// Stockage local persistant (IndexedDB) : les données restent après fermeture du navigateur,
// fonctionnent hors-ligne et ne quittent jamais l'appareil.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  ActivityEvent,
  AnalyticsEvent,
  AppSettings,
  BetaLead,
  CatalogItem,
  Client,
  ContactMessage,
  ExportFile,
  FeedbackEntry,
  PhotoMeta,
  PhotoRecord,
  Project,
  Quote,
  QuoteTemplate,
  User,
} from '../../types';
import type { ProductRecords, StorageProvider } from './StorageProvider';
import { blobToDataUrl, dataUrlToBlob } from './exportFormat';

interface PaysaproDB extends DBSchema {
  settings: { key: string; value: AppSettings };
  clients: { key: string; value: Client };
  projects: { key: string; value: Project };
  quotes: { key: string; value: Quote };
  catalog: { key: string; value: CatalogItem };
  photos: { key: string; value: PhotoRecord; indexes: { projectId: string } };
  activity: { key: string; value: ActivityEvent };
  // v2
  user: { key: string; value: User };
  templates: { key: string; value: QuoteTemplate };
  leads: { key: string; value: BetaLead };
  messages: { key: string; value: ContactMessage };
  feedback: { key: string; value: FeedbackEntry };
  analytics: { key: string; value: AnalyticsEvent };
}

/** Données métier (exportées, importées, effacées par « Supprimer toutes mes données ») */
const BUSINESS_STORES = ['settings', 'user', 'clients', 'projects', 'quotes', 'catalog', 'templates', 'photos', 'activity'] as const;
const SINGLETON = 'app';

/** Levée quand une autre fenêtre (ancienne version) empêche la mise à niveau de la base. */
export class StorageBlockedError extends Error {
  constructor() {
    super('Paysapro AI est ouvert dans un autre onglet ou une autre fenêtre avec une ancienne version. Fermez-les puis réessayez.');
    this.name = 'StorageBlockedError';
  }
}

function toMeta(p: PhotoRecord): PhotoMeta {
  return { id: p.id, projectId: p.projectId, tag: p.tag, caption: p.caption, width: p.width, height: p.height, createdAt: p.createdAt };
}

export class IndexedDBProvider implements StorageProvider {
  readonly name = 'Stockage local (IndexedDB)';
  private dbPromise: Promise<IDBPDatabase<PaysaproDB>>;

