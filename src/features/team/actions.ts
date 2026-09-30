// Équipe (mode cloud) : membres, rôles, invitations, suppression de compte.
//
// Toutes les règles sont appliquées par la base (RLS + fonctions de supabase/migrations/0004) :
// seul un administrateur gère l'équipe, la limite d'utilisateurs de l'offre est vérifiée côté
// serveur et une entreprise garde toujours au moins un administrateur. Ce fichier ne fait que
// présenter les erreurs de façon lisible.
import { clearCloudSession, getCloudSession, supabase, type MemberRole } from '../../services/cloud/client';
import { storage } from '../../services/storage';
import { loadAll, setState } from '../../lib/store';
import { isValidEmail } from '../../utils/validation';

export const ROLES: { value: MemberRole; label: string; hint: string }[] = [
  { value: 'admin', label: 'Administrateur', hint: 'Tout, y compris l’équipe et l’abonnement' },
  { value: 'office', label: 'Bureau', hint: 'Devis, clients, chantiers, catalogue et réglages' },
  { value: 'field', label: 'Terrain', hint: 'Chantiers, photos, mesures et devis ; pas le catalogue' },
  { value: 'read_only', label: 'Lecture seule', hint: 'Consultation uniquement' },
];

export function roleLabel(role: string | null | undefined): string {
  return ROLES.find((r) => r.value === role)?.label ?? '—';
}

export interface TeamMember {
  id: string;
  userId: string;
  role: MemberRole;
  name: string;
  email: string;
  isSelf: boolean;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: MemberRole;
  createdAt: string;
}

export class TeamError extends Error {}

const MESSAGES: Record<string, string> = {
  not_admin: 'Seul un administrateur peut gérer l’équipe.',
  invalid_role: 'Rôle inconnu.',
  already_member: 'Cette personne fait déjà partie de l’équipe.',
  user_limit_reached: 'Nombre maximal d’utilisateurs atteint pour votre offre.',
  last_admin: 'L’entreprise doit garder au moins un administrateur : nommez-en un autre d’abord.',
};

function fail(error: { message?: string } | null): never {
  const key = Object.keys(MESSAGES).find((k) => error?.message?.includes(k));
  throw new TeamError(key ? MESSAGES[key]! : 'Action impossible. Vérifiez votre connexion et vos droits, puis réessayez.');
}

function context() {
  const session = getCloudSession();
  if (!supabase || !session?.companyId) throw new TeamError('Connexion requise.');
  return { db: supabase, session, companyId: session.companyId };
}

export async function listTeam(): Promise<{ members: TeamMember[]; invitations: TeamInvitation[] }> {
  const { db, session, companyId } = context();
  const members = await db.from('company_members').select('id, user_id, role, created_at').eq('company_id', companyId).order('created_at');
  if (members.error) fail(members.error);
  const ids = (members.data ?? []).map((m) => m.user_id as string);
  const profiles = await db.from('profiles').select('id, first_name, last_name, email').in('id', ids);
  if (profiles.error) fail(profiles.error);
  const byId = new Map((profiles.data ?? []).map((p) => [p.id as string, p]));
  // Les invitations ne sont lisibles que par un administrateur (la base renvoie une liste vide sinon).
  const invitations = await db.from('company_invitations').select('id, email, role, created_at').eq('company_id', companyId).is('accepted_at', null).order('created_at');
  return {
    members: (members.data ?? []).map((m) => {
      const p = byId.get(m.user_id as string);
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
      return { id: m.id as string, userId: m.user_id as string, role: m.role as MemberRole, name: name || (p?.email as string | undefined) || 'Utilisateur', email: (p?.email as string | undefined) ?? '', isSelf: m.user_id === session.userId };
    }),
    invitations: (invitations.data ?? []).map((i) => ({ id: i.id as string, email: i.email as string, role: i.role as MemberRole, createdAt: i.created_at as string })),
  };
}

/** Enregistre l'invitation et renvoie son identifiant. */
export async function inviteMember(email: string, role: MemberRole): Promise<string> {
  const { db } = context();
  if (!email.trim() || !isValidEmail(email)) throw new TeamError('Adresse e-mail invalide.');
  const { data, error } = await db.rpc('invite_member', { p_email: email.trim().toLowerCase(), p_role: role });
  if (error) fail(error);
  return data as string;
}

export async function revokeInvitation(id: string): Promise<void> {
  const { db, companyId } = context();
  const { error } = await db.from('company_invitations').delete().eq('company_id', companyId).eq('id', id);
  if (error) fail(error);
}

export async function setMemberRole(memberId: string, role: MemberRole): Promise<void> {
  const { db, companyId } = context();
  const { data, error } = await db.from('company_members').update({ role }).eq('company_id', companyId).eq('id', memberId).select('id');
  if (error) fail(error);
  if (!data?.length) fail({ message: 'not_admin' });
}

export async function removeMember(memberId: string): Promise<void> {
  const { db, companyId } = context();
  const { data, error } = await db.from('company_members').delete().eq('company_id', companyId).eq('id', memberId).select('id');
  if (error) fail(error);
  if (!data?.length) fail({ message: 'not_admin' });
}

/**
 * Supprime le compte de l'utilisateur connecté. S'il est le seul membre de son entreprise,
 * l'entreprise, ses données et ses photos sont supprimées définitivement.
 */
export async function deleteMyAccount(): Promise<void> {
  const { db } = context();
  const { members } = await listTeam();
  if (members.length === 1) await storage.clearAll(); // retire aussi les fichiers photo du stockage
  const { error } = await db.rpc('delete_my_account');
  if (error) fail(error);
  await db.auth.signOut({ scope: 'local' });
  clearCloudSession();
  setState({ ready: false });
  await loadAll();
}
