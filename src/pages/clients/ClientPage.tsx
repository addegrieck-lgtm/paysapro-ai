import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Mail, MapPin, Pencil, Phone, Plus } from 'lucide-react';
import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardTitle, Stat } from '../../components/ui/Card';
import { ButtonLink } from '../../components/ui/Button';
import { ProjectCard } from '../../components/ProjectCard';
import { NotFoundPage } from '../NotFoundPage';
import { clientAddress, clientDisplayName } from '../../features/clients/format';
import { computeTotals } from '../../features/quotes/pricing';
import { QUOTE_STATUS } from '../../features/projects/status';
import { Badge } from '../../components/ui/Card';
import { formatMoney } from '../../utils/number';
import { relativeTime } from '../../utils/date';
import { Link } from 'react-router';

export function ClientPage() {
  const { id } = useParams();
  const { clients, projects, quotes, activity } = useAppState();
  const client = clients.find((c) => c.id === id);

  const data = useMemo(() => {
    const ps = projects.filter((p) => p.clientId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const qs = quotes.filter((q) => q.clientId === id && q.number);
    const totalFor = (qId: string) => {
      const q = quotes.find((x) => x.id === qId);
      const p = ps.find((x) => x.id === q?.projectId);
      return q && p ? computeTotals(q, p).totalTTC : 0;
    };
    const quoted = qs.reduce((s, q) => s + totalFor(q.id), 0);
    const signed = qs.filter((q) => q.status === 'signed' || q.status === 'accepted').reduce((s, q) => s + totalFor(q.id), 0);
    const ids = new Set(ps.map((p) => p.id));
    const history = activity.filter((a) => a.projectId && ids.has(a.projectId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
    const last = [...history.map((h) => h.createdAt), client?.updatedAt ?? ''].sort().at(-1) ?? null;
    return { ps, qs, quoted, signed, history, totalFor, last };
  }, [projects, quotes, activity, id, client]);

  if (!client) return <NotFoundPage message="Ce client n’existe pas ou a été supprimé." />;

  return (
    <div className="space-y-5">
      <PageHeader
        back="/clients"
        title={clientDisplayName(client)}
        subtitle={client.companyName && [client.firstName, client.lastName].filter(Boolean).join(' ')}
        actions={
          <ButtonLink to={`/clients/${client.id}/edit`} variant="ghost" size="sm" icon={<Pencil className="h-4 w-4" />}>
            Modifier
          </ButtonLink>
        }
      />

      <Card>
        <ul className="space-y-2">
          {client.phone && (
            <li>
              <a href={`tel:${client.phone.replace(/\s/g, '')}`} className="flex min-h-11 items-center gap-3 text-ink">
                <Phone className="h-5 w-5 text-brand" aria-hidden /> {client.phone}
              </a>
            </li>
          )}
          {client.email && (
            <li>
              <a href={`mailto:${client.email}`} className="flex min-h-11 items-center gap-3 break-all text-ink">
                <Mail className="h-5 w-5 shrink-0 text-brand" aria-hidden /> {client.email}
              </a>
            </li>
          )}
          {clientAddress(client) && (
            <li className="flex min-h-11 items-center gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-brand" aria-hidden /> {clientAddress(client)}
            </li>
          )}
          {!client.phone && !client.email && !clientAddress(client) && <li className="text-muted">Aucune coordonnée renseignée.</li>}
        </ul>
        {client.notes && <p className="mt-3 whitespace-pre-line border-t border-line pt-3 text-sm text-muted">{client.notes}</p>}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Montant des devis" value={formatMoney(data.quoted, true)} hint={`${data.qs.length} devis`} />
        <Stat label="Accepté / signé" value={formatMoney(data.signed, true)} />
      </div>
      {data.last && <p className="text-sm text-muted">Dernière activité : {relativeTime(data.last)}</p>}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chantiers</h2>
          <ButtonLink to={`/projects/new?client=${client.id}`} variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />}>
            Nouveau
          </ButtonLink>
        </div>
        {data.ps.length === 0 ? (
          <p className="text-muted">Aucun chantier pour ce client.</p>
        ) : (
          <div className="space-y-3">
            {data.ps.map((p) => (
              <ProjectCard key={p.id} project={p} quote={quotes.find((q) => q.id === p.quoteId)} client={client} />
            ))}
          </div>
        )}
      </section>

      {data.qs.length > 0 && (
        <Card>
          <CardTitle>Devis</CardTitle>
          <ul className="divide-y divide-line">
            {data.qs.map((q) => (
              <li key={q.id}>
                <Link to={`/projects/${q.projectId}/quote`} className="flex min-h-12 items-center justify-between gap-3 py-2">
                  <span className="font-medium">N° {q.number}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{formatMoney(data.totalFor(q.id))}</span>
                    <Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.history.length > 0 && (
        <Card>
          <CardTitle>Historique</CardTitle>
          <ul className="space-y-2 text-sm">
            {data.history.map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                <span>{a.message}</span>
                <span className="shrink-0 text-muted">{relativeTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
