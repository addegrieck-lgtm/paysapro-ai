// Couche d'abstraction du stockage.
//
//   StorageProvider
//   ├── IndexedDBProvider     (bêta : données sur l'appareil, sans compte ni serveur)
//   └── CloudStorageProvider  (futur : Supabase / Firebase / API, cf. docs/MIGRATION-SUPABASE.md)
//
// Toute l'application passe par cette interface : changer de fournisseur ne demande pas
// de réécrire les écrans.
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
  ID,
  PhotoMeta,
  PhotoRecord,
  Project,
  Quote,
  QuoteTemplate,
  User,
} from '../../types';

export interface ProductRecords {
  leads: BetaLead;
  messages: ContactMessage;
  feedback: FeedbackEntry;
  analytics: AnalyticsEvent;
}

export interface StorageProvider {
  readonly name: string;

  getUser(): Promise<User | null>;
  saveUser(user: User): Promise<void>;

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

  getTemplates(): Promise<QuoteTemplate[]>;
  saveTemplate(template: QuoteTemplate): Promise<void>;
  deleteTemplate(id: ID): Promise<void>;

  /** Métadonnées de toutes les photos (sans les images, pour rester léger) */
  getPhotoMetas(): Promise<PhotoMeta[]>;
  getPhoto(id: ID): Promise<PhotoRecord | undefined>;
  savePhoto(photo: PhotoRecord): Promise<void>;
  deletePhoto(id: ID): Promise<void>;

  getActivity(): Promise<ActivityEvent[]>;
  addActivity(event: ActivityEvent): Promise<void>;

  // Données « produit » (bêta, contact, feedback, analytics) : jamais exportées avec les données métier.
  addRecord<K extends keyof ProductRecords>(store: K, value: ProductRecords[K]): Promise<void>;
  getRecords<K extends keyof ProductRecords>(store: K): Promise<ProductRecords[K][]>;
  clearRecords(store: keyof ProductRecords): Promise<void>;

  /** Facultatif : une seule taille d'une photo (évite de télécharger la grande image pour une vignette). */
  getPhotoBlob?(id: ID, quality: 'thumb' | 'medium'): Promise<Blob | undefined>;

  /** Mode cloud uniquement : enregistre la vue publique d'un devis (lien client). */
  publishQuote?(id: ID, view: object): Promise<void>;

  exportAll(): Promise<ExportFile>;
  /** Remplace toutes les données métier par celles du fichier (déjà migré) */
  importAll(data: ExportFile): Promise<void>;
  clearAll(): Promise<void>;
}
