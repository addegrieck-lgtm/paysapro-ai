// Ce que chaque rôle peut faire dans l'interface.
//
// Miroir des règles RLS de la base (supabase/migrations/0001) : l'interface s'en sert pour ne pas
// proposer une action qui serait refusée. La protection réelle reste dans la base.
//   admin      tout, y compris l'équipe
//   office     devis, clients, chantiers, catalogue, réglages de l'entreprise
//   field      chantiers, photos, mesures, devis — pas le catalogue ni les réglages
//   read_only  consultation uniquement
// Rôle null : mode local ou démonstration, un seul utilisateur qui peut tout faire.
import type { MemberRole } from '../../services/cloud/client';
import { useAppState } from '../../lib/store';

export type Permission = 'write' | 'manage' | 'admin';

export function roleCan(role: MemberRole | null, permission: Permission): boolean {
  if (role === null || role === 'admin') return true;
  if (permission === 'admin') return false;
  if (permission === 'manage') return role === 'office';
  return role === 'office' || role === 'field';
}

export const PERMISSION_MESSAGE: Record<Permission, string> = {
  write: 'Votre accès est en lecture seule : vous pouvez consulter, mais pas créer ni modifier.',
  manage: 'Cette partie est réservée aux rôles Administrateur et Bureau.',
  admin: 'Cette partie est réservée aux administrateurs de l’entreprise.',
};

export function useCan(permission: Permission): boolean {
  const { role, demo } = useAppState();
  return demo || roleCan(role, permission);
}
