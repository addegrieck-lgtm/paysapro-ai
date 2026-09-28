import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { IndexedDBProvider } from '../src/services/storage/IndexedDBProvider';
import { parseExportFile, blobToDataUrl, dataUrlToBlob } from '../src/services/storage/exportFormat';
import { defaultCatalog, defaultSettings } from '../src/data/defaults';
import { buildDemoData } from '../src/features/demo/demoData';
import type { Client, PhotoRecord } from '../src/types';

let n = 0;
const fresh = () => new IndexedDBProvider(`test-${++n}`);

const client = (id: string): Client => ({
  id,
  firstName: 'Jean',
  lastName: 'Dupont',
  companyName: '',
  phone: '',
  email: '',
  address: '10 rue Exemple',
  postalCode: '',
  city: '',
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('stockage IndexedDB', () => {
  it('enregistre, relit et supprime des clients', async () => {
    const db = fresh();
    await db.saveClient(client('c1'));
    await db.saveClient(client('c2'));
    expect((await db.getClients()).map((c) => c.id).sort()).toEqual(['c1', 'c2']);
    await db.deleteClient('c1');
    expect(await db.getClient('c1')).toBeUndefined();
  });

  it('réglages, chantiers, devis', async () => {
    const db = fresh();
    const settings = defaultSettings();
    await db.saveSettings(settings);
    expect((await db.getSettings())?.vatRate).toBe(20);
    const demo = buildDemoData(defaultCatalog(), settings);
    for (const p of demo.projects) await db.saveProject(p);
    for (const q of demo.quotes) await db.saveQuote(q);
    expect(await db.getProjects()).toHaveLength(4);
    const q = demo.quotes[0]!;
    expect((await db.getQuote(q.id))?.number).toBe(q.number);
  });

  it('supprimer un chantier supprime ses photos', async () => {
    const db = fresh();
    const demo = buildDemoData(defaultCatalog(), defaultSettings());
    const p = demo.projects[0]!;
    await db.saveProject(p);
    const photo: PhotoRecord = {
      id: 'ph1', projectId: p.id, tag: 'before', caption: '', width: 1, height: 1, createdAt: '',
      thumb: new Blob(['a'], { type: 'image/jpeg' }), medium: new Blob(['b'], { type: 'image/jpeg' }),
    };
    await db.savePhoto(photo);
    expect(await db.getPhotoMetas()).toHaveLength(1);
    await db.deleteProject(p.id);
    expect(await db.getPhotoMetas()).toHaveLength(0);
    expect(await db.getProject(p.id)).toBeUndefined();
  });
});

describe('export / import', () => {
  it('aller-retour complet, photos comprises', async () => {
    const a = fresh();
    const settings = defaultSettings();
    const catalog = defaultCatalog();
    const demo = buildDemoData(catalog, settings);
    await a.saveSettings(demo.settings);
    for (const c of catalog) await a.saveCatalogItem(c);
    for (const c of demo.clients) await a.saveClient(c);
    for (const p of demo.projects) await a.saveProject(p);
    for (const q of demo.quotes) await a.saveQuote(q);
    await a.savePhoto({
      id: 'ph', projectId: demo.projects[0]!.id, tag: 'after', caption: 'Fin', width: 2, height: 2, createdAt: '',
      thumb: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
      medium: new Blob([new Uint8Array([4, 5, 6, 7])], { type: 'image/jpeg' }),
    });

    const exported = await a.exportAll();
    const text = JSON.stringify(exported);
    const parsed = parseExportFile(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const b = fresh();
    await b.saveClient(client('ancien')); // sera remplacé
    await b.importAll(parsed.data);
    expect((await b.getClients()).map((c) => c.lastName).sort()).toEqual(['', 'Bernard', 'Dupont', 'Martin']);
    expect(await b.getCatalog()).toHaveLength(catalog.length);
    expect((await b.getSettings())?.quoteCounter).toEqual(demo.settings.quoteCounter);
    const photo = await b.getPhoto('ph');
    expect(photo?.caption).toBe('Fin');
    expect(new Uint8Array(await photo!.medium.arrayBuffer())).toEqual(new Uint8Array([4, 5, 6, 7]));
  });

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(parseExportFile('pas du json')).toEqual({ ok: false, error: "Ce fichier n'est pas un fichier JSON valide." });
    expect(parseExportFile('{"app":"autre"}').ok).toBe(false);
    expect(parseExportFile('{"app":"paysapro-ai","version":1,"clients":[]}').ok).toBe(false);
  });

  it('conversion image ⇄ data URL', async () => {
    const blob = new Blob([new Uint8Array([255, 0, 128])], { type: 'image/png' });
    const url = await blobToDataUrl(blob);
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    const back = dataUrlToBlob(url);
    expect(back.type).toBe('image/png');
    expect(new Uint8Array(await back.arrayBuffer())).toEqual(new Uint8Array([255, 0, 128]));
  });

  it('vider toutes les données', async () => {
    const db = fresh();
    await db.saveClient(client('x'));
    await db.clearAll();
    expect(await db.getClients()).toHaveLength(0);
  });
});

describe('mise à niveau de la base', () => {
  it('une ancienne version ouverte ailleurs produit un message clair, pas un chargement infini', async () => {
    const { openDB } = await import('idb');
    const { StorageBlockedError } = await import('../src/services/storage/IndexedDBProvider');
    const name = `blocked-${++n}`;
    // ancienne version (v1) restée ouverte, sans gestion de « versionchange »
    const old = await openDB(name, 1, { upgrade: (db) => db.createObjectStore('settings') });
    const next = new IndexedDBProvider(name);
    await expect(next.getSettings()).rejects.toBeInstanceOf(StorageBlockedError);
    old.close();
  });

  it('une base v1 du MVP est mise à niveau sans perte', async () => {
    const { openDB } = await import('idb');
    const name = `upgrade-${++n}`;
    const old = await openDB(name, 1, {
      upgrade: (db) => {
        db.createObjectStore('settings');
        db.createObjectStore('clients', { keyPath: 'id' });
        db.createObjectStore('projects', { keyPath: 'id' });
        db.createObjectStore('quotes', { keyPath: 'id' });
        db.createObjectStore('catalog', { keyPath: 'id' });
        db.createObjectStore('photos', { keyPath: 'id' }).createIndex('projectId', 'projectId');
        db.createObjectStore('activity', { keyPath: 'id' });
      },
    });
    await old.put('clients', client('ancien'));
    old.close();
    const next = new IndexedDBProvider(name);
    expect((await next.getClients()).map((c) => c.id)).toEqual(['ancien']);
    expect(await next.getTemplates()).toEqual([]);
  });
});
