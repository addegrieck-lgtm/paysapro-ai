// Client Supabase (mode « cloud »).
//
// Actif uniquement si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies. Sans elles,
// l'application reste en mode local (données sur l'appareil), exactement comme avant.
//
// Seule la clé PUBLIQUE « anon » est utilisée ici : elle est faite pour vivre dans le navigateur,
// la sécurité repose sur les règles RLS de la base. La clé « service_role » ne doit jamais
// apparaître dans ce projet frontend.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env ?? {};
const url = (env.VITE_SUPABASE_URL ?? '').trim();
const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const CLOUD_ENABLED = url !== '' && anonKey !== '';

export const supabase: SupabaseClient | null = CLOUD_ENABLED
  ? createClient(url, anonKey, {
      auth: {
        // PKCE : le retour des e-mails (confirmation, mot de passe oublié) passe par « ?code= »
        // et non par le fragment d'URL, déjà utilisé par le routeur de l'application.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Adresse de retour des e-mails d'authentification (page d'accueil de l'application). */
export function authRedirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export type MemberRole = 'admin' | 'office' | 'field' | 'read_only';

export interface CloudSession {
  userId: string;
  email: string;
  companyId: string | null;
  role: MemberRole | null;
}

let session: CloudSession | null = null;

export function getCloudSession(): CloudSession | null {
  return session;
}

/** Lit la session Supabase et l'entreprise de l'utilisateur. null si personne n'est connecté. */
export async function refreshCloudSession(): Promise<CloudSession | null> {
  if (!supabase) return (session = null);
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const user = data.session?.user;
  if (!user) return (session = null);
  const member = await supabase.from('company_members').select('company_id, role').eq('user_id', user.id).order('created_at').limit(1).maybeSingle();
  if (member.error) throw new Error(member.error.message);
  session = {
    userId: user.id,
    email: user.email ?? '',
    companyId: (member.data?.company_id as string | undefined) ?? null,
    role: (member.data?.role as MemberRole | undefined) ?? null,
  };
  return session;
}

/** Crée l'entreprise de l'utilisateur connecté (il en devient administrateur, abonnement « bêta »). */
export async function createCompany(name: string, settings: object): Promise<string> {
  if (!supabase || !session) throw new Error('Connexion requise.');
  const { data, error } = await supabase.rpc('create_company', { p_name: name, p_settings: settings });
  if (error) throw new Error(error.message);
  session = { ...session, companyId: data as string, role: 'admin' };
  return data as string;
}

/** Abonnement de l'entreprise courante (lecture seule : la base refuse toute écriture depuis le navigateur). */
export async function fetchSubscription(): Promise<{ planId: string; status: string; currentPeriodEnd: string | null } | null> {
  if (!supabase || !session?.companyId) return null;
  const { data, error } = await supabase.from('subscriptions').select('plan_id, status, current_period_end').eq('company_id', session.companyId).maybeSingle();
  if (error || !data) return null;
  return { planId: data.plan_id as string, status: data.status as string, currentPeriodEnd: (data.current_period_end as string | null) ?? null };
}

export function clearCloudSession(): void {
  session = null;
}
