// Plans, tarifs et fonctionnalités : CONFIGURATION CENTRALE.
//
// Tout prix, quota ou contenu d'offre se modifie ici et nulle part ailleurs.
//
// • Mode bêta (APP_CONFIG.betaMode) : tout le monde a le plan BETA = jeu de fonctionnalités
//   Premium Max, 0 €, sans carte bancaire.
// • Bêta désactivée : le plan vient de l'abonnement de l'entreprise (table `subscriptions`,
//   écrite uniquement côté serveur par le webhook Stripe).
//
// ⚠️ Masquer un écran dans l'application n'est pas une protection. Ce contrôle-ci sert à l'interface ;
// tout ce qui coûte ou engage (IA distante, nombre d'utilisateurs, paiement) doit aussi être vérifié
// côté serveur à partir de la table `subscriptions`.
import { APP_CONFIG, type PlanId } from '../../config/app';
import type { SubscriptionInfo } from '../../types';
import { getState } from '../../lib/store';

export type Feature =
  | 'quotes_pdf'
  | 'clients_projects'
  | 'photos'
  | 'catalog'
  | 'signature'
  | 'ai_basic'
  | 'measurements'
  | 'templates'
  | 'client_portal'
  | 'planning'
  | 'statistics'
  | 'sap'
  | 'profitability'
  | 'team'
  | 'ai_advanced'
  | 'online_payment';

/** available : utilisable aujourd'hui · planned : annoncé, pas encore développé (jamais vendu comme disponible) */
export const FEATURES: Record<Feature, { label: string; status: 'available' | 'planned' }> = {
  quotes_pdf: { label: 'Devis et PDF à vos couleurs', status: 'available' },
  clients_projects: { label: 'Clients et chantiers', status: 'available' },
  photos: { label: 'Photos de chantier', status: 'available' },
  catalog: { label: 'Catalogue de prestations', status: 'available' },
  signature: { label: 'Signature du devis', status: 'available' },
  ai_basic: { label: 'Assistant : suggestions de prestations et description', status: 'available' },
  measurements: { label: 'Mesures et calculs de quantités', status: 'available' },
  templates: { label: 'Modèles de devis', status: 'available' },
  client_portal: { label: 'Lien client : consultation et signature en ligne', status: 'available' },
  planning: { label: 'Planning des chantiers', status: 'available' },
  statistics: { label: 'Statistiques', status: 'available' },
  sap: { label: 'Mode SAP (services à la personne)', status: 'available' },
  profitability: { label: 'Marge et rentabilité des devis', status: 'available' },
  team: { label: 'Équipe : plusieurs utilisateurs et rôles', status: 'available' },
  ai_advanced: { label: 'IA avancée (analyse par un modèle distant)', status: 'planned' },
  online_payment: { label: 'Paiement en ligne de l’acompte', status: 'planned' },
};

export interface Plan {
  id: PlanId;
  name: string;
  /** Prix mensuel hors taxes, en euros */
  monthlyPriceHT: number;
  paymentRequired: boolean;
  features: Feature[];
  limits: {
    /** Utilisateurs inclus. La limite réelle est appliquée par la base : company_user_limit() (migration 0004) */
    users: number;
    /** Requêtes d'IA distante par mois (appliqué côté serveur quand l'IA distante sera disponible) */
    aiRequestsPerMonth: number;
  };
}

const STARTER: Feature[] = ['quotes_pdf', 'clients_projects', 'photos', 'catalog', 'signature', 'ai_basic'];
const PRO: Feature[] = [...STARTER, 'measurements', 'templates', 'client_portal', 'planning', 'statistics', 'sap', 'team'];
const BUSINESS: Feature[] = [...PRO, 'profitability', 'ai_advanced', 'online_payment'];

