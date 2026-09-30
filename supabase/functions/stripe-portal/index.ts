// Ouvre le portail client Stripe (moyen de paiement, factures, changement d'offre, résiliation).
import { adminClient, APP_URL, cors, json, requireAdmin, stripe } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const admin = await requireAdmin(req);
    if (!admin) return json({ error: 'forbidden' }, 403);
    const sub = await adminClient().from('subscriptions').select('stripe_customer_id').eq('company_id', admin.companyId).maybeSingle();
    const customer = sub.data?.stripe_customer_id as string | null | undefined;
    if (!customer) return json({ error: 'no_customer' }, 400);
    const session = await stripe('billing_portal/sessions', { customer, return_url: `${APP_URL}/#/settings/subscription` });
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
});
