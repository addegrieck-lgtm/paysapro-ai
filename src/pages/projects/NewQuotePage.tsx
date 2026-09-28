import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, Check, LayoutTemplate, RotateCcw, Search, UserPlus, Users } from 'lucide-react';
import { useAppState } from '../../lib/store';
import { PageHeader, StickyActions } from '../../components/ui/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip, Segmented, TextArea, TextField } from '../../components/ui/Form';
import { Alert, useToast } from '../../components/ui/Feedback';
import { Avatar } from '../../components/ui/Extras';
import { ClientFields, isClientValid } from '../../components/ClientFields';
import { QuoteFlowBar } from '../../components/QuoteFlowBar';
import { createClient, emptyClient, type ClientInput } from '../../features/clients/actions';
import { clientAddress, clientDisplayName } from '../../features/clients/format';
import { createProject } from '../../features/projects/actions';
import { applyTemplate } from '../../features/quotes/actions';
import { CATEGORIES } from '../../features/projects/status';
import { normalize } from '../../services/ai/LocalAIProvider';
import type { ProjectCategory } from '../../types';

interface Draft {
  step: 1 | 2;
  mode: 'new' | 'existing';
  clientInput: ClientInput;
  clientId: string | null;
  categories: ProjectCategory[];
  title: string;
  description: string;
  siteAddress: string;
  templateId: string | null;
}

const DRAFT_KEY = 'paysapro-new-quote-draft';

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* stockage indisponible : le brouillon n'est simplement pas conservé */
  }
}

function emptyDraft(clientId: string | null): Draft {
  return {
    step: clientId ? 2 : 1,
    mode: clientId ? 'existing' : 'new',
    clientInput: emptyClient(),
    clientId,
    categories: [],
    title: '',
    description: '',
    siteAddress: '',
    templateId: null,
  };
}

function isMeaningful(d: Draft): boolean {
  const c = d.clientInput;
  return !!(c.lastName || c.firstName || c.companyName || c.phone || d.clientId || d.title || d.description || d.categories.length);
}

/**
 * Parcours « Nouveau devis » (mode quote) ou « Nouveau chantier » (mode project) :
 * 1. Client — 2. Chantier, puis photos, mesures, prix, aperçu, envoi.
 * Le brouillon est sauvegardé en continu : rien n'est perdu si l'application est fermée.
 */
