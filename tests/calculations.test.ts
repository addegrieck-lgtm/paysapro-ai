import { describe, expect, it } from 'vitest';
import type { MeasureZone, QuoteLine } from '../src/types';
import { totalArea, totalLength, zoneArea } from '../src/features/measurements/geometry';
import { borders, fence, gravel, labor, lawn, planting, terrace, volume, withWaste } from '../src/features/measurements/calculators';
import { applyMargin, applyMarginToLines, computeTotals, depositOf, vatOf } from '../src/features/quotes/pricing';
import { resolveQuantity } from '../src/features/quotes/quantity';
import { formatQuoteNumber, nextQuoteNumber, quoteFileName } from '../src/features/quotes/numbering';
import { formatMoney, parseDecimal, round } from '../src/utils/number';
import { checkPercent, checkNonNegative } from '../src/utils/validation';

const zone = (p: Partial<MeasureZone>): MeasureZone => ({
  id: Math.random().toString(),
  name: 'Z',
  shape: 'rectangle',
  length: null,
  width: null,
  radius: null,
  manualArea: null,
  subtract: false,
  approximate: false,
  ...p,
});

const line = (p: Partial<QuoteLine>): QuoteLine => ({
  id: Math.random().toString(),
  catalogItemId: null,
  label: 'Ligne',
  description: '',
  kind: 'service',
  unit: 'm2',
  quantityRule: 'area',
  measureRef: { type: 'total' },
  manualQuantity: null,
  wastePercent: 0,
  thicknessCm: null,
  unitPrice: 0,
  unitCost: 0,
  ...p,
});

describe('surface', () => {
  it('rectangle 20 × 8 = 160 m²', () => {
    const r = zoneArea(zone({ length: 20, width: 8 }));
    expect(r).toMatchObject({ ok: true, area: 160 });
  });
  it('triangle base 6, hauteur 4 = 12 m²', () => {
    expect(zoneArea(zone({ shape: 'triangle', length: 6, width: 4 }))).toMatchObject({ ok: true, area: 12 });
  });
  it('cercle rayon 2 ≈ 12,57 m²', () => {
    expect(zoneArea(zone({ shape: 'circle', radius: 2 }))).toMatchObject({ ok: true, area: 12.57 });
  });
  it('plusieurs zones : 50 + 32 = 82 m², zone à déduire', () => {
    const zones = [zone({ length: 10, width: 5 }), zone({ length: 8, width: 4 })];
    expect(totalArea(zones).total).toBe(82);
    expect(totalArea([...zones, zone({ length: 2, width: 1, subtract: true })]).total).toBe(80);
  });
  it('donnée manquante : message humain, jamais NaN', () => {
    const r = zoneArea(zone({ length: 12, width: null }));
    expect(r).toEqual({ ok: false, error: 'Veuillez renseigner une largeur valide.' });
    const s = totalArea([zone({ length: 12 })]);
    expect(s.total).toBe(0);
    expect(s.incomplete).toHaveLength(1);
  });
  it('mesure approximative signalée', () => {
    expect(totalArea([zone({ shape: 'manual', manualArea: 85, approximate: true })]).approximate).toBe(true);
  });
  it('longueurs', () => {
    expect(totalLength([{ id: '1', name: 'a', length: 10, approximate: false }, { id: '2', name: 'b', length: null, approximate: false }])).toMatchObject({ total: 10, counted: 1 });
  });
});

