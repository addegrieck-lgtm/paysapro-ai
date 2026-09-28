import type { LinearMeasure, MeasureZone, ZoneShape } from '../../types';
import { formatNumber, round } from '../../utils/number';

export type AreaResult = { ok: true; area: number; formula: string } | { ok: false; error: string };

export const SHAPES: { value: ZoneShape; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'circle', label: 'Cercle' },
  { value: 'manual', label: 'Surface connue' },
];

function positive(v: number | null): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/** Surface d'une zone. Ne renvoie jamais NaN : une donnée manquante produit un message clair. */
export function zoneArea(zone: MeasureZone): AreaResult {
  const f = (n: number) => formatNumber(n);
  switch (zone.shape) {
    case 'rectangle': {
      if (!positive(zone.length)) return { ok: false, error: 'Veuillez renseigner une longueur valide.' };
      if (!positive(zone.width)) return { ok: false, error: 'Veuillez renseigner une largeur valide.' };
      const area = round(zone.length * zone.width);
      return { ok: true, area, formula: `${f(zone.length)} m × ${f(zone.width)} m = ${f(area)} m²` };
    }
    case 'triangle': {
      if (!positive(zone.length)) return { ok: false, error: 'Veuillez renseigner une base valide.' };
      if (!positive(zone.width)) return { ok: false, error: 'Veuillez renseigner une hauteur valide.' };
      const area = round((zone.length * zone.width) / 2);
      return { ok: true, area, formula: `${f(zone.length)} m × ${f(zone.width)} m ÷ 2 = ${f(area)} m²` };
    }
    case 'circle': {
      if (!positive(zone.radius)) return { ok: false, error: 'Veuillez renseigner un rayon valide.' };
      const area = round(Math.PI * zone.radius * zone.radius);
      return { ok: true, area, formula: `π × ${f(zone.radius)} m × ${f(zone.radius)} m = ${f(area)} m²` };
    }
    case 'manual': {
      if (!positive(zone.manualArea)) return { ok: false, error: 'Veuillez renseigner une surface valide.' };
      const area = round(zone.manualArea);
      return { ok: true, area, formula: `${f(area)} m²` };
    }
  }
}

export interface AreaSummary {
  total: number;
  /** Au moins une zone approximative a été prise en compte */
  approximate: boolean;
  /** Nombre de zones valides prises en compte */
  counted: number;
  /** Zones incomplètes (ignorées dans le total) */
  incomplete: { zone: MeasureZone; error: string }[];
}

export function totalArea(zones: MeasureZone[]): AreaSummary {
  let total = 0;
  let approximate = false;
  let counted = 0;
  const incomplete: AreaSummary['incomplete'] = [];
  for (const zone of zones) {
    const res = zoneArea(zone);
    if (!res.ok) {
      incomplete.push({ zone, error: res.error });
      continue;
    }
    counted++;
    total += zone.subtract ? -res.area : res.area;
    if (zone.approximate) approximate = true;
  }
  return { total: round(Math.max(0, total)), approximate, counted, incomplete };
}

export interface LengthSummary {
  total: number;
  approximate: boolean;
  counted: number;
}

export function totalLength(linears: LinearMeasure[]): LengthSummary {
  let total = 0;
  let approximate = false;
  let counted = 0;
  for (const l of linears) {
    if (!positive(l.length)) continue;
    counted++;
    total += l.length;
    if (l.approximate) approximate = true;
  }
  return { total: round(total), approximate, counted };
}
