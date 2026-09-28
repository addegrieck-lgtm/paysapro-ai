import { describe, expect, it } from 'vitest';
import { defaultCatalog, defaultSettings } from '../src/data/defaults';
import { buildDemoData } from '../src/features/demo/demoData';
import { computeStats } from '../src/features/stats/stats';
import { getProjectStatus } from '../src/features/projects/status';
import { projectTimeline } from '../src/features/projects/timeline';
import { computeNotifications, notificationCenter } from '../src/features/notifications/notifications';
import { LocalAIProvider } from '../src/services/ai/LocalAIProvider';
import { MockAIProvider } from '../src/services/ai/MockAIProvider';
import { assertExternalConsent, ConsentRequiredError } from '../src/services/ai/ExternalAIProvider';
import { LocalSignatureProvider, FutureElectronicSignatureProvider } from '../src/services/signature/SignatureProvider';
import { ManualPaymentProvider, MockPaymentProvider } from '../src/services/payments/PaymentProvider';

const catalog = defaultCatalog();
const demo = () => buildDemoData(catalog, defaultSettings(), new Date(2026, 8, 28));

describe('statuts et timeline', () => {
  it('statut calculé à partir du devis et du suivi', () => {
    const d = demo();
    const [p1, p2, p3] = d.projects;
    const [q1, q2, q3] = d.quotes;
    expect(getProjectStatus(p1!, q1)).toBe('viewed');
    expect(getProjectStatus(p2!, q2)).toBe('in_progress');
    expect(getProjectStatus(p3!, q3)).toBe('quoting');
    expect(getProjectStatus({ ...p3!, work: null }, undefined)).toBe('draft');
  });
  it('timeline : étapes franchies', () => {
    const d = demo();
    const steps = projectTimeline(d.projects[1]!, d.quotes[1], 0);
    const done = Object.fromEntries(steps.map((s) => [s.key, s.done]));
    expect(done).toMatchObject({ measures: true, quote: true, signature: true, deposit: true, work: true, done: false, photos: false });
  });
});

describe('statistiques (données réelles)', () => {
  it('aucune donnée → zéros', () => {
    expect(computeStats([], [])).toEqual({
      quoteCount: 0, quotedAmount: 0, monthCount: 0, monthAmount: 0, acceptedCount: 0, signedAmount: 0, inProgressCount: 0, collectedAmount: 0, conversionRate: null, averageQuote: null, signedMargin: 0,
    });
  });
  it('démo : 3 devis émis, 2 signés, 3 682 € encaissés', () => {
    const d = demo();
    const s = computeStats(d.projects, d.quotes);
    expect(s.quoteCount).toBe(3);
    expect(s.acceptedCount).toBe(2);
    expect(s.collectedAmount).toBe(3682);
    expect(s.inProgressCount).toBe(1);
    expect(s.conversionRate).toBe(67);
    expect(s.signedAmount).toBeGreaterThan(0);
  });
});

describe('notifications', () => {
  it('alertes : chantier qui commence demain', () => {
    const d = demo();
    const now = new Date(2026, 8, 28);
    const p2 = { ...d.projects[1]!, work: { ...d.projects[1]!.work!, stage: 'planned' as const, startDate: '2026-09-29' } };
    const msgs = computeNotifications([d.projects[0]!, p2], d.quotes, d.clients, now).map((n) => n.message);
    expect(msgs).toContain('Le chantier de Marie Martin commence demain.');
  });
  it('centre : événements enregistrés, filtrés par préférences, badge = non lus', () => {
    const d = demo();
    const prefs = { signed: true, viewed: true, expired: true, work_done: true, new_client: true };
    const all = notificationCenter(d.activity, [], prefs);
    expect(all.items.some((n) => n.message.includes('vient de signer'))).toBe(true);
    expect(all.unread).toBe(1); // « Jean Dupont a consulté » (il y a 1 jour)
    const noViewed = notificationCenter(d.activity, [], { ...prefs, viewed: false });
    expect(noViewed.items.some((n) => n.kind === 'viewed')).toBe(false);
    expect(noViewed.unread).toBe(0);
  });
});

describe('assistant IA', () => {
  const ctx = {
    categories: ['lawn' as const],
    description: 'Pelouse et un olivier',
    area: 96,
    areaApproximate: false,
    length: null,
    photoCount: 3,
    catalog,
  };
  it('propose des prestations expliquées, avec un niveau de confiance', async () => {
    const s = await new LocalAIProvider().suggestServices(ctx);
    const gazon = s.find((x) => x.label === 'Pose de gazon');
    expect(gazon?.confidence).toBe('high');
    expect(gazon?.catalogItemId).not.toBeNull();
    expect(gazon?.reason).toContain('96 m²');
    expect(s.some((x) => x.label === 'Plantation')).toBe(true);
  });
  it("l'analyse photo n'invente rien sans service externe", async () => {
    const r = await new LocalAIProvider().analyzePhoto();
    expect(r.available).toBe(false);
  });
  it('estimation approximative → fourchette et avertissement', async () => {
    const e = await new LocalAIProvider().estimateProject({ ...ctx, area: 85, areaApproximate: true });
    expect(e.areaRange).toEqual([72, 98]);
    expect(e.warning).toMatch(/indicative/);
  });
  it('données manquantes listées', async () => {
    const e = await new LocalAIProvider().estimateProject({ ...ctx, area: null, photoCount: 0 });
    expect(e.missing.join(' ')).toMatch(/information manquante/);
  });
  it('mode démonstration clairement marqué comme simulé', async () => {
    const mock = new MockAIProvider();
    expect(mock.simulated).toBe(true);
    const s = await mock.suggestServices(ctx);
    expect(s.every((x) => x.reason.startsWith('[Simulation]'))).toBe(true);
  });
  it('consentement obligatoire avant envoi externe', () => {
    expect(() => assertExternalConsent({ externalAIConsent: false })).toThrow(ConsentRequiredError);
    expect(() => assertExternalConsent({ externalAIConsent: true })).not.toThrow();
  });
});

describe('signature et paiement', () => {
  it('signature locale : nom, date, empreinte du devis', async () => {
    const q = demo().quotes[0]!;
    const sig = await new LocalSignatureProvider().sign({ quote: q, signerName: ' Jean Dupont ', imageDataUrl: 'data:image/png;base64,AAAA' });
    expect(sig.signerName).toBe('Jean Dupont');
    expect(sig.contentHash).toMatch(/^[0-9a-f]{64}$/);
    await expect(new LocalSignatureProvider().sign({ quote: q, signerName: '', imageDataUrl: 'data:image/png;base64,AA' })).rejects.toThrow();
  });
  it('signature électronique qualifiée : non disponible', async () => {
    const p = new FutureElectronicSignatureProvider();
    expect(p.available).toBe(false);
    await expect(p.sign()).rejects.toThrow(/prochaine version/);
  });
  it('paiement manuel et simulé', async () => {
    const manual = await new ManualPaymentProvider().createPayment({ quoteId: 'q', kind: 'deposit', amount: 1455, method: 'transfer' });
    expect(manual.amount).toBe(1455);
    await expect(new ManualPaymentProvider().createPayment({ quoteId: 'q', kind: 'deposit', amount: 0, method: 'cash' })).rejects.toThrow();
    const mock = new MockPaymentProvider();
    const p = await mock.createPayment({ quoteId: 'q', kind: 'deposit', amount: 10, method: 'card' });
    expect(await mock.getPaymentStatus(p)).toBe('paid');
  });
});