describe('calculateurs', () => {
  it('gazon : 100 m² + 8 % = 108 m²', () => expect(lawn(100, 8)).toEqual({ ok: true, value: 108 }));
  it('volume terre : 50 m² × 20 cm = 10 m³', () => expect(volume(50, 20)).toEqual({ ok: true, value: 10 }));
  it('gravier : volume et poids', () => expect(gravel(40, 5, 1.6)).toEqual({ ok: true, value: { volume: 2, weight: 3.2 } }));
  it('gravier sans coefficient : poids non estimé', () => expect(gravel(40, 5, null)).toEqual({ ok: true, value: { volume: 2, weight: null } }));
  it('bordures : somme des longueurs', () => expect(borders([10, 4.5, null])).toEqual({ ok: true, value: 14.5 }));
  it('clôture : 10 m / 2,5 m = 4 panneaux, 5 poteaux', () => expect(fence(10, 2.5)).toEqual({ ok: true, value: { panels: 4, posts: 5 } }));
  it('clôture : 11 m / 2,5 m = 5 panneaux (arrondi supérieur)', () => expect(fence(11, 2.5)).toMatchObject({ value: { panels: 5, posts: 6 } }));
  it('terrasse : 20 m² × 95 € = 1 900 €', () => expect(terrace(20, 95)).toEqual({ ok: true, value: 1900 }));
  it('plantation : 5 × 35 € = 175 €', () => expect(planting(5, 35)).toEqual({ ok: true, value: 175 }));
  it("main-d'œuvre : 8 h × 45 € = 360 €", () => expect(labor(8, 45)).toEqual({ ok: true, value: 360 }));
  it('refuse les valeurs invalides', () => {
    expect(withWaste(-1, 5).ok).toBe(false);
    expect(withWaste(10, 120).ok).toBe(false);
    expect(fence(10, 0).ok).toBe(false);
    expect(volume(10, null).ok).toBe(false);
  });
});

describe('quantités', () => {
  const src = { zones: [zone({ length: 12, width: 8 })], linears: [{ id: 'l', name: 'b', length: 14, approximate: false }] };
  it('surface du chantier : 96 m²', () => {
    expect(resolveQuantity(line({}), src)).toMatchObject({ quantity: 96, status: 'measured' });
  });
  it('surface + pertes : 96 + 8 % = 103,68', () => {
    expect(resolveQuantity(line({ wastePercent: 8 }), src).quantity).toBe(103.68);
  });
  it('volume : 96 m² × 20 cm = 19,2 m³', () => {
    expect(resolveQuantity(line({ quantityRule: 'volume', unit: 'm3', thicknessCm: 20 }), src).quantity).toBe(19.2);
  });
  it('longueur : 14 ml', () => {
    expect(resolveQuantity(line({ quantityRule: 'length', unit: 'ml' }), src).quantity).toBe(14);
  });
  it('manquante : signalée, pas inventée', () => {
    const r = resolveQuantity(line({}), { zones: [], linears: [] });
    expect(r.status).toBe('missing');
    expect(r.quantity).toBe(0);
    expect(r.message).toMatch(/Information manquante/);
  });
  it('mesure approximative → estimation', () => {
    const r = resolveQuantity(line({}), { zones: [zone({ shape: 'manual', manualArea: 85, approximate: true })], linears: [] });
    expect(r.status).toBe('estimated');
  });
});

