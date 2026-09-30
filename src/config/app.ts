// Configuration globale de l'application.
//
// Phase bêta : tout le monde bénéficie gratuitement du plan PREMIUM_MAX.
// Aucun paiement, aucun abonnement : ces interrupteurs restent désactivés tant que
// l'offre commerciale n'est pas prête (voir features/plans).

export type PlanId = 'BETA' | 'STARTER' | 'PRO' | 'BUSINESS';

/** Mode bêta : actif sauf si VITE_BETA_MODE (ou l'ancien VITE_TEST_MODE) vaut « false ». */
const betaMode = (import.meta.env?.VITE_BETA_MODE ?? import.meta.env?.VITE_TEST_MODE) !== 'false';

const env = import.meta.env ?? {};

export const APP_CONFIG = {
  name: env.VITE_APP_NAME || 'Paysapro AI',
  tagline: 'Le devis paysagiste, directement depuis le chantier.',
  punchline: 'Photographiez. Chiffrez. Envoyez. Faites signer.',
  version: '0.1 Beta',
  /** Bêta : Premium Max pour tous, 0 €, aucune carte bancaire */
  betaMode,
  /** Alias historique de betaMode */
  testMode: betaMode,
  /** Jeu de fonctionnalités offert pendant la bêta */
  testPlan: 'PREMIUM_MAX' as const,
  paymentsEnabled: false,
  subscriptionsEnabled: false,
  /** Ouvre directement l'espace de démonstration au démarrage */
  demoMode: env.VITE_DEMO_MODE === 'true',
  /** Adresse qui reçoit les inscriptions bêta / messages via l'application e-mail (facultatif) */
  contactEmail: env.VITE_CONTACT_EMAIL || '',
} as const;
