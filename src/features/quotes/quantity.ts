// Calcul de la quantité d'une ligne de devis à partir des mesures du chantier.
// Règle d'or : ne jamais inventer. Une donnée manquante est signalée, jamais remplacée en silence.
import type { MeasureZone, LinearMeasure, QuoteLine } from '../../types';
import { formatNumber, round } from '../../utils/number';
import { totalArea, totalLength, zoneArea } from '../measurements/geometry';
import { unitShort } from '../catalog/units';

export type QuantityStatus = 'measured' | 'estimated' | 'manual' | 'missing';

export interface QuantityInfo {
  quantity: number;
  status: QuantityStatus;
  /** Explication lisible : « 96 m² + 8 % = 103,68 m² » */
  formula: string;
  /** Message affiché si la quantité est manquante */
  message: string | null;
}

export interface MeasureSource {
  zones: MeasureZone[];
  linears: LinearMeasure[];
}

const missing = (message: string): QuantityInfo => ({ quantity: 0, status: 'missing', formula: '', message });

function baseFromMeasures(
  line: QuoteLine,
  src: MeasureSource,
): { base: number; approximate: boolean; label: string } | { error: string } {
  const ref = line.measureRef;
  if (line.quantityRule === 'length') {
    if (ref.type === 'linear') {
      const l = src.linears.find((x) => x.id === ref.id);
      if (!l || !l.length || l.length <= 0) return { error: 'Information manquante : longueur à renseigner.' };
      return { base: l.length, approximate: l.approximate, label: `${formatNumber(l.length)} ml` };
    }
    const sum = totalLength(src.linears);
    if (sum.counted === 0) return { error: 'Information manquante : ajoutez une longueur dans « Mesures ».' };
    return { base: sum.total, approximate: sum.approximate, label: `${formatNumber(sum.total)} ml` };
  }
  // surface (règles « area » et « volume »)
  if (ref.type === 'zone') {
    const zone = src.zones.find((z) => z.id === ref.id);
    if (!zone) return { error: 'Information manquante : la zone sélectionnée a été supprimée.' };
    const res = zoneArea(zone);
    if (!res.ok) return { error: `Information manquante (${zone.name}) : ${res.error.toLowerCase()}` };
    return { base: res.area, approximate: zone.approximate, label: `${formatNumber(res.area)} m²` };
  }
  const sum = totalArea(src.zones);
  if (sum.counted === 0 || sum.total <= 0)
    return { error: 'Information manquante : ajoutez une surface dans « Mesures ».' };
  return { base: sum.total, approximate: sum.approximate, label: `${formatNumber(sum.total)} m²` };
}

export function resolveQuantity(line: QuoteLine, src: MeasureSource): QuantityInfo {
  const waste = Math.min(100, Math.max(0, line.wastePercent || 0));
  const u = unitShort(line.unit);
  const useManual = line.quantityRule === 'manual' || line.measureRef.type === 'manual';

  if (useManual) {
    const q = line.manualQuantity;
    if (q === null || !Number.isFinite(q) || q < 0) return missing('Quantité à renseigner.');
    const quantity = round(q * (1 + waste / 100));
    const formula =
      waste > 0
        ? `${formatNumber(q)} ${u} + ${formatNumber(waste)} % = ${formatNumber(quantity)} ${u}`
        : `${formatNumber(quantity)} ${u}`;
    return { quantity, status: 'manual', formula, message: null };
  }

  const base = baseFromMeasures(line, src);
  if ('error' in base) return missing(base.error);

  let raw = base.base;
  let formula = base.label;
  if (line.quantityRule === 'volume') {
    const t = line.thicknessCm;
    if (t === null || !Number.isFinite(t) || t <= 0) return missing('Information manquante : épaisseur à renseigner.');
    raw = round((base.base * t) / 100, 2);
    formula = `${base.label} × ${formatNumber(t)} cm = ${formatNumber(raw)} m³`;
  }
  const quantity = round(raw * (1 + waste / 100));
  if (waste > 0) formula += ` + ${formatNumber(waste)} % = ${formatNumber(quantity)} ${u}`;
  return { quantity, status: base.approximate ? 'estimated' : 'measured', formula, message: null };
}
