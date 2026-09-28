import { useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { ProjectCard } from '../../components/ProjectCard';
import { EmptyState } from '../../components/ui/Feedback';
import { ButtonLink } from '../../components/ui/Button';
import { getProjectStatus } from '../../features/projects/status';
import { clientDisplayName } from '../../features/clients/format';
import { projectTitle } from '../../features/projects/actions';
import { normalize } from '../../services/ai/LocalAIProvider';

type Filter = 'all' | 'quotes' | 'won' | 'work' | 'done';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'quotes', label: 'Devis en cours' },
  { value: 'won', label: 'Signés' },
  { value: 'work', label: 'Travaux' },
  { value: 'done', label: 'Terminés' },
];

export function ProjectsPage() {
  const { projects, quotes, clients } = useAppState();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = normalize(query.trim());
    return [...projects]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((p) => {
        const quote = quotes.find((x) => x.id === p.quoteId);
        const s = getProjectStatus(p, quote);
        const stage = p.work?.stage;
        const pass =
          filter === 'all' ||
          (filter === 'quotes' && ['draft', 'quoting', 'sent', 'viewed'].includes(s)) ||
          (filter === 'won' && ['accepted', 'signed', 'deposit_paid'].includes(s) && !p.work) ||
          (filter === 'work' && !!p.work && stage !== 'done' && stage !== 'archived') ||
          (filter === 'done' && s === 'done');
        if (!pass) return false;
        if (!q) return true;
        const client = clients.find((c) => c.id === p.clientId);
        return normalize(`${clientDisplayName(client)} ${projectTitle(p)} ${client?.city ?? ''}`).includes(q);
      });
  }, [projects, quotes, clients, filter, query]);

  return (
    <div>
      <PageHeader title="Chantiers" subtitle={`${projects.length} chantier${projects.length > 1 ? 's' : ''}`} />
      {projects.length > 0 && (
        <div className="mb-4 space-y-3">
          <label className="relative block">
            <span className="sr-only">Rechercher un chantier</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              placeholder="Rechercher un client, une ville…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3"
            />
          </label>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Filtrer les chantiers">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${
                  filter === f.value ? 'bg-ink text-bg' : 'border border-line bg-surface text-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {projects.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" />}
          title="Aucun chantier"
          action={<ButtonLink to="/projects/new">Nouveau chantier</ButtonLink>}
        >
          Chaque visite client devient un chantier : photos, mesures, devis, signature.
        </EmptyState>
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-muted">Aucun chantier ne correspond.</p>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <ProjectCard key={p.id} project={p} quote={quotes.find((q) => q.id === p.quoteId)} client={clients.find((c) => c.id === p.clientId)} />
          ))}
        </div>
      )}
    </div>
  );
}
