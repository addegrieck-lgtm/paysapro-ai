import { useState } from 'react';
import { useParams } from 'react-router';
import { Camera, Check, Hammer, ListChecks, MessageSquare, Plus, Trash2, Wallet } from 'lucide-react';
import { useProjectData } from '../../hooks/useData';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button, ButtonLink, IconButton } from '../../components/ui/Button';
import { Chip, TextArea, TextField } from '../../components/ui/Form';
import { Alert, EmptyState } from '../../components/ui/Feedback';
import { PhotoThumb } from '../../components/PhotoThumb';
import { PaymentDialog } from '../../components/PaymentDialog';
import { BeforeAfterSlider } from '../../components/BeforeAfter';
import { FollowUpDialog } from '../../components/FollowUpDialog';
import { NotFoundPage } from '../NotFoundPage';
import { startWork, updateWork } from '../../features/projects/actions';
import { removePayment } from '../../features/quotes/actions';
import { WORK_STAGES } from '../../features/projects/status';
import { clientDisplayName } from '../../features/clients/format';
import { paymentMethodLabel } from '../../services/payments/PaymentProvider';
import { formatMoney } from '../../utils/number';
import { formatDate } from '../../utils/date';
import { uid } from '../../utils/id';
import type { PhotoMeta, PhotoTag } from '../../types';

