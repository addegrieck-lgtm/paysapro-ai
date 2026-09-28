// Abstraction de l'assistance « IA ».
//
// Règles non négociables :
//  • l'application ne dépend jamais d'une IA pour fonctionner ;
//  • une IA ne remplace jamais une mesure : elle propose, le professionnel valide ;
//  • toute estimation affiche son incertitude (fourchette, niveau de confiance) ;
//  • aucune photo n'est envoyée à un service externe sans consentement explicite ;
//  • une réponse simulée est toujours présentée comme telle.
import type { CatalogItem, ProjectCategory } from '../../types';

export type Confidence = 'low' | 'medium' | 'high';

export interface ProjectContext {
  categories: ProjectCategory[];
  description: string;
  /** Surface totale mesurée (m²), null si aucune */
  area: number | null;
  areaApproximate: boolean;
  /** Longueur totale mesurée (ml), null si aucune */
  length: number | null;
  photoCount: number;
  catalog: CatalogItem[];
}

export interface ServiceSuggestion {
  id: string;
  label: string;
  catalogItemId: string | null;
  reason: string;
  confidence: Confidence;
}

export interface ProjectEstimate {
  /** Fourchette de surface (m²) — jamais une valeur « exacte » sans mesure */
  areaRange: [number, number] | null;
  known: string[];
  missing: string[];
  warning: string | null;
}

export type PhotoAnalysis =
  | { available: false; message: string }
  | { available: true; simulated: boolean; observations: string[]; areaRange: [number, number] | null; confidence: Confidence };

export type VisualizationResult = { available: false; message: string } | { available: true; imageDataUrl: string };

export interface AIProvider {
  readonly id: 'local' | 'demo' | 'external';
  readonly label: string;
  /** Réponses fictives de démonstration (à signaler clairement dans l'interface) */
  readonly simulated: boolean;
  /** Envoie des données hors de l'appareil (consentement requis) */
  readonly sendsDataExternally: boolean;

  analyzePhoto(photo: Blob, ctx: ProjectContext): Promise<PhotoAnalysis>;
  suggestServices(ctx: ProjectContext): Promise<ServiceSuggestion[]>;
  estimateProject(ctx: ProjectContext): Promise<ProjectEstimate>;
  generateDescription(ctx: ProjectContext, elements: string[]): Promise<string>;
  /** Description professionnelle des travaux à partir des prestations du devis */
  generateQuoteDescription(ctx: ProjectContext, lineLabels: string[]): Promise<string>;
  generateVisualization(photo: Blob, elements: string[]): Promise<VisualizationResult>;
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
};
