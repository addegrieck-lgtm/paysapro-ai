import { CircleCheck, Mail } from 'lucide-react';
import type { SubmitResult } from '../services/forms/forms';
import { buttonClass } from './ui/Button';

/** Confirmation honnête après un formulaire : on dit exactement où la demande est allée. */
export function SubmitResultPanel({ result, title, onReset }: { result: SubmitResult; title: string; onReset?: () => void }) {
  return (
    <div className="rounded-2xl border border-success/40 bg-success-soft p-6 text-center">
      <CircleCheck className="mx-auto h-10 w-10 text-success" aria-hidden />
      <h2 className="mt-2 text-xl font-bold text-ink">{title}</h2>
      {result.mailto ? (
        <>
          <p className="mt-2 text-muted">Dernière étape : envoyez-nous votre demande par e-mail (le message est déjà rédigé).</p>
          <a href={result.mailto} className={buttonClass('primary', 'lg', false, 'mt-4')}>
            <Mail className="h-5 w-5" aria-hidden /> Envoyer par e-mail
          </a>
        </>
      ) : (
        <p className="mt-2 text-muted">
          Votre demande est enregistrée sur cet appareil. La transmission automatique à l’équipe sera activée avec la version en ligne.
        </p>
      )}
      {onReset && (
        <button type="button" onClick={onReset} className="mt-4 block w-full text-sm font-semibold text-brand hover:underline">
          Envoyer une autre demande
        </button>
      )}
    </div>
  );
}
