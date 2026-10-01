// État applicatif en mémoire, synchronisé avec le StorageProvider.
// Les écritures sont optimistes : l'interface se met à jour immédiatement, puis la donnée est persistée.
import { useSyncExternalStore } from 'react';
import type { ActivityEvent, AppSettings, CatalogItem, Client, PhotoMeta, Project, Quote, QuoteTemplate, SubscriptionInfo, User } from '../types';
import { isDemoSpace, storage } from '../services/storage';
import { shrinkLogoIfNeeded } from '../services/images/logo';
import { CLOUD_ENABLED, fetchSubscription, getCloudSession, refreshCloudSession, type MemberRole } from '../services/cloud/client';
import { builtInTemplates, defaultCatalog, defaultSettings } from '../data/defaults';
import { migrateCatalogItem, migrateProject, migrateQuote, migrateSettings, needsMigration } from '../features/migrations';

export interface AppState {
  ready: boolean;
  loadError: string | null;
  demo: boolean;
  user: User | null;
  /** Rôle dans l'entreprise (mode cloud) ; null en mode local ou démo */
  role: MemberRole | null;
  /** Abonnement de l'entreprise (mode cloud) ; null en mode local ou démo */
  subscription: SubscriptionInfo | null;
  settings: AppSettings;
  clients: Client[];
  projects: Project[];
  quotes: Quote[];
  catalog: CatalogItem[];
  templates: QuoteTemplate[];
  photos: PhotoMeta[];
  activity: ActivityEvent[];
}

let state: AppState = {
  ready: false,
  loadError: null,
  demo: false,
  user: null,
  role: null,
  subscription: null,
  settings: defaultSettings(),
  clients: [],
  projects: [],
  quotes: [],
  catalog: [],
  templates: [],
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
    // Mode cloud : l'écran a été mis à jour avant le refus du serveur (droits, réseau).
    // On relit la base pour ne jamais afficher une modification qui n'a pas été enregistrée.
    if (CLOUD_ENABLED && !isDemoSpace() && typeof navigator !== 'undefined' && navigator.onLine) void loadAll();
    errorHandler(
      quota
        ? "L'espace de stockage de l'appareil est plein. Exportez vos données puis supprimez d'anciennes photos."
        : CLOUD_ENABLED && !isDemoSpace()
          ? 'Enregistrement impossible. Vérifiez votre connexion Internet et vos droits, puis réessayez.'
          : 'Impossible d’enregistrer. Réessayez.',
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

/**
 * Chargement initial. Crée les réglages, le catalogue et les modèles au premier lancement,
 * et met à niveau les données d'une version précédente (migration sans perte).
 */
export async function loadAll(): Promise<void> {
  const cloud = CLOUD_ENABLED && !isDemoSpace();
  try {
    if (cloud) {
      // Mode cloud : sans session ou sans entreprise, rien n'est lu ni écrit (écrans de connexion / création).
      const session = await refreshCloudSession();
      if (!session?.companyId) {
        const user = session ? await storage.getUser() : null;
        setState({ ready: true, loadError: null, demo: false, user, role: null, subscription: null, settings: defaultSettings(), clients: [], projects: [], quotes: [], catalog: [], templates: [], photos: [], activity: [] });
        return;
      }
    }
    const rawSettings = await storage.getSettings();
    const migrate = needsMigration(rawSettings);
    const settings = migrateSettings(rawSettings);
    if (!rawSettings || migrate) await storage.saveSettings(settings);

    let catalog = (await storage.getCatalog()).map((c) => migrateCatalogItem(c, settings.defaultMarginPercent));
    if (catalog.length === 0 && !settings.onboardingDone) {
      catalog = defaultCatalog();
      await Promise.all(catalog.map((c) => storage.saveCatalogItem(c)));
    } else if (migrate) {
      await Promise.all(catalog.map((c) => storage.saveCatalogItem(c)));
    }

    let templates = await storage.getTemplates();
    if (templates.length === 0 && (!rawSettings || migrate)) {
      templates = builtInTemplates();
      await Promise.all(templates.map((t) => storage.saveTemplate(t)));
    }

    const [clients, rawProjects, rawQuotes, photos, activity, user] = await Promise.all([
      storage.getClients(),
      storage.getProjects(),
      storage.getQuotes(),
      storage.getPhotoMetas(),
      storage.getActivity(),
      storage.getUser(),
    ]);
    const projects = rawProjects.map(migrateProject);
    const quotes = rawQuotes.map(migrateQuote);
    if (migrate) {
      await Promise.all([...projects.map((p) => storage.saveProject(p)), ...quotes.map((q) => storage.saveQuote(q))]);
    }
    const smaller = await shrinkLogoIfNeeded(settings.company.logoDataUrl);
    if (smaller) {
      settings.company = { ...settings.company, logoDataUrl: smaller };
      await storage.saveSettings(settings).catch(() => undefined);
    }
    const subscription = cloud ? ((await fetchSubscription()) as SubscriptionInfo | null) : null;
    const role = cloud ? (getCloudSession()?.role ?? null) : null;
    setState({ ready: true, loadError: null, demo: isDemoSpace(), user, role, subscription, settings, clients, projects, quotes, catalog, templates, photos, activity });
  } catch (e) {
    console.error(e);
    const blocked = e instanceof Error && e.name === 'StorageBlockedError';
    setState({
      ready: true,
      loadError: blocked
        ? e.message
        : cloud
          ? 'Connexion au serveur impossible. Vérifiez votre connexion Internet, puis réessayez.'
          : "Impossible d'accéder au stockage local. Vérifiez que la navigation privée est désactivée, puis rechargez la page.",
    });
  }
}
