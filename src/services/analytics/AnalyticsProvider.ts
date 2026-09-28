// Analytics produit — architecture prête, 100 % locale.
//
// Les événements clés du parcours (onboarding, premier devis, signature…) sont enregistrés
// uniquement sur l'appareil pour visualiser son propre entonnoir (Statistiques).
// Aucun envoi vers un service externe : un futur fournisseur distant devra être activé
// explicitement ET avec le consentement de l'utilisateur.
import type { AnalyticsEvent, AnalyticsEventName } from '../../types';
import { storage } from '../storage';
import { uid } from '../../utils/id';

export type AnalyticsProps = Record<string, string | number | boolean>;

export interface AnalyticsProvider {
  readonly sendsDataExternally: boolean;
  track(name: AnalyticsEventName, props?: AnalyticsProps): void;
  getEvents(): Promise<AnalyticsEvent[]>;
  clear(): Promise<void>;
}

export class LocalAnalyticsProvider implements AnalyticsProvider {
  readonly sendsDataExternally = false;

  track(name: AnalyticsEventName, props: AnalyticsProps = {}): void {
    const event: AnalyticsEvent = { id: uid(), name, props, createdAt: new Date().toISOString() };
    // Jamais bloquant : une erreur d'analytics ne doit pas gêner l'utilisateur.
    storage.addRecord('analytics', event).catch(() => undefined);
  }

  getEvents(): Promise<AnalyticsEvent[]> {
    return storage.getRecords('analytics');
  }

  clear(): Promise<void> {
    return storage.clearRecords('analytics');
  }
}

export const analytics: AnalyticsProvider = new LocalAnalyticsProvider();

/** Étapes de l'entonnoir d'activation (du premier lancement au premier devis signé). */
export const FUNNEL: { event: AnalyticsEventName; label: string }[] = [
  { event: 'onboarding_completed', label: 'Espace créé' },
  { event: 'client_created', label: 'Premier client' },
  { event: 'project_created', label: 'Premier chantier' },
  { event: 'quote_created', label: 'Premier devis' },
  { event: 'quote_sent', label: 'Premier envoi' },
  { event: 'quote_signed', label: 'Premier devis signé' },
];

export function funnelProgress(events: AnalyticsEvent[]): { label: string; reached: boolean; count: number }[] {
  return FUNNEL.map((f) => {
    const count = events.filter((e) => e.name === f.event).length;
    return { label: f.label, reached: count > 0, count };
  });
}
