// Implémentation Supabase du contrat CloudApi (voir services/storage/CloudStorageProvider.ts).
//
// • Chaque ligne porte company_id ; les règles RLS (supabase/migrations) garantissent qu'un
//   utilisateur ne lit et n'écrit que les données de son entreprise. Le filtre company_id posé
//   ici n'est qu'un confort : la sécurité est dans la base, pas dans ce fichier.
// • Les écritures passent par une file d'attente : elles arrivent au serveur dans l'ordre où
//   l'application les a émises (un chantier n'est jamais enregistré avant son client).
// • Les photos vont dans le bucket privé « photos » : {company_id}/{photo_id}/thumb|medium.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppSettings, PhotoMeta, PhotoRecord, User } from '../../types';
import type { CloudApi, CloudTable } from '../storage/CloudStorageProvider';
import type { CloudSession } from './client';

const TABLE: Partial<Record<CloudTable, string>> = {
  clients: 'clients',
  projects: 'projects',
  quotes: 'quotes',
  catalog: 'catalog_items',
  templates: 'quote_templates',
  activity: 'activity_events',
  photos: 'project_photos',
};

/** Tables dont les lignes sont masquées (deleted_at) plutôt que supprimées : l'historique est conservé. */
const SOFT_DELETE = new Set<CloudTable>(['clients', 'projects', 'quotes']);

const PAGE = 1000;
const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const uuidOrNull = (v: unknown): string | null => (typeof v === 'string' && UUID.test(v) ? v : null);

/** Colonnes relationnelles sorties de l'objet pour les clés étrangères, index et recherches. */
function columns(table: CloudTable, value: Record<string, unknown>): Record<string, unknown> {
  switch (table) {
    case 'projects':
      return { client_id: uuidOrNull(value.clientId) };
    case 'quotes':
      return {
        project_id: uuidOrNull(value.projectId),
        client_id: uuidOrNull(value.clientId),
        number: value.number ?? null,
        status: value.status ?? 'draft',
        public_token: value.publicToken ?? null,
      };
    case 'photos':
      return { project_id: uuidOrNull(value.projectId) };
    default:
      return {};
  }
}

export class CloudError extends Error {}

export class SupabaseApi implements CloudApi {
  private queue: Promise<unknown> = Promise.resolve();
  private db: SupabaseClient;
  private session: () => CloudSession | null;

  constructor(db: SupabaseClient, session: () => CloudSession | null) {
    this.db = db;
    this.session = session;
  }

  private get companyId(): string | null {
    return this.session()?.companyId ?? null;
  }

