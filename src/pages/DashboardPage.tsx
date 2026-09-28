import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bell, Camera, Check, ClipboardList, FileText, History, Plus, Sprout, UserPlus } from 'lucide-react';
import { useAppState } from '../lib/store';
import { computeStats } from '../features/stats/stats';
import { computeNotifications } from '../features/notifications/notifications';
import { ProjectCard } from '../components/ProjectCard';
import { Card, CardTitle } from '../components/ui/Card';
import { StatCard } from '../components/ui/Extras';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';
import { NotificationBell } from '../components/NotificationBell';
import { formatMoney } from '../utils/number';
import { formatLongDate, relativeTime } from '../utils/date';
import { clientDisplayName } from '../features/clients/format';
import { projectTitle } from '../features/projects/actions';

function greeting(): string {
  const h = new Date().getHours();
  return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour';
}

export function DashboardPage() {
  const { projects, quotes, clients, settings, activity, user } = useAppState();
  const navigate = useNavigate();
  const stats = useMemo(() => computeStats(projects, quotes), [projects, quotes]);
  const alerts = useMemo(() => computeNotifications(projects, quotes, clients), [projects, quotes, clients]);
  const recent = useMemo(() => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4), [projects]);
  const recentActivity = useMemo(() => [...activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [activity]);
  const firstName = settings.owner.firstName || user?.firstName || '';

  // Brouillon de devis à reprendre : chantier récent dont le devis n'est pas encore créé
  const draft = useMemo(() => {
    const candidates = projects
      .map((p) => ({ p, q: quotes.find((q) => q.id === p.quoteId) }))
      .filter(({ p, q }) => q && !q.number && !p.work)
      .sort((a, b) => b.p.updatedAt.localeCompare(a.p.updatedAt));
    return candidates[0];
  }, [projects, quotes]);

  // Premiers pas (time to value) : masqué une fois le premier devis signé
  const steps = [
    { label: 'Créer votre espace', done: settings.onboardingDone, to: '/company' },
    { label: 'Premier client', done: clients.length > 0, to: '/clients/new' },
    { label: 'Premier chantier', done: projects.length > 0, to: '/quotes/new' },
    { label: 'Premier devis', done: quotes.some((q) => q.number), to: '/quotes/new' },
    { label: 'Premier envoi au client', done: quotes.some((q) => q.sentAt), to: '/quotes' },
    { label: 'Premier devis signé', done: quotes.some((q) => q.status === 'signed'), to: '/quotes' },
  ];
  const showSteps = !steps[steps.length - 1]!.done;

  const quick = [
    { label: 'Nouveau devis', icon: FileText, to: '/quotes/new', primary: true },
    { label: 'Nouveau client', icon: UserPlus, to: '/clients/new' },
    { label: 'Nouveau chantier', icon: ClipboardList, to: '/projects/new' },
    { label: 'Ajouter une photo', icon: Camera, to: recent[0] ? `/projects/${recent[0].id}/photos` : '/quotes/new' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{formatLongDate(new Date())}</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {greeting()}
            {firstName ? ` ${firstName}` : ''} 👋
          </h1>
          {settings.company.name && <p className="text-muted">{settings.company.name}</p>}
        </div>
        <NotificationBell className="lg:hidden" />
      </header>

      <ButtonLink to="/quotes/new" size="lg" block icon={<Plus className="h-6 w-6" />}>
        Nouveau devis
      </ButtonLink>

      <section aria-label="Actions rapides" className="grid grid-cols-3 gap-2 lg:gap-3">
        {quick.slice(1).map(({ label, icon: Icon, to }) => (
          <Link key={label} to={to} className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface p-2 text-center text-sm font-semibold text-ink shadow-card hover:border-brand/40">
            <Icon className="h-5 w-5 text-brand" aria-hidden />
            {label}
          </Link>
        ))}
      </section>

      {draft && (
        <Card className="border-brand/40 bg-brand-soft/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand">Brouillon sauvegardé</p>
              <p className="truncate font-medium text-ink">
                {clientDisplayName(clients.find((c) => c.id === draft.p.clientId))} · {projectTitle(draft.p)}
              </p>
            </div>
            <ButtonLink to={`/projects/${draft.p.id}/${draft.q && draft.q.lines.length ? 'services' : 'photos'}`} size="sm">
              Reprendre
            </ButtonLink>
          </div>
        </Card>
      )}

      <section aria-label="Votre activité">
        <h2 className="mb-3 text-lg font-semibold">Votre activité</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Devis ce mois" value={stats.monthCount} hint={formatMoney(stats.monthAmount, true)} />
          <StatCard label="Devis acceptés" value={stats.acceptedCount} hint={stats.conversionRate === null ? 'Aucun devis envoyé' : `${stats.conversionRate} % de transformation`} />
          <StatCard label="Montant des devis" value={formatMoney(stats.quotedAmount, true)} hint={`${stats.quoteCount} devis au total`} />
          <StatCard label="Chantiers en cours" value={stats.inProgressCount} hint={`${formatMoney(stats.collectedAmount, true)} encaissés`} />
        </div>
      </section>

      {showSteps && (
        <Card>
          <CardTitle>Premiers pas</CardTitle>
          <ol className="space-y-1">
            {steps.map((s) => (
              <li key={s.label}>
                <button type="button" onClick={() => !s.done && navigate(s.to)} disabled={s.done} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-2 disabled:hover:bg-transparent">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.done ? 'bg-brand text-on-brand' : 'border-2 border-line'}`}>
                    {s.done && <Check className="h-4 w-4" aria-hidden />}
                  </span>
                  <span className={s.done ? 'text-muted line-through' : 'font-medium text-ink'}>{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {alerts.length > 0 && (
        <Card>
          <CardTitle icon={<Bell className="h-5 w-5" />}>À suivre</CardTitle>
          <ul className="space-y-1">
            {alerts.slice(0, 5).map((n) => (
              <li key={n.id}>
                <Link to={`/projects/${n.projectId}`} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-ink hover:bg-surface-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden />
                  {n.message}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
            title="Aucun chantier"
            action={
              <ButtonLink to="/quotes/new" icon={<Plus className="h-5 w-5" />}>
                Créer mon premier chantier
              </ButtonLink>
            }
          >
            Votre premier chantier peut être créé en quelques secondes, directement chez votre client.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {recent.map((p) => (
              <ProjectCard key={p.id} project={p} quote={quotes.find((q) => q.id === p.quoteId)} client={clients.find((c) => c.id === p.clientId)} />
            ))}
          </div>
        )}
      </section>

      {recentActivity.length > 0 && (
        <Card>
          <CardTitle icon={<History className="h-5 w-5" />}>Activité récente</CardTitle>
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
