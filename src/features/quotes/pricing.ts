// Calculs financiers du devis : fonctions pures, testées (tests/pricing.test.ts).
//
// Modèle : les prix du catalogue sont des prix HT « avant marge ».
// Prix de vente unitaire = prix × (1 + marge %). Exemple : coût 2 230 € + 30 % = 2 899 € HT.
import type { LineKind, PaymentRecord, Quote, QuoteLine } from '../../types';
import { round } from '../../utils/number';
import { resolveQuantity, type MeasureSource, type QuantityInfo } from './quantity';

export interface ComputedLine extends QuantityInfo {
  line: QuoteLine;
  costTotal: number;
  saleUnitPrice: number;
  saleTotal: number;
}

export interface QuoteTotals {
  lines: ComputedLine[];
  costTotal: number;
  marginPercent: number;
  marginAmount: number;
  totalHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
  depositPercent: number;
  depositAmount: number;
  balanceAmount: number;
  paidAmount: number;
  remainingAmount: number;
  costByKind: Partial<Record<LineKind, number>>;
  missingCount: number;
  hasEstimates: boolean;
}

/** Prix de vente à partir d'un coût et d'une marge (%). 1 850 € à 30 % → 2 405 €. */
export function applyMargin(cost: number, marginPercent: number): number {
  return round(cost * (1 + marginPercent / 100));
}

/** TVA d'un montant HT. */
export function vatOf(amountHT: number, vatRate: number): number {
  return round((amountHT * vatRate) / 100);
}

/** Acompte = pourcentage du TTC. 4 850 € à 30 % → 1 455 €. */
export function depositOf(totalTTC: number, depositPercent: number): number {
  return round((totalTTC * depositPercent) / 100);
}

export function computeLine(line: QuoteLine, src: MeasureSource, marginPercent: number): ComputedLine {
  const q = resolveQuantity(line, src);
  const unitPrice = Math.max(0, line.unitPrice || 0);
  const saleUnitPrice = applyMargin(unitPrice, marginPercent);
  return {
    ...q,
    line,
    costTotal: round(q.quantity * unitPrice),
    saleUnitPrice,
    saleTotal: round(q.quantity * saleUnitPrice),
  };
}

type TotalsInput = Pick<Quote, 'lines' | 'marginPercent' | 'vatRate' | 'vatExempt' | 'depositPercent'> & {
  payments?: PaymentRecord[];
};

export function computeTotals(quote: TotalsInput, src: MeasureSource): QuoteTotals {
  const margin = clampPercent(quote.marginPercent);
  const vatRate = quote.vatExempt ? 0 : clampPercent(quote.vatRate);
  const depositPercent = clampPercent(quote.depositPercent);

  const lines = quote.lines.map((l) => computeLine(l, src, margin));
  const costTotal = round(lines.reduce((s, l) => s + l.costTotal, 0));
  const totalHT = round(lines.reduce((s, l) => s + l.saleTotal, 0));
  const vatAmount = vatOf(totalHT, vatRate);
  const totalTTC = round(totalHT + vatAmount);
  const depositAmount = depositOf(totalTTC, depositPercent);
  const paidAmount = round((quote.payments ?? []).reduce((s, p) => s + p.amount, 0));

  const costByKind: QuoteTotals['costByKind'] = {};
  for (const l of lines) costByKind[l.line.kind] = round((costByKind[l.line.kind] ?? 0) + l.costTotal);

  return {
    lines,
    costTotal,
    marginPercent: margin,
    marginAmount: round(totalHT - costTotal),
    totalHT,
    vatRate,
    vatAmount,
    totalTTC,
    depositPercent,
    depositAmount,
    balanceAmount: round(totalTTC - depositAmount),
    paidAmount,
    remainingAmount: round(Math.max(0, totalTTC - paidAmount)),
    costByKind,
    missingCount: lines.filter((l) => l.status === 'missing').length,
    hasEstimates: lines.some((l) => l.status === 'estimated'),
  };
}

function clampPercent(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}