  private requireCompany(): string {
    const id = this.companyId;
    if (!id) throw new CloudError('Aucune entreprise : connectez-vous pour enregistrer.');
    return id;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private name(table: CloudTable): string {
    const name = TABLE[table];
    if (!name) throw new CloudError(`Table inconnue : ${table}`);
    return name;
  }

  async list<T>(table: CloudTable): Promise<T[]> {
    const companyId = this.companyId;
    if (!companyId) return [];
    const out: T[] = [];
    for (let from = 0; ; from += PAGE) {
      let query = this.db.from(this.name(table)).select('data').eq('company_id', companyId);
      if (SOFT_DELETE.has(table)) query = query.is('deleted_at', null);
      const { data, error } = await query.order('created_at', { ascending: true }).range(from, from + PAGE - 1);
      if (error) throw new CloudError(error.message);
      out.push(...(data ?? []).map((r) => r.data as T));
      if (!data || data.length < PAGE) break;
    }
    return out;
  }

  async get<T>(table: CloudTable, id: string): Promise<T | undefined> {
    if (table === 'settings') return (await this.getSettings()) as T | undefined;
    if (table === 'user') return (await this.getUser()) as T | undefined;
    const companyId = this.companyId;
    if (!companyId) return undefined;
    const { data, error } = await this.db.from(this.name(table)).select('data').eq('company_id', companyId).eq('id', id).maybeSingle();
    if (error) throw new CloudError(error.message);
    return (data?.data as T | undefined) ?? undefined;
  }

  upsert<T extends object>(table: CloudTable, id: string, value: T): Promise<void> {
    return this.enqueue(async () => {
      if (table === 'settings') return this.saveSettings(value as unknown as AppSettings);
      if (table === 'user') return this.saveUser(value as unknown as User);
      const company_id = this.requireCompany();
      const row = { id, company_id, data: value, ...columns(table, value as Record<string, unknown>), ...(SOFT_DELETE.has(table) ? { deleted_at: null } : {}) };
      const onConflict = table === 'templates' ? 'company_id,id' : 'id';
      const { error } = await this.db.from(this.name(table)).upsert(row, { onConflict });
      if (error) throw new CloudError(error.message);
    });
  }

  remove(table: CloudTable, id: string): Promise<void> {
    return this.enqueue(async () => {
      const company_id = this.requireCompany();
      if (table === 'photos') await this.removePhotoFiles(company_id, [id]);
      const base = this.db.from(this.name(table));
      const { error } = SOFT_DELETE.has(table)
        ? await base.update({ deleted_at: new Date().toISOString() }).eq('company_id', company_id).eq('id', id)
        : await base.delete().eq('company_id', company_id).eq('id', id);
      if (error) throw new CloudError(error.message);
    });
  }

  /** Supprime toutes les données métier de l'entreprise (réservé aux rôles autorisés par RLS). */
  removeAll(): Promise<void> {
    return this.enqueue(async () => {
      const company_id = this.requireCompany();
      const photos = await this.listPhotoMetas();
      await this.removePhotoFiles(
        company_id,
        photos.map((p) => p.id),
      );
      for (const table of ['photos', 'activity', 'quotes', 'projects', 'clients', 'catalog', 'templates'] as const) {
        const { error } = await this.db.from(this.name(table)).delete().eq('company_id', company_id);
        if (error) throw new CloudError(error.message);
      }
      const { error } = await this.db.from('companies').update({ settings: {} }).eq('id', company_id);
      if (error) throw new CloudError(error.message);
    });
  }

  /** Vue publique du devis (lien client). Passe par la file : toujours après l'enregistrement du devis. */
  publishQuote(id: string, view: object): Promise<void> {
    return this.enqueue(async () => {
      const company_id = this.requireCompany();
      const { error } = await this.db.from('quotes').update({ public_view: view, published_at: new Date().toISOString() }).eq('company_id', company_id).eq('id', id);
      if (error) throw new CloudError(error.message);
    });
  }

  // ───── Réglages (ligne de l'entreprise) ─────

  private async getSettings(): Promise<AppSettings | undefined> {
    const companyId = this.companyId;
    if (!companyId) return undefined;
    const { data, error } = await this.db.from('companies').select('settings').eq('id', companyId).maybeSingle();
    if (error) throw new CloudError(error.message);
    const settings = data?.settings as Partial<AppSettings> | undefined;
    return settings && typeof settings.schemaVersion === 'number' ? (settings as AppSettings) : undefined;
  }

  private async saveSettings(settings: AppSettings): Promise<void> {
    const id = this.requireCompany();
    const c = settings.company;
    const { error } = await this.db
      .from('companies')
      .update({ settings, name: c.name, siret: c.siret, address: c.address, postal_code: c.postalCode, city: c.city, phone: c.phone, email: c.email })
      .eq('id', id);
    if (error) throw new CloudError(error.message);
  }

  // ───── Profil ─────

  private async getUser(): Promise<User | undefined> {
    const s = this.session();
    if (!s) return undefined;
    const { data, error } = await this.db.from('profiles').select('first_name, last_name, email, created_at').eq('id', s.userId).maybeSingle();
    if (error) throw new CloudError(error.message);
    return {
      id: s.userId,
      firstName: (data?.first_name as string | undefined) ?? '',
      lastName: (data?.last_name as string | undefined) ?? '',
      email: s.email,
      provider: 'cloud',
      createdAt: (data?.created_at as string | undefined) ?? new Date().toISOString(),
    };
  }

  private async saveUser(user: User): Promise<void> {
    const s = this.session();
    if (!s) throw new CloudError('Connexion requise.');
    const { error } = await this.db.from('profiles').update({ first_name: user.firstName.trim().slice(0, 80), last_name: user.lastName.trim().slice(0, 80) }).eq('id', s.userId);
    if (error) throw new CloudError(error.message);
  }

  // ───── Photos ─────

  private path(companyId: string, photoId: string, kind: 'thumb' | 'medium'): string {
    return `${companyId}/${photoId}/${kind}`;
  }

  private async removePhotoFiles(companyId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const paths = ids.flatMap((id) => [this.path(companyId, id, 'thumb'), this.path(companyId, id, 'medium')]);
    const { error } = await this.db.storage.from('photos').remove(paths);
    if (error) throw new CloudError(error.message);
  }

  uploadPhoto(photo: PhotoRecord): Promise<void> {
    return this.enqueue(async () => {
      const company_id = this.requireCompany();
      const { thumb, medium, ...meta } = photo;
      for (const [kind, blob] of [['thumb', thumb], ['medium', medium]] as const) {
        const contentType = blob.type || 'image/jpeg';
        // Contrôle côté navigateur pour un message clair ; le bucket refuse de toute façon le reste.
        if (!ALLOWED_IMAGE.has(contentType)) throw new CloudError('Format d’image non accepté (JPEG, PNG ou WebP uniquement).');
        if (blob.size > MAX_IMAGE_BYTES) throw new CloudError('Photo trop lourde (5 Mo maximum après compression).');
        const { error } = await this.db.storage.from('photos').upload(this.path(company_id, photo.id, kind), blob, { contentType, upsert: true });
        if (error) throw new CloudError(error.message);
      }
      const { error } = await this.db.from('project_photos').upsert({ id: photo.id, company_id, data: meta, ...columns('photos', meta) }, { onConflict: 'id' });
      if (error) throw new CloudError(error.message);
    });
  }

  async downloadPhoto(id: string): Promise<PhotoRecord | undefined> {
    const companyId = this.companyId;
    if (!companyId) return undefined;
    const meta = await this.get<PhotoMeta>('photos', id);
    if (!meta) return undefined;
    const [thumb, medium] = await Promise.all([
      this.db.storage.from('photos').download(this.path(companyId, id, 'thumb')),
      this.db.storage.from('photos').download(this.path(companyId, id, 'medium')),
    ]);
    if (thumb.error || medium.error || !thumb.data || !medium.data) return undefined;
    return { ...meta, thumb: thumb.data, medium: medium.data };
  }

  listPhotoMetas(): Promise<PhotoMeta[]> {
    return this.list<PhotoMeta>('photos');
  }
}
