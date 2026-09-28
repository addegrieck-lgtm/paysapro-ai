// Emplacement d'un futur service d'IA distant (analyse photo, estimation de surface, rendu du projet).
//
// Pourquoi ce n'est pas actif dans le MVP : une clé d'API ne doit JAMAIS être placée dans le code
// d'un site statique (GitHub Pages) — n'importe qui pourrait la lire et la consommer à vos frais.
// La bonne architecture : un petit backend (ex. fonction Supabase Edge / Cloudflare Worker gratuit)
// qui détient la clé et que l'application appelle. Ce fournisseur appellera ce backend.
//
// Obligations déjà prévues :
//  • consentement explicite avant tout envoi de photo (settings.externalAIConsent) ;
//  • surfaces toujours rendues sous forme de fourchette (« 70–90 m² »), avec un niveau de confiance.
import type { AppSettings } from '../../types';
import type { AIProvider, PhotoAnalysis, ServiceSuggestion, ProjectEstimate, VisualizationResult } from './AIProvider';

export const EXTERNAL_AI_AVAILABLE = false;

export class ConsentRequiredError extends Error {
  constructor() {
    super('Votre accord est nécessaire avant d’envoyer une photo à un service externe.');
  }
}

/** À appeler avant tout envoi de données à un service externe. */
export function assertExternalConsent(settings: Pick<AppSettings, 'externalAIConsent'>): void {
  if (!settings.externalAIConsent) throw new ConsentRequiredError();
}

const UNAVAILABLE = 'Service d’IA externe non configuré — disponible prochainement.';

export class ExternalAIProvider implements AIProvider {
  readonly id = 'external' as const;
  readonly label = 'Service d’IA externe (disponible prochainement)';
  readonly simulated = false;
  readonly sendsDataExternally = true;
  private settings: Pick<AppSettings, 'externalAIConsent'>;

  constructor(settings: Pick<AppSettings, 'externalAIConsent'>) {
    this.settings = settings;
  }

  async analyzePhoto(): Promise<PhotoAnalysis> {
    assertExternalConsent(this.settings);
    return { available: false, message: UNAVAILABLE };
  }
  async suggestServices(): Promise<ServiceSuggestion[]> {
    throw new Error(UNAVAILABLE);
  }
  async estimateProject(): Promise<ProjectEstimate> {
    throw new Error(UNAVAILABLE);
  }
  async generateDescription(): Promise<string> {
    throw new Error(UNAVAILABLE);
  }
  async generateVisualization(): Promise<VisualizationResult> {
    assertExternalConsent(this.settings);
    return { available: false, message: UNAVAILABLE };
  }
}
