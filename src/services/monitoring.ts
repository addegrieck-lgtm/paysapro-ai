// Suivi des erreurs (facultatif).
//
// Inactif tant que VITE_SENTRY_DSN est vide : rien n'est chargé ni envoyé.
// Quand il est actif, seules les erreurs techniques sont transmises (message, pile d'appels,
// version, environnement). Aucune donnée métier : ni clients, ni devis, ni contenu de formulaire,
// ni adresse e-mail, ni adresse IP.
import { APP_CONFIG } from '../config/app';

const dsn = (import.meta.env?.VITE_SENTRY_DSN ?? '').trim();

type Reporter = (error: unknown, context?: string) => void;
let reporter: Reporter | null = null;

export const MONITORING_ENABLED = dsn !== '';

export async function initMonitoring(): Promise<void> {
  if (!MONITORING_ENABLED || reporter) return;
  try {
    const Sentry = await import('@sentry/browser');
    Sentry.init({
      dsn,
      environment: import.meta.env?.MODE ?? 'production',
      release: `paysapro-ai@${APP_CONFIG.version}`,
      // Pas de fil d'Ariane (clics, saisies, requêtes) : il pourrait contenir des données de clients.
      maxBreadcrumbs: 0,
      beforeSend(event) {
        delete event.user;
        delete event.request;
        delete event.extra;
        return event;
      },
    });
    reporter = (error, context) => Sentry.captureException(error, context ? { tags: { context } } : undefined);
  } catch (e) {
    console.error('Suivi des erreurs indisponible', e);
  }
}

/** Signale une erreur inattendue. Sans DSN, elle reste dans la console du navigateur. */
export function reportError(error: unknown, context?: string): void {
  reporter?.(error, context);
}
