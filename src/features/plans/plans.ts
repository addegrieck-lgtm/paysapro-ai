// Plans et fonctionnalités : architecture prête pour la monétisation future.
// Pendant la bêta (testMode), getCurrentPlan() renvoie toujours PREMIUM_MAX : aucune restriction.
import { APP_CONFIG, type PlanId } from '../../config/app';

export type Feature =
  | 'unlimited_quotes'
  | 'unlimited_clients'
  | 'pdf'
  | 'signature'
  | 'catalog'
  | 'templates'
  | 'ai_assistant'
  | 'ai_photo_analysis'
  | 'planning'
  | 'statistics'
  | 'custom_branding'
  | 'cloud_sync'
  | 'online_payment';

export interface Plan {
  id: PlanId;
  name: string;
  /** Prix non défini tant que l'offre n'est pas annoncée */
  priceLabel: string;
  available: boolean;
  features: Feature[];
}

const ALL: Feature[] = [
  'unlimited_quotes',
  'unlimited_clients',
  'pdf',
  'signature',
  'catalog',
  'templates',
  'ai_assistant',
  'ai_photo_analysis',
  'planning',
  'statistics',
  'custom_branding',
  'cloud_sync',
  'online_payment',
];

export const PLANS: Record<PlanId, Plan> = {
  FREE: { id: 'FREE', name: 'Starter', priceLabel: 'À venir', available: false, features: ['pdf', 'catalog', 'signature'] },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    priceLabel: 'À venir',
    available: false,
    features: ['unlimited_quotes', 'unlimited_clients', 'pdf', 'signature', 'catalog', 'templates', 'custom_branding'],
  },
  PREMIUM: {
    id: 'PREMIUM',
    name: 'Premium',
    priceLabel: 'À venir',
    available: false,
    features: ['unlimited_quotes', 'unlimited_clients', 'pdf', 'signature', 'catalog', 'templates', 'custom_branding', 'ai_assistant', 'planning', 'statistics'],
  },
  PREMIUM_MAX: { id: 'PREMIUM_MAX', name: 'Premium Max', priceLabel: '0 € pendant la bêta', available: true, features: ALL },
};

export function getCurrentPlan(): Plan {
  // Bêta : plan de test pour tous. Plus tard : plan lu depuis le compte (AuthProvider).
  if (APP_CONFIG.testMode || !APP_CONFIG.subscriptionsEnabled) return PLANS[APP_CONFIG.testPlan];
  return PLANS.FREE;
}

export function hasFeature(feature: Feature, plan: Plan = getCurrentPlan()): boolean {
  return plan.features.includes(feature);
}

/** Vérifie l'accès à une fonctionnalité et explique un éventuel refus (jamais utilisé comme paywall en bêta). */
export function canUseFeature(feature: Feature, plan: Plan = getCurrentPlan()): { allowed: boolean; reason: string | null } {
  return hasFeature(feature, plan)
    ? { allowed: true, reason: null }
    : { allowed: false, reason: `Fonctionnalité incluse dans une offre supérieure à ${plan.name}.` };
}
