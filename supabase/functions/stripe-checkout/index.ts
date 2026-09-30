// Crée une session de paiement Stripe (abonnement) pour l'entreprise de l'administrateur connecté.
// Appelée par l'application : supabase.functions.invoke('stripe-checkout', { body: { plan } }).
import { APP_URL, cors, customerFor, json, PRICE_IDS, requireAdmin, stripe, YEARLY_PRICE_IDS } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const admin = await requireAdmin(req);
    if (!admin) return json({ error: 'forbidden' }, 403);
    const { plan, interval } = (await req.json().catch(() => ({}))) as { plan?: string; interval?: string };
    // Le navigateur choisit l'offre et la périodicité ; le prix, lui, vient toujours des tarifs Stripe configurés ici.
    const price = plan ? (interval === 'year' ? YEARLY_PRICE_IDS : PRICE_IDS)[plan] : undefined;
    if (!price) return json({ error: 'unknown_plan' }, 400);

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
      success_url: `${APP_URL}/#/settings/subscription?paiement=ok`,
      cancel_url: `${APP_URL}/#/settings/subscription`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
});
