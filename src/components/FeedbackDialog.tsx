import { useState } from 'react';
import { Star } from 'lucide-react';
import { Dialog, useToast } from './ui/Feedback';
import { Button } from './ui/Button';
import { TextArea } from './ui/Form';
import { SubmitResultPanel } from './SubmitResultPanel';
import { submitFeedback, type FeedbackInput, type SubmitResult } from '../services/forms/forms';
import { analytics } from '../services/analytics/AnalyticsProvider';

const EMPTY: FeedbackInput = { rating: null, likes: '', missing: '', timeWasters: '', wishedFeature: '' };

/** « Que pensez-vous de Paysapro AI ? » — retour produit uniquement. */
export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [value, setValue] = useState<FeedbackInput>(EMPTY);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const empty = !value.rating && !value.likes && !value.missing && !value.timeWasters && !value.wishedFeature;

  const close = () => {
    setValue(EMPTY);
    setResult(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Que pensez-vous de Paysapro AI ?"
      footer={
        result ? (
          <Button onClick={close}>Fermer</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Annuler
            </Button>
            <Button
              disabled={empty}
              onClick={async () => {
                try {
                  setResult(await submitFeedback(value));
                  analytics.track('feedback_submitted', { rating: value.rating ?? 0 });
                } catch {
                  toast('Impossible d’enregistrer votre avis. Réessayez.', 'danger');
                }
              }}
            >
              Envoyer mon avis
            </Button>
          </>
        )
      }
    >
      {result ? (
        <SubmitResultPanel result={result} title="Merci pour votre avis !" />
      ) : (
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Votre note (facultatif)</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Note de 1 à 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={value.rating === n}
                  aria-label={`${n} sur 5`}
                  onClick={() => setValue({ ...value, rating: value.rating === n ? null : n })}
                  className="rounded-lg p-1.5 hover:bg-surface-2"
                >
                  <Star className={`h-8 w-8 ${value.rating !== null && n <= value.rating ? 'fill-[#e8a317] text-[#e8a317]' : 'text-line'}`} />
                </button>
              ))}
            </div>
          </fieldset>
          <TextArea label="Ce que vous aimez" value={value.likes} onChange={(v) => setValue({ ...value, likes: v })} rows={2} />
          <TextArea label="Ce qui vous manque" value={value.missing} onChange={(v) => setValue({ ...value, missing: v })} rows={2} />
          <TextArea label="Ce qui vous fait perdre du temps" value={value.timeWasters} onChange={(v) => setValue({ ...value, timeWasters: v })} rows={2} />
          <TextArea label="Fonctionnalité souhaitée" value={value.wishedFeature} onChange={(v) => setValue({ ...value, wishedFeature: v })} rows={2} />
          <p className="text-xs text-muted">Cette note sert uniquement à améliorer le produit.</p>
        </div>
      )}
    </Dialog>
  );
}
