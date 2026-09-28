// État applicatif en mémoire, synchronisé avec le StorageProvider.
// Les écritures sont optimistes : l'interface se met à jour immédiatement, puis la donnée est persistée.
import { useSyncExternalStore } from 'react';
import type { ActivityEvent, AppSettings, CatalogItem, Client, PhotoMeta, Project, Quote } from '../types';
import { storage } from '../services/storage';
import { defaultCatalog, defaultSettings } from '../data/defaults';

export interface AppState {
  ready: boolean;
  loadError: string | null;
  settings: AppSettings;
  clients: Client[];
  projects: Project[];
  quotes: Quote[];
  catalog: CatalogItem[];
  photos: PhotoMeta[];
  activity: ActivityEvent[];
}

let state: AppState = {
  ready: false,
  loadError: null,
  settings: defaultSettings(),
  clients: [],
  projects: [],
  quotes: [],
  catalog: [],
  photos: [],
  activity: [],
};

const listeners = new Set<() => void>();
let errorHandler: (message: string) => void = (m) => console.error(m);

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Accès à l'état global depuis un composant React. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function onStorageError(handler: (message: string) => void) {
  errorHandler = handler;
}

/** Exécute une écriture et signale une erreur lisible en cas d'échec. */
export async function persist(task: () => Promise<unknown>): Promise<boolean> {
  try {
    await task();
    return true;
  } catch (e) {
    console.error(e);
    const quota = e instanceof DOMException && e.name === 'QuotaExceededError';
    errorHandler(
      quota
        ? "L'espace de stockage de l'appareil est plein. Exportez vos données puis supprimez d'anciennes photos."
        : "L'enregistrement a échoué. Vos dernières modifications n'ont peut-être pas été sauvegardées.",
    );
    return false;
  }
}

export function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

export function without<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}

/** Chargement initial (au démarrage). Crée les réglages et le catalogue par défaut au premier lancement. */
export async function loadAll(): Promise<void> {
  try {
    let settings = await storage.getSettings();
    if (!settings) {
      settings = defaultSettings();
      await storage.saveSettings(settings);
    } else {
      // fusion : un réglage ajouté dans une nouvelle version reçoit sa valeur par défaut
      const d = defaultSettings();
      settings = { ...d, ...settings, company: { ...d.company, ...settings.company } };
    }
    let catalog = await storage.getCatalog();
    if (catalog.length === 0 && !settings.onboardingDone) {
      catalog = defaultCatalog();
      await Promise.all(catalog.map((c) => storage.saveCatalogItem(c)));
    }
    const [clients, projects, quotes, photos, activity] = await Promise.all([
      storage.getClients(),
      storage.getProjects(),
      storage.getQuotes(),
      storage.getPhotoMetas(),
      storage.getActivity(),
    ]);
    setState({ ready: true, settings, clients, projects, quotes, catalog, photos, activity });
  } catch (e) {
    console.error(e);
    setState({
      ready: true,
      loadError:
        "Impossible d'accéder au stockage local. Vérifiez que la navigation privée est désactivée, puis rechargez la page.",
    });
  }
}
