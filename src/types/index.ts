// Types métier de Paysapro AI.
// Toutes les données sont sérialisables en JSON (sauf les Blob des photos, convertis à l'export).
//
// Modèle conceptuel (prêt pour une base cloud multi-utilisateurs, cf. docs/MIGRATION-SUPABASE.md) :
//   User 1─1 Company (réglages) 1─n Client 1─n Project 1─1 Quote
//                                  Project 1─n Photo · Company 1─n CatalogItem · Company 1─n QuoteTemplate
// En local, un seul utilisateur par appareil : l'identifiant de propriétaire est implicite.

export type ID = string;
/** Date ISO 8601 (ex. 2026-09-28T10:15:00.000Z) */
export type ISODate = string;

// ───────────────────────── Compte ─────────────────────────

export interface User {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  /** 'local' : compte sur cet appareil uniquement (aucun mot de passe stocké) */
  provider: 'local' | 'cloud';
  createdAt: ISODate;
}

// ───────────────────────── Entreprise ─────────────────────────

/** Services à la personne : informations déclarées et vérifiées par l'entreprise elle-même */
export interface SapSettings {
  enabled: boolean;
  /** Numéro de déclaration SAP (ex. SAP123456789) */
  number: string;
  /** Date d'enregistrement de la déclaration (AAAA-MM-JJ) */
  declarationDate: string;
  /** Activité déclarée (ex. « Petits travaux de jardinage ») */
  activity: string;
  /** Informations complémentaires imprimées sur les documents SAP */
  notes: string;
}

