// Notifications locales : calculées à partir des données, affichées dans l'application.
// Architecture prête pour de futures notifications push (nécessitent un serveur).
import type { Client, Project, Quote } from '../../types';
import { addDays, daysBetween, fromInputDate } from '../../utils/date';
import { clientDisplayName } from '../clients/format';

export type NotificationKind = 'viewed' | 'expiring' | 'expired' | 'starting' | 'followup';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  projectId: string;
  message: string;
  /** Plus petit = plus urgent */
  priority: number;
}

export function computeNotifications(
  projects: Project[],
  quotes: Quote[],
  clients: Client[],
  now = new Date(),
): AppNotification[] {
  const out: AppNotification[] = [];
  const clientName = (id: string) => clientDisplayName(clients.find((c) => c.id === id));

  for (const q of quotes) {
    const name = clientName(q.clientId);
    const open = q.status === 'sent' || q.status === 'viewed' || q.status === 'ready';
    if (q.status === 'viewed' && q.viewedAt && daysBetween(new Date(q.viewedAt), now) <= 7) {
      out.push({ id: `viewed-${q.id}`, kind: 'viewed', projectId: q.projectId, message: `Le devis de ${name} a été consulté.`, priority: 2 });
    }
    if (open && q.issueDate) {
      const left = daysBetween(now, addDays(q.issueDate, q.validityDays));
      if (left < 0) {
        out.push({ id: `expired-${q.id}`, kind: 'expired', projectId: q.projectId, message: `Le devis de ${name} a expiré.`, priority: 3 });
      } else if (left <= 3) {
        const when = left === 0 ? "aujourd'hui" : left === 1 ? 'demain' : `dans ${left} jours`;
        out.push({ id: `expiring-${q.id}`, kind: 'expiring', projectId: q.projectId, message: `Le devis de ${name} expire ${when}.`, priority: 1 });
      }
    }
    if ((q.status === 'sent' || q.status === 'viewed') && q.sentAt && daysBetween(new Date(q.sentAt), now) >= 7) {
      out.push({ id: `followup-${q.id}`, kind: 'followup', projectId: q.projectId, message: `Pensez à relancer ${name} (devis envoyé il y a ${daysBetween(new Date(q.sentAt), now)} jours).`, priority: 4 });
    }
  }

  for (const p of projects) {
    const start = fromInputDate(p.work?.startDate ?? null);
    if (!start || !p.work || p.work.stage === 'in_progress' || p.work.stage === 'done' || p.work.stage === 'archived') continue;
    const d = daysBetween(now, start);
    if (d === 0 || d === 1) {
      out.push({
        id: `start-${p.id}`,
        kind: 'starting',
        projectId: p.id,
        message: `Le chantier de ${clientName(p.clientId)} commence ${d === 0 ? "aujourd'hui" : 'demain'}.`,
        priority: 0,
      });
    }
  }
  return out.sort((a, b) => a.priority - b.priority);
}
