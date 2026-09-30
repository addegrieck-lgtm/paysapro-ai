import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CatalogItem, CompanySettings, Project, Quote } from '../src/types';
import { defaultCatalog, defaultSettings } from '../src/data/defaults';
import { buildDemoData } from '../src/features/demo/demoData';
import { migrateSettings } from '../src/features/migrations';
import { lineFromCatalog } from '../src/features/quotes/lines';
import { toPublicQuote } from '../src/features/quotes/publicView';
import { computeTotals } from '../src/features/quotes/pricing';
import { buildSapAttestation, sapMissingFields, sapYears } from '../src/features/sap/sap';
import { generateSapAttestationPdf } from '../src/services/pdf/sapAttestationPdf';
import { generateQuotePdf } from '../src/services/pdf/quotePdf';

function sapCompany(): CompanySettings {
  return {
    ...defaultSettings().company,
    name: 'Jardins du Val Vert',
    address: '5 chemin des Prés',
    postalCode: '69100',
    city: 'Villeurbanne',
    siret: '123 456 789 00012',
    sap: { enabled: true, number: 'SAP123456789', declarationDate: '2024-03-15', activity: 'Petits travaux de jardinage', notes: '' },
  };
}

function fixture() {
  const settings = defaultSettings();
  const demo = buildDemoData(defaultCatalog(), settings, new Date(2026, 8, 28));
  const client = { ...demo.clients[0]!, address: '12 rue des Lilas', postalCode: '69003', city: 'Lyon' };
  const baseQuote = demo.quotes.find((q) => q.clientId === client.id)!;
  const project: Project = {
    ...demo.projects.find((p) => p.id === baseQuote.projectId)!,
    work: { stage: 'done', startDate: '2026-04-02', endDate: '2026-04-03', checklist: [], notes: '', createdAt: '2026-04-01T08:00:00.000Z' },
  };
  // deux lignes manuelles : 10 h d'entretien (SAP) à 40 € et un forfait terrassement (hors SAP) à 600 €
  const line = (label: string, qty: number, price: number, sap: boolean) => ({
    ...baseQuote.lines[0]!,
    id: label,
    label,
    quantityRule: 'manual' as const,
    measureRef: { type: 'manual' as const },
    manualQuantity: qty,
    wastePercent: 0,
    unit: 'hour' as const,
    unitPrice: price,
    unitCost: 0,
    ...(sap ? { sapEligible: true } : {}),
  });
  const quote: Quote = {
    ...baseQuote,
    vatRate: 20,
    vatExempt: false,
    lines: [line('Petit entretien de jardin', 10, 40, true), line('Terrassement', 1, 600, false)],
    payments: [
      { id: 'p1', kind: 'deposit', amount: 600, method: 'transfer', date: '2026-04-01T10:00:00.000Z', provider: 'manual', reference: '' },
      { id: 'p2', kind: 'balance', amount: 300, method: 'cesu', date: '2026-04-10T10:00:00.000Z', provider: 'manual', reference: '' },
      { id: 'p3', kind: 'balance', amount: 300, method: 'transfer', date: '2027-01-05T10:00:00.000Z', provider: 'manual', reference: '' },
    ],
  };
  return { client, project, quote };
}

describe('Mode SAP — réglages', () => {
  it('est désactivé par défaut, y compris pour des réglages existants sans bloc SAP', () => {
    expect(defaultSettings().company.sap.enabled).toBe(false);
    const { sap: _sap, ...legacyCompany } = defaultSettings().company;
    const migrated = migrateSettings({ ...defaultSettings(), company: { ...legacyCompany, name: 'Ancien' } });
    expect(migrated.company.name).toBe('Ancien');
    expect(migrated.company.sap).toEqual({ enabled: false, number: '', declarationDate: '', activity: '', notes: '' });
  });

  it('liste les informations manquantes', () => {
    expect(sapMissingFields(sapCompany())).toEqual([]);
    const c = sapCompany();
    c.sap.number = ' ';
    c.siret = '';
    expect(sapMissingFields(c)).toEqual(['Numéro SAP', 'SIREN / SIRET']);
  });
});