export function NewQuotePage({ mode: flowMode }: { mode: 'quote' | 'project' }) {
  const { clients, templates } = useAppState();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const preselected = params.get('client');

  const [draft, setDraft] = useState<Draft>(() => {
    const saved = readDraft();
    if (saved && !preselected && isMeaningful(saved)) return saved;
    return emptyDraft(preselected);
  });
  const [restored] = useState(() => {
    const saved = readDraft();
    return !!saved && !preselected && isMeaningful(saved);
  });
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (restored) toast('Votre brouillon a été sauvegardé : vous reprenez là où vous en étiez.', 'info');
  }, [restored, toast]);

  useEffect(() => {
    writeDraft(isMeaningful(draft) ? draft : null);
  }, [draft]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return [...clients]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((c) => !q || normalize(`${clientDisplayName(c)} ${c.city} ${c.phone}`).includes(q));
  }, [clients, search]);

  const selectedClient = clients.find((c) => c.id === draft.clientId);
  const mode = clients.length === 0 ? 'new' : draft.mode;

  const nextFromClient = () => {
    if (mode === 'existing') {
      if (!draft.clientId) return setError('Choisissez un client, ou créez-en un nouveau.');
    } else {
      const problem = isClientValid(draft.clientInput);
      if (problem) return setError(problem);
    }
    setError(null);
    update({ step: 2 });
  };

  const create = () => {
    if (draft.categories.length === 0 && !draft.templateId) return setError('Choisissez un type de travaux ou un modèle.');
    let id = draft.clientId;
    if (mode === 'new') id = createClient(draft.clientInput).id;
    if (!id) return;
    const template = templates.find((t) => t.id === draft.templateId);
    const categories = draft.categories.length ? draft.categories : (template?.categories ?? []);
    const project = createProject({
      clientId: id,
      title: draft.title.trim() || template?.name || '',
      categories,
      description: draft.description.trim(),
      siteAddress: draft.siteAddress.trim(),
    });
    if (template && project.quoteId) {
      const missing = applyTemplate(project.quoteId, template);
      if (missing.length) toast(`Absent de votre catalogue : ${missing.join(', ')}.`, 'info');
    }
    writeDraft(null);
    toast(flowMode === 'quote' ? '✓ Chantier créé — ajoutez vos photos' : '✓ Chantier créé');
    navigate(flowMode === 'quote' ? `/projects/${project.id}/photos` : `/projects/${project.id}`, { replace: true });
  };

  const toggle = (c: ProjectCategory) => update({ categories: draft.categories.includes(c) ? draft.categories.filter((x) => x !== c) : [...draft.categories, c] });

  return (
    <div>
      <PageHeader
        title={flowMode === 'quote' ? 'Nouveau devis' : 'Nouveau chantier'}
        back={draft.step === 1 ? '/app' : undefined}
        actions={
          isMeaningful(draft) ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                writeDraft(null);
                setDraft(emptyDraft(null));
              }}
            >
              Recommencer
            </Button>
          ) : undefined
        }
      />
      {flowMode === 'quote' && <QuoteFlowBar current={draft.step === 1 ? 'client' : 'site'} />}

      {draft.step === 1 && (
        <div className="space-y-4">
          {clients.length > 0 && (
            <Segmented
              label="Client"
              value={mode}
              onChange={(v) => {
                update({ mode: v });
                setError(null);
              }}
              options={[
                { value: 'existing', label: 'Client existant' },
                { value: 'new', label: '+ Nouveau client' },
              ]}
            />
          )}
          {mode === 'new' ? (
            <Card>
              <CardTitle icon={<UserPlus className="h-5 w-5" />}>Nouveau client</CardTitle>
              <ClientFields value={draft.clientInput} onChange={(v) => update({ clientInput: v })} />
            </Card>
          ) : (
            <Card>
              <label className="relative mb-3 block">
                <span className="sr-only">Rechercher un client</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un client"
                  className="min-h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3"
                />
              </label>
              <ul className="max-h-80 space-y-1 overflow-y-auto" role="listbox" aria-label="Clients">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={draft.clientId === c.id}
                      onClick={() => update({ clientId: c.id })}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left ${draft.clientId === c.id ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}
                    >
                      <Avatar name={clientDisplayName(c)} className="h-9 w-9 text-sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{clientDisplayName(c)}</span>
                        <span className="block truncate text-sm text-muted">{clientAddress(c) || c.phone}</span>
                      </span>
                      {draft.clientId === c.id && <Check className="h-5 w-5 text-brand" aria-hidden />}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="flex items-center gap-2 p-3 text-muted">
                    <Users className="h-5 w-5" aria-hidden /> Aucun client trouvé.
                  </li>
                )}
              </ul>
            </Card>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
          <StickyActions>
            <Button block size="lg" onClick={nextFromClient} icon={<ArrowRight className="h-5 w-5" />}>
              Continuer : chantier
            </Button>
          </StickyActions>
        </div>
      )}

      {draft.step === 2 && (
        <div className="space-y-4">
          {(selectedClient || mode === 'new') && (
            <p className="text-sm text-muted">
              Client : <strong className="text-ink">{mode === 'new' ? clientDisplayName(draft.clientInput) : clientDisplayName(selectedClient)}</strong>
            </p>
          )}
          {flowMode === 'quote' && templates.length > 0 && (
            <Card>
              <CardTitle icon={<LayoutTemplate className="h-5 w-5" />}>Partir d’un modèle (facultatif)</CardTitle>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <Chip key={t.id} selected={draft.templateId === t.id} onClick={() => update({ templateId: draft.templateId === t.id ? null : t.id })}>
                    {t.name}
                  </Chip>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">Les prestations du modèle seront ajoutées au devis ; les quantités se calculent avec vos mesures.</p>
            </Card>
          )}
          <Card>
            <h2 className="mb-1 font-semibold">Type de travaux</h2>
            <p className="mb-4 text-sm text-muted">Plusieurs choix possibles.</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c.value} selected={draft.categories.includes(c.value)} onClick={() => toggle(c.value)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </Card>
          <Card>
            <div className="space-y-4">
              <TextField label="Nom du chantier" value={draft.title} onChange={(v) => update({ title: v })} placeholder="Ex. Jardin arrière, création de pelouse" />
              <TextField
                label="Adresse du chantier"
                value={draft.siteAddress}
                onChange={(v) => update({ siteAddress: v })}
                hint="Laisser vide si identique à l’adresse du client."
              />
              <TextArea
                label="Description / notes de visite"
                value={draft.description}
                onChange={(v) => update({ description: v })}
                rows={3}
                placeholder="Ce que souhaite le client, accès, nature du sol…"
              />
            </div>
          </Card>
          {error && <Alert tone="danger">{error}</Alert>}
          <StickyActions>
            {!preselected && (
              <Button variant="secondary" size="lg" onClick={() => update({ step: 1 })}>
                Retour
              </Button>
            )}
            <Button block size="lg" onClick={create} icon={<ArrowRight className="h-5 w-5" />}>
              {flowMode === 'quote' ? 'Continuer : photos' : 'Créer le chantier'}
            </Button>
          </StickyActions>
        </div>
      )}
    </div>
  );
}
