import type { QuoteTotals } from '../features/quotes/pricing';
import { kindLabel } from '../features/catalog/units';
import { formatMoney, formatPercent } from '../utils/number';
import type { LineKind } from '../types';
import { Card, CardTitle } from './ui/Card';
import { NumberField } from './ui/Form';
import { Alert } from './ui/Feedback';

/** Estimation financière : coût estimé, marge, prix de vente, TVA, TTC, acompte. */
export function TotalsCard({
  totals,
  vatExempt,
  onMarginChange,
  locked,
}: {
  totals: QuoteTotals;
  vatExempt: boolean;
  onMarginChange?: (v: number) => void;
  locked?: boolean;
}) {
  const kinds = Object.entries(totals.costByKind) as [LineKind, number][];
  return (
    <Card>
      <CardTitle>Estimation du chantier</CardTitle>
      {kinds.length > 0 && (
        <dl className="mb-3 space-y-1 text-sm">
          {kinds.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-muted">{kindLabel(k)}</dt>
              <dd className="tabular-nums">{formatMoney(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="space-y-2 border-t border-line pt-3">
        <Line label="Coût estimé" value={formatMoney(totals.costTotal)} strong />
        {onMarginChange && !locked ? (
          <div className="flex items-end justify-between gap-3">
            <NumberField label="Marge" suffix="%" value={totals.marginPercent} max={100} onChange={(v) => onMarginChange(v ?? 0)} className="w-32" />
            <div className="pb-3 text-right tabular-nums text-muted">+ {formatMoney(totals.marginAmount)}</div>
          </div>
        ) : (
          <Line label={`Marge (${formatPercent(totals.marginPercent)})`} value={formatMoney(totals.marginAmount)} />
        )}
        <Line label="Prix de vente HT" value={formatMoney(totals.totalHT)} strong />
        {vatExempt ? (
          <p className="text-sm text-muted">TVA non applicable (art. 293 B du CGI)</p>
        ) : (
          <Line label={`TVA ${formatPercent(totals.vatRate)}`} value={formatMoney(totals.vatAmount)} />
        )}
        <div className="flex items-baseline justify-between gap-3 rounded-xl bg-brand px-4 py-3 text-on-brand">
          <span className="font-semibold">Total TTC</span>
          <span className="text-2xl font-bold tabular-nums">{formatMoney(totals.totalTTC)}</span>
        </div>
        {totals.depositPercent > 0 && (
          <Line label={`Acompte (${formatPercent(totals.depositPercent)})`} value={formatMoney(totals.depositAmount)} />
        )}
      </div>
      {totals.missingCount > 0 && (
        <div className="mt-3">
          <Alert tone="warning">
            {totals.missingCount} ligne{totals.missingCount > 1 ? 's' : ''} sans quantité : information manquante, non comptée{totals.missingCount > 1 ? 's' : ''} dans le total.
          </Alert>
        </div>
      )}
      {totals.hasEstimates && (
        <div className="mt-3">
          <Alert tone="warning">⚠️ Estimation indicative — certaines quantités reposent sur des mesures approximatives, à confirmer.</Alert>
        </div>
      )}
    </Card>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={strong ? 'font-semibold text-ink' : 'text-muted'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-ink' : ''}`}>{value}</span>
    </div>
  );
}
