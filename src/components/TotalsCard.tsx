import { useState } from 'react';
import { Lock } from 'lucide-react';
import { GROUP_LABEL, type PriceGroup, type QuoteTotals } from '../features/quotes/pricing';
import { formatMoney, formatPercent } from '../utils/number';
import { Card, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { NumberField } from './ui/Form';
import { Alert } from './ui/Feedback';

/**
 * Récapitulatif des prix : ce que verra le client (HT, TVA, TTC, acompte)
 * + un encadré « visible uniquement par vous » avec coût et marge.
 */
export function TotalsCard({
  totals,
  vatExempt,
  locked,
  defaultMargin,
  onApplyMargin,
}: {
  totals: QuoteTotals;
  vatExempt: boolean;
  locked?: boolean;
  defaultMargin: number;
  onApplyMargin?: (percent: number) => void;
}) {
  const [margin, setMargin] = useState<number | null>(defaultMargin);
  const groups = (Object.keys(totals.saleByGroup) as PriceGroup[]).filter((g) => totals.saleByGroup[g] > 0);

  return (
    <Card>
      <CardTitle>Prix</CardTitle>
      <dl className="space-y-1.5">
        {groups.map((g) => (
          <Line key={g} label={GROUP_LABEL[g]} value={formatMoney(totals.saleByGroup[g])} />
        ))}
        <div className="border-t border-line pt-2">
          <Line label="Total HT" value={formatMoney(totals.totalHT)} strong />
        </div>
        {vatExempt ? (
          <p className="text-sm text-muted">TVA non applicable (art. 293 B du CGI)</p>
        ) : (
          <Line label={`TVA ${formatPercent(totals.vatRate)}`} value={formatMoney(totals.vatAmount)} />
        )}
        <div className="flex items-baseline justify-between gap-3 rounded-xl bg-brand px-4 py-3 text-on-brand">
          <dt className="font-semibold">Total TTC</dt>
          <dd className="text-2xl font-bold tabular-nums">{formatMoney(totals.totalTTC)}</dd>
        </div>
        {totals.depositPercent > 0 && <Line label={`Acompte (${formatPercent(totals.depositPercent)})`} value={formatMoney(totals.depositAmount)} />}
      </dl>

      <div className="mt-4 rounded-xl border border-dashed border-line bg-surface-2/60 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <Lock className="h-3.5 w-3.5" aria-hidden /> Visible uniquement par vous
        </p>
        <dl className="space-y-1.5">
          <Line label="Coût estimé" value={formatMoney(totals.costTotal)} />
          <Line label="Prix de vente HT" value={formatMoney(totals.totalHT)} />
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-semibold text-ink">Marge</dt>
            <dd className={`font-bold tabular-nums ${totals.marginAmount < 0 ? 'text-danger' : 'text-success'}`}>
              {formatMoney(totals.marginAmount)} <span className="text-sm font-medium text-muted">({formatPercent(totals.marginRate)} du HT)</span>
            </dd>
          </div>
        </dl>
        {totals.marginAmount < 0 && <p className="mt-2 text-sm text-danger">Attention : vos prix de vente sont inférieurs à vos coûts.</p>}
        {onApplyMargin && !locked && (
          <div className="mt-3 flex items-end gap-2">
            <NumberField label="Marge sur coûts" suffix="%" max={100} value={margin} onChange={setMargin} className="w-36" />
            <Button variant="soft" disabled={margin === null} onClick={() => margin !== null && onApplyMargin(margin)} className="mb-0">
              Appliquer aux prix
            </Button>
          </div>
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
      <dt className={strong ? 'font-semibold text-ink' : 'text-muted'}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-semibold text-ink' : ''}`}>{value}</dd>
    </div>
  );
}
