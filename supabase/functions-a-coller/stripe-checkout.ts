// FICHIER GÉNÉRÉ (node scripts/bundle-functions.mjs) — ne pas modifier à la main.
// À coller dans Supabase → Edge Functions → stripe-checkout.
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

/** Origines autorisées : l'application, plus d'éventuelles adresses d'essai (APP_EXTRA_ORIGINS, séparées par des virgules). */
const ALLOWED_ORIGINS = [APP_URL, ...(Deno.env.get('APP_EXTRA_ORIGINS') ?? '').split(',').map((o) => o.trim().replace(/\/+$/, ''))].filter(Boolean);

/** Adresse de retour après paiement : l'origine de la requête si elle est autorisée, sinon l'application. */
function originOf(req?: Request): string {
  const origin = (req?.headers.get('Origin') ?? '').replace(/\/+$/, '');
  return ALLOWED_ORIGINS.includes(origin) ? origin : APP_URL;
}

function cors(req?: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': originOf(req) || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
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

// Crée une session de paiement Stripe (abonnement) pour l'entreprise de l'administrateur connecté.
// Appelée par l'application : supabase.functions.invoke('stripe-checkout', { body: { plan } }).

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
