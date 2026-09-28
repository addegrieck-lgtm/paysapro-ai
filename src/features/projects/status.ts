import type { PhotoTag, Project, ProjectCategory, ProjectStatus, Quote, QuoteStatus, WorkStage } from '../../types';

export const CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: 'creation', label: 'Création de jardin' },
  { value: 'maintenance', label: 'Entretien' },
  { value: 'terrace', label: 'Terrasse' },
  { value: 'lawn', label: 'Gazon' },
  { value: 'planting', label: 'Plantation' },
  { value: 'fence', label: 'Clôture' },
  { value: 'earthwork', label: 'Terrassement' },
  { value: 'pruning_trees', label: 'Élagage' },
  { value: 'hedge_trimming', label: 'Taille' },
  { value: 'full_landscaping', label: 'Aménagement complet' },
  { value: 'other', label: 'Autre' },
];

export function categoryLabel(c: ProjectCategory): string {
  return CATEGORIES.find((x) => x.value === c)?.label ?? 'Autre';
}

export function categoriesText(categories: ProjectCategory[]): string {
  return categories.length ? categories.map(categoryLabel).join(', ') : 'Projet paysager';
}

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'accent';

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  quoting: { label: 'Devis en préparation', tone: 'neutral' },
  sent: { label: 'Envoyé', tone: 'info' },
  viewed: { label: 'Vu', tone: 'info' },
  accepted: { label: 'Accepté', tone: 'accent' },
  signed: { label: 'Signé', tone: 'success' },
  deposit_paid: { label: 'Acompte reçu', tone: 'success' },
  in_progress: { label: 'En cours', tone: 'warning' },
  done: { label: 'Terminé', tone: 'success' },
};

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  draft: { label: 'En préparation', tone: 'neutral' },
  ready: { label: 'Prêt à envoyer', tone: 'neutral' },
  sent: { label: 'Envoyé', tone: 'info' },
  viewed: { label: 'Vu', tone: 'info' },
  accepted: { label: 'Accepté', tone: 'accent' },
  signed: { label: 'Signé', tone: 'success' },
  refused: { label: 'Refusé', tone: 'warning' },
};

export const WORK_STAGES: { value: WorkStage; label: string }[] = [
  { value: 'planned', label: 'Planifié' },
  { value: 'preparing', label: 'En préparation' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'on_hold', label: 'En attente' },
  { value: 'done', label: 'Terminé' },
  { value: 'archived', label: 'Archivé' },
];

export function workStageLabel(s: WorkStage): string {
  return WORK_STAGES.find((x) => x.value === s)?.label ?? '';
}

export const PHOTO_TAGS: { value: PhotoTag; label: string }[] = [
  { value: 'before', label: 'Avant' },
  { value: 'zone', label: 'Zone concernée' },
  { value: 'overview', label: 'Vue générale' },
  { value: 'detail', label: 'Élément particulier' },
  { value: 'during', label: 'Pendant les travaux' },
  { value: 'after', label: 'Après' },
];

export function photoTagLabel(t: PhotoTag): string {
  return PHOTO_TAGS.find((x) => x.value === t)?.label ?? '';
}

export const DEFAULT_CHECKLIST = [
  'Matériel préparé',
  'Matériaux commandés',
  'Client prévenu',
  'Terrassement',
  'Pose',
  'Nettoyage',
  'Photos finales',
  'Réception',
];

export function hasDepositPaid(quote: Quote | undefined): boolean {
  return !!quote?.payments.some((p) => p.kind === 'deposit');
}

/** Statut affiché d'un chantier : calculé (jamais stocké) pour rester toujours cohérent. */
export function getProjectStatus(project: Project, quote: Quote | undefined): ProjectStatus {
  const stage = project.work?.stage;
  if (stage === 'done' || stage === 'archived') return 'done';
  if (stage === 'in_progress') return 'in_progress';
  if (hasDepositPaid(quote)) return 'deposit_paid';
  if (!quote) return 'draft';
  switch (quote.status) {
    case 'signed':
      return 'signed';
    case 'accepted':
      return 'accepted';
    case 'viewed':
      return 'viewed';
    case 'sent':
      return 'sent';
    case 'ready':
      return 'quoting';
    default:
      return quote.lines.length > 0 ? 'quoting' : 'draft';
  }
}

/** Le devis est-il verrouillé (plus modifiable) ? */
export function isQuoteLocked(quote: Quote | undefined): boolean {
  return quote?.status === 'signed' || quote?.status === 'accepted';
}

export function isQuoteExpired(quote: Quote, now = new Date()): boolean {
  if (!quote.issueDate || quote.status === 'signed' || quote.status === 'accepted') return false;
  const end = new Date(quote.issueDate);
  end.setDate(end.getDate() + quote.validityDays);
  return end.getTime() < now.getTime();
}