export function WorkPage() {
  const { id } = useParams();
  const { project, quote, client, photos, totals, settings } = useProjectData(id);
  const [newItem, setNewItem] = useState('');
  const [payment, setPayment] = useState<'deposit' | 'balance' | null>(null);
  const [message, setMessage] = useState(false);

  if (!project) return <NotFoundPage />;
  const work = project.work;
  const canStart = quote?.status === 'signed' || quote?.status === 'accepted';

  if (!work) {
    return (
      <div className="space-y-5">
        <PageHeader back={`/projects/${project.id}`} title="Suivi du chantier" subtitle={clientDisplayName(client)} />
        <EmptyState
          icon={<Hammer className="h-7 w-7" />}
          title="Chantier pas encore lancé"
          action={
            canStart ? (
              <Button onClick={() => startWork(project.id)} icon={<Hammer className="h-5 w-5" />}>
                Transformer en chantier
              </Button>
            ) : (
              <ButtonLink to={`/projects/${project.id}/quote`}>Voir le devis</ButtonLink>
            )
          }
        >
          {canStart ? 'Le devis est accepté : lancez le suivi des travaux.' : 'Le suivi démarre une fois le devis accepté ou signé.'}
        </EmptyState>
      </div>
    );
  }

  const done = work.checklist.filter((c) => c.done).length;
  const deposit = quote?.payments.find((p) => p.kind === 'deposit');

  return (
    <div className="space-y-5">
      <PageHeader back={`/projects/${project.id}`} title="Suivi du chantier" subtitle={clientDisplayName(client)} />

      <Card>
        <CardTitle>Étape</CardTitle>
        <div className="flex flex-wrap gap-2">
          {WORK_STAGES.map((s) => (
            <Chip key={s.value} selected={work.stage === s.value} onClick={() => updateWork(project.id, { stage: s.value })}>
              {s.label}
            </Chip>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <TextField label="Début" type="date" value={work.startDate ?? ''} onChange={(v) => updateWork(project.id, { startDate: v || null })} />
          <TextField label="Fin prévue" type="date" value={work.endDate ?? ''} onChange={(v) => updateWork(project.id, { endDate: v || null })} />
        </div>
        <Button className="mt-3" variant="ghost" size="sm" icon={<MessageSquare className="h-4 w-4" />} onClick={() => setMessage(true)}>
          Prévenir le client
        </Button>
      </Card>

      <Card>
        <CardTitle icon={<ListChecks className="h-5 w-5" />} action={<span className="text-sm text-muted">{done}/{work.checklist.length}</span>}>
          Checklist
        </CardTitle>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={work.checklist.length} aria-label="Progression de la checklist">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${work.checklist.length ? (done / work.checklist.length) * 100 : 0}%` }} />
        </div>
        <ul className="space-y-1">
          {work.checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={item.done}
                onClick={() => updateWork(project.id, { checklist: work.checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)) })}
                className="flex min-h-12 flex-1 items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-2"
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${item.done ? 'border-brand bg-brand text-on-brand' : 'border-line'}`} aria-hidden>
                  {item.done && <Check className="h-4 w-4" />}
                </span>
                <span className={item.done ? 'text-muted line-through' : 'text-ink'}>{item.label}</span>
              </button>
              <IconButton label={`Retirer ${item.label}`} onClick={() => updateWork(project.id, { checklist: work.checklist.filter((c) => c.id !== item.id) })}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newItem.trim()) return;
            updateWork(project.id, { checklist: [...work.checklist, { id: uid(), label: newItem.trim(), done: false }] });
            setNewItem('');
          }}
        >
          <TextField label="Ajouter une tâche" value={newItem} onChange={setNewItem} className="flex-1" />
          <Button type="submit" variant="soft" aria-label="Ajouter la tâche" icon={<Plus className="h-5 w-5" />} />
        </form>
      </Card>

      {quote && totals && (
        <Card>
          <CardTitle icon={<Wallet className="h-5 w-5" />}>Paiements</CardTitle>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Total TTC</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(totals.totalTTC)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Acompte demandé</dt>
              <dd className="tabular-nums">
                {formatMoney(totals.depositAmount)} · <span className={deposit ? 'text-success' : 'text-warning'}>{deposit ? 'Reçu' : 'En attente'}</span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Déjà encaissé</dt>
              <dd className="tabular-nums">{formatMoney(totals.paidAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-semibold">Reste à encaisser</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(totals.remainingAmount)}</dd>
            </div>
          </dl>
          {quote.payments.length > 0 && (
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
              {quote.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span>
                    {p.kind === 'deposit' ? 'Acompte' : 'Paiement'} · {paymentMethodLabel(p.method)} · {formatDate(p.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <strong className="tabular-nums">{formatMoney(p.amount)}</strong>
                    <IconButton label="Supprimer ce paiement" onClick={() => removePayment(quote.id, p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {!deposit && totals.depositAmount > 0 && (
              <Button variant="soft" onClick={() => setPayment('deposit')}>
                Acompte reçu
              </Button>
            )}
            {totals.remainingAmount > 0 && (
              <Button variant="secondary" onClick={() => setPayment('balance')}>
                Enregistrer un paiement
              </Button>
            )}
          </div>
        </Card>
      )}

      <BeforeAfter projectId={project.id} photos={photos} />

      <TextArea label="Notes de chantier" value={work.notes} onChange={(v) => updateWork(project.id, { notes: v })} rows={4} />

      {work.stage === 'done' && <Alert tone="success">Chantier terminé. Pensez aux photos finales et à la réception avec le client.</Alert>}

      {payment && quote && totals && (
        <PaymentDialog
          quoteId={quote.id}
          kind={payment}
          suggestedAmount={payment === 'deposit' ? totals.depositAmount : totals.remainingAmount}
          onClose={() => setPayment(null)}
        />
      )}
      {message && totals && (
        <FollowUpDialog
          open
          onClose={() => setMessage(false)}
          client={client}
          company={settings.company}
          quoteNumber={quote?.number ?? null}
          total={formatMoney(totals.totalTTC)}
          initialTemplate="start"
        />
      )}
    </div>
  );
}

/** Galerie avant / pendant / après. */
function BeforeAfter({ projectId, photos }: { projectId: string; photos: PhotoMeta[] }) {
  const cols: { title: string; tags: PhotoTag[] }[] = [
    { title: 'Avant', tags: ['before', 'overview', 'zone', 'detail'] },
    { title: 'Pendant', tags: ['during'] },
    { title: 'Après', tags: ['after'] },
  ];
  const first = photos.find((p) => cols[0]!.tags.includes(p.tag));
  const last = [...photos].reverse().find((p) => p.tag === 'after');
  const beforeAfter = first && last ? { before: first.id, after: last.id } : null;
  return (
    <Card>
      <CardTitle
        icon={<Camera className="h-5 w-5" />}
        action={
          <ButtonLink to={`/projects/${projectId}/photos`} variant="ghost" size="sm">
            Ajouter
          </ButtonLink>
        }
      >
        Avant / après
      </CardTitle>
      {beforeAfter && (
        <div className="mb-4">
          <BeforeAfterSlider beforeId={beforeAfter.before} afterId={beforeAfter.after} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {cols.map((c) => {
          const list = photos.filter((p) => c.tags.includes(p.tag));
          return (
            <div key={c.title}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">{c.title}</h3>
              {list.length === 0 ? (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">Aucune photo</div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1">
                  {list.slice(0, 4).map((p) => (
                    <PhotoThumb key={p.id} photoId={p.id} alt={p.caption || c.title} className="aspect-[4/3] w-full rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
