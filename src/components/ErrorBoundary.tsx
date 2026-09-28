import { Component, type ErrorInfo, type ReactNode } from 'react';
import { LogoMark } from './Logo';

interface State {
  error: Error | null;
}

/**
 * Filet de sécurité : jamais d'écran blanc. Si un écran ne peut pas se charger
 * (réseau coupé avant sa première mise en cache, erreur inattendue), on explique et on propose de réessayer.
 * Les données enregistrées ne sont pas touchées.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    const chunk = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(this.state.error.message);
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <LogoMark className="h-12 w-12" />
        <h1 className="text-2xl font-bold">{chunk || offline ? 'Connexion nécessaire' : 'Un problème est survenu'}</h1>
        <p className="max-w-sm text-muted">
          {chunk || offline
            ? 'Cet écran n’a pas encore été enregistré sur votre appareil. Reconnectez-vous une fois à Internet : il fonctionnera ensuite hors-ligne.'
            : 'L’écran n’a pas pu s’afficher. Vos données enregistrées ne sont pas affectées.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => window.location.reload()} className="min-h-12 rounded-xl bg-brand px-5 font-semibold text-on-brand">
            Réessayer
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/app';
              window.location.reload();
            }}
            className="min-h-12 rounded-xl border border-line bg-surface px-5 font-semibold"
          >
            Tableau de bord
          </button>
        </div>
      </div>
    );
  }
}
