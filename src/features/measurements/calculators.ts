// Calculateurs métier : fonctions pures, testées (tests/calculators.test.ts).
import { round } from '../../utils/number';

export type CalcResult<T> = { ok: true; value: T } | { ok: false; error: string };

const err = (error: string) => ({ ok: false as const, error });
const valid = (n: number | null): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const pct = (n: number | null): n is number => valid(n) && n <= 100;

/** Quantité à commander = quantité + pertes %. Ex. 100 m² + 8 % = 108 m². */
export function withWaste(quantity: number | null, wastePercent: number | null): CalcResult<number> {
  if (!valid(quantity)) return err('Veuillez renseigner une quantité valide.');
  if (!pct(wastePercent)) return err('Le pourcentage de perte doit être compris entre 0 et 100.');
  return { ok: true, value: round(quantity * (1 + wastePercent / 100)) };
}

/** Gazon : surface + pertes. */
export function lawn(area: number | null, wastePercent: number | null): CalcResult<number> {
  if (!valid(area)) return err('Veuillez renseigner une surface valide.');
  return withWaste(area, wastePercent);
}

/** Volume (m³) = surface (m²) × épaisseur (cm) ÷ 100. */
export function volume(area: number | null, thicknessCm: number | null): CalcResult<number> {
  if (!valid(area)) return err('Veuillez renseigner une surface valide.');
  if (!valid(thicknessCm) || thicknessCm === 0) return err('Veuillez renseigner une épaisseur valide.');
  return { ok: true, value: round((area * thicknessCm) / 100, 2) };
}

/** Gravier : volume puis poids (tonnes) si un coefficient t/m³ est fourni. */
export function gravel(
  area: number | null,
  thicknessCm: number | null,
  densityTPerM3: number | null,
): CalcResult<{ volume: number; weight: number | null }> {
  const v = volume(area, thicknessCm);
  if (!v.ok) return v;
  const weight = valid(densityTPerM3) && densityTPerM3 > 0 ? round(v.value * densityTPerM3, 2) : null;
  return { ok: true, value: { volume: v.value, weight } };
}

/** Bordures : somme des longueurs = mètres linéaires. */
export function borders(lengths: (number | null)[]): CalcResult<number> {
  const values = lengths.filter(valid);
  if (values.length === 0) return err('Veuillez renseigner au moins une longueur valide.');
  return { ok: true, value: round(values.reduce((a, b) => a + b, 0)) };
}

/** Clôture : panneaux = ⌈longueur ÷ largeur panneau⌉, poteaux = panneaux + 1 (+ angles). */
export function fence(
  length: number | null,
  panelWidth: number | null,
  corners: number | null = 0,
): CalcResult<{ panels: number; posts: number }> {
  if (!valid(length) || length === 0) return err('Veuillez renseigner une longueur valide.');
  if (!valid(panelWidth) || panelWidth === 0) return err('Veuillez renseigner une largeur de panneau valide.');
  // arrondi préalable : évite qu'une erreur de flottant ajoute un panneau
  const panels = Math.ceil(round(length / panelWidth, 6));
  const extra = valid(corners) ? Math.floor(corners) : 0;
  return { ok: true, value: { panels, posts: panels + 1 + extra } };
}

/** Terrasse : surface × prix au m². */
export function terrace(area: number | null, pricePerM2: number | null): CalcResult<number> {
  if (!valid(area)) return err('Veuillez renseigner une surface valide.');
  if (!valid(pricePerM2)) return err('Veuillez renseigner un prix valide.');
  return { ok: true, value: round(area * pricePerM2) };
}

/** Plantation : nombre × prix unitaire. */
export function planting(count: number | null, unitPrice: number | null): CalcResult<number> {
  if (!valid(count)) return err('Veuillez renseigner un nombre de plantes valide.');
  if (!valid(unitPrice)) return err('Veuillez renseigner un prix valide.');
  return { ok: true, value: round(count * unitPrice) };
}

/** Main-d'œuvre : heures × taux horaire (ou jours × taux journalier). */
export function labor(amount: number | null, rate: number | null): CalcResult<number> {
  if (!valid(amount)) return err('Veuillez renseigner une durée valide.');
  if (!valid(rate)) return err('Veuillez renseigner un tarif valide.');
  return { ok: true, value: round(amount * rate) };
}