export interface CompanySettings {
  name: string;
  logoDataUrl: string | null;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  siret: string;
  vatNumber: string;
  /** Micro-entreprise : « TVA non applicable, art. 293 B du CGI » */
  vatExempt: boolean;
  iban: string;
  /** Mentions / conditions générales imprimées sur les devis */
  terms: string;
  /** Couleur principale des devis (hexadécimal) */
  brandColor: string;
  /** Pied de page des devis (mentions, assurance, etc.) */
  quoteFooter: string;
  sap: SapSettings;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type TextSize = 'normal' | 'large';
export type AIMode = 'local' | 'demo';

export type Activity =
  | 'landscaper'
  | 'gardener'
  | 'maintenance'
  | 'garden_design'
  | 'earthwork'
  | 'tree_care'
  | 'fencing'
  | 'other';

export type Goal = 'faster_quotes' | 'clients' | 'site_tracking' | 'margins' | 'ai' | 'all';

export type NotificationKind = 'signed' | 'viewed' | 'expired' | 'work_done' | 'new_client' | 'info';

export interface AppSettings {
  schemaVersion: number;
  company: CompanySettings;
  owner: { firstName: string; lastName: string };
  activities: Activity[];
  mainServices: string[];
  goal: Goal | null;
  vatRate: number;
  /** Marge appliquée par défaut pour proposer un prix de vente à partir d'un coût */
  defaultMarginPercent: number;
  defaultDepositPercent: number;
  quoteValidityDays: number;
  quotePrefix: string;
  /** Compteur de numérotation : remis à 1 chaque nouvelle année */
  quoteCounter: { year: number; next: number };
  hourlyRate: number;
  dailyRate: number;
  theme: ThemePreference;
  textSize: TextSize;
  aiMode: AIMode;
  /** Consentement explicite avant tout envoi vers un service IA externe */
  externalAIConsent: boolean;
  /** Types de notifications affichées dans l'application */
  notificationPrefs: Record<Exclude<NotificationKind, 'info'>, boolean>;
  onboardingDone: boolean;
}

// ───────────────────────── Clients ─────────────────────────

export interface Client {
  id: ID;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  notes: string;
  isDemo?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ───────────────────────── Chantiers ─────────────────────────

export type ProjectCategory =
  | 'creation'
  | 'maintenance'
  | 'terrace'
  | 'lawn'
  | 'planting'
  | 'fence'
  | 'earthwork'
  | 'pruning_trees'
  | 'hedge_trimming'
  | 'full_landscaping'
  | 'other';

export type ZoneShape = 'rectangle' | 'triangle' | 'circle' | 'manual';

export interface MeasureZone {
  id: ID;
  name: string;
  shape: ZoneShape;
  /** rectangle : longueur ; triangle : base */
  length: number | null;
  /** rectangle : largeur ; triangle : hauteur */
  width: number | null;
  /** cercle */
  radius: number | null;
  /** surface saisie directement (forme libre) */
  manualArea: number | null;
  /** Zone à déduire (ex. emprise d'une maison, d'un bassin) */
  subtract: boolean;
  /** Mesure approximative (mode rapide) : affichée « à confirmer » */
  approximate: boolean;
}

export interface LinearMeasure {
  id: ID;
  name: string;
  length: number | null;
  approximate: boolean;
}

export type EstimateMode = 'precise' | 'quick';

export type WorkStage = 'planned' | 'preparing' | 'in_progress' | 'on_hold' | 'done' | 'archived';

export interface ChecklistItem {
  id: ID;
  label: string;
  done: boolean;
}

export interface WorkTracking {
  stage: WorkStage;
  startDate: string | null; // AAAA-MM-JJ
  endDate: string | null;
  checklist: ChecklistItem[];
  notes: string;
  createdAt: ISODate;
}

export interface Project {
  id: ID;
  clientId: ID;
  title: string;
  categories: ProjectCategory[];
  description: string;
  siteAddress: string;
  /** Notes internes : jamais visibles par le client */
  privateNotes: string;
  estimateMode: EstimateMode;
  zones: MeasureZone[];
  linears: LinearMeasure[];
  quoteId: ID | null;
  work: WorkTracking | null;
  isDemo?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Statut affiché d'un chantier (calculé à partir du devis et du suivi) */
export type ProjectStatus =
  | 'draft'
  | 'quoting'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'signed'
  | 'deposit_paid'
  | 'in_progress'
  | 'done';

// ───────────────────────── Photos ─────────────────────────

export type PhotoTag = 'before' | 'zone' | 'overview' | 'detail' | 'during' | 'after';

export interface PhotoMeta {
  id: ID;
  projectId: ID;
  tag: PhotoTag;
  caption: string;
  width: number;
  height: number;
  createdAt: ISODate;
}

export interface PhotoRecord extends PhotoMeta {
  thumb: Blob;
  medium: Blob;
}

// ───────────────────────── Catalogue ─────────────────────────

export type Unit = 'm2' | 'm' | 'ml' | 'm3' | 'unit' | 'flat' | 'hour' | 'day';

export type LineKind =
  | 'service'
  | 'material'
  | 'plant'
  | 'labor'
  | 'rental'
  | 'transport'
  | 'disposal'
  | 'consumable';

/** Comment la quantité est calculée à partir des mesures du chantier */
export type QuantityRule = 'area' | 'length' | 'volume' | 'manual';

export interface CatalogItem {
  id: ID;
  section: string;
  label: string;
  description: string;
  unit: Unit;
  /** Prix de vente unitaire HT (ce que voit le client) */
  unitPrice: number;
  /** Prix d'achat / coût de revient unitaire HT (interne, jamais montré au client) */
  costPrice: number;
  kind: LineKind;
  quantityRule: QuantityRule;
  /** Pertes / chutes en % ajoutées à la quantité mesurée */
  wastePercent: number;
  /** Épaisseur par défaut en cm (règle « volume ») */
  thicknessCm: number | null;
  /** Prestation relevant des services à la personne : choisi par l'entreprise, jamais déduit */
  sapEligible?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ───────────────────────── Devis ─────────────────────────

/** Référence de mesure utilisée pour calculer la quantité d'une ligne */
export type MeasureRef = { type: 'manual' } | { type: 'total' } | { type: 'zone'; id: ID } | { type: 'linear'; id: ID };

export interface QuoteLine {
  id: ID;
  catalogItemId: ID | null;
  label: string;
  description: string;
  kind: LineKind;
  unit: Unit;
  quantityRule: QuantityRule;
  measureRef: MeasureRef;
  /** Quantité saisie à la main (utilisée si measureRef = manual) */
  manualQuantity: number | null;
  wastePercent: number;
  thicknessCm: number | null;
  /** Prix de vente unitaire HT */
  unitPrice: number;
  /** Coût unitaire HT (interne) */
  unitCost: number;
  sapEligible?: boolean;
}

export type QuoteStatus = 'draft' | 'ready' | 'sent' | 'viewed' | 'accepted' | 'signed' | 'refused';

export interface SignatureRecord {
  /** 'online' : signée par le client via le lien public (date et empreinte fixées par le serveur) */
  provider: 'local' | 'electronic' | 'online';
  signerName: string;
  signedAt: ISODate;
  imageDataUrl: string;
  /** Empreinte SHA-256 du contenu du devis au moment de la signature */
  contentHash: string;
  userAgent: string;
}

export type PaymentMethod = 'transfer' | 'check' | 'cash' | 'card' | 'cesu' | 'other';

export interface PaymentRecord {
  id: ID;
  kind: 'deposit' | 'balance';
  amount: number;
  method: PaymentMethod;
  date: ISODate;
  provider: string;
  reference: string;
}

export interface Quote {
  id: ID;
  projectId: ID;
  clientId: ID;
  /** null tant que le devis n'est pas finalisé (« Créer le devis ») */
  number: string | null;
  publicToken: string | null;
  status: QuoteStatus;
  issueDate: ISODate | null;
  validityDays: number;
  description: string;
  lines: QuoteLine[];
  vatRate: number;
  vatExempt: boolean;
  depositPercent: number;
  terms: string;
  includedPhotoIds: ID[];
  sentAt: ISODate | null;
  viewedAt: ISODate | null;
  acceptedAt: ISODate | null;
  refusedAt: ISODate | null;
  signature: SignatureRecord | null;
  payments: PaymentRecord[];
  isDemo?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ───────────────────────── Modèles de devis ─────────────────────────

export interface QuoteTemplate {
  id: ID;
  name: string;
  description: string;
  categories: ProjectCategory[];
  /** Prestations du catalogue (par libellé) + quantité facultative */
  items: { label: string; quantity: number | null }[];
  /** Lignes complètes (modèles créés à partir d'un devis) */
  lines: Omit<QuoteLine, 'id'>[];
  builtIn: boolean;
  createdAt: ISODate;
}

// ───────────────────────── Journal d'activité & notifications ─────────────────────────

export interface ActivityEvent {
  id: ID;
  projectId: ID | null;
  message: string;
  kind?: NotificationKind;
  /** Affiché dans le centre de notifications */
  notify?: boolean;
  read?: boolean;
  createdAt: ISODate;
}

// ───────────────────────── Bêta, contact, feedback, analytics ─────────────────────────

export interface BetaLead {
  id: ID;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  activity: string;
  teamSize: string;
  quotesPerMonth: string;
  currentSoftware: string;
  mainProblem: string;
  comment: string;
  createdAt: ISODate;
}

export interface ContactMessage {
  id: ID;
  name: string;
  email: string;
  message: string;
  createdAt: ISODate;
}

export interface FeedbackEntry {
  id: ID;
  rating: number | null;
  likes: string;
  missing: string;
  timeWasters: string;
  wishedFeature: string;
  createdAt: ISODate;
}

export type AnalyticsEventName =
  | 'app_opened'
  | 'account_created'
  | 'onboarding_completed'
  | 'client_created'
  | 'project_created'
  | 'quote_created'
  | 'quote_sent'
  | 'quote_viewed'
  | 'quote_signed'
  | 'pdf_generated'
  | 'ai_used'
  | 'beta_form_submitted'
  | 'contact_submitted'
  | 'feedback_submitted'
  | 'demo_opened';

export interface AnalyticsEvent {
  id: ID;
  name: AnalyticsEventName;
  props: Record<string, string | number | boolean>;
  createdAt: ISODate;
}

// ───────────────────────── Export ─────────────────────────

export interface ExportedPhoto extends PhotoMeta {
  thumbDataUrl: string;
  mediumDataUrl: string;
}

export interface ExportFile {
  app: 'paysapro-ai';
  version: 1;
  exportedAt: ISODate;
  settings: AppSettings | null;
  clients: Client[];
  projects: Project[];
  quotes: Quote[];
  catalog: CatalogItem[];
  photos: ExportedPhoto[];
  activity: ActivityEvent[];
  /** Ajouté en v0.1 bêta (absent des anciennes sauvegardes) */
  templates?: QuoteTemplate[];
  user?: User | null;
}
