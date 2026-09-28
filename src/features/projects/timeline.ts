import type { Project, Quote } from '../../types';
import { totalArea, totalLength } from '../measurements/geometry';
import { hasDepositPaid } from './status';

export interface TimelineStep {
  key: string;
  label: string;
  done: boolean;
  /** Chemin relatif à /projects/:id */
  path: string;
}

/** Étapes du parcours chantier (Client → … → Terminé), calculées depuis les données réelles. */
export function projectTimeline(project: Project, quote: Quote | undefined, photoCount: number): TimelineStep[] {
  const hasMeasures = totalArea(project.zones).counted > 0 || totalLength(project.linears).counted > 0;
  const signed = quote?.status === 'signed';
  const stage = project.work?.stage;
  return [
    { key: 'client', label: 'Client', done: !!project.clientId, path: 'client' },
    { key: 'photos', label: 'Photos', done: photoCount > 0, path: 'photos' },
    { key: 'measures', label: 'Mesures', done: hasMeasures, path: 'measures' },
    { key: 'services', label: 'Prestations & estimation', done: (quote?.lines.length ?? 0) > 0, path: 'services' },
    { key: 'quote', label: 'Devis', done: !!quote?.number, path: 'quote' },
    { key: 'send', label: 'Présentation au client', done: !!quote?.sentAt, path: 'quote' },
    { key: 'signature', label: 'Signature', done: signed, path: 'quote' },
    { key: 'deposit', label: 'Acompte', done: hasDepositPaid(quote), path: 'work' },
    {
      key: 'work',
      label: 'Travaux',
      done: stage === 'in_progress' || stage === 'done' || stage === 'archived',
      path: 'work',
    },
    { key: 'done', label: 'Terminé', done: stage === 'done' || stage === 'archived', path: 'work' },
  ];
}

/** Première étape non terminée : sert au bouton « Continuer ». */
export function nextStep(steps: TimelineStep[]): TimelineStep | undefined {
  return steps.find((s) => !s.done);
}
