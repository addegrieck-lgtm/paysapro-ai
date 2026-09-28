import type { Client, Project, Quote } from '../types';
import { ListLink, Badge } from './ui/Card';
import { clientDisplayName } from '../features/clients/format';
import { projectTitle } from '../features/projects/actions';
import { getProjectStatus, PROJECT_STATUS } from '../features/projects/status';
import { computeTotals } from '../features/quotes/pricing';
import { formatMoney } from '../utils/number';

export function ProjectCard({ project, quote, client }: { project: Project; quote: Quote | undefined; client: Client | undefined }) {
  const status = PROJECT_STATUS[getProjectStatus(project, quote)];
  const total = quote && quote.lines.length > 0 ? computeTotals(quote, project).totalTTC : null;
  return (
    <ListLink to={`/projects/${project.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{clientDisplayName(client)}</div>
          <div className="truncate text-sm text-muted">{projectTitle(project)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-semibold tabular-nums text-ink">{total !== null ? formatMoney(total, true) : '—'}</div>
          {total !== null && <div className="text-xs text-muted">TTC</div>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        {quote?.number && <span className="text-xs text-muted">Devis {quote.number}</span>}
      </div>
    </ListLink>
  );
}
