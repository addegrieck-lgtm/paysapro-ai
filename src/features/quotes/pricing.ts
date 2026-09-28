// Calculs financiers du devis : fonctions pures, testées (tests/calculations.test.ts).
//
// Modèle : chaque ligne porte un prix de vente HT (vu par le client) et un coût HT (interne).
//   Total HT = Σ quantité × prix de vente        Coût estimé = Σ quantité × coût
//   Marge    = Total HT − Coût estimé            (jamais montrée au client)
// Exemple : 80 m² de gazon à 12 €/m² → 80 × 12 = 960 € HT.
import type { LineKind, PaymentRecord, Quote, QuoteLine } from '../../types';
import { round } from '../../utils/number';
import { resolveQuantity, type MeasureSource, type QuantityInfo } from './quantity';

export interface ComputedLine extends QuantityInfo {
  line: QuoteLine;
  costTotal: number;
  saleUnitPrice: number;
  saleTotal: number;
  marginTotal: number;
}

export type PriceGroup = 'materials' | 'labor' | 'other';

export interface QuoteTotals {
  lines: ComputedLine[];
  costTotal: number;
  marginAmount: number;
  /** Marge rapportée au prix de vente HT (%) */
  marginRate: number;
  totalHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
  depositPercent: number;
  depositAmount: number;
  balanceAmount: number;
  paidAmount: number;
  remainingAmount: number;
  /** Prix de vente HT par grande famille (matériaux, main-d'œuvre, autres) */
  saleByGroup: Record<PriceGroup, number>;
  missingCount: number;
  hasEstimates: boolean;
}

const GROUP: Record<LineKind, PriceGroup> = {
  material: 'materials',
  plant: 'materials',
  consumable: 'materials',
  service: 'labor',
  labor: 'labor',
  rental: 'other',
  transport: 'other',
  disposal: 'other',
};

export const GROUP_LABEL: Record<PriceGroup, string> = {
  materials: 'Matériaux & végétaux',
  labor: 'Main-d’œuvre & prestations',
  other: 'Location, transport, évacuation',
};

/** Prix de vente à partir d'un coût et d'un taux de marge sur coût (%). 1 850 € à 30 % → 2 405 €. */
export function applyMargin(cost: number, marginPercent: number): number {
  return round(cost * (1 + marginPercent / 100));
}

/** Recalcule les prix de vente des lignes à partir de leur coût (outil « Appliquer une marge »). */
export function applyMarginToLines(lines: QuoteLine[], marginPercent: number): QuoteLine[] {
  return lines.map((l) => (l.unitCost > 0 ? { ...l, unitPrice: applyMargin(l.unitCost, marginPercent) } : l));
}

/** TVA d'un montant HT. */
export function vatOf(amountHT: number, vatRate: number): number {
  return round((amountHT * vatRate) / 100);
}

/** Acompte = pourcentage du TTC. 4 850 € à 30 % → 1 455 €. */
export function depositOf(totalTTC: number, depositPercent: number): number {
  return round((totalTTC * depositPercent) / 100);
}

export function computeLine(line: QuoteLine, src: MeasureSource): ComputedLine {
  const q = resolveQuantity(line, src);
  const saleUnitPrice = Math.max(0, line.unitPrice || 0);
  const unitCost = Math.max(0, line.unitCost || 0);
  const saleTotal = round(q.quantity * saleUnitPrice);
  const costTotal = round(q.quantity * unitCost);
  return { ...q, line, saleUnitPrice, saleTotal, costTotal, marginTotal: round(saleTotal - costTotal) };
}

type TotalsInput = Pick<Quote, 'lines' | 'vatRate' | 'vatExempt' | 'depositPercent'> & {
  payments?: PaymentRecord[];
};

export function computeTotals(quote: TotalsInput, src: MeasureSource): QuoteTotals {
  const vatRate = quote.vatExempt ? 0 : clampPercent(quote.vatRate);
  const depositPercent = clampPercent(quote.depositPercent);

  const lines = quote.lines.map((l) => computeLine(l, src));
  const costTotal = round(lines.reduce((s, l) => s + l.costTotal, 0));
  const totalHT = round(lines.reduce((s, l) => s + l.saleTotal, 0));
  const vatAmount = vatOf(totalHT, vatRate);
  const totalTTC = round(totalHT + vatAmount);
  const depositAmount = depositOf(totalTTC, depositPercent);
  const paidAmount = round((quote.payments ?? []).reduce((s, p) => s + p.amount, 0));
  const marginAmount = round(totalHT - costTotal);

  const saleByGroup: Record<PriceGroup, number> = { materials: 0, labor: 0, other: 0 };
  for (const l of lines) saleByGroup[GROUP[l.line.kind]] = round(saleByGroup[GROUP[l.line.kind]] + l.saleTotal);

  return {
    lines,
    costTotal,
    marginAmount,
    marginRate: totalHT > 0 ? round((marginAmount / totalHT) * 100, 1) : 0,
    totalHT,
    vatRate,
    vatAmount,
    totalTTC,
    depositPercent,
    depositAmount,
    balanceAmount: round(totalTTC - depositAmount),
    paidAmount,
    remainingAmount: round(Math.max(0, totalTTC - paidAmount)),
    saleByGroup,
    missingCount: lines.filter((l) => l.status === 'missing').length,
    hasEstimates: lines.some((l) => l.status === 'estimated'),
  };
}

function clampPercent(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}
