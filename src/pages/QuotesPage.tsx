import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { useAppState } from '../lib/store';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge, ListLink } from '../components/ui/Card';
import { EmptyState } from '../components/ui/Feedback';
import { ButtonLink } from '../components/ui/Button';
import { clientDisplayName } from '../features/clients/format';
import { computeTotals } from '../features/quotes/pricing';
import { isQuoteExpired, QUOTE_STATUS } from '../features/projects/status';
import { formatMoney } from '../utils/number';
import { formatDate } from '../utils/date';
import type { QuoteStatus } from '../types';

type Filter = 'all' | 'open' | 'won' | 'lost';
const OPEN: QuoteStatus[] = ['ready', 'sent', 'viewed'];

export function QuotesPage() {
  const { quotes, projects, clients } = useAppState();
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(
    () =>
      quotes
        .filter((q) => q.number)
        .map((q) => {
          const project = projects.find((p) => p.id === q.projectId);
          return { q, project, client: clients.find((c) => c.id === q.clientId), total: project ? computeTotals(q, project).totalTTC : 0 };
        })
        .filter(({ q }) =>
          filter === 'all' ? true : filter === 'open' ? OPEN.includes(q.status) : filter === 'won' ? q.status === 'signed' || q.status === 'accepted' : q.status === 'refused',
        )
        .sort((a, b) => (b.q.number ?? '').localeCompare(a.q.number ?? '')),
    [quotes, projects, clients, filter],
  );
  const drafts = quotes.filter((q) => !q.number && q.lines.length > 0).length;

  return (
    <div>
      <PageHeader title="Devis" subtitle={drafts > 0 ? `${drafts} devis en préparation dans vos chantiers` : undefined} />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Filtrer les devis">
        {(
          [
            ['all', 'Tous'],
            ['open', 'En attente'],
            ['won', 'Acceptés'],
            ['lost', 'Refusés'],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            role="tab"
            aria-selected={filter === v}
            onClick={() => setFilter(v)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${filter === v ? 'bg-ink text-bg' : 'border border-line bg-surface text-muted'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<FileText className="h-7 w-7" />} title="Aucun devis" action={<ButtonLink to="/projects/new">Nouveau chantier</ButtonLink>}>
          Un devis se crée depuis un chantier, après les mesures et les prestations.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {rows.map(({ q, client, total }) => {
            const expired = isQuoteExpired(q);
            return (
              <ListLink key={q.id} to={`/projects/${q.projectId}/quote`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">N° {q.number}</div>
                    <div className="truncate text-sm text-muted">
                      {clientDisplayName(client)} · {formatDate(q.issueDate)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums">{formatMoney(total, true)}</div>
                    <div className="mt-1 flex justify-end gap-1">
                      {expired && <Badge tone="warning">Expiré</Badge>}
                      <Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Badge>
                    </div>
                  </div>
                </div>
              </ListLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
