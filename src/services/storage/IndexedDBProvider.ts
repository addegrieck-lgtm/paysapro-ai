// Stockage local persistant (IndexedDB) : les données restent après fermeture du navigateur,
// fonctionnent hors-ligne et ne quittent jamais l'appareil.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  ActivityEvent,
  AppSettings,
  CatalogItem,
  Client,
  ExportFile,
  PhotoMeta,
  PhotoRecord,
  Project,
  Quote,
} from '../../types';
import type { StorageProvider } from './StorageProvider';
import { blobToDataUrl, dataUrlToBlob } from './exportFormat';

interface PaysaproDB extends DBSchema {
  settings: { key: string; value: AppSettings };
  clients: { key: string; value: Client };
  projects: { key: string; value: Project };
  quotes: { key: string; value: Quote };
  catalog: { key: string; value: CatalogItem };
  photos: { key: string; value: PhotoRecord; indexes: { projectId: string } };
  activity: { key: string; value: ActivityEvent };
}

const STORES = ['settings', 'clients', 'projects', 'quotes', 'catalog', 'photos', 'activity'] as const;
const SETTINGS_KEY = 'app';

function toMeta(p: PhotoRecord): PhotoMeta {
  return {
    id: p.id,
    projectId: p.projectId,
    tag: p.tag,
    caption: p.caption,
    width: p.width,
    height: p.height,
    createdAt: p.createdAt,
  };
}

export class IndexedDBProvider implements StorageProvider {
  readonly name = 'Stockage local (IndexedDB)';
  private dbPromise: Promise<IDBPDatabase<PaysaproDB>>;

  constructor(dbName = 'paysapro-ai') {
    this.dbPromise = openDB<PaysaproDB>(dbName, 1, {
      upgrade(db) {
        db.createObjectStore('settings');
        db.createObjectStore('clients', { keyPath: 'id' });
        db.createObjectStore('projects', { keyPath: 'id' });
        db.createObjectStore('quotes', { keyPath: 'id' });
        db.createObjectStore('catalog', { keyPath: 'id' });
        const photos = db.createObjectStore('photos', { keyPath: 'id' });
        photos.createIndex('projectId', 'projectId');
        db.createObjectStore('activity', { keyPath: 'id' });
      },
    });
  }

  private db() {
    return this.dbPromise;
  }

  async getSettings() {
    return (await (await this.db()).get('settings', SETTINGS_KEY)) ?? null;
  }
  async saveSettings(settings: AppSettings) {
    await (await this.db()).put('settings', settings, SETTINGS_KEY);
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

  async exportAll(): Promise<ExportFile> {
    const db = await this.db();
    const photos = await db.getAll('photos');
    return {
      app: 'paysapro-ai',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: await this.getSettings(),
      clients: await db.getAll('clients'),
      projects: await db.getAll('projects'),
      quotes: await db.getAll('quotes'),
      catalog: await db.getAll('catalog'),
      activity: await db.getAll('activity'),
      photos: await Promise.all(
        photos.map(async (p) => ({
          ...toMeta(p),
          thumbDataUrl: await blobToDataUrl(p.thumb),
          mediumDataUrl: await blobToDataUrl(p.medium),
        })),
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
    const tx = db.transaction(STORES, 'readwrite');
    await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));
    const ops: Promise<unknown>[] = [];
    if (data.settings) ops.push(tx.objectStore('settings').put(data.settings, SETTINGS_KEY));
    data.clients.forEach((c) => ops.push(tx.objectStore('clients').put(c)));
    data.projects.forEach((p) => ops.push(tx.objectStore('projects').put(p)));
    data.quotes.forEach((q) => ops.push(tx.objectStore('quotes').put(q)));
    data.catalog.forEach((c) => ops.push(tx.objectStore('catalog').put(c)));
    data.activity.forEach((a) => ops.push(tx.objectStore('activity').put(a)));
    photos.forEach((p) => ops.push(tx.objectStore('photos').put(p)));
    await Promise.all(ops);
    await tx.done;
  }

  async clearAll() {
    const db = await this.db();
    const tx = db.transaction(STORES, 'readwrite');
    await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));
    await tx.done;
  }
}
