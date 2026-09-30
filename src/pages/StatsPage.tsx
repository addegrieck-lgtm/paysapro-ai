import { useEffect, useMemo, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { useAppState } from '../lib/store';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardTitle } from '../components/ui/Card';
import { StatCard } from '../components/ui/Extras';
import { computeStats, signedByMonth } from '../features/stats/stats';
import { analytics, funnelProgress } from '../services/analytics/AnalyticsProvider';
import { formatMoney } from '../utils/number';
import type { AnalyticsEvent } from '../types';
import { canUseFeature, hasFeature } from '../features/plans/plans';

export function StatsPage() {
  const { projects, quotes, clients } = useAppState();
  const stats = useMemo(() => computeStats(projects, quotes), [projects, quotes]);
  const months = useMemo(() => signedByMonth(projects, quotes), [projects, quotes]);
  const max = Math.max(1, ...months.map((m) => m.amount));
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  useEffect(() => {
    void analytics.getEvents().then(setEvents).catch(() => setEvents([]));
  }, []);
  const funnel = funnelProgress(events);

  return (
    <div className="space-y-5">
      <PageHeader title="Statistiques" subtitle="Calculées à partir de vos données, sur cet appareil." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Devis émis" value={stats.quoteCount} hint={formatMoney(stats.quotedAmount, true)} />
        <StatCard label="Devis signés / acceptés" value={stats.acceptedCount} hint={formatMoney(stats.signedAmount, true)} />
        <StatCard label="Taux de transformation" value={stats.conversionRate === null ? '—' : `${stats.conversionRate} %`} hint="acceptés / envoyés" />
        <StatCard label="Devis moyen" value={stats.averageQuote === null ? '—' : formatMoney(stats.averageQuote, true)} hint="TTC" />
        <StatCard label="Encaissé" value={formatMoney(stats.collectedAmount, true)} hint="acomptes et soldes" />
        <StatCard label="Clients" value={clients.length} />
      </div>

      <Card>
        <CardTitle>Montant signé par mois</CardTitle>
        <div className="flex h-44 items-end gap-2" role="img" aria-label={`Montant signé par mois : ${months.map((m) => `${m.label} ${formatMoney(m.amount, true)}`).join(', ')}`}>
          {months.map((m) => (
            <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[0.65rem] tabular-nums text-muted">{m.amount > 0 ? formatMoney(m.amount, true) : ''}</span>
              <div className="w-full rounded-t-lg bg-brand transition-all" style={{ height: `${Math.max(2, (m.amount / max) * 120)}px`, opacity: m.amount > 0 ? 1 : 0.2 }} />
              <span className="text-xs text-muted">{m.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle icon={<Lock className="h-4 w-4" />}>Marge des devis signés</CardTitle>
        {hasFeature('profitability') ? (
          <>
            <p className="text-2xl font-bold text-success">{formatMoney(stats.signedMargin)}</p>
            <p className="text-sm text-muted">Visible uniquement par vous. Calculée à partir des coûts renseignés dans vos devis.</p>
          </>
        ) : (
          <p className="text-sm text-muted">{canUseFeature('profitability').reason}</p>
        )}
      </Card>

      <Card>
        <CardTitle>Votre progression</CardTitle>
        <ol className="space-y-2">
          {funnel.map((f) => (
            <li key={f.label} className="flex items-center gap-3">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${f.reached ? 'bg-brand text-on-brand' : 'border-2 border-line'}`}>
                {f.reached && <Check className="h-4 w-4" aria-hidden />}
              </span>
              <span className={f.reached ? 'text-ink' : 'text-muted'}>{f.label}</span>
              {f.count > 1 && <span className="text-sm text-muted">× {f.count}</span>}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">Événements enregistrés uniquement sur cet appareil, jamais envoyés à un service externe.</p>
      </Card>
    </div>
  );
}
