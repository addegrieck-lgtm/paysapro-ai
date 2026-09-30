// Enregistrement du service worker (généré par vite-plugin-pwa au build).
// En développement, aucun service worker n'est actif : le rechargement reste instantané.

let updateReady = false;

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  // Une nouvelle version vient de prendre la main (et ce n'est pas la première installation) :
  // elle sera chargée au prochain changement d'écran, jamais au milieu d'une saisie.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) updateReady = true;
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((registration) => {
        // Au retour sur l'application, on vérifie s'il existe une version plus récente.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void registration.update().catch(() => undefined);
        });
      })
      .catch((e) => console.warn('Service worker :', e));
  });
}

/** À appeler à chaque changement d'écran : recharge l'application si une nouvelle version est prête. */
export function applyPendingUpdate(): void {
  if (!updateReady) return;
  updateReady = false;
  window.location.reload();
}

/** Demande au navigateur de ne pas effacer les données locales en cas de manque d'espace. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageEstimate(): Promise<{ used: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { used: e.usage ?? 0, quota: e.quota ?? 0 } : null;
  } catch {
    return null;
  }
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
