import type { CatalogItem, MeasureRef, QuoteLine, QuoteTemplate } from '../../types';
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
    unitCost: item.costPrice,
    ...(item.sapEligible ? { sapEligible: true } : {}),
  };
}

/** Lignes d'un modèle de devis. Les prestations absentes du catalogue sont signalées, pas inventées. */
export function linesFromTemplate(template: QuoteTemplate, catalog: CatalogItem[]): { lines: QuoteLine[]; missing: string[] } {
  const norm = (s: string) => s.trim().toLowerCase();
  const lines: QuoteLine[] = template.lines.map((l) => ({ ...l, id: uid() }));
  const missing: string[] = [];
  for (const it of template.items) {
    const item = catalog.find((c) => norm(c.label) === norm(it.label));
    if (!item) {
      missing.push(it.label);
      continue;
    }
    const line = lineFromCatalog(item);
    if (it.quantity !== null) {
      line.measureRef = { type: 'manual' };
      line.manualQuantity = it.quantity;
    }
    lines.push(line);
  }
  return { lines, missing };
}

/** Transforme les lignes d'un devis en lignes de modèle réutilisables. */
export function templateLinesFrom(lines: QuoteLine[]): Omit<QuoteLine, 'id'>[] {
  return lines.map(({ id: _id, ...l }) => ({
    ...l,
    // les zones et longueurs sont propres à un chantier : on revient au total du chantier
    measureRef: l.measureRef.type === 'zone' || l.measureRef.type === 'linear' ? { type: 'total' } : l.measureRef,
  }));
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
    unitCost: 0,
  };
}
