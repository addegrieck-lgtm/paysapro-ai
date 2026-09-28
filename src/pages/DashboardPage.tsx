import { useMemo } from 'react';
import { Link } from 'react-router';
import { Bell, ClipboardList, Plus, Sprout } from 'lucide-react';
import { useAppState } from '../lib/store';
import { computeStats } from '../features/stats/stats';
import { computeNotifications } from '../features/notifications/notifications';
import { ProjectCard } from '../components/ProjectCard';
import { Card, CardTitle, Stat } from '../components/ui/Card';
import { ButtonLink, Button } from '../components/ui/Button';
import { EmptyState, useToast } from '../components/ui/Feedback';
import { formatMoney } from '../utils/number';
import { formatLongDate, relativeTime } from '../utils/date';
import { loadDemoData } from '../features/settings/dataActions';

function greeting(): string {
  const h = new Date().getHours();
  return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour';
}

export function DashboardPage() {
  const { projects, quotes, clients, settings, activity } = useAppState();
  const toast = useToast();
  const stats = useMemo(() => computeStats(projects, quotes), [projects, quotes]);
  const notifications = useMemo(() => computeNotifications(projects, quotes, clients), [projects, quotes, clients]);
  const recent = useMemo(() => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5), [projects]);
  const recentActivity = useMemo(() => [...activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [activity]);
  const companyName = settings.company.name.trim();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-muted">{formatLongDate(new Date())}</p>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{greeting()} 👋</h1>
        <p className="text-muted">{companyName ? `${companyName} — voici votre activité.` : 'Voici votre activité.'}</p>
      </header>

      <ButtonLink to="/projects/new" size="lg" block icon={<Plus className="h-6 w-6" />}>
        Nouveau chantier
      </ButtonLink>

      {notifications.length > 0 && (
        <Card>
          <CardTitle icon={<Bell className="h-5 w-5" />}>À suivre</CardTitle>
          <ul className="space-y-1">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id}>
                <Link to={`/projects/${n.projectId}`} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-ink hover:bg-surface-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-leaf" aria-hidden />
                  {n.message}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section aria-label="Statistiques" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Devis" value={stats.quoteCount} hint={formatMoney(stats.quotedAmount, true) + ' au total'} />
        <Stat label="Devis acceptés" value={stats.acceptedCount} hint={formatMoney(stats.signedAmount, true) + ' signés'} />
        <Stat label="Chantiers en cours" value={stats.inProgressCount} />
        <Stat label="Montant encaissé" value={formatMoney(stats.collectedAmount, true)} />
        <Stat
          label="Taux de transformation"
          value={stats.conversionRate === null ? '—' : `${stats.conversionRate} %`}
          hint={stats.conversionRate === null ? 'Aucun devis envoyé' : 'acceptés / envoyés'}
        />
        <Stat label="Clients" value={clients.length} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Chantiers récents</h2>
          {projects.length > 0 && (
            <Link to="/projects" className="text-sm font-semibold text-brand">
              Tout voir
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Sprout className="h-7 w-7" />}
            title="Aucun chantier pour l’instant"
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <ButtonLink to="/projects/new" icon={<Plus className="h-5 w-5" />}>
                  Créer mon premier chantier
                </ButtonLink>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await loadDemoData();
                    toast('Données de démonstration chargées.');
                  }}
                >
                  Charger des données de démonstration
                </Button>
              </div>
            }
          >
            Créez un chantier chez votre client : photos, mesures, devis et signature, tout depuis votre téléphone.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {recent.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                quote={quotes.find((q) => q.id === p.quoteId)}
                client={clients.find((c) => c.id === p.clientId)}
              />
            ))}
          </div>
        )}
      </section>

      {recentActivity.length > 0 && (
        <Card>
          <CardTitle icon={<ClipboardList className="h-5 w-5" />}>Activité récente</CardTitle>
          <ul className="space-y-2 text-sm">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                <span className="text-ink">{a.message}</span>
                <span className="shrink-0 text-muted">{relativeTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
