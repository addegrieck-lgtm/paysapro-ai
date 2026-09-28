import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { CatalogItem } from '../types';
import { Dialog } from './ui/Feedback';
import { Button, ButtonLink } from './ui/Button';
import { unitShort } from '../features/catalog/units';
import { formatMoney } from '../utils/number';
import { normalize } from '../services/ai/LocalAIProvider';

/** Sélection multiple de prestations du catalogue. */
export function CatalogPicker({
  open,
  catalog,
  onClose,
  onAdd,
}: {
  open: boolean;
  catalog: CatalogItem[];
  onClose: () => void;
  onAdd: (items: CatalogItem[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = normalize(query.trim());
    const map = new Map<string, CatalogItem[]>();
    for (const item of catalog) {
      if (q && !normalize(`${item.section} ${item.label}`).includes(q)) continue;
      map.set(item.section, [...(map.get(item.section) ?? []), item]);
    }
    return [...map.entries()];
  }, [catalog, query]);

  const close = () => {
    setSelected([]);
    setQuery('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Catalogue de prestations"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Annuler
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              onAdd(catalog.filter((c) => selected.includes(c.id)));
              close();
            }}
          >
            Ajouter {selected.length > 0 ? `(${selected.length})` : ''}
          </Button>
        </>
      }
    >
      {catalog.length === 0 ? (
        <div className="space-y-3 text-muted">
          <p>Votre catalogue est vide.</p>
          <ButtonLink to="/settings/catalog" variant="soft">
            Créer mes prestations
          </ButtonLink>
        </div>
      ) : (
        <>
          <label className="relative mb-3 block">
            <span className="sr-only">Rechercher une prestation</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher"
              className="min-h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3"
            />
          </label>
          <div className="space-y-4">
            {sections.map(([section, items]) => (
              <div key={section}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{section}</h3>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const on = selected.includes(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          aria-label={`${item.label}, ${formatMoney(item.unitPrice)} par ${unitShort(item.unit)}`}
                          onClick={() => setSelected((s) => (on ? s.filter((x) => x !== item.id) : [...s, item.id]))}
                          className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left ${on ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-brand bg-brand text-on-brand' : 'border-line'}`}
                            aria-hidden
                          >
                            {on && <Check className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1 text-ink">{item.label}</span>
                          <span className="shrink-0 text-sm tabular-nums text-muted">
                            {formatMoney(item.unitPrice)} / {unitShort(item.unit)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {sections.length === 0 && <p className="text-muted">Aucune prestation trouvée.</p>}
          </div>
        </>
      )}
    </Dialog>
  );
}