describe('marge, TVA, total, acompte', () => {
  it('marge : 1 850 € + 30 % = 2 405 €', () => expect(applyMargin(1850, 30)).toBe(2405));
  it('TVA 20 % de 2 899 € = 579,80 €', () => expect(vatOf(2899, 20)).toBe(579.8));
  it('acompte 30 % de 4 850 € = 1 455 €', () => expect(depositOf(4850, 30)).toBe(1455));

  it('80 m² de gazon à 12 €/m² → 960 € HT', () => {
    const t = computeTotals(
      { lines: [line({ label: 'Gazon', unitPrice: 12, unitCost: 4 })], vatRate: 20, vatExempt: false, depositPercent: 30 },
      { zones: [zone({ length: 10, width: 8 })], linears: [] },
    );
    expect(t.totalHT).toBe(960);
    expect(t.costTotal).toBe(320);
    expect(t.marginAmount).toBe(640);
  });

  it('exemple complet : coût 2 230 €, marge 30 % appliquée → 2 899 € HT', () => {
    const src = { zones: [zone({ length: 10, width: 8 })], linears: [] };
    const costLines = [
      line({ label: 'Gazon', unitCost: 18 }),
      line({ label: 'Préparation', unitCost: 8 }),
      line({ label: 'Transport', unit: 'flat', quantityRule: 'manual', measureRef: { type: 'manual' }, manualQuantity: 1, unitCost: 150, kind: 'transport' }),
    ];
    const t = computeTotals({ lines: applyMarginToLines(costLines, 30), vatRate: 20, vatExempt: false, depositPercent: 30 }, src);
    expect(t.lines.map((l) => l.costTotal)).toEqual([1440, 640, 150]);
    expect(t.costTotal).toBe(2230);
    expect(t.totalHT).toBe(2899);
    expect(t.marginAmount).toBe(669);
    expect(t.marginRate).toBe(23.1);
    expect(t.vatAmount).toBe(579.8);
    expect(t.totalTTC).toBe(3478.8);
    expect(t.depositAmount).toBe(1043.64);
    expect(t.balanceAmount).toBe(2435.16);
    expect(t.saleByGroup).toEqual({ materials: 0, labor: 2704, other: 195 });
  });

  it('marge affichée au pro : 4 000 € HT − 2 200 € de coût = 1 800 €', () => {
    const t = computeTotals(
      { lines: [line({ quantityRule: 'manual', measureRef: { type: 'manual' }, manualQuantity: 1, unitPrice: 4000, unitCost: 2200 })], vatRate: 20, vatExempt: false, depositPercent: 0 },
      { zones: [], linears: [] },
    );
    expect(t.marginAmount).toBe(1800);
    expect(t.marginRate).toBe(45);
  });

  it('TVA non applicable (micro-entreprise)', () => {
    const t = computeTotals(
      { lines: [line({ quantityRule: 'manual', measureRef: { type: 'manual' }, manualQuantity: 2, unitPrice: 100 })], vatRate: 20, vatExempt: true, depositPercent: 0 },
      { zones: [], linears: [] },
    );
    expect(t.vatAmount).toBe(0);
    expect(t.totalTTC).toBe(200);
  });

  it('les pourcentages hors bornes sont ramenés entre 0 et 100', () => {
    const t = computeTotals({ lines: [], vatRate: 250, vatExempt: false, depositPercent: NaN }, { zones: [], linears: [] });
    expect(t.vatRate).toBe(100);
    const t2 = computeTotals({ lines: [], vatRate: -5, vatExempt: false, depositPercent: 30 }, { zones: [], linears: [] });
    expect(t2.vatRate).toBe(0);
    expect(t.depositPercent).toBe(0);
    expect(Number.isNaN(t.totalTTC)).toBe(false);
  });

  it('paiements reçus et reste à payer', () => {
    const t = computeTotals(
      {
        lines: [line({ quantityRule: 'manual', measureRef: { type: 'manual' }, manualQuantity: 1, unitPrice: 1000 })],
        vatRate: 0,
        vatExempt: false,
        depositPercent: 30,
        payments: [{ id: 'p', kind: 'deposit', amount: 300, method: 'transfer', date: '', provider: 'manual', reference: '' }],
      },
      { zones: [], linears: [] },
    );
    expect(t.paidAmount).toBe(300);
    expect(t.remainingAmount).toBe(700);
  });
});

describe('numéro de devis', () => {
  it('format 2026-001', () => expect(formatQuoteNumber(2026, 1)).toBe('2026-001'));
  it('incrémente dans la même année', () => {
    const r = nextQuoteNumber({ year: 2026, next: 7 }, new Date(2026, 5, 1));
    expect(r.number).toBe('2026-007');
    expect(r.counter).toEqual({ year: 2026, next: 8 });
  });
  it('repart à 1 une nouvelle année', () => {
    expect(nextQuoteNumber({ year: 2025, next: 42 }, new Date(2026, 0, 2)).number).toBe('2026-001');
  });
  it('nom du fichier PDF', () => expect(quoteFileName('DEVIS', '2026-001')).toBe('DEVIS-2026-001.pdf'));
});

describe('nombres et validation', () => {
  it('accepte la virgule française', () => expect(parseDecimal('12,5')).toBe(12.5));
  it('refuse le texte', () => expect(parseDecimal('abc')).toBeNull());
  it('arrondi au centime', () => expect(round(1.005)).toBe(1.01));
  it("n'affiche jamais NaN", () => {
    expect(formatMoney(NaN)).not.toMatch(/NaN/);
    expect(formatMoney(Infinity)).not.toMatch(/Infini/);
  });
  it('pourcentage 0–100', () => {
    expect(checkPercent('30').ok).toBe(true);
    expect(checkPercent('101')).toEqual({ ok: false, error: 'Le pourcentage doit être compris entre 0 et 100.' });
    expect(checkNonNegative('-3').ok).toBe(false);
  });
});
