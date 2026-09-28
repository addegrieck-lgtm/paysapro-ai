// Couche d'abstraction du stockage.
//
// Le MVP utilise IndexedDBProvider (données sur l'appareil, sans compte ni serveur).
// Pour passer au cloud (ex. SupabaseProvider), il suffira d'implémenter cette interface
// et de la brancher dans services/storage/index.ts — sans réécrire l'application.
import type {
  ActivityEvent,
  AppSettings,
  CatalogItem,
  Client,
  ExportFile,
  ID,
  PhotoMeta,
  PhotoRecord,
  Project,
  Quote,
} from '../../types';

export interface StorageProvider {
  readonly name: string;

  getSettings(): Promise<AppSettings | null>;
  saveSettings(settings: AppSettings): Promise<void>;

  getClients(): Promise<Client[]>;
  getClient(id: ID): Promise<Client | undefined>;
  saveClient(client: Client): Promise<void>;
  deleteClient(id: ID): Promise<void>;

  getProjects(): Promise<Project[]>;
  getProject(id: ID): Promise<Project | undefined>;
  saveProject(project: Project): Promise<void>;
  deleteProject(id: ID): Promise<void>;

  getQuotes(): Promise<Quote[]>;
  getQuote(id: ID): Promise<Quote | undefined>;
  saveQuote(quote: Quote): Promise<void>;
  deleteQuote(id: ID): Promise<void>;

  getCatalog(): Promise<CatalogItem[]>;
  saveCatalogItem(item: CatalogItem): Promise<void>;
  deleteCatalogItem(id: ID): Promise<void>;

  /** Métadonnées de toutes les photos (sans les images, pour rester léger) */
  getPhotoMetas(): Promise<PhotoMeta[]>;
  getPhoto(id: ID): Promise<PhotoRecord | undefined>;
  savePhoto(photo: PhotoRecord): Promise<void>;
  deletePhoto(id: ID): Promise<void>;

  getActivity(): Promise<ActivityEvent[]>;
  addActivity(event: ActivityEvent): Promise<void>;

  exportAll(): Promise<ExportFile>;
  /** Remplace toutes les données par celles du fichier */
  importAll(data: ExportFile): Promise<void>;
  clearAll(): Promise<void>;
}
