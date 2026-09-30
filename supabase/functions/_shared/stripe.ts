// Code partagé des fonctions Stripe (Supabase Edge Functions, environnement Deno).
//
// Secrets lus dans l'environnement de la fonction (Supabase → Edge Functions → Secrets) :
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//   STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_BUSINESS_PRICE_ID,
//   APP_URL (ex. https://app.paysapro-ai.fr)
// SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
// Aucun de ces secrets ne doit apparaître dans le code du navigateur.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');

export const PRICE_IDS: Record<string, string | undefined> = {
  starter: Deno.env.get('STRIPE_STARTER_PRICE_ID'),
  pro: Deno.env.get('STRIPE_PRO_PRICE_ID'),
  business: Deno.env.get('STRIPE_BUSINESS_PRICE_ID'),
};

export function planForPrice(priceId: string | undefined): string | null {
  const found = Object.entries(PRICE_IDS).find(([, id]) => id && id === priceId);
  return found ? found[0] : null;
}

export function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': APP_URL || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(), 'Content-Type': 'application/json' } });
}

/** Client « service_role » : contourne RLS, réservé au serveur. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

/** Utilisateur authentifié par le jeton de la requête, et l'entreprise dont il est administrateur. */
export async function requireAdmin(req: Request): Promise<{ userId: string; email: string; companyId: string } | null> {
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
export async function stripe(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
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
export async function customerFor(companyId: string, email: string): Promise<string> {
  const db = adminClient();
  const sub = await db.from('subscriptions').select('stripe_customer_id').eq('company_id', companyId).maybeSingle();
  const existing = sub.data?.stripe_customer_id as string | null | undefined;
  if (existing) return existing;
  const company = await db.from('companies').select('name').eq('id', companyId).maybeSingle();
  const customer = await stripe('customers', { email, name: (company.data?.name as string | undefined) ?? '', 'metadata[company_id]': companyId });
  await db.from('subscriptions').update({ stripe_customer_id: customer.id as string }).eq('company_id', companyId);
  return customer.id as string;
}
