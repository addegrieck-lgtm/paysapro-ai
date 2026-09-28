// Notifications internes (sans service payant) :
//  • événements enregistrés : devis signé, devis vu, chantier terminé, nouveau client ;
//  • alertes calculées à la volée : devis bientôt expiré / expiré, chantier qui commence, relance à faire.
// Architecture prête pour de futures notifications push (nécessitent un serveur).
import type { ActivityEvent, AppSettings, Client, NotificationKind, Project, Quote } from '../../types';
import { addDays, daysBetween, fromInputDate } from '../../utils/date';
import { clientDisplayName } from '../clients/format';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  projectId: string | null;
  message: string;
  /** Plus petit = plus urgent (alertes calculées) */
  priority: number;
  read: boolean;
  createdAt: string | null;
}

/** Alertes calculées depuis l'état des devis et chantiers. */
export function computeNotifications(projects: Project[], quotes: Quote[], clients: Client[], now = new Date()): AppNotification[] {
  const out: AppNotification[] = [];
  const clientName = (id: string) => clientDisplayName(clients.find((c) => c.id === id));
  const alert = (id: string, kind: NotificationKind, projectId: string, message: string, priority: number): AppNotification => ({
    id,
    kind,
    projectId,
    message,
    priority,
    read: false,
    createdAt: null,
  });

  for (const q of quotes) {
    const name = clientName(q.clientId);
    const open = q.status === 'sent' || q.status === 'viewed' || q.status === 'ready';
    if (open && q.issueDate) {
      const left = daysBetween(now, addDays(q.issueDate, q.validityDays));
      if (left < 0) out.push(alert(`expired-${q.id}`, 'expired', q.projectId, `Le devis de ${name} a expiré.`, 3));
      else if (left <= 3) {
        const when = left === 0 ? "aujourd'hui" : left === 1 ? 'demain' : `dans ${left} jours`;
        out.push(alert(`expiring-${q.id}`, 'expired', q.projectId, `Le devis de ${name} expire ${when}.`, 1));
      }
    }
    if ((q.status === 'sent' || q.status === 'viewed') && q.sentAt && daysBetween(new Date(q.sentAt), now) >= 7) {
      out.push(alert(`followup-${q.id}`, 'info', q.projectId, `Pensez à relancer ${name} (devis envoyé il y a ${daysBetween(new Date(q.sentAt), now)} jours).`, 4));
    }
  }

  for (const p of projects) {
    const start = fromInputDate(p.work?.startDate ?? null);
    if (!start || !p.work || p.work.stage === 'in_progress' || p.work.stage === 'done' || p.work.stage === 'archived') continue;
    const d = daysBetween(now, start);
    if (d === 0 || d === 1) {
      out.push(alert(`start-${p.id}`, 'info', p.id, `Le chantier de ${clientName(p.clientId)} commence ${d === 0 ? "aujourd'hui" : 'demain'}.`, 0));
    }
  }
  return out.sort((a, b) => a.priority - b.priority);
}

/** Centre de notifications : alertes du moment + événements enregistrés, selon les préférences. */
export function notificationCenter(
  activity: ActivityEvent[],
  alerts: AppNotification[],
  prefs: AppSettings['notificationPrefs'],
): { items: AppNotification[]; unread: number } {
  const allowed = (k: NotificationKind | undefined) => !k || k === 'info' || prefs[k];
  const events: AppNotification[] = activity
    .filter((a) => a.notify && allowed(a.kind))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30)
    .map((a) => ({ id: a.id, kind: a.kind ?? 'info', projectId: a.projectId, message: a.message, priority: 5, read: !!a.read, createdAt: a.createdAt }));
  const items = [...alerts.filter((a) => allowed(a.kind)), ...events];
  // Le badge ne compte que les événements non lus : les alertes restent visibles tant qu'elles sont d'actualité.
  return { items, unread: events.filter((e) => !e.read).length };
}
