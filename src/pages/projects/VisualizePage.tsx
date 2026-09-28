import { useState } from 'react';
import { useParams } from 'react-router';
import { Check, ImageIcon, Loader2, ScanSearch, Sparkles, Wand2 } from 'lucide-react';
import { useProjectData } from '../../hooks/useData';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Chip, TextArea } from '../../components/ui/Form';
import { Alert, useToast } from '../../components/ui/Feedback';
import { PhotoThumb } from '../../components/PhotoThumb';
import { NotFoundPage } from '../NotFoundPage';
import { getAIProvider, CONFIDENCE_LABEL, type PhotoAnalysis } from '../../services/ai';
import { VISUALIZATION_ELEMENTS } from '../../services/ai/LocalAIProvider';
import { buildProjectContext } from '../../features/ai/context';
import { updateQuote } from '../../features/quotes/actions';
import { isQuoteLocked } from '../../features/projects/status';
import { clientDisplayName } from '../../features/clients/format';
import { storage } from '../../services/storage';
import { analytics } from '../../services/analytics/AnalyticsProvider';

export function VisualizePage() {
  const { id } = useParams();
  const { project, quote, client, photos, settings, catalog } = useProjectData(id);
  const toast = useToast();
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [elements, setElements] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);

  if (!project) return <NotFoundPage />;
  const provider = getAIProvider(settings.aiMode);
  const ctx = buildProjectContext(project, photos.length, catalog);
  const selectedPhoto = photoId ?? photos[0]?.id ?? null;

  const describe = async () => {
    setBusy(true);
    setText(await provider.generateDescription(ctx, elements));
    analytics.track('ai_used', { feature: 'visualize_description' });
    setBusy(false);
  };

  const analyze = async () => {
    if (!selectedPhoto) return;
    const rec = await storage.getPhoto(selectedPhoto);
    if (!rec) return;
    setAnalysis(await provider.analyzePhoto(rec.medium, ctx));
  };

  return (
    <div className="space-y-5">
      <PageHeader back={`/projects/${project.id}`} title="Visualiser le projet" subtitle={clientDisplayName(client)} />

      {provider.simulated && (
        <Alert tone="warning" title="Mode simulation / démonstration">
          Les résultats d’analyse de ce mode sont fictifs. Changez de mode dans Paramètres → IA.
        </Alert>
      )}

      <Card>
        <CardTitle icon={<ImageIcon className="h-5 w-5" />}>Photo du jardin actuel</CardTitle>
        {photos.length === 0 ? (
          <div className="space-y-3">
            <p className="text-muted">Ajoutez d’abord une photo du chantier.</p>
            <ButtonLink to={`/projects/${project.id}/photos`} variant="soft">
              Ajouter des photos
            </ButtonLink>
          </div>
        ) : (
          <>
            {selectedPhoto && <PhotoThumb photoId={selectedPhoto} quality="medium" alt="Photo sélectionnée" className="mb-3 aspect-[4/3] w-full rounded-xl" />}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label="Choisir cette photo"
                  aria-pressed={selectedPhoto === p.id}
                  onClick={() => {
                    setPhotoId(p.id);
                    setAnalysis(null);
                  }}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 ${selectedPhoto === p.id ? 'border-brand' : 'border-transparent'}`}
                >
                  <PhotoThumb photoId={p.id} alt="" className="h-16 w-16" />
                </button>
              ))}
            </div>
            <Button className="mt-3" variant="secondary" icon={<ScanSearch className="h-5 w-5" />} onClick={analyze}>
              Analyse intelligente du chantier
            </Button>
            {analysis && !analysis.available && (
              <div className="mt-3">
                <Alert tone="info">
                  {analysis.message}{' '}
                  <a className="font-semibold underline" href={`#/projects/${project.id}/measures`}>
                    Entrer les dimensions
                  </a>
                </Alert>
              </div>
            )}
            {analysis?.available && (
              <div className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-warning">
                <p className="font-semibold">{analysis.simulated ? 'Résultat simulé (fictif)' : 'Analyse'}</p>
                <ul className="mt-1 list-inside list-disc">
                  {analysis.observations.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                {analysis.areaRange && (
                  <p className="mt-1">
                    Surface estimée : {analysis.areaRange[0]}–{analysis.areaRange[1]} m² · Confiance : {CONFIDENCE_LABEL[analysis.confidence]} — à confirmer par une mesure.
                  </p>
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">Vos photos restent sur cet appareil : aucune image n’est envoyée à un service externe.</p>
          </>
        )}
      </Card>

      <Card>
        <CardTitle icon={<Sparkles className="h-5 w-5" />}>Éléments du projet</CardTitle>
        <div className="flex flex-wrap gap-2">
          {VISUALIZATION_ELEMENTS.map((e) => (
            <Chip key={e} selected={elements.includes(e)} onClick={() => setElements((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]))}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </Chip>
          ))}
        </div>
        <Button className="mt-4" block onClick={describe} disabled={busy} icon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}>
          Préparer la description de la transformation
        </Button>
        {text && (
          <div className="mt-4 space-y-3">
            <TextArea label="Description (modifiable)" value={text} onChange={setText} rows={6} />
            {quote && !isQuoteLocked(quote) && (
              <Button
                variant="soft"
                block
                icon={<Check className="h-5 w-5" />}
                onClick={() => {
                  updateQuote(quote.id, { description: text.trim() });
                  toast('Description ajoutée au devis.');
                }}
              >
                Utiliser comme description du devis
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle icon={<ImageIcon className="h-5 w-5" />}>Image du projet terminé</CardTitle>
        <p className="text-muted">Générer une image « après » à partir de la photo nécessite un service d’IA externe.</p>
        <Button className="mt-3" block variant="secondary" disabled>
          Générer l’image — disponible prochainement
        </Button>
      </Card>
    </div>
  );
}
