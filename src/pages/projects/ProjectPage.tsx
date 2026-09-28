import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowRight, Check, Mail, MapPin, Pencil, Phone, Sparkles, Trash2 } from 'lucide-react';
import { useProjectData } from '../../hooks/useData';
import { PageHeader, StickyActions } from '../../components/ui/PageHeader';
import { Badge, Card, CardTitle } from '../../components/ui/Card';
import { ButtonLink, Button, IconButton } from '../../components/ui/Button';
import { Chip, TextArea, TextField } from '../../components/ui/Form';
import { PrivateNotes } from '../../components/PrivateNotes';
import { ConfirmDialog, Dialog, useToast } from '../../components/ui/Feedback';
import { NotFoundPage } from '../NotFoundPage';
import { clientAddress, clientDisplayName } from '../../features/clients/format';
import { deleteProject, projectTitle, updateProject } from '../../features/projects/actions';
import { CATEGORIES, getProjectStatus, PROJECT_STATUS } from '../../features/projects/status';
import { nextStep, projectTimeline } from '../../features/projects/timeline';
import { formatMoney } from '../../utils/number';
import type { ProjectCategory } from '../../types';

export function ProjectPage() {
  const { id } = useParams();
  const { project, quote, client, photos, totals } = useProjectData(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!project) return <NotFoundPage message="Ce chantier n’existe pas ou a été supprimé." />;

  const status = PROJECT_STATUS[getProjectStatus(project, quote)];
  const steps = projectTimeline(project, quote, photos.length);
  const next = nextStep(steps);
  const stepHref = (path: string) => (path === 'client' ? `/clients/${project.clientId}` : `/projects/${project.id}/${path}`);

  return (
    <div className="space-y-5">
      <PageHeader
        back="/projects"
        title={clientDisplayName(client)}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {projectTitle(project)} <Badge tone={status.tone}>{status.label}</Badge>
          </span>
        }
        actions={
          <IconButton label="Modifier le chantier" onClick={() => setEditing(true)}>
            <Pencil className="h-5 w-5" />
          </IconButton>
        }
      />

      {client && (
        <Card className="flex flex-wrap gap-2">
          {client.phone && (
            <a href={`tel:${client.phone.replace(/\s/g, '')}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-soft px-3.5 font-medium text-brand">
              <Phone className="h-4 w-4" aria-hidden /> Appeler
            </a>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-soft px-3.5 font-medium text-brand">
              <Mail className="h-4 w-4" aria-hidden /> E-mail
            </a>
          )}
          {(project.siteAddress || clientAddress(client)) && (
            <span className="inline-flex min-h-11 items-center gap-2 px-1 text-sm text-muted">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden /> {project.siteAddress || clientAddress(client)}
            </span>
          )}
        </Card>
      )}

      {totals && quote && quote.lines.length > 0 && (
        <Link to={`/projects/${project.id}/services`} className="block">
          <Card className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-muted">Coût estimé</div>
              <div className="font-semibold tabular-nums">{formatMoney(totals.costTotal, true)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Marge</div>
              <div className="font-semibold tabular-nums">{formatMoney(totals.marginAmount, true)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Total TTC</div>
              <div className="font-bold tabular-nums text-brand">{formatMoney(totals.totalTTC, true)}</div>
            </div>
          </Card>
        </Link>
      )}

      <PrivateNotes projectId={project.id} value={project.privateNotes} />

      <Card>
        <CardTitle>Avancement</CardTitle>
        <ol className="relative">
          {steps.map((s, i) => {
            const isNext = s.key === next?.key;
            return (
              <li key={s.key} className="relative flex gap-3 pb-1">
                {i < steps.length - 1 && (
                  <span className={`absolute left-[15px] top-9 h-[calc(100%-1.75rem)] w-0.5 ${s.done ? 'bg-brand' : 'bg-line'}`} aria-hidden />
                )}
                <span
                  className={`relative z-10 mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    s.done ? 'bg-brand text-on-brand' : isNext ? 'border-2 border-brand bg-surface text-brand' : 'border-2 border-line bg-surface text-muted'
                  }`}
                >
                  {s.done ? <Check className="h-4 w-4" aria-label="terminé" /> : i + 1}
                </span>
                <Link
                  to={stepHref(s.path)}
                  className={`flex min-h-11 flex-1 items-center justify-between rounded-xl px-3 ${isNext ? 'bg-brand-soft font-semibold text-brand' : 'text-ink hover:bg-surface-2'}`}
                >
                  {s.label}
                  {isNext && <span className="text-xs font-semibold uppercase tracking-wide">À faire</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <ButtonLink to={`/projects/${project.id}/visualize`} variant="secondary" icon={<Sparkles className="h-5 w-5" />}>
          Visualiser le projet
        </ButtonLink>
        <Button variant="danger" icon={<Trash2 className="h-5 w-5" />} onClick={() => setConfirmDelete(true)}>
          Supprimer le chantier
        </Button>
      </div>

      {next && (
        <StickyActions>
          <ButtonLink to={stepHref(next.path)} block size="lg" icon={<ArrowRight className="h-5 w-5" />}>
            Continuer : {next.label}
          </ButtonLink>
        </StickyActions>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce chantier ?"
        message={<p>Le chantier, son devis et ses photos seront définitivement supprimés de cet appareil.</p>}
        confirmLabel="Supprimer"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteProject(project.id);
          toast('Chantier supprimé.');
          navigate('/projects', { replace: true });
        }}
      />
      {editing && <EditProjectDialog projectId={project.id} onClose={() => setEditing(false)} />}
    </div>
  );
}

function EditProjectDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { project } = useProjectData(projectId);
  const [title, setTitle] = useState(project?.title ?? '');
  const [categories, setCategories] = useState<ProjectCategory[]>(project?.categories ?? []);
  const [description, setDescription] = useState(project?.description ?? '');
  const [siteAddress, setSiteAddress] = useState(project?.siteAddress ?? '');
  if (!project) return null;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Modifier le chantier"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={categories.length === 0}
            onClick={() => {
              updateProject(projectId, { title: title.trim(), categories, description: description.trim(), siteAddress: siteAddress.trim() });
              onClose();
            }}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Nom du projet" value={title} onChange={setTitle} />
        <div>
          <p className="mb-2 text-sm font-medium">Type de projet</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.value}
                selected={categories.includes(c.value)}
                onClick={() => setCategories((p) => (p.includes(c.value) ? p.filter((x) => x !== c.value) : [...p, c.value]))}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </div>
        <TextArea label="Notes de visite" value={description} onChange={setDescription} rows={3} />
        <TextField label="Adresse du chantier" value={siteAddress} onChange={setSiteAddress} />
      </div>
    </Dialog>
  );
}
