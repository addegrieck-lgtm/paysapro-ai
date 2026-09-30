import { useMemo, useState } from 'react';
import { BookOpen, Copy, LayoutTemplate, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button, ButtonLink, IconButton } from '../../components/ui/Button';
import { ConfirmDialog, Dialog, EmptyState, useToast } from '../../components/ui/Feedback';
import { CatalogItemFields, itemMargin, newCatalogItem } from '../../components/CatalogItemFields';
import { deleteCatalogItem, duplicateCatalogItem, saveCatalogItem } from '../../features/settings/actions';
import { defaultCatalog } from '../../data/defaults';
import { unitShort } from '../../features/catalog/units';
import { normalize } from '../../services/ai/LocalAIProvider';
import { formatMoney } from '../../utils/number';
import type { CatalogItem } from '../../types';

export function CatalogPage() {
  const { catalog, settings } = useAppState();
  const toast = useToast();
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [toDelete, setToDelete] = useState<CatalogItem | null>(null);
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = normalize(query.trim());
    const map = new Map<string, CatalogItem[]>();
    for (const item of [...catalog].sort((a, b) => a.label.localeCompare(b.label, 'fr'))) {
      if (q && !normalize(`${item.section} ${item.label}`).includes(q)) continue;
      const key = item.section.trim() || 'Divers';
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'));
  }, [catalog, query]);

  const restoreDefaults = () => {
    const existing = new Set(catalog.map((c) => c.label.toLowerCase()));
    const missing = defaultCatalog().filter((c) => !existing.has(c.label.toLowerCase()));
    missing.forEach(saveCatalogItem);
    toast(missing.length ? `✓ ${missing.length} prestation${missing.length > 1 ? 's' : ''} ajoutée${missing.length > 1 ? 's' : ''}` : 'Toutes les prestations types sont déjà présentes.');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catalogue"
        subtitle="Vos prestations : prix d’achat, prix de vente et marge."
        actions={
          <ButtonLink to="/templates" variant="ghost" size="sm" icon={<LayoutTemplate className="h-4 w-4" />}>
            Modèles
          </ButtonLink>
        }
      />

      <div className="flex gap-2">
        <label className="relative block flex-1">
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
        <Button icon={<Plus className="h-5 w-5" />} onClick={() => setEditing(newCatalogItem())}>
          Ajouter
        </Button>
      </div>

      {catalog.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-7 w-7" />} title="Catalogue vide" action={<Button variant="soft" onClick={restoreDefaults}>Charger les prestations types</Button>}>
          Ajoutez vos prestations avec leur prix : elles seront réutilisées dans tous vos devis.
        </EmptyState>
      ) : sections.length === 0 ? (
        <p className="py-8 text-center text-muted">Aucune prestation ne correspond.</p>
      ) : (
        sections.map(([section, items]) => (
          <section key={section}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">{section}</h2>
            <Card className="p-0!">
              <div className="hidden grid-cols-[1fr_6rem_6rem_6rem_7.5rem] gap-2 border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
                <span>Prestation</span>
                <span className="text-right">Achat</span>
                <span className="text-right">Vente</span>
                <span className="text-right">Marge</span>
                <span />
              </div>
              <ul className="divide-y divide-line">
                {items.map((item) => {
                  const m = itemMargin(item);
                  const u = unitShort(item.unit);
                  return (
                    <li key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-2 py-2 pl-4 pr-2 md:grid-cols-[1fr_6rem_6rem_6rem_7.5rem]">
                      <button type="button" className="min-w-0 py-1 text-left" onClick={() => setEditing(item)}>
                        <div className="truncate font-medium">
                          {item.label}
                          {settings.company.sap.enabled && item.sapEligible && <span className="ml-2 rounded border border-line px-1.5 py-0.5 align-middle text-[0.65rem] font-semibold uppercase tracking-wider text-muted">SAP</span>}
                        </div>
                        <div className="text-sm tabular-nums text-muted md:hidden">
                          Achat {formatMoney(item.costPrice)} · Vente {formatMoney(item.unitPrice)} / {u} ·{' '}
                          <span className={m.amount < 0 ? 'text-danger' : 'text-success'}>marge {formatMoney(m.amount)}</span>
                        </div>
                      </button>
                      <span className="hidden text-right text-sm tabular-nums text-muted md:block">{formatMoney(item.costPrice)}</span>
                      <span className="hidden text-right text-sm font-semibold tabular-nums md:block">
                        {formatMoney(item.unitPrice)}
                        <span className="block text-xs font-normal text-muted">/ {u}</span>
                      </span>
                      <span className={`hidden text-right text-sm font-semibold tabular-nums md:block ${m.amount < 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(m.amount)}</span>
                      <span className="flex justify-end">
                        <IconButton label={`Modifier ${item.label}`} onClick={() => setEditing(item)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={`Dupliquer ${item.label}`}
                          onClick={() => {
                            duplicateCatalogItem(item);
                            toast('✓ Prestation dupliquée');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Supprimer ${item.label}`} onClick={() => setToDelete(item)}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))
      )}

      {catalog.length > 0 && (
        <Button variant="ghost" block icon={<RotateCcw className="h-4 w-4" />} onClick={restoreDefaults}>
          Ajouter les prestations types manquantes
        </Button>
      )}

      {editing && (
        <EditDialog
          item={editing}
          sections={[...new Set(catalog.map((c) => c.section))]}
          defaultMargin={settings.defaultMarginPercent}
          sapEnabled={settings.company.sap.enabled}
          onClose={() => setEditing(null)}
          onSave={(item) => {
            saveCatalogItem(item);
            setEditing(null);
            toast('✓ Prestation enregistrée');
          }}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cette prestation ?"
        message={<p>« {toDelete?.label} » sera retirée du catalogue. Les devis existants ne sont pas modifiés.</p>}
        confirmLabel="Supprimer"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteCatalogItem(toDelete.id);
          setToDelete(null);
          toast('Prestation supprimée.');
        }}
      />
    </div>
  );
}

function EditDialog({
  item,
  sections,
  defaultMargin,
  sapEnabled,
  onClose,
  onSave,
}: {
  item: CatalogItem;
  sections: string[];
  defaultMargin: number;
  sapEnabled: boolean;
  onClose: () => void;
  onSave: (i: CatalogItem) => void;
}) {
  const [value, setValue] = useState(item);
  const invalid = !value.label.trim();
  return (
    <Dialog
      open
      onClose={onClose}
      title={item.label ? 'Modifier la prestation' : 'Nouvelle prestation'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={invalid} onClick={() => onSave({ ...value, label: value.label.trim(), section: value.section.trim() || 'Divers' })}>
            Enregistrer
          </Button>
        </>
      }
    >
      <CatalogItemFields value={value} onChange={setValue} sections={sections} defaultMargin={defaultMargin} sapEnabled={sapEnabled} />
    </Dialog>
  );
}
