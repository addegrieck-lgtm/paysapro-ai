import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { PhotoMeta, PhotoRecord } from '../src/types';
import { defaultCatalog, defaultSettings } from '../src/data/defaults';
import { buildDemoData } from '../src/features/demo/demoData';
import { CloudStorageProvider, type CloudApi, type CloudTable } from '../src/services/storage/CloudStorageProvider';
import { authMessage, checkCredentials, PASSWORD_MIN_LENGTH } from '../src/features/auth/actions';
import { CLOUD_ENABLED } from '../src/services/cloud/client';

/** Faux backend en mémoire : vérifie la logique du fournisseur sans réseau. */
class MemoryApi implements CloudApi {
  tables = new Map<CloudTable, Map<string, unknown>>();
  photos = new Map<string, PhotoRecord>();
  order: string[] = [];
  private t(table: CloudTable) {
    if (!this.tables.has(table)) this.tables.set(table, new Map());
    return this.tables.get(table)!;
  }
  async list<T>(table: CloudTable) {
    return [...this.t(table).values()] as T[];
  }
  async get<T>(table: CloudTable, id: string) {
    return this.t(table).get(id) as T | undefined;
  }
  async upsert<T extends object>(table: CloudTable, id: string, value: T) {
    this.order.push(table);
    this.t(table).set(id, value);
  }
  async remove(table: CloudTable, id: string) {
    this.t(table).delete(id);
    if (table === 'photos') this.photos.delete(id);
  }
  async removeAll() {
    this.tables.clear();
    this.photos.clear();
  }
  async uploadPhoto(photo: PhotoRecord) {
    this.order.push('photos');
    this.photos.set(photo.id, photo);
  }
  async downloadPhoto(id: string) {
    return this.photos.get(id);
  }
  published = new Map<string, object>();
  async publishQuote(id: string, view: object) {
    this.published.set(id, view);
  }
  async listPhotoMetas() {
    return [...this.photos.values()].map(({ thumb: _t, medium: _m, ...meta }) => meta as PhotoMeta);
  }
}

const noLocal = {
  addRecord: async () => undefined,
  getRecords: async () => [],
  clearRecords: async () => undefined,
};

describe('Mode cloud — configuration', () => {
  it('est désactivé tant que les variables Supabase ne sont pas définies', () => {
    expect(CLOUD_ENABLED).toBe(false);
  });
});

describe('Mode cloud — fournisseur de stockage', () => {
  it('exporte puis réimporte toutes les données, dans l’ordre imposé par les relations', async () => {
    const settings = { ...defaultSettings(), onboardingDone: true };
    const demo = buildDemoData(defaultCatalog(), settings, new Date(2026, 8, 28));
    const source = new CloudStorageProvider(new MemoryApi(), noLocal);
    await source.saveSettings(demo.settings);
    for (const c of demo.clients) await source.saveClient(c);
    for (const p of demo.projects) await source.saveProject(p);
    for (const q of demo.quotes) await source.saveQuote(q);
    const photo: PhotoRecord = {
      id: 'photo-1',
      projectId: demo.projects[0]!.id,
      tag: 'before',
      caption: 'Avant',
      width: 10,
      height: 10,
      createdAt: '2026-09-28T10:00:00.000Z',
      thumb: new Blob(['a'], { type: 'image/jpeg' }),
      medium: new Blob(['bb'], { type: 'image/jpeg' }),
    };
    await source.savePhoto(photo);

    const file = await source.exportAll();
    expect(file.clients).toHaveLength(demo.clients.length);
    expect(file.photos[0]!.thumbDataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);

    const api = new MemoryApi();
    const target = new CloudStorageProvider(api, noLocal);
    await target.saveClient({ ...demo.clients[0]!, id: 'to-be-replaced' });
    await target.importAll(file);
    expect((await target.getClients()).map((c) => c.id).sort()).toEqual(demo.clients.map((c) => c.id).sort());
    expect(await target.getQuotes()).toEqual(demo.quotes);
    expect((await target.getSettings())?.onboardingDone).toBe(true);
    expect((await target.getPhoto('photo-1'))?.medium.size).toBe(2);
    const firstOf = (t: string) => api.order.indexOf(t);
    expect(firstOf('clients')).toBeLessThan(firstOf('projects'));
    expect(firstOf('projects')).toBeLessThan(firstOf('quotes'));
    expect(firstOf('quotes')).toBeLessThan(firstOf('photos'));
  });

  it('vide toutes les données de l’entreprise', async () => {
    const provider = new CloudStorageProvider(new MemoryApi(), noLocal);
    await provider.saveCatalogItem(defaultCatalog()[0]!);
    await provider.clearAll();
    expect(await provider.getCatalog()).toEqual([]);
    expect(await provider.getSettings()).toBeNull();
  });
});

describe('Mode cloud — authentification', () => {
  it('valide l’e-mail et la longueur du mot de passe', () => {
    expect(checkCredentials('pas-un-email', 'x'.repeat(PASSWORD_MIN_LENGTH))).toMatch(/e-mail/);
    expect(checkCredentials('a@b.fr', 'court')).toMatch(/au moins/);
    expect(checkCredentials('a@b.fr', 'x'.repeat(73))).toMatch(/72/);
    expect(checkCredentials('a@b.fr', 'x'.repeat(PASSWORD_MIN_LENGTH))).toBeNull();
  });

  it('ne montre jamais de détail technique dans les messages d’erreur', () => {
    expect(authMessage({ code: 'invalid_credentials' })).toBe('E-mail ou mot de passe incorrect.');
    expect(authMessage({ status: 429 })).toMatch(/Trop de tentatives/);
    const unknown = authMessage({ code: 'unexpected_failure', message: 'relation "auth.users" does not exist' });
    expect(unknown).toBe('Une erreur est survenue. Réessayez dans un instant.');
  });
});
