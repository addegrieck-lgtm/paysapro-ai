// Configuration globale de l'application.
//
// Phase bêta : tout le monde bénéficie gratuitement du plan PREMIUM_MAX.
// Aucun paiement, aucun abonnement : ces interrupteurs restent désactivés tant que
// l'offre commerciale n'est pas prête (voir features/plans).

export type PlanId = 'FREE' | 'PRO' | 'PREMIUM' | 'PREMIUM_MAX';

const env = import.meta.env ?? {};

export const APP_CONFIG = {
  name: env.VITE_APP_NAME || 'Paysapro AI',
  tagline: 'Le devis paysagiste, directement depuis le chantier.',
  punchline: 'Photographiez. Chiffrez. Envoyez. Faites signer.',
  version: '0.1 Beta',
  testMode: env.VITE_TEST_MODE !== 'false',
  testPlan: 'PREMIUM_MAX' as PlanId,
  paymentsEnabled: false,
  subscriptionsEnabled: false,
  /** Ouvre directement l'espace de démonstration au démarrage */
  demoMode: env.VITE_DEMO_MODE === 'true',
  /** Adresse qui reçoit les inscriptions bêta / messages via l'application e-mail (facultatif) */
  contactEmail: env.VITE_CONTACT_EMAIL || '',
} as const;