describe('Mode SAP — catalogue et devis', () => {
  it('ne déduit jamais l’éligibilité : aucune prestation type n’est SAP', () => {
    expect(defaultCatalog().some((c) => c.sapEligible)).toBe(false);
  });

  it('reprend le choix de l’entreprise du catalogue vers la ligne de devis', () => {
    const item: CatalogItem = { ...defaultCatalog()[0]!, sapEligible: true };
    expect(lineFromCatalog(item).sapEligible).toBe(true);
    expect(lineFromCatalog(defaultCatalog()[0]!).sapEligible).toBeUndefined();
  });

  it('n’affiche aucune mention SAP si le mode est désactivé, le numéro absent ou sans prestation SAP', () => {
    const { client, project, quote } = fixture();
    const view = (company: CompanySettings, q = quote) => toPublicQuote({ quote: q, project, client, company, photos: [] });

    const off = sapCompany();
    off.sap.enabled = false;
    expect(view(off).sap).toBeNull();
    expect(view(off).lines.some((l) => l.sap)).toBe(false);

    const noNumber = sapCompany();
    noNumber.sap.number = '';
    expect(view(noNumber).sap).toBeNull();

    const noSapLines = { ...quote, lines: quote.lines.map(({ sapEligible: _s, ...l }) => l) };
    expect(view(sapCompany(), noSapLines).sap).toBeNull();
  });

  it('affiche les informations SAP et repère les prestations concernées', () => {
    const { client, project, quote } = fixture();
    const view = toPublicQuote({ quote, project, client, company: sapCompany(), photos: [] });
    expect(view.sap).toMatchObject({ number: 'SAP123456789', totalHT: 400, totalTTC: 480 });
    expect(view.lines.map((l) => l.sap)).toEqual([true, false]);
    expect('sap' in view.company).toBe(false);
  });

  it('génère le PDF du devis avec le bloc SAP', async () => {
    const { client, project, quote } = fixture();
    const view = toPublicQuote({ quote: { ...quote, includedPhotoIds: [] }, project, client, company: sapCompany(), photos: [] });
    const blob = await generateQuotePdf({ view, loadPhoto: async () => undefined });
    expect(blob.size).toBeGreaterThan(3000);
    if (process.env.SAP_QUOTE_PDF_OUT) writeFileSync(process.env.SAP_QUOTE_PDF_OUT, new Uint8Array(await blob.arrayBuffer()));
  });
});

describe('Mode SAP — attestation annuelle', () => {
  it('ne retient que les paiements de l’année, au prorata des prestations SAP', () => {
    const { client, project, quote } = fixture();
    expect(computeTotals(quote, project).totalTTC).toBe(1200);
    const a = buildSapAttestation({ company: sapCompany(), client, projects: [project], quotes: [quote], year: 2026 });
    expect(a.ready).toBe(true);
    expect(a.entries).toHaveLength(1);
    expect(a.entries[0]!.lines.map((l) => l.label)).toEqual(['Petit entretien de jardin']);
    expect(a.entries[0]!.sapTotalTTC).toBe(480);
    // 900 € encaissés en 2026 × (400 / 1 000) = 360 €
    expect(a.totalPaidSap).toBe(360);
    expect(a.byMethod).toEqual({ transfer: 240, cesu: 120 });
    expect(a.hasMixedQuotes).toBe(true);

    const next = buildSapAttestation({ company: sapCompany(), client, projects: [project], quotes: [quote], year: 2027 });
    expect(next.totalPaidSap).toBe(120);
    expect(sapYears([quote], client.id, new Date(2026, 5, 1))).toEqual([2027, 2026]);
  });

  it('signale chaque information manquante et bloque la génération', () => {
    const { client, project, quote } = fixture();
    const company = sapCompany();
    company.sap.number = '';
    const a = buildSapAttestation({
      company,
      client: { ...client, address: '' },
      projects: [{ ...project, work: null }],
      quotes: [quote],
      year: 2026,
    });
    const failed = a.checks.filter((c) => !c.ok).map((c) => c.key);
    expect(failed).toEqual(['client', 'number', 'interventions']);
    expect(a.ready).toBe(false);

    const empty = buildSapAttestation({ company: sapCompany(), client, projects: [project], quotes: [quote], year: 2024 });
    expect(empty.entries).toEqual([]);
    expect(empty.checks.filter((c) => !c.ok).map((c) => c.key)).toEqual(['interventions', 'amounts']);
  });

  it('ignore les devis des autres clients et ceux sans prestation SAP', () => {
    const { client, project, quote } = fixture();
    const other = { ...quote, id: 'other', clientId: 'someone-else' };
    const plain = { ...quote, id: 'plain', lines: quote.lines.map(({ sapEligible: _s, ...l }) => l) };
    const a = buildSapAttestation({ company: sapCompany(), client, projects: [project], quotes: [other, plain], year: 2026 });
    expect(a.entries).toEqual([]);
  });

  it('génère un PDF valide', async () => {
    const { client, project, quote } = fixture();
    const a = buildSapAttestation({ company: sapCompany(), client, projects: [project], quotes: [quote], year: 2026 });
    const blob = await generateSapAttestationPdf(a, new Date(2027, 0, 15));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(3000);
    if (process.env.SAP_PDF_OUT) writeFileSync(process.env.SAP_PDF_OUT, bytes);
  });
});
