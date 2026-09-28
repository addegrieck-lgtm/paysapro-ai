import type { LineKind, QuantityRule, Unit } from '../../types';

export const UNITS: { value: Unit; label: string; short: string }[] = [
  { value: 'm2', label: 'm²', short: 'm²' },
  { value: 'm', label: 'm', short: 'm' },
  { value: 'ml', label: 'ml (mètre linéaire)', short: 'ml' },
  { value: 'm3', label: 'm³', short: 'm³' },
  { value: 'unit', label: 'unité', short: 'u' },
  { value: 'flat', label: 'forfait', short: 'forfait' },
  { value: 'hour', label: 'heure', short: 'h' },
  { value: 'day', label: 'jour', short: 'j' },
];

export function unitShort(unit: Unit): string {
  return UNITS.find((u) => u.value === unit)?.short ?? '';
}

export function unitLabel(unit: Unit): string {
  return UNITS.find((u) => u.value === unit)?.label ?? '';
}

export const LINE_KINDS: { value: LineKind; label: string }[] = [
  { value: 'service', label: 'Prestation' },
  { value: 'material', label: 'Matériaux' },
  { value: 'plant', label: 'Végétaux' },
  { value: 'labor', label: "Main-d'œuvre" },
  { value: 'rental', label: 'Location matériel' },
  { value: 'transport', label: 'Transport' },
  { value: 'disposal', label: 'Évacuation' },
  { value: 'consumable', label: 'Consommables' },
];

export function kindLabel(kind: LineKind): string {
  return LINE_KINDS.find((k) => k.value === kind)?.label ?? '';
}

export const QUANTITY_RULES: { value: QuantityRule; label: string; hint: string }[] = [
  { value: 'area', label: 'Surface (m²)', hint: 'Quantité = surface mesurée (+ pertes)' },
  { value: 'length', label: 'Longueur (ml)', hint: 'Quantité = longueurs mesurées (+ pertes)' },
  { value: 'volume', label: 'Volume (surface × épaisseur)', hint: 'Quantité = surface × épaisseur (+ pertes)' },
  { value: 'manual', label: 'Saisie manuelle', hint: 'Vous saisissez la quantité' },
];

/** Unité cohérente par défaut pour une règle de quantité. */
export function defaultUnitForRule(rule: QuantityRule): Unit {
  switch (rule) {
    case 'area':
      return 'm2';
    case 'length':
      return 'ml';
    case 'volume':
      return 'm3';
    default:
      return 'unit';
  }
}
