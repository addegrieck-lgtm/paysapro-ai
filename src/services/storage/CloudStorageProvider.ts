// Fournisseur de stockage cloud.
//
// Il s'appuie sur un contrat minimal (CloudApi), implémenté avec Supabase dans
// services/cloud/SupabaseApi.ts : tables clients, projects, quotes, catalog_items, quote_templates,
// activity_events ; photos dans un bucket privé ; isolation par company_id + règles RLS.
// Seule une clé publique (« anon ») peut vivre dans le navigateur : jamais de clé secrète.
//
// Les données « produit » (inscriptions bêta, messages de contact, feedback, analytics locales)
// ne sont pas des données de l'entreprise : elles restent sur l'appareil pour l'instant.
import type { ActivityEvent, AppSettings, CatalogItem, Client, ExportFile, ExportedPhoto, PhotoMeta, PhotoRecord, Project, Quote, QuoteTemplate, User } from '../../types';
import type { ProductRecords, StorageProvider } from './StorageProvider';
import { blobToDataUrl, dataUrlToBlob } from './exportFormat';

export type CloudTable = 'settings' | 'user' | 'photos' | 'clients' | 'projects' | 'quotes' | 'catalog' | 'templates' | 'activity';

/** Contrat minimal qu'un backend doit fournir. */
export interface CloudApi {
  list<T>(table: CloudTable): Promise<T[]>;
  get<T>(table: CloudTable, id: string): Promise<T | undefined>;
  upsert<T extends object>(table: CloudTable, id: string, value: T): Promise<void>;
  remove(table: CloudTable, id: string): Promise<void>;
  /** Supprime toutes les données métier de l'entreprise */
  removeAll(): Promise<void>;
  uploadPhoto(photo: PhotoRecord): Promise<void>;
  downloadPhoto(id: string): Promise<PhotoRecord | undefined>;
  listPhotoMetas(): Promise<PhotoMeta[]>;
  downloadPhotoBlob(id: string, quality: 'thumb' | 'medium'): Promise<Blob | undefined>;
  publishQuote(id: string, view: object): Promise<void>;
}

/** Stockage des données « produit », conservées sur l'appareil. */
type LocalRecords = Pick<StorageProvider, 'addRecord' | 'getRecords' | 'clearRecords'>;

export class CloudStorageProvider implements StorageProvider {
  readonly name = 'Stockage en ligne';
  private client: CloudApi;
  private local: LocalRecords;

  constructor(api: CloudApi, local: LocalRecords) {
    this.client = api;
    this.local = local;
  }

  getUser = () => this.client.get<User>('user', 'me').then((u) => u ?? null);
  saveUser = (u: object) => this.client.upsert('user', 'me', u);
  getSettings = () => this.client.get<AppSettings>('settings', 'app').then((s) => s ?? null);
  saveSettings = (s: object) => this.client.upsert('settings', 'app', s);
  getClients = () => this.client.list<Client>('clients');
  getClient = (id: string) => this.client.get<Client>('clients', id);
  saveClient = (c: { id: string }) => this.client.upsert('clients', c.id, c);
  deleteClient = (id: string) => this.client.remove('clients', id);
  getProjects = () => this.client.list<Project>('projects');
  getProject = (id: string) => this.client.get<Project>('projects', id);
  saveProject = (p: { id: string }) => this.client.upsert('projects', p.id, p);
  deleteProject = (id: string) => this.client.remove('projects', id);
  getQuotes = () => this.client.list<Quote>('quotes');
  getQuote = (id: string) => this.client.get<Quote>('quotes', id);
  saveQuote = (q: { id: string }) => this.client.upsert('quotes', q.id, q);
  deleteQuote = (id: string) => this.client.remove('quotes', id);
  getCatalog = () => this.client.list<CatalogItem>('catalog');
  saveCatalogItem = (c: { id: string }) => this.client.upsert('catalog', c.id, c);
  deleteCatalogItem = (id: string) => this.client.remove('catalog', id);
  getTemplates = () => this.client.list<QuoteTemplate>('templates');
  saveTemplate = (t: { id: string }) => this.client.upsert('templates', t.id, t);
  deleteTemplate = (id: string) => this.client.remove('templates', id);
  getPhotoMetas = () => this.client.listPhotoMetas();
  getPhoto = (id: string) => this.client.downloadPhoto(id);
  savePhoto = (p: PhotoRecord) => this.client.uploadPhoto(p);
  deletePhoto = (id: string) => this.client.remove('photos', id);
  getActivity = () => this.client.list<ActivityEvent>('activity');
  addActivity = (a: { id: string }) => this.client.upsert('activity', a.id, a);

  addRecord = <K extends keyof ProductRecords>(store: K, value: ProductRecords[K]) => this.local.addRecord(store, value);
  getRecords = <K extends keyof ProductRecords>(store: K) => this.local.getRecords(store);
  clearRecords = (store: keyof ProductRecords) => this.local.clearRecords(store);

  exportAll = async (): Promise<ExportFile> => {
    const [settings, clients, projects, quotes, catalog, templates, activity, metas, user] = await Promise.all([
      this.getSettings(),
      this.getClients(),
      this.getProjects(),
      this.getQuotes(),
      this.getCatalog(),
      this.getTemplates(),
      this.getActivity(),
      this.getPhotoMetas(),
      this.getUser(),
    ]);
    const photos: ExportedPhoto[] = [];
    for (const meta of metas) {
      const record = await this.getPhoto(meta.id);
      if (!record) continue;
      const { thumb, medium, ...rest } = record;
      photos.push({ ...rest, thumbDataUrl: await blobToDataUrl(thumb), mediumDataUrl: await blobToDataUrl(medium) });
    }
    return { app: 'paysapro-ai', version: 1, exportedAt: new Date().toISOString(), settings, clients, projects, quotes, catalog, photos, activity, templates, user };
  };

  importAll = async (data: ExportFile): Promise<void> => {
    await this.client.removeAll();
    if (data.settings) await this.saveSettings(data.settings);
    // Ordre imposé par les relations : clients → chantiers → devis → photos.
    for (const c of data.clients) await this.saveClient(c);
    for (const p of data.projects) await this.saveProject(p);
    for (const q of data.quotes) await this.saveQuote(q);
    for (const c of data.catalog) await this.saveCatalogItem(c);
    for (const t of data.templates ?? []) await this.saveTemplate(t);
    for (const a of data.activity) await this.addActivity(a);
    for (const { thumbDataUrl, mediumDataUrl, ...meta } of data.photos) {
      await this.savePhoto({ ...meta, thumb: dataUrlToBlob(thumbDataUrl), medium: dataUrlToBlob(mediumDataUrl) });
    }
  };

  getPhotoBlob = (id: string, quality: 'thumb' | 'medium') => this.client.downloadPhotoBlob(id, quality);
  publishQuote = (id: string, view: object) => this.client.publishQuote(id, view);

  clearAll = () => this.client.removeAll();
}
