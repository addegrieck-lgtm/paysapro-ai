// Statistiques : calculées uniquement à partir des données réelles de l'utilisateur.
import type { Project, Quote } from '../../types';
import { round } from '../../utils/number';
import { computeTotals } from '../quotes/pricing';

export interface DashboardStats {
  quoteCount: number;
  quotedAmount: number;
  /** Devis émis ce mois-ci */
  monthCount: number;
  monthAmount: number;
  acceptedCount: number;
  signedAmount: number;
  inProgressCount: number;
  collectedAmount: number;
  /** Taux de transformation (%) : devis acceptés ou signés ÷ devis présentés au client */
  conversionRate: number | null;
  averageQuote: number | null;
  /** Marge totale des devis acceptés / signés (interne) */
  signedMargin: number;
}

export function computeStats(projects: Project[], quotes: Quote[], now = new Date()): DashboardStats {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const issued = quotes.filter((q) => q.number);
  let quotedAmount = 0;
  let monthCount = 0;
  let monthAmount = 0;
  let signedAmount = 0;
  let signedMargin = 0;
  let acceptedCount = 0;
  let presented = 0;
  for (const q of issued) {
    const totals = computeTotals(q, byId.get(q.projectId) ?? { zones: [], linears: [] });
    quotedAmount += totals.totalTTC;
    const issuedAt = q.issueDate ? new Date(q.issueDate) : null;
    if (issuedAt && issuedAt.getFullYear() === now.getFullYear() && issuedAt.getMonth() === now.getMonth()) {
      monthCount++;
      monthAmount += totals.totalTTC;
    }
    if (q.status === 'accepted' || q.status === 'signed') {
      acceptedCount++;
      signedAmount += totals.totalTTC;
      signedMargin += totals.marginAmount;
    }
    if (q.sentAt || q.status === 'accepted' || q.status === 'signed' || q.status === 'refused') presented++;
  }
  const collectedAmount = quotes.reduce((s, q) => s + q.payments.reduce((a, p) => a + p.amount, 0), 0);
  const inProgressCount = projects.filter((p) => p.work && p.work.stage !== 'done' && p.work.stage !== 'archived').length;
  return {
    quoteCount: issued.length,
    quotedAmount: round(quotedAmount),
    monthCount,
    monthAmount: round(monthAmount),
    acceptedCount,
    signedAmount: round(signedAmount),
    inProgressCount,
    collectedAmount: round(collectedAmount),
    conversionRate: presented > 0 ? round((acceptedCount / presented) * 100, 0) : null,
    averageQuote: issued.length ? round(quotedAmount / issued.length) : null,
    signedMargin: round(signedMargin),
  };
}

/** Montant signé par mois (6 derniers mois) pour le graphique des statistiques. */
export function signedByMonth(projects: Project[], quotes: Quote[], now = new Date(), months = 6): { label: string; amount: number }[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const fmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: fmt.format(d).replace('.', ''), amount: 0 };
  });
  for (const q of quotes) {
    const when = q.signature?.signedAt ?? (q.status === 'accepted' ? q.acceptedAt : null);
    if (!when) continue;
    const d = new Date(when);
    const b = buckets.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (b) b.amount = round(b.amount + computeTotals(q, byId.get(q.projectId) ?? { zones: [], linears: [] }).totalTTC);
  }
  return buckets.map(({ label, amount }) => ({ label, amount }));
}
