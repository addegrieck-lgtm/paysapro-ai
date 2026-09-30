import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { builtInTemplates, defaultCatalog, defaultSettings } from '../src/data/defaults';
import { buildDemoData } from '../src/features/demo/demoData';
import { migrateCatalogItem, migrateProject, migrateQuote, migrateSettings, needsMigration } from '../src/features/migrations';
import { computeTotals } from '../src/features/quotes/pricing';
import { toPublicQuote } from '../src/features/quotes/publicView';
import { linesFromTemplate, templateLinesFrom } from '../src/features/quotes/lines';
import { canUseFeature, FEATURES, getCurrentPlan, hasFeature, NO_PLAN, planFor, PLANS } from '../src/features/plans/plans';
import { APP_CONFIG } from '../src/config/app';
import { emptyLead, LocalBetaLeadProvider, sanitize, validateContact, validateLead } from '../src/services/forms/forms';
import { funnelProgress, LocalAnalyticsProvider } from '../src/services/analytics/AnalyticsProvider';
import { LocalAuthProvider, CloudAuthProvider } from '../src/services/auth/AuthProvider';
import type { AnalyticsEvent, Quote } from '../src/types';

const catalog = defaultCatalog();
const demo = () => buildDemoData(catalog, defaultSettings(), new Date(2026, 8, 28));

