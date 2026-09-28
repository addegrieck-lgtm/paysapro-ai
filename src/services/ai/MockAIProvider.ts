// Mode « Simulation / démonstration » : réponses FICTIVES pour découvrir l'interface.
// L'interface affiche en permanence un bandeau « Simulation » : ce n'est jamais une vraie analyse.
import type { AIProvider, PhotoAnalysis, ProjectContext, ServiceSuggestion, VisualizationResult } from './AIProvider';
import { LocalAIProvider } from './LocalAIProvider';

export class MockAIProvider implements AIProvider {
  readonly id = 'demo' as const;
  readonly label = 'Simulation / démonstration (réponses fictives)';
  readonly simulated = true;
  readonly sendsDataExternally = false;
  private local = new LocalAIProvider();

  async analyzePhoto(): Promise<PhotoAnalysis> {
    return {
      available: true,
      simulated: true,
      observations: [
        'Exemple fictif : pelouse clairsemée sur la majeure partie du terrain',
        'Exemple fictif : haie en limite de propriété',
        'Exemple fictif : zone de terre nue près de la maison',
      ],
      areaRange: [70, 90],
      confidence: 'low',
    };
  }

  async suggestServices(ctx: ProjectContext): Promise<ServiceSuggestion[]> {
    const base = await this.local.suggestServices(ctx);
    return base.map((s) => ({ ...s, reason: `[Simulation] ${s.reason}` }));
  }

  estimateProject(ctx: ProjectContext) {
    return this.local.estimateProject(ctx);
  }

  generateDescription(ctx: ProjectContext, elements: string[]) {
    return this.local.generateDescription(ctx, elements);
  }

  async generateVisualization(): Promise<VisualizationResult> {
    return { available: false, message: 'Aucune image n’est générée en mode démonstration.' };
  }
}
