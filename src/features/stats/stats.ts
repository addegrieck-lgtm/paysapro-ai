// Statistiques du tableau de bord : calculées uniquement à partir des données réelles.
import type { Project, Quote } from '../../types';
import { round } from '../../utils/number';
import { computeTotals } from '../quotes/pricing';
import { getProjectStatus } from '../projects/status';

export interface DashboardStats {
  quoteCount: number;
  quotedAmount: number;
  acceptedCount: number;
  signedAmount: number;
  inProgressCount: number;
  collectedAmount: number;
  /** Taux de transformation (%) : devis acceptés ou signés ÷ devis présentés au client */
  conversionRate: number | null;
}

export function computeStats(projects: Project[], quotes: Quote[]): DashboardStats {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const issued = quotes.filter((q) => q.number);
  let quotedAmount = 0;
  let signedAmount = 0;
  let collectedAmount = 0;
  let acceptedCount = 0;
  let presented = 0;
  for (const q of issued) {
    const project = byId.get(q.projectId);
    const totals = computeTotals(q, project ?? { zones: [], linears: [] });
    quotedAmount += totals.totalTTC;
    if (q.status === 'accepted' || q.status === 'signed') {
      acceptedCount++;
      signedAmount += totals.totalTTC;
    }
    if (q.sentAt || q.status === 'accepted' || q.status === 'signed' || q.status === 'refused') presented++;
  }
  for (const q of quotes) collectedAmount += q.payments.reduce((s, p) => s + p.amount, 0);
  const inProgressCount = projects.filter((p) => {
    const s = getProjectStatus(p, quotes.find((q) => q.id === p.quoteId));
    return s === 'in_progress' || (p.work && p.work.stage !== 'done' && p.work.stage !== 'archived');
  }).length;
  return {
    quoteCount: issued.length,
    quotedAmount: round(quotedAmount),
    acceptedCount,
    signedAmount: round(signedAmount),
    inProgressCount,
    collectedAmount: round(collectedAmount),
    conversionRate: presented > 0 ? round((acceptedCount / presented) * 100, 0) : null,
  };
}
