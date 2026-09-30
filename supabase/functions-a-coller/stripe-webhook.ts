// FICHIER GÉNÉRÉ (node scripts/bundle-functions.mjs) — ne pas modifier à la main.
// À coller dans Supabase → Edge Functions → stripe-webhook.
// Code partagé des fonctions Stripe (Supabase Edge Functions, environnement Deno).
//
// Secrets lus dans l'environnement de la fonction (Supabase → Edge Functions → Secrets) :
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//   STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_BUSINESS_PRICE_ID (tarifs mensuels),
//   STRIPE_STARTER_YEARLY_PRICE_ID, STRIPE_PRO_YEARLY_PRICE_ID, STRIPE_BUSINESS_YEARLY_PRICE_ID (tarifs annuels, −25 %),
//   APP_URL (ex. https://app.paysapro-ai.fr)
// SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
// Aucun de ces secrets ne doit apparaître dans le code du navigateur.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');

const PRICE_IDS: Record<string, string | undefined> = {
  starter: Deno.env.get('STRIPE_STARTER_PRICE_ID'),
  pro: Deno.env.get('STRIPE_PRO_PRICE_ID'),
  business: Deno.env.get('STRIPE_BUSINESS_PRICE_ID'),
};

const YEARLY_PRICE_IDS: Record<string, string | undefined> = {
  starter: Deno.env.get('STRIPE_STARTER_YEARLY_PRICE_ID'),
  pro: Deno.env.get('STRIPE_PRO_YEARLY_PRICE_ID'),
  business: Deno.env.get('STRIPE_BUSINESS_YEARLY_PRICE_ID'),
};

/** Offre correspondant à un tarif Stripe, qu'il soit mensuel ou annuel. */
function planForPrice(priceId: string | undefined): string | null {
  const found = [...Object.entries(PRICE_IDS), ...Object.entries(YEARLY_PRICE_IDS)].find(([, id]) => id && id === priceId);
  return found ? found[0] : null;
}

function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': APP_URL || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(), 'Content-Type': 'application/json' } });
}

/** Client « service_role » : contourne RLS, réservé au serveur. */
function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

/** Utilisateur authentifié par le jeton de la requête, et l'entreprise dont il est administrateur. */
async function requireAdmin(req: Request): Promise<{ userId: string; email: string; companyId: string } | null> {
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return null;
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;
  const member = await adminClient().from('company_members').select('company_id').eq('user_id', data.user.id).eq('role', 'admin').order('created_at').limit(1).maybeSingle();
  if (member.error || !member.data) return null;
  return { userId: data.user.id, email: data.user.email ?? '', companyId: member.data.company_id as string };
}

/** Appel de l'API Stripe (formulaire encodé), sans dépendance. */
async function stripe(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    // Le détail reste dans les journaux du serveur ; jamais renvoyé au navigateur.
    console.error('Stripe error', path, response.status, (body.error as { code?: string; type?: string } | undefined)?.code);
    throw new Error('stripe_error');
  }
  return body;
}

/** Client Stripe de l'entreprise : réutilisé s'il existe, créé sinon. */
async function customerFor(companyId: string, email: string): Promise<string> {
  const db = adminClient();
  const sub = await db.from('subscriptions').select('stripe_customer_id').eq('company_id', companyId).maybeSingle();
  const existing = sub.data?.stripe_customer_id as string | null | undefined;
  if (existing) return existing;
  const company = await db.from('companies').select('name').eq('id', companyId).maybeSingle();
  const customer = await stripe('customers', { email, name: (company.data?.name as string | undefined) ?? '', 'metadata[company_id]': companyId });
  await db.from('subscriptions').update({ stripe_customer_id: customer.id as string }).eq('company_id', companyId);
  return customer.id as string;
}

// Vérification de la signature d'un webhook Stripe (HMAC-SHA256), sans dépendance.
// Fonction pure (Web Crypto) : testée dans tests/stripe-signature.test.ts.

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparaison à temps constant. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signPayload(payload: string, timestamp: number, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
}

/**
 * @param header  en-tête « Stripe-Signature » : t=<horodatage>,v1=<signature>[,v1=…]
 * @param toleranceSeconds  écart maximal accepté (protection contre le rejeu)
 */
async function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSeconds = 300, nowSeconds = Date.now() / 1000): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const timestamp = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v ?? '');
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;
  const expected = await signPayload(payload, timestamp, secret);
  return signatures.some((s) => safeEqual(s, expected));
}

// Webhook Stripe : seule source d'écriture de la table `subscriptions`.
//
// • La signature de chaque événement est vérifiée (STRIPE_WEBHOOK_SECRET) : un appel forgé est rejeté.
// • Chaque événement est enregistré une seule fois (subscription_events.stripe_event_id est unique).
// • La base est la source de vérité de l'accès : l'application ne fait que la lire.
//
// À déployer SANS vérification du jeton Supabase (Stripe n'en envoie pas) : « Verify JWT » désactivé.

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
