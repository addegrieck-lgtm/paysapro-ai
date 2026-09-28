import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, Check, Search, UserPlus, Users } from 'lucide-react';
import { useAppState } from '../../lib/store';
import { PageHeader, StickyActions } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip, Segmented, TextArea, TextField } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Feedback';
import { ClientFields, isClientValid } from '../../components/ClientFields';
import { createClient, emptyClient, type ClientInput } from '../../features/clients/actions';
import { clientAddress, clientDisplayName } from '../../features/clients/format';
import { createProject } from '../../features/projects/actions';
import { CATEGORIES } from '../../features/projects/status';
import { normalize } from '../../services/ai/LocalAIProvider';
import type { ProjectCategory } from '../../types';

export function NewProjectPage() {
  const { clients } = useAppState();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselected = params.get('client');

  const [step, setStep] = useState<1 | 2>(preselected ? 2 : 1);
  const [mode, setMode] = useState<'new' | 'existing'>(preselected ? 'existing' : 'new');
  const [clientInput, setClientInput] = useState<ClientInput>(emptyClient());
  const [clientId, setClientId] = useState<string | null>(preselected);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [siteAddress, setSiteAddress] = useState('');

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return [...clients]
      .sort((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b)))
      .filter((c) => !q || normalize(`${clientDisplayName(c)} ${c.city} ${c.phone}`).includes(q));
  }, [clients, search]);

  const selectedClient = clients.find((c) => c.id === clientId);

  const nextFromClient = () => {
    if (mode === 'existing') {
      if (!clientId) return setError('Veuillez choisir un client.');
    } else {
      const problem = isClientValid(clientInput);
      if (problem) return setError(problem);
    }
    setError(null);
    setStep(2);
  };

  const create = () => {
    if (categories.length === 0) return setError('Choisissez au moins un type de projet.');
    let id = clientId;
    if (mode === 'new') id = createClient(clientInput).id;
    if (!id) return;
    const project = createProject({ clientId: id, title: title.trim(), categories, description: description.trim(), siteAddress: siteAddress.trim() });
    navigate(`/projects/${project.id}/photos`, { replace: true });
  };

  const toggle = (c: ProjectCategory) => setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <div>
      <PageHeader title="Nouveau chantier" subtitle={`Étape ${step} sur 2 · ${step === 1 ? 'Client' : 'Type de projet'}`} back={step === 1 ? '/' : undefined} />
      <div className="mb-5 grid grid-cols-2 gap-2" aria-hidden>
        <div className="h-1.5 rounded-full bg-brand" />
        <div className={`h-1.5 rounded-full ${step === 2 ? 'bg-brand' : 'bg-line'}`} />
      </div>

      {step === 1 && (
        <div className="space-y-4">
          {clients.length > 0 && (
            <Segmented
              label="Type de client"
              value={mode}
              onChange={(v) => {
                setMode(v);
                setError(null);
              }}
              options={[
                { value: 'new', label: 'Nouveau client' },
                { value: 'existing', label: 'Client existant' },
              ]}
            />
          )}
          {mode === 'new' ? (
            <Card>
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <UserPlus className="h-5 w-5 text-brand" aria-hidden /> Client
              </h2>
              <ClientFields value={clientInput} onChange={setClientInput} />
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
                      aria-selected={clientId === c.id}
                      onClick={() => setClientId(c.id)}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left ${
                        clientId === c.id ? 'bg-brand-soft' : 'hover:bg-surface-2'
                      }`}
                    >
                      <Users className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{clientDisplayName(c)}</span>
                        <span className="block truncate text-sm text-muted">{clientAddress(c) || c.phone}</span>
                      </span>
                      {clientId === c.id && <Check className="h-5 w-5 text-brand" aria-hidden />}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && <li className="p-3 text-muted">Aucun client trouvé.</li>}
              </ul>
            </Card>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
          <StickyActions>
            <Button block size="lg" onClick={nextFromClient} icon={<ArrowRight className="h-5 w-5" />}>
              Continuer
            </Button>
          </StickyActions>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <h2 className="mb-1 font-semibold">Type de projet</h2>
            <p className="mb-4 text-sm text-muted">Plusieurs choix possibles.</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c.value} selected={categories.includes(c.value)} onClick={() => toggle(c.value)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </Card>
          <Card>
            <div className="space-y-4">
              <TextField label="Nom du projet (facultatif)" value={title} onChange={setTitle} placeholder="Ex. Jardin arrière, création de pelouse" />
              <TextArea
                label="Notes de visite (facultatif)"
                value={description}
                onChange={setDescription}
                rows={3}
                placeholder="Ce que souhaite le client, contraintes d’accès, nature du sol…"
              />
              <TextField
                label="Adresse du chantier"
                value={siteAddress}
                onChange={setSiteAddress}
                hint={
                  mode === 'existing' && selectedClient
                    ? `Laisser vide si identique à l’adresse du client (${clientAddress(selectedClient) || 'non renseignée'}).`
                    : 'Laisser vide si identique à l’adresse du client.'
                }
              />
            </div>
          </Card>
          {error && <Alert tone="danger">{error}</Alert>}
          <StickyActions>
            {!preselected && (
              <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
                Retour
              </Button>
            )}
            <Button block size="lg" onClick={create} icon={<Check className="h-5 w-5" />}>
              Créer le chantier
            </Button>
          </StickyActions>
        </div>
      )}
    </div>
  );
}
