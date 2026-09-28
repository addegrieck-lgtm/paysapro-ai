import { useMemo } from 'react';
import { Link } from 'react-router';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { useAppState } from '../lib/store';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge, Card, CardTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/Feedback';
import { ButtonLink } from '../components/ui/Button';
import { clientDisplayName } from '../features/clients/format';
import { projectTitle } from '../features/projects/actions';
import { workStageLabel } from '../features/projects/status';
import { daysBetween, formatLongDate, fromInputDate } from '../utils/date';
import type { Project } from '../types';

export function PlanningPage() {
  const { projects, quotes, clients } = useAppState();

  const groups = useMemo(() => {
    const now = new Date();
    const inProgress: Project[] = [];
    const upcoming: { p: Project; date: Date }[] = [];
    const toSchedule: Project[] = [];
    const done: Project[] = [];
    for (const p of projects) {
      const q = quotes.find((x) => x.id === p.quoteId);
      if (!p.work) {
        if (q?.status === 'signed' || q?.status === 'accepted') toSchedule.push(p);
        continue;
      }
      if (p.work.stage === 'done' || p.work.stage === 'archived') {
        done.push(p);
        continue;
      }
      if (p.work.stage === 'in_progress') {
        inProgress.push(p);
        continue;
      }
      const d = fromInputDate(p.work.startDate);
      if (d && daysBetween(now, d) >= 0) upcoming.push({ p, date: d });
      else toSchedule.push(p);
    }
    upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
    return { inProgress, upcoming, toSchedule, done: done.slice(0, 5) };
  }, [projects, quotes]);

  const Row = ({ p, extra }: { p: Project; extra?: string }) => (
    <li>
      <Link to={`/projects/${p.id}/work`} className="flex min-h-14 items-center gap-3 rounded-xl px-2 hover:bg-surface-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{clientDisplayName(clients.find((c) => c.id === p.clientId))}</div>
          <div className="truncate text-sm text-muted">
            {projectTitle(p)}
            {extra && ` · ${extra}`}
          </div>
        </div>
        {p.work && <Badge tone={p.work.stage === 'in_progress' ? 'warning' : 'neutral'}>{workStageLabel(p.work.stage)}</Badge>}
        <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
      </Link>
    </li>
  );

  const empty = !groups.inProgress.length && !groups.upcoming.length && !groups.toSchedule.length && !groups.done.length;

  return (
    <div className="space-y-5">
      <PageHeader title="Planning" subtitle="Vos chantiers en cours et à venir." />
      {empty ? (
        <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="Aucun chantier planifié" action={<ButtonLink to="/quotes">Voir mes devis</ButtonLink>}>
          Dès qu’un devis est signé, transformez-le en chantier : il apparaîtra ici avec ses dates.
        </EmptyState>
      ) : (
        <>
          {groups.inProgress.length > 0 && (
            <Card>
              <CardTitle>En cours</CardTitle>
              <ul>{groups.inProgress.map((p) => <Row key={p.id} p={p} />)}</ul>
            </Card>
          )}
          {groups.upcoming.length > 0 && (
            <Card>
              <CardTitle>À venir</CardTitle>
              <ul>
                {groups.upcoming.map(({ p, date }) => (
                  <Row key={p.id} p={p} extra={`début le ${formatLongDate(date)}`} />
                ))}
              </ul>
            </Card>
          )}
          {groups.toSchedule.length > 0 && (
            <Card>
              <CardTitle>À planifier</CardTitle>
              <p className="mb-2 text-sm text-muted">Devis signés ou chantiers sans date de début.</p>
              <ul>{groups.toSchedule.map((p) => <Row key={p.id} p={p} />)}</ul>
            </Card>
          )}
          {groups.done.length > 0 && (
            <Card>
              <CardTitle>Terminés récemment</CardTitle>
              <ul>{groups.done.map((p) => <Row key={p.id} p={p} />)}</ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
