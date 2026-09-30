import { useCallback, useEffect, useState } from 'react';
import { MailPlus, Trash2, Users } from 'lucide-react';
import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge, Card, CardTitle } from '../../components/ui/Card';
import { Button, IconButton } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Form';
import { Alert, ConfirmDialog, useToast } from '../../components/ui/Feedback';
import { inviteMember, listTeam, removeMember, revokeInvitation, ROLES, roleLabel, setMemberRole, type TeamInvitation, type TeamMember } from '../../features/team/actions';
import { getCurrentPlan } from '../../features/plans/plans';
import { emailEnabled, sendInvitationEmail } from '../../features/email/email';
import { CLOUD_ENABLED, getCloudSession, type MemberRole } from '../../services/cloud/client';

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r.value, label: r.label }));

/** Paramètres → Équipe : membres, rôles et invitations (mode cloud). */
export function TeamPage() {
  const { demo, user } = useAppState();
  const toast = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('field');
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState<TeamMember | null>(null);
  const cloud = CLOUD_ENABLED && !demo && user?.provider === 'cloud';
  const isAdmin = getCloudSession()?.role === 'admin';
  const limit = getCurrentPlan().limits.users;

  const reload = useCallback(async () => {
    try {
      const team = await listTeam();
      setMembers(team.members);
      setInvitations(team.invitations);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cloud) void reload();
  }, [cloud, reload]);

  const run = async (task: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await task();
      toast(done);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action impossible.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  if (!cloud) {
    return (
      <div className="space-y-5">
        <PageHeader back="/settings" title="Équipe" />
        <Alert tone="info">La gestion d’équipe nécessite un compte en ligne. Ici, vos données restent sur cet appareil.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader back="/settings" title="Équipe" subtitle={`${members.length + invitations.length} / ${limit} utilisateurs inclus dans votre offre`} />
      {error && <Alert tone="danger">{error}</Alert>}

      <Card>
        <CardTitle icon={<Users className="h-5 w-5" />}>Membres</CardTitle>
        {loading ? (
          <p className="text-muted">Chargement…</p>
        ) : (
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {m.name} {m.isSelf && <Badge>Vous</Badge>}
                  </div>
                  <div className="break-all text-sm text-muted">{m.email}</div>
                </div>
                {isAdmin && !m.isSelf ? (
                  <>
                    <div className="w-44">
                      <SelectField label={`Rôle de ${m.name}`} value={m.role} options={ROLE_OPTIONS} disabled={busy} onChange={(v) => run(() => setMemberRole(m.id, v as MemberRole), '✓ Rôle modifié')} />
                    </div>
                    <IconButton label={`Retirer ${m.name}`} onClick={() => setToRemove(m)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </>
                ) : (
                  <Badge tone="info">{roleLabel(m.role)}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isAdmin ? (
        <Card>
          <CardTitle icon={<MailPlus className="h-5 w-5" />}>Inviter un collègue</CardTitle>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const id = await inviteMember(email, role);
                setEmail('');
                // L'invitation est enregistrée même si l'e-mail ne part pas : on le signale sans bloquer.
                if (emailEnabled()) await sendInvitationEmail(id).catch((err) => toast(err instanceof Error ? err.message : 'E-mail non envoyé.', 'danger'));
              }, emailEnabled() ? '✓ Invitation enregistrée et envoyée par e-mail' : '✓ Invitation enregistrée');
            }}
          >
            <TextField label="E-mail du collègue" type="email" value={email} onChange={setEmail} autoComplete="off" inputMode="email" />
            <SelectField label="Rôle" value={role} onChange={(v) => setRole(v as MemberRole)} options={ROLE_OPTIONS} />
            <Button type="submit" disabled={busy || !email.trim()}>
              Inviter
            </Button>
          </form>
          <p className="mt-2 text-sm text-muted">{ROLES.find((r) => r.value === role)?.hint}.</p>
          <Alert tone="info">
            {emailEnabled() ? 'Un e-mail d’invitation est envoyé. ' : 'Aucun e-mail n’est envoyé automatiquement pour l’instant. '}Votre collègue crée son compte avec cette adresse (ou se reconnecte s’il en a déjà un) : il rejoint votre entreprise à sa prochaine connexion,
            s’il n’appartient pas déjà à une autre entreprise.
          </Alert>
          {invitations.length > 0 && (
            <ul className="mt-4 divide-y divide-line">
              {invitations.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="break-all font-medium">{i.email}</div>
                    <div className="text-sm text-muted">En attente · {roleLabel(i.role)}</div>
                  </div>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => revokeInvitation(i.id), 'Invitation annulée.')}>
                    Annuler
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Alert tone="info">Seul un administrateur peut inviter des collègues ou modifier les rôles.</Alert>
      )}

      <ConfirmDialog
        open={!!toRemove}
        title="Retirer ce membre ?"
        message={<p>{toRemove?.name} n’aura plus accès aux données de l’entreprise. Son compte personnel n’est pas supprimé.</p>}
        confirmLabel="Retirer"
        danger
        onClose={() => setToRemove(null)}
        onConfirm={() => {
          const m = toRemove;
          setToRemove(null);
          if (m) void run(() => removeMember(m.id), 'Membre retiré.');
        }}
      />
    </div>
  );
}