describe('migration des données du MVP (v1 → v2)', () => {
  it('catalogue : l’ancien prix devient le coût, le prix de vente inclut la marge', () => {
    const legacy = { ...catalog[0]!, unitPrice: 18 } as Record<string, unknown>;
    delete legacy.costPrice;
    const m = migrateCatalogItem(legacy as never, 30);
    expect(m.costPrice).toBe(18);
    expect(m.unitPrice).toBe(23.4);
  });

  it('devis : les totaux restent strictement identiques après migration', () => {
    const q = demo().quotes[0]!;
    const project = demo().projects[0]!;
    // ancien format : prix = coût, marge globale 30 %
    const legacy = { ...q, marginPercent: 30, lines: q.lines.map(({ unitCost, ...l }) => ({ ...l, unitPrice: unitCost })) };
    const migrated = migrateQuote(legacy as never);
    expect('marginPercent' in migrated).toBe(false);
    const oldSale = legacy.lines.reduce((s, l) => s + Math.round(l.unitPrice * 1.3 * 100) / 100, 0);
    expect(migrated.lines.reduce((s, l) => s + l.unitPrice, 0)).toBeCloseTo(oldSale, 2);
    expect(computeTotals(migrated, project).costTotal).toBeGreaterThan(0);
  });

  it('chantier et réglages : nouveaux champs avec valeurs par défaut', () => {
    const p = { ...demo().projects[0]! } as Record<string, unknown>;
    delete p.privateNotes;
    expect(migrateProject(p as never).privateNotes).toBe('');
    const s = migrateSettings({ vatRate: 10, company: { name: 'Ancienne SARL' } } as never);
    expect(s.vatRate).toBe(10);
    expect(s.company.name).toBe('Ancienne SARL');
    expect(s.company.brandColor).toMatch(/^#/);
    expect(s.notificationPrefs.signed).toBe(true);
    expect(needsMigration({ schemaVersion: 1 })).toBe(true);
    expect(needsMigration(s)).toBe(false);
  });
});

describe('page client : vue publique du devis', () => {
  it('ne contient ni coût, ni marge, ni notes privées, ni notes client', () => {
    const d = demo();
    const project = { ...d.projects[0]!, privateNotes: 'NOTE-SECRETE-CHANTIER' };
    const client = { ...d.clients[0]!, notes: 'NOTE-SECRETE-CLIENT' };
    const settings = defaultSettings();
    const view = toPublicQuote({ quote: d.quotes[0]!, project, client, company: settings.company, photos: [] });
    const json = JSON.stringify(view);
    for (const forbidden of ['unitCost', 'costPrice', 'costTotal', 'margin', 'NOTE-SECRETE', 'payments', 'privateNotes']) {
      expect(json).not.toContain(forbidden);
    }
    expect(view.lines.length).toBe(d.quotes[0]!.lines.length);
    expect(view.totals.totalTTC).toBe(computeTotals(d.quotes[0]!, project).totalTTC);
  });

  it('n’expose que les photos choisies pour le devis', () => {
    const d = demo();
    const quote: Quote = { ...d.quotes[0]!, includedPhotoIds: ['a'] };
    const photos = [
      { id: 'a', projectId: 'p', tag: 'before' as const, caption: 'Vue', width: 1, height: 1, createdAt: '' },
      { id: 'b', projectId: 'p', tag: 'detail' as const, caption: 'Interne', width: 1, height: 1, createdAt: '' },
    ];
    const view = toPublicQuote({ quote, project: d.projects[0]!, client: d.clients[0], company: defaultSettings().company, photos });
    expect(view.photos.map((p) => p.id)).toEqual(['a']);
  });
});

describe('plans (bêta : Premium Max pour tous)', () => {
  it('mode test actif, Premium Max, aucun paiement', () => {
    expect(APP_CONFIG.testMode).toBe(true);
    expect(APP_CONFIG.paymentsEnabled).toBe(false);
    expect(APP_CONFIG.subscriptionsEnabled).toBe(false);
    expect(APP_CONFIG.betaMode).toBe(true);
    expect(getCurrentPlan()).toMatchObject({ id: 'BETA', name: 'Premium Max', monthlyPriceHT: 0, paymentRequired: false });
    expect(Object.keys(FEATURES).every((f) => hasFeature(f as keyof typeof FEATURES))).toBe(true);
    expect(canUseFeature('quotes_pdf').allowed).toBe(true);
  });
  it('tarifs : Starter 19 €, Pro 39 €, Business 69 € HT par mois', () => {
    expect([PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS].map((p) => p.monthlyPriceHT)).toEqual([19, 39, 69]);
    expect([PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS].every((p) => p.paymentRequired)).toBe(true);
  });
  it('bêta désactivée : le plan vient de l’abonnement, chaque offre inclut la précédente', () => {
    const sub = (planId: string, status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive' | 'beta') => ({ planId, status, currentPeriodEnd: null });
    expect(planFor(false, null)).toBe(NO_PLAN);
    expect(planFor(false, sub('pro', 'canceled'))).toBe(NO_PLAN);
    expect(planFor(false, sub('beta', 'beta'))).toBe(NO_PLAN);
    expect(planFor(false, sub('inconnu', 'active'))).toBe(NO_PLAN);
    expect(planFor(false, sub('starter', 'active'))).toBe(PLANS.STARTER);
    expect(planFor(false, sub('pro', 'trialing'))).toBe(PLANS.PRO);
    expect(planFor(false, sub('business', 'past_due'))).toBe(PLANS.BUSINESS);
    expect(planFor(true, sub('starter', 'active'))).toBe(PLANS.BETA);

    expect(canUseFeature('planning', PLANS.STARTER)).toEqual({ allowed: false, reason: 'Fonctionnalité incluse à partir de l’offre Pro.' });
    expect(canUseFeature('planning', PLANS.PRO).allowed).toBe(true);
    expect(canUseFeature('profitability', PLANS.PRO).allowed).toBe(false);
    expect(canUseFeature('quotes_pdf', NO_PLAN).allowed).toBe(false);
    expect(PLANS.STARTER.features.every((f) => PLANS.PRO.features.includes(f))).toBe(true);
    expect(PLANS.PRO.features.every((f) => PLANS.BUSINESS.features.includes(f))).toBe(true);
  });
});

describe('modèles de devis', () => {
  it('un modèle fourni crée les lignes depuis le catalogue', () => {
    const lawn = builtInTemplates().find((t) => t.name === 'Création de pelouse')!;
    const { lines, missing } = linesFromTemplate(lawn, catalog);
    expect(missing).toEqual([]);
    expect(lines.map((l) => l.label)).toContain('Pose de gazon');
  });
  it('une prestation absente du catalogue est signalée, pas inventée', () => {
    const planting = builtInTemplates().find((t) => t.name === 'Plantation')!;
    const { lines, missing } = linesFromTemplate(planting, catalog.filter((c) => c.label !== 'Plantation'));
    expect(missing).toEqual(['Plantation']);
    expect(lines.find((l) => l.label === 'Fourniture plant')?.manualQuantity).toBe(5);
  });
  it('un devis enregistré comme modèle revient au total du chantier', () => {
    const q = demo().quotes[0]!;
    const withZone = q.lines.map((l) => ({ ...l, measureRef: { type: 'zone' as const, id: 'z1' } }));
    expect(templateLinesFrom(withZone).every((l) => l.measureRef.type === 'total')).toBe(true);
  });
});

describe('formulaires bêta / contact', () => {
  it('validation et nettoyage', () => {
    expect(Object.keys(validateLead(emptyLead()))).toEqual(['firstName', 'lastName', 'email']);
    expect(validateLead({ ...emptyLead(), firstName: 'A', lastName: 'B', email: 'a@b.fr', phone: 'abc' }).phone).toBeDefined();
    expect(validateContact({ name: 'A', email: 'x', message: 'Bonjour à vous' }).email).toBeDefined();
    expect(sanitize('  Bonjour\u0007  ')).toBe('Bonjour');
    expect(sanitize('x'.repeat(50), 10)).toHaveLength(10);
  });
  it('inscription enregistrée localement, jamais présentée comme transmise', async () => {
    const provider = new LocalBetaLeadProvider();
    const res = await provider.submit({ ...emptyLead(), firstName: 'Jean', lastName: 'Test', email: 'jean@test.fr' });
    expect(res.storedLocally).toBe(true);
    expect(res.delivered).toBe(false);
    expect((await provider.list()).some((l) => l.email === 'jean@test.fr')).toBe(true);
  });
});

describe('analytics local et compte', () => {
  it('entonnoir d’activation', () => {
    const ev = (name: AnalyticsEvent['name']): AnalyticsEvent => ({ id: name, name, props: {}, createdAt: '' });
    const f = funnelProgress([ev('onboarding_completed'), ev('client_created'), ev('client_created')]);
    expect(f[0]).toMatchObject({ reached: true, count: 1 });
    expect(f[1]).toMatchObject({ reached: true, count: 2 });
    expect(f[5]).toMatchObject({ reached: false });
  });
  it('les événements restent sur l’appareil', async () => {
    const a = new LocalAnalyticsProvider();
    expect(a.sendsDataExternally).toBe(false);
    a.track('app_opened');
    await new Promise((r) => setTimeout(r, 20));
    expect((await a.getEvents()).some((e) => e.name === 'app_opened')).toBe(true);
  });
  it('compte local sans mot de passe ; compte cloud non disponible', async () => {
    const local = new LocalAuthProvider();
    const user = await local.signUp({ firstName: 'Léa', lastName: 'Martin', email: 'lea@exemple.fr' });
    expect((await local.getCurrentUser())?.id).toBe(user.id);
    await expect(local.signIn('autre@exemple.fr')).rejects.toThrow();
    await expect(local.resetPassword()).rejects.toThrow(/mode local/);
    await expect(new CloudAuthProvider().signUp()).rejects.toThrow(/prochaine version/);
  });
});
