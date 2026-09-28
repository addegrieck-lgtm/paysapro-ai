import { useId } from 'react';
import type { CatalogItem, LineKind, QuantityRule, Unit } from '../types';
import { NumberField, SelectField, TextField } from './ui/Form';
import { LINE_KINDS, QUANTITY_RULES, UNITS, defaultUnitForRule } from '../features/catalog/units';
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
    kind: 'service',
    quantityRule: 'area',
    wastePercent: 0,
    thicknessCm: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function CatalogItemFields({ value, onChange, sections }: { value: CatalogItem; onChange: (v: CatalogItem) => void; sections: string[] }) {
  const listId = useId();
  const set = <K extends keyof CatalogItem>(k: K, v: CatalogItem[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField label="Nom de la prestation" value={value.label} onChange={(v) => set('label', v)} className="col-span-2" placeholder="Ex. Pose de gazon" />
      <TextField label="Rubrique" value={value.section} onChange={(v) => set('section', v)} list={listId} placeholder="Ex. Gazon" className="col-span-2" />
      <datalist id={listId}>
        {sections.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <NumberField label="Prix unitaire HT" suffix="€" value={value.unitPrice} onChange={(v) => set('unitPrice', v ?? 0)} />
      <SelectField label="Unité" value={value.unit} onChange={(v) => set('unit', v as Unit)} options={UNITS.map((u) => ({ value: u.value, label: u.label }))} />
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
