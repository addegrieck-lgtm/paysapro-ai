// Fournisseur de stockage cloud — PRÉPARÉ, NON ACTIF.
//
// Il suffira d'implémenter CloudApi (ex. avec le client Supabase : tables clients, projects, quotes,
// catalog, templates, activity ; photos dans Supabase Storage ; filtrage par user_id + règles RLS)
// puis de l'utiliser dans services/storage/index.ts. Voir docs/MIGRATION-SUPABASE.md.
// Seule une clé publique (« anon ») peut vivre dans le navigateur : jamais de clé secrète.
import type { ExportFile, PhotoRecord } from '../../types';
import type { ProductRecords, StorageProvider } from './StorageProvider';

type Table = 'settings' | 'user' | 'photos' | 'clients' | 'projects' | 'quotes' | 'catalog' | 'templates' | 'activity' | keyof ProductRecords;

/** Contrat minimal qu'un backend doit fournir. */
export interface CloudApi {
  list<T>(table: Table): Promise<T[]>;
  get<T>(table: Table, id: string): Promise<T | undefined>;
  upsert<T extends object>(table: Table, id: string, value: T): Promise<void>;
  remove(table: Table, id: string): Promise<void>;
  uploadPhoto(photo: PhotoRecord): Promise<void>;
  downloadPhoto(id: string): Promise<PhotoRecord | undefined>;
  listPhotoMetas(): Promise<Omit<PhotoRecord, 'thumb' | 'medium'>[]>;
}

export class CloudNotConfiguredError extends Error {
  constructor() {
    super('Le stockage en ligne n’est pas encore disponible. Vos données restent sur cet appareil.');
  }
}

export const CLOUD_STORAGE_AVAILABLE = false;

export class CloudStorageProvider implements StorageProvider {
  readonly name = 'Stockage en ligne';
  private api: CloudApi | null;

  constructor(api: CloudApi | null = null) {
    this.api = api;
  }

  private get client(): CloudApi {
    if (!this.api) throw new CloudNotConfiguredError();
    return this.api;
  }

  getUser = () => this.client.get<never>('user', 'me').then((u) => u ?? null);
  saveUser = (u: object) => this.client.upsert('user', 'me', u);
  getSettings = () => this.client.get<never>('settings', 'app').then((s) => s ?? null);
  saveSettings = (s: object) => this.client.upsert('settings', 'app', s);
  getClients = () => this.client.list<never>('clients');
  getClient = (id: string) => this.client.get<never>('clients', id);
  saveClient = (c: { id: string }) => this.client.upsert('clients', c.id, c);
  deleteClient = (id: string) => this.client.remove('clients', id);
  getProjects = () => this.client.list<never>('projects');
  getProject = (id: string) => this.client.get<never>('projects', id);
  saveProject = (p: { id: string }) => this.client.upsert('projects', p.id, p);
  deleteProject = (id: string) => this.client.remove('projects', id);
  getQuotes = () => this.client.list<never>('quotes');
  getQuote = (id: string) => this.client.get<never>('quotes', id);
  saveQuote = (q: { id: string }) => this.client.upsert('quotes', q.id, q);
  deleteQuote = (id: string) => this.client.remove('quotes', id);
  getCatalog = () => this.client.list<never>('catalog');
  saveCatalogItem = (c: { id: string }) => this.client.upsert('catalog', c.id, c);
  deleteCatalogItem = (id: string) => this.client.remove('catalog', id);
  getTemplates = () => this.client.list<never>('templates');
  saveTemplate = (t: { id: string }) => this.client.upsert('templates', t.id, t);
  deleteTemplate = (id: string) => this.client.remove('templates', id);
  getPhotoMetas = () => this.client.listPhotoMetas();
  getPhoto = (id: string) => this.client.downloadPhoto(id);
  savePhoto = (p: PhotoRecord) => this.client.uploadPhoto(p);
  deletePhoto = (id: string) => this.client.remove('photos', id);
  getActivity = () => this.client.list<never>('activity');
  addActivity = (a: { id: string }) => this.client.upsert('activity', a.id, a);
  addRecord = <K extends keyof ProductRecords>(store: K, value: ProductRecords[K]) => this.client.upsert(store, value.id, value);
  getRecords = <K extends keyof ProductRecords>(store: K) => this.client.list<ProductRecords[K]>(store);
  clearRecords = async () => {
    throw new CloudNotConfiguredError();
  };
  exportAll = async (): Promise<ExportFile> => {
    throw new CloudNotConfiguredError();
  };
  importAll = async () => {
    throw new CloudNotConfiguredError();
  };
  clearAll = async () => {
    throw new CloudNotConfiguredError();
  };
}
