import { Link } from 'react-router';
import { Check, CloudCheck } from 'lucide-react';
import type { Quote } from '../types';

export type FlowStep = 'client' | 'site' | 'measures' | 'price' | 'quote' | 'send';

const STEPS: { key: FlowStep; label: string; path: string | null }[] = [
  { key: 'client', label: 'Client', path: null },
  { key: 'site', label: 'Chantier', path: 'photos' },
  { key: 'measures', label: 'Mesures', path: 'measures' },
  { key: 'price', label: 'Prix', path: 'services' },
  { key: 'quote', label: 'Devis', path: 'quote' },
  { key: 'send', label: 'Envoi', path: 'quote' },
];

/**
 * Barre de progression du parcours devis : Client → Chantier → Mesures → Prix → Devis → Envoi.
 * Chaque étape déjà passée reste cliquable ; tout est enregistré automatiquement.
 */
export function QuoteFlowBar({ current, projectId, quote }: { current: FlowStep; projectId?: string; quote?: Quote }) {
  // Une fois le devis envoyé, la barre n'a plus lieu d'être : on est dans le suivi.
  if (quote && quote.sentAt) return null;
  const index = STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Étapes du devis" className="no-print mb-5">
      <ol className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const done = i < index;
          const active = i === index;
          const clickable = !!projectId && !!s.path && i <= Math.max(index, 4);
          const inner = (
            <span className="flex flex-col items-center gap-1">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  done ? 'bg-brand text-on-brand' : active ? 'bg-brand text-on-brand ring-4 ring-brand/20' : 'bg-surface-2 text-muted'
                }`}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </span>
              <span className={`text-[0.68rem] font-semibold sm:text-xs ${active ? 'text-brand' : 'text-muted'}`}>{s.label}</span>
            </span>
          );
          return (
            <li key={s.key} className="flex flex-1 items-center gap-1" aria-current={active ? 'step' : undefined}>
              {clickable && !active ? (
                <Link to={`/projects/${projectId}/${s.path}`} className="flex-1 rounded-lg py-1 hover:bg-surface-2">
                  {inner}
                </Link>
              ) : (
                <span className="flex-1 py-1">{inner}</span>
              )}
            </li>
          );
        })}
      </ol>
      {projectId && (
        <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted">
          <CloudCheck className="h-3.5 w-3.5 text-brand" aria-hidden /> Brouillon enregistré automatiquement
        </p>
      )}
    </nav>
  );
}
