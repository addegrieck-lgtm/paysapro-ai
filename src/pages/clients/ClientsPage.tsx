import { useMemo, useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { ListLink } from '../../components/ui/Card';
import { ButtonLink, IconButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Feedback';
import { clientAddress, clientDisplayName } from '../../features/clients/format';
import { normalize } from '../../services/ai/LocalAIProvider';
import { useNavigate } from 'react-router';

export function ClientsPage() {
  const { clients, projects } = useAppState();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const list = useMemo(() => {
    const q = normalize(query.trim());
    return [...clients]
      .sort((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b), 'fr'))
      .filter((c) => !q || normalize(`${clientDisplayName(c)} ${c.city} ${c.phone} ${c.email}`).includes(q));
  }, [clients, query]);

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length > 1 ? 's' : ''}`}
        actions={
          <IconButton label="Nouveau client" onClick={() => navigate('/clients/new')}>
            <UserPlus className="h-5 w-5" />
          </IconButton>
        }
      />
      {clients.length === 0 ? (
        <EmptyState icon={<Users className="h-7 w-7" />} title="Aucun client" action={<ButtonLink to="/clients/new">Ajouter un client</ButtonLink>}>
          Vos clients sont créés automatiquement avec chaque nouveau chantier.
        </EmptyState>
      ) : (
        <>
          <label className="relative mb-4 block">
            <span className="sr-only">Rechercher un client</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              placeholder="Nom, ville, téléphone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3"
            />
          </label>
          <div className="space-y-2">
            {list.map((c) => {
              const count = projects.filter((p) => p.clientId === c.id).length;
              return (
                <ListLink key={c.id} to={`/clients/${c.id}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand" aria-hidden>
                      {clientDisplayName(c).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{clientDisplayName(c)}</div>
                      <div className="truncate text-sm text-muted">
                        {[clientAddress(c), `${count} chantier${count > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                </ListLink>
              );
            })}
            {list.length === 0 && <p className="py-8 text-center text-muted">Aucun client ne correspond.</p>}
          </div>
        </>
      )}
    </div>
  );
}
