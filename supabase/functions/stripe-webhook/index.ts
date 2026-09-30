// Webhook Stripe : seule source d'écriture de la table `subscriptions`.
//
// • La signature de chaque événement est vérifiée (STRIPE_WEBHOOK_SECRET) : un appel forgé est rejeté.
// • Chaque événement est enregistré une seule fois (subscription_events.stripe_event_id est unique).
// • La base est la source de vérité de l'accès : l'application ne fait que la lire.
//
// À déployer SANS vérification du jeton Supabase (Stripe n'en envoie pas) : « Verify JWT » désactivé.
import { adminClient, planForPrice } from '../_shared/stripe.ts';
import { verifyStripeSignature } from '../_shared/signature.ts';

const STATUS: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  unpaid: 'past_due',
  canceled: 'canceled',
  incomplete: 'inactive',
  incomplete_expired: 'inactive',
  paused: 'inactive',
};

const iso = (seconds: unknown): string | null => (typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null);

type Obj = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const payload = await req.text();
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  if (!secret || !(await verifyStripeSignature(payload, req.headers.get('Stripe-Signature'), secret))) {
    return new Response('invalid signature', { status: 400 });
  }

  const event = JSON.parse(payload) as { id: string; type: string; data: { object: Obj } };
  const object = event.data.object;
  const db = adminClient();

  // Entreprise concernée : métadonnée posée à la création, sinon client Stripe déjà connu.
  const metadata = (object.metadata ?? {}) as Obj;
  let companyId = (metadata.company_id as string | undefined) ?? (object.client_reference_id as string | undefined) ?? null;
  const customerId = typeof object.customer === 'string' ? object.customer : null;
  if (!companyId && customerId) {
    const found = await db.from('subscriptions').select('company_id').eq('stripe_customer_id', customerId).maybeSingle();
    companyId = (found.data?.company_id as string | undefined) ?? null;
  }

  // Idempotence : un événement déjà reçu n'est pas rejoué.
  const logged = await db.from('subscription_events').insert({ stripe_event_id: event.id, type: event.type, company_id: companyId, payload: { object_id: object.id ?? null } });
  if (logged.error) {
    if (logged.error.code === '23505') return new Response('already processed', { status: 200 });
    console.error('subscription_events', logged.error.code);
    return new Response('storage error', { status: 500 });
  }
  if (!companyId) return new Response('ignored', { status: 200 });

  let update: Obj | null = null;
  switch (event.type) {
    case 'checkout.session.completed':
      update = { stripe_customer_id: customerId, stripe_subscription_id: typeof object.subscription === 'string' ? object.subscription : null };
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const items = ((object.items as Obj | undefined)?.data ?? []) as Obj[];
      const price = (items[0]?.price as Obj | undefined)?.id as string | undefined;
      const plan = planForPrice(price);
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : (STATUS[object.status as string] ?? 'inactive');
      update = {
        stripe_customer_id: customerId,
        stripe_subscription_id: object.id,
        status,
        ...(plan ? { plan_id: plan } : {}),
        current_period_start: iso(object.current_period_start ?? items[0]?.current_period_start),
        current_period_end: iso(object.current_period_end ?? items[0]?.current_period_end),
      };
      break;
    }
    // invoice.paid / invoice.payment_failed : journalisés ci-dessus ; le statut arrive par customer.subscription.updated.
  }

  if (update) {
    const { error } = await db.from('subscriptions').update(update).eq('company_id', companyId);
    if (error) {
      console.error('subscriptions', error.code);
      // L'événement devra être rejoué par Stripe : on retire sa trace.
      await db.from('subscription_events').delete().eq('stripe_event_id', event.id);
      return new Response('storage error', { status: 500 });
    }
  }
  return new Response('ok', { status: 200 });
});