  constructor(dbName = 'paysapro-ai') {
    let rejectBlocked: (e: Error) => void = () => undefined;
    const blocked = new Promise<never>((_, reject) => (rejectBlocked = reject));
    const opening = openDB<PaysaproDB>(dbName, 2, {
      // Une ancienne version ouverte ailleurs empêche la mise à niveau : on le signale au lieu d'attendre sans fin.
      blocked() {
        rejectBlocked(new StorageBlockedError());
      },
      // Une version plus récente demande la base : on la libère pour ne jamais la bloquer.
      blocking() {
        void opening.then((db) => db.close());
      },
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('settings');
          db.createObjectStore('clients', { keyPath: 'id' });
          db.createObjectStore('projects', { keyPath: 'id' });
          db.createObjectStore('quotes', { keyPath: 'id' });
          db.createObjectStore('catalog', { keyPath: 'id' });
          const photos = db.createObjectStore('photos', { keyPath: 'id' });
          photos.createIndex('projectId', 'projectId');
          db.createObjectStore('activity', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('user');
          db.createObjectStore('templates', { keyPath: 'id' });
          db.createObjectStore('leads', { keyPath: 'id' });
          db.createObjectStore('messages', { keyPath: 'id' });
          db.createObjectStore('feedback', { keyPath: 'id' });
          db.createObjectStore('analytics', { keyPath: 'id' });
        }
      },
    });
    this.dbPromise = Promise.race([opening, blocked]);
    // évite une « unhandled rejection » si personne n'a encore demandé la base
    this.dbPromise.catch(() => undefined);
  }

  private db() {
    return this.dbPromise;
  }

  async getUser() {
    return (await (await this.db()).get('user', SINGLETON)) ?? null;
  }
  async saveUser(user: User) {
    await (await this.db()).put('user', user, SINGLETON);
  }

  async getSettings() {
    return (await (await this.db()).get('settings', SINGLETON)) ?? null;
  }
  async saveSettings(settings: AppSettings) {
    await (await this.db()).put('settings', settings, SINGLETON);
  }

  async getClients() {
    return (await this.db()).getAll('clients');
  }
  async getClient(id: string) {
    return (await this.db()).get('clients', id);
  }
  async saveClient(client: Client) {
    await (await this.db()).put('clients', client);
  }
  async deleteClient(id: string) {
    await (await this.db()).delete('clients', id);
  }

  async getProjects() {
    return (await this.db()).getAll('projects');
  }
  async getProject(id: string) {
    return (await this.db()).get('projects', id);
  }
  async saveProject(project: Project) {
    await (await this.db()).put('projects', project);
  }
  async deleteProject(id: string) {
    const db = await this.db();
    const tx = db.transaction(['projects', 'photos'], 'readwrite');
    const photoKeys = await tx.objectStore('photos').index('projectId').getAllKeys(id);
    await Promise.all([...photoKeys.map((k) => tx.objectStore('photos').delete(k)), tx.objectStore('projects').delete(id)]);
    await tx.done;
  }

  async getQuotes() {
    return (await this.db()).getAll('quotes');
  }
  async getQuote(id: string) {
    return (await this.db()).get('quotes', id);
  }
  async saveQuote(quote: Quote) {
    await (await this.db()).put('quotes', quote);
  }
  async deleteQuote(id: string) {
    await (await this.db()).delete('quotes', id);
  }

  async getCatalog() {
    return (await this.db()).getAll('catalog');
  }
  async saveCatalogItem(item: CatalogItem) {
    await (await this.db()).put('catalog', item);
  }
  async deleteCatalogItem(id: string) {
    await (await this.db()).delete('catalog', id);
  }

  async getTemplates() {
    return (await this.db()).getAll('templates');
  }
  async saveTemplate(template: QuoteTemplate) {
    await (await this.db()).put('templates', template);
  }
  async deleteTemplate(id: string) {
    await (await this.db()).delete('templates', id);
  }

  async getPhotoMetas() {
    const db = await this.db();
    const metas: PhotoMeta[] = [];
    let cursor = await db.transaction('photos').store.openCursor();
    while (cursor) {
      metas.push(toMeta(cursor.value));
      cursor = await cursor.continue();
    }
    return metas;
  }
  async getPhoto(id: string) {
    return (await this.db()).get('photos', id);
  }
  async savePhoto(photo: PhotoRecord) {
    await (await this.db()).put('photos', photo);
  }
  async deletePhoto(id: string) {
    await (await this.db()).delete('photos', id);
  }

  async getActivity() {
    return (await this.db()).getAll('activity');
  }
  async addActivity(event: ActivityEvent) {
    await (await this.db()).put('activity', event);
  }

  async addRecord<K extends keyof ProductRecords>(store: K, value: ProductRecords[K]) {
    // Les 4 magasins ont la même forme (clé « id ») : le typage générique d'idb ne sait pas l'exprimer.
    await (await this.db()).put(store as 'leads', value as BetaLead);
  }
  async getRecords<K extends keyof ProductRecords>(store: K): Promise<ProductRecords[K][]> {
    return (await (await this.db()).getAll(store as 'leads')) as unknown as ProductRecords[K][];
  }
  async clearRecords(store: keyof ProductRecords) {
    await (await this.db()).clear(store);
  }

  async exportAll(): Promise<ExportFile> {
    const db = await this.db();
    const photos = await db.getAll('photos');
    return {
      app: 'paysapro-ai',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: await this.getSettings(),
      user: await this.getUser(),
      clients: await db.getAll('clients'),
      projects: await db.getAll('projects'),
      quotes: await db.getAll('quotes'),
      catalog: await db.getAll('catalog'),
      templates: await db.getAll('templates'),
      activity: await db.getAll('activity'),
      photos: await Promise.all(
        photos.map(async (p) => ({ ...toMeta(p), thumbDataUrl: await blobToDataUrl(p.thumb), mediumDataUrl: await blobToDataUrl(p.medium) })),
      ),
    };
  }

  async importAll(data: ExportFile) {
    // Conversion des images AVANT la transaction (une transaction IndexedDB ne doit pas attendre).
    const photos: PhotoRecord[] = data.photos.map(({ thumbDataUrl, mediumDataUrl, ...meta }) => ({
      ...meta,
      thumb: dataUrlToBlob(thumbDataUrl),
      medium: dataUrlToBlob(mediumDataUrl),
    }));
    const db = await this.db();
    const tx = db.transaction(BUSINESS_STORES, 'readwrite');
    await Promise.all(BUSINESS_STORES.map((s) => tx.objectStore(s).clear()));
    const ops: Promise<unknown>[] = [];
    if (data.settings) ops.push(tx.objectStore('settings').put(data.settings, SINGLETON));
    if (data.user) ops.push(tx.objectStore('user').put(data.user, SINGLETON));
    data.clients.forEach((c) => ops.push(tx.objectStore('clients').put(c)));
    data.projects.forEach((p) => ops.push(tx.objectStore('projects').put(p)));
    data.quotes.forEach((q) => ops.push(tx.objectStore('quotes').put(q)));
    data.catalog.forEach((c) => ops.push(tx.objectStore('catalog').put(c)));
    (data.templates ?? []).forEach((t) => ops.push(tx.objectStore('templates').put(t)));
    data.activity.forEach((a) => ops.push(tx.objectStore('activity').put(a)));
    photos.forEach((p) => ops.push(tx.objectStore('photos').put(p)));
    await Promise.all(ops);
    await tx.done;
  }

  async clearAll() {
    const db = await this.db();
    const stores = [...BUSINESS_STORES, 'leads', 'messages', 'feedback', 'analytics'] as const;
    const tx = db.transaction(stores, 'readwrite');
    await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
    await tx.done;
  }
}
