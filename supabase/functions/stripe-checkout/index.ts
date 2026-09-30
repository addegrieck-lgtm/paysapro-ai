// Crée une session de paiement Stripe (abonnement) pour l'entreprise de l'administrateur connecté.
// Appelée par l'application : supabase.functions.invoke('stripe-checkout', { body: { plan } }).
import { adminClient, originOf, cors, customerFor, json, PRICE_IDS, requireAdmin, stripe, YEARLY_PRICE_IDS } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, req);
  try {
    const admin = await requireAdmin(req);
    if (!admin) return json({ error: 'forbidden' }, 403, req);
    const { plan, interval } = (await req.json().catch(() => ({}))) as { plan?: string; interval?: string };
    // Le navigateur choisit l'offre et la périodicité ; le prix, lui, vient toujours des tarifs Stripe configurés ici.
    const price = plan ? (interval === 'year' ? YEARLY_PRICE_IDS : PRICE_IDS)[plan] : undefined;
    if (!price) return json({ error: 'unknown_plan' }, 400, req);

    // Une entreprise déjà abonnée change d'offre par le portail : jamais un second abonnement en parallèle.
    const current = await adminClient().from('subscriptions').select('status').eq('company_id', admin.companyId).maybeSingle();
    if (['active', 'trialing', 'past_due'].includes((current.data?.status as string | undefined) ?? '')) return json({ error: 'already_subscribed' }, 409, req);

    const customer = await customerFor(admin.companyId, admin.email);
    const session = await stripe('checkout/sessions', {
      mode: 'subscription',
      customer,
      'line_items[0][price]': price,
      'line_items[0][quantity]': '1',
      client_reference_id: admin.companyId,
      'subscription_data[metadata][company_id]': admin.companyId,
      'metadata[company_id]': admin.companyId,
      allow_promotion_codes: 'true',
      success_url: `${originOf(req)}/#/settings/subscription?paiement=ok`,
      cancel_url: `${originOf(req)}/#/settings/subscription`,
    });
    return json({ url: session.url }, 200, req);
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500, req);
  }
});
