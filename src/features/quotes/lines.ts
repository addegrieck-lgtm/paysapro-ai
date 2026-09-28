import type { CatalogItem, MeasureRef, QuoteLine } from '../../types';
import { uid } from '../../utils/id';

/** Référence de mesure par défaut : total du chantier pour les surfaces/longueurs. */
function defaultRef(rule: QuoteLine['quantityRule']): MeasureRef {
  return rule === 'manual' ? { type: 'manual' } : { type: 'total' };
}

export function lineFromCatalog(item: CatalogItem): QuoteLine {
  return {
    id: uid(),
    catalogItemId: item.id,
    label: item.label,
    description: item.description,
    kind: item.kind,
    unit: item.unit,
    quantityRule: item.quantityRule,
    measureRef: defaultRef(item.quantityRule),
    manualQuantity: item.quantityRule === 'manual' && item.unit === 'flat' ? 1 : null,
    wastePercent: item.wastePercent,
    thicknessCm: item.thicknessCm,
    unitPrice: item.unitPrice,
  };
}

export function blankLine(): QuoteLine {
  return {
    id: uid(),
    catalogItemId: null,
    label: '',
    description: '',
    kind: 'service',
    unit: 'unit',
    quantityRule: 'manual',
    measureRef: { type: 'manual' },
    manualQuantity: 1,
    wastePercent: 0,
    thicknessCm: null,
    unitPrice: 0,
  };
}