export const PLANS: Record<PlanId, Plan> = {
  BETA: { id: 'BETA', name: 'Premium Max', monthlyPriceHT: 0, paymentRequired: false, features: BUSINESS, limits: { users: 10, aiRequestsPerMonth: 1500 } },
  STARTER: { id: 'STARTER', name: 'Starter', monthlyPriceHT: 19, paymentRequired: true, features: STARTER, limits: { users: 1, aiRequestsPerMonth: 50 } },
  PRO: { id: 'PRO', name: 'Pro', monthlyPriceHT: 39, paymentRequired: true, features: PRO, limits: { users: 3, aiRequestsPerMonth: 300 } },
  BUSINESS: { id: 'BUSINESS', name: 'Business', monthlyPriceHT: 69, paymentRequired: true, features: BUSINESS, limits: { users: 10, aiRequestsPerMonth: 1500 } },
};

export const PAID_PLANS: Plan[] = [PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS];

/** Sans abonnement actif (bêta terminée) : consultation uniquement, aucune fonctionnalité payante. */
export const NO_PLAN: Plan = { id: 'STARTER', name: 'Aucun abonnement', monthlyPriceHT: 0, paymentRequired: true, features: [], limits: { users: 1, aiRequestsPerMonth: 0 } };

/** Réduction accordée pour un paiement à l'année (en %). Se modifie ici et nulle part ailleurs. */
export const YEARLY_DISCOUNT_PERCENT = 25;

export type BillingInterval = 'month' | 'year';

/** Prix annuel HT : 12 mois moins la réduction. 39 €/mois → 351 €/an. */
export function yearlyPriceHT(plan: Plan): number {
  return Math.round(plan.monthlyPriceHT * 12 * (100 - YEARLY_DISCOUNT_PERCENT)) / 100;
}

/** Équivalent mensuel du paiement annuel. 39 €/mois → 29,25 €/mois. */
export function yearlyMonthlyEquivalentHT(plan: Plan): number {
  return Math.round((yearlyPriceHT(plan) / 12) * 100) / 100;
}

const euros = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

export function yearlyPriceLabel(plan: Plan): string {
  return `${euros(yearlyPriceHT(plan))} € HT/an`;
}

export function yearlyEquivalentLabel(plan: Plan): string {
  return `soit ${euros(yearlyMonthlyEquivalentHT(plan))} € HT/mois`;
}

export function priceLabel(plan: Plan): string {
  return plan.monthlyPriceHT === 0 ? '0 €' : `${plan.monthlyPriceHT} € HT/mois`;
}

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

/** Plan correspondant à un abonnement (fonction pure, testée). */
export function planFor(betaMode: boolean, subscription: SubscriptionInfo | null): Plan {
  if (betaMode) return PLANS.BETA;
  if (!subscription || !ACTIVE_STATUSES.has(subscription.status)) return NO_PLAN;
  const id = subscription.planId.toUpperCase() as PlanId;
  return id !== 'BETA' && PLANS[id] ? PLANS[id] : NO_PLAN;
}

export function getCurrentPlan(): Plan {
  return planFor(APP_CONFIG.betaMode, getState().subscription);
}

export function hasFeature(feature: Feature, plan: Plan = getCurrentPlan()): boolean {
  return plan.features.includes(feature);
}

/** Plus petite offre payante qui contient la fonctionnalité. */
export function minimumPlanFor(feature: Feature): Plan | null {
  return PAID_PLANS.find((p) => p.features.includes(feature)) ?? null;
}

/** Vérifie l'accès à une fonctionnalité et explique un éventuel refus (jamais un paywall pendant la bêta). */
export function canUseFeature(feature: Feature, plan: Plan = getCurrentPlan()): { allowed: boolean; reason: string | null } {
  if (hasFeature(feature, plan)) return { allowed: true, reason: null };
  const needed = minimumPlanFor(feature);
  return { allowed: false, reason: needed ? `Fonctionnalité incluse à partir de l’offre ${needed.name}.` : 'Fonctionnalité non disponible.' };
}
