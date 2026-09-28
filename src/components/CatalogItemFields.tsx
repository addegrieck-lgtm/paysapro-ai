import { useId } from 'react';
import type { CatalogItem, LineKind, QuantityRule, Unit } from '../types';
import { NumberField, SelectField, TextField } from './ui/Form';
import { Button } from './ui/Button';
import { LINE_KINDS, QUANTITY_RULES, UNITS, defaultUnitForRule, unitShort } from '../features/catalog/units';
import { applyMargin } from '../features/quotes/pricing';
import { formatMoney, formatNumber, round } from '../utils/number';
import { uid } from '../utils/id';

export function newCatalogItem(section = ''): CatalogItem {
  const now = new Date().toISOString();
  return {
    id: uid(),
    section,
    label: '',
    description: '',
    unit: 'm2',
    unitPrice: 0,
    costPrice: 0,
    kind: 'service',
    quantityRule: 'area',
    wastePercent: 0,
    thicknessCm: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Marge unitaire d'une prestation (vente − achat) et taux sur prix de vente. */
export function itemMargin(item: Pick<CatalogItem, 'unitPrice' | 'costPrice'>): { amount: number; rate: number | null } {
  const amount = round(item.unitPrice - item.costPrice);
  return { amount, rate: item.unitPrice > 0 ? round((amount / item.unitPrice) * 100, 0) : null };
}

export function CatalogItemFields({
  value,
  onChange,
  sections,
  defaultMargin,
}: {
  value: CatalogItem;
  onChange: (v: CatalogItem) => void;
  sections: string[];
  defaultMargin: number;
}) {
  const listId = useId();
  const set = <K extends keyof CatalogItem>(k: K, v: CatalogItem[K]) => onChange({ ...value, [k]: v });
  const m = itemMargin(value);
  const u = unitShort(value.unit);
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField label="Nom de la prestation" value={value.label} onChange={(v) => set('label', v)} className="col-span-2" placeholder="Ex. Gazon en plaques" />
      <TextField label="Rubrique" value={value.section} onChange={(v) => set('section', v)} list={listId} placeholder="Ex. Gazon" />
      <datalist id={listId}>
        {sections.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <SelectField label="Unité" value={value.unit} onChange={(v) => set('unit', v as Unit)} options={UNITS.map((x) => ({ value: x.value, label: x.label }))} />
      <NumberField label={`Prix d’achat / coût (${u})`} suffix="€" value={value.costPrice} onChange={(v) => set('costPrice', v ?? 0)} hint="Interne, jamais montré au client." />
      <NumberField label={`Prix de vente HT (${u})`} suffix="€" value={value.unitPrice} onChange={(v) => set('unitPrice', v ?? 0)} />
      <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5">
        <span className={`font-semibold tabular-nums ${m.amount < 0 ? 'text-danger' : 'text-success'}`}>
          Marge : {formatMoney(m.amount)} / {u}
          {m.rate !== null && <span className="font-medium text-muted"> ({m.rate} %)</span>}
        </span>
        {value.costPrice > 0 && (
          <Button size="sm" variant="ghost" onClick={() => set('unitPrice', applyMargin(value.costPrice, defaultMargin))}>
            Vente = coût + {formatNumber(defaultMargin)} %
          </Button>
        )}
      </div>
      <SelectField
        label="Quantité calculée depuis"
        value={value.quantityRule}
        onChange={(v) => {
          const rule = v as QuantityRule;
          onChange({ ...value, quantityRule: rule, unit: rule === 'manual' ? value.unit : defaultUnitForRule(rule), thicknessCm: rule === 'volume' ? (value.thicknessCm ?? 10) : value.thicknessCm });
        }}
        options={QUANTITY_RULES}
        className="col-span-2"
      />
      <NumberField label="Pertes" suffix="%" max={100} value={value.wastePercent} onChange={(v) => set('wastePercent', v ?? 0)} />
      {value.quantityRule === 'volume' ? (
        <NumberField label="Épaisseur" suffix="cm" value={value.thicknessCm} onChange={(v) => set('thicknessCm', v)} />
      ) : (
        <SelectField label="Catégorie" value={value.kind} onChange={(v) => set('kind', v as LineKind)} options={LINE_KINDS} />
      )}
      {value.quantityRule === 'volume' && (
        <SelectField label="Catégorie" value={value.kind} onChange={(v) => set('kind', v as LineKind)} options={LINE_KINDS} className="col-span-2" />
      )}
      <TextField label="Détail affiché sur le devis (facultatif)" value={value.description} onChange={(v) => set('description', v)} className="col-span-2" />
    </div>
  );
}
