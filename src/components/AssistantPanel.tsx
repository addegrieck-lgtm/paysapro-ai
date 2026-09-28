import { useState } from 'react';
import { Check, Loader2, Plus, Sparkles, X } from 'lucide-react';
import type { CatalogItem, Project } from '../types';
import { getAIProvider, CONFIDENCE_LABEL, type ProjectEstimate, type ServiceSuggestion } from '../services/ai';
import { analytics } from '../services/analytics/AnalyticsProvider';
import { buildProjectContext } from '../features/ai/context';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Alert } from './ui/Feedback';
import { useAppState } from '../lib/store';

const confidenceTone = { high: 'bg-success-soft text-success', medium: 'bg-info-soft text-info', low: 'bg-warning-soft text-warning' };

/**
 * « ✨ Analyser le chantier » : l'assistant propose, le professionnel valide chaque élément
 * (« Ajouter au devis » ou « Ignorer »). Aucune suggestion n'est ajoutée sans action de sa part.
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

  const analyze = async () => {
    setLoading(true);
    try {
      const ctx = buildProjectContext(project, photoCount, catalog);
      const [s, e] = await Promise.all([provider.suggestServices(ctx), provider.estimateProject(ctx)]);
      setSuggestions(s.filter((x) => !x.catalogItemId || !existingCatalogIds.includes(x.catalogItemId)));
      setEstimate(e);
      analytics.track('ai_used', { feature: 'suggestions', mode: provider.id });
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const remove = (id: string) => setSuggestions((prev) => prev?.filter((s) => s.id !== id) ?? null);
  const addOne = (s: ServiceSuggestion) => {
    const item = catalog.find((c) => c.id === s.catalogItemId);
    if (item) onAdd([item]);
    remove(s.id);
  };
  const addable = suggestions?.filter((s) => s.catalogItemId) ?? [];

  return (
    <Card className="border-brand/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-brand" aria-hidden /> Analyser le chantier
          </h2>
          <p className="text-sm text-muted">{provider.simulated ? 'Mode démonstration' : 'Suggestions automatiques (règles métier, hors-ligne)'}</p>
        </div>
        <Button variant="soft" onClick={analyze} disabled={loading} icon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}>
          {suggestions ? 'Relancer' : '✨ Analyser'}
        </Button>
      </div>

      {provider.simulated && (
        <div className="mt-3">
          <Alert tone="warning" title="Mode démonstration">
            Les réponses de ce mode sont fictives et servent uniquement à découvrir l’interface. Ce n’est pas une analyse réelle.
          </Alert>
        </div>
      )}

      {estimate && (estimate.known.length > 0 || estimate.missing.length > 0) && (
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
          {estimate.warning && <p className="text-sm font-medium text-warning sm:col-span-2">⚠️ {estimate.warning}</p>}
        </div>
      )}

      {suggestions && (
        <div className="mt-4">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted">Aucune nouvelle suggestion. Précisez le type de travaux ou la description, ou ajoutez des prestations depuis le catalogue.</p>
          ) : (
            <>
              <p className="mb-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">Suggestions générées automatiquement. Vérifiez avant d’ajouter au devis.</p>
              <ul className="space-y-2">
                {suggestions.map((s) => (
                  <li key={s.id} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{s.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${confidenceTone[s.confidence]}`}>Confiance : {CONFIDENCE_LABEL[s.confidence]}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">Pourquoi ? {s.reason}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" disabled={!s.catalogItemId} onClick={() => addOne(s)} icon={<Plus className="h-4 w-4" />}>
                        Ajouter au devis
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(s.id)} icon={<X className="h-4 w-4" />}>
                        Ignorer
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {addable.length > 1 && (
                <Button
                  className="mt-3"
                  variant="soft"
                  block
                  icon={<Check className="h-4 w-4" />}
                  onClick={() => {
                    onAdd(addable.map((a) => catalog.find((c) => c.id === a.catalogItemId)).filter((c): c is CatalogItem => !!c));
                    setSuggestions((prev) => prev?.filter((s) => !s.catalogItemId) ?? null);
                  }}
                >
                  Tout ajouter ({addable.length}) après vérification
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
