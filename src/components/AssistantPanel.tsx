import { useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import type { CatalogItem, Project } from '../types';
import { getAIProvider, CONFIDENCE_LABEL, type ProjectEstimate, type ServiceSuggestion } from '../services/ai';
import { buildProjectContext } from '../features/ai/context';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Alert } from './ui/Feedback';
import { useAppState } from '../lib/store';

const confidenceTone = { high: 'bg-success-soft text-success', medium: 'bg-info-soft text-info', low: 'bg-warning-soft text-warning' };

/**
 * « Analyser le chantier » : l'assistant propose, le professionnel valide chaque élément.
 */
export function AssistantPanel({
  project,
  photoCount,
  existingCatalogIds,
  onAdd,
}: {
  project: Project;
  photoCount: number;
  existingCatalogIds: string[];
  onAdd: (items: CatalogItem[]) => void;
}) {
  const { settings, catalog } = useAppState();
  const provider = getAIProvider(settings.aiMode);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ServiceSuggestion[] | null>(null);
  const [estimate, setEstimate] = useState<ProjectEstimate | null>(null);
  const [checked, setChecked] = useState<string[]>([]);

  const analyze = async () => {
    setLoading(true);
    try {
      const ctx = buildProjectContext(project, photoCount, catalog);
      const [s, e] = await Promise.all([provider.suggestServices(ctx), provider.estimateProject(ctx)]);
      const fresh = s.filter((x) => !x.catalogItemId || !existingCatalogIds.includes(x.catalogItemId));
      setSuggestions(fresh);
      setEstimate(e);
      setChecked([]);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const addable = suggestions?.filter((s) => s.catalogItemId && checked.includes(s.id)) ?? [];

  return (
    <Card className="border-brand/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-brand" aria-hidden /> Analyser le chantier
          </h2>
          <p className="text-sm text-muted">{provider.label}</p>
        </div>
        <Button variant="soft" onClick={analyze} disabled={loading} icon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}>
          {suggestions ? 'Relancer' : 'Estimer le chantier'}
        </Button>
      </div>

      {provider.simulated && (
        <div className="mt-3">
          <Alert tone="warning" title="Mode simulation / démonstration">
            Les réponses de ce mode sont fictives et servent uniquement à découvrir l’interface. Ce n’est pas une analyse réelle.
          </Alert>
        </div>
      )}

      {estimate && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {estimate.known.length > 0 && (
            <div className="rounded-xl bg-surface-2 p-3 text-sm">
              <div className="mb-1 font-semibold">Données prises en compte</div>
              <ul className="list-inside list-disc text-muted">
                {estimate.known.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
          )}
          {estimate.missing.length > 0 && (
            <div className="rounded-xl bg-warning-soft p-3 text-sm text-warning">
              <div className="mb-1 font-semibold">Information manquante</div>
              <ul className="list-inside list-disc">
                {estimate.missing.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
          )}
          {estimate.warning && (
            <p className="text-sm font-medium text-warning sm:col-span-2">⚠️ {estimate.warning}</p>
          )}
        </div>
      )}

      {suggestions && (
        <div className="mt-4">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted">
              Aucune nouvelle prestation à proposer. Précisez le type de projet ou les notes de visite, ou ajoutez des prestations depuis le catalogue.
            </p>
          ) : (
            <>
              <p className="mb-2 text-sm font-medium">Prestations possibles — cochez celles à ajouter :</p>
              <ul className="space-y-2">
                {suggestions.map((s) => {
                  const on = checked.includes(s.id);
                  const disabled = !s.catalogItemId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        role="checkbox"
                        aria-checked={on}
                        aria-label={`${s.label} — confiance ${CONFIDENCE_LABEL[s.confidence].toLowerCase()}. ${s.reason}`}
                        onClick={() => setChecked((c) => (on ? c.filter((x) => x !== s.id) : [...c, s.id]))}
                        className={`flex w-full gap-3 rounded-xl border p-3 text-left ${on ? 'border-brand bg-brand-soft' : 'border-line'} disabled:opacity-60`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-brand bg-brand text-on-brand' : 'border-line'}`}
                          aria-hidden
                        >
                          {on && <Check className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-ink">{s.label}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${confidenceTone[s.confidence]}`}>
                              Confiance : {CONFIDENCE_LABEL[s.confidence]}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">Pourquoi ? {s.reason}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Button
                className="mt-3"
                block
                disabled={addable.length === 0}
                onClick={() => {
                  onAdd(addable.map((a) => catalog.find((c) => c.id === a.catalogItemId)).filter((c): c is CatalogItem => !!c));
                  setSuggestions((prev) => prev?.filter((s) => !checked.includes(s.id)) ?? null);
                  setChecked([]);
                }}
              >
                Ajouter la sélection ({addable.length})
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
