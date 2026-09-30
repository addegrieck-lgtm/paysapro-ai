import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCheck2,
  LayoutTemplate,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useProjectData } from '../../hooks/useData';
import { PageHeader, StickyActions } from '../../components/ui/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button, IconButton } from '../../components/ui/Button';
import { hasFeature } from '../../features/plans/plans';
import { Checkbox, Chip, NumberField, Segmented, SelectField, TextArea, TextField } from '../../components/ui/Form';
import { Alert, Dialog, EmptyState, useToast } from '../../components/ui/Feedback';
import { CatalogPicker } from '../../components/CatalogPicker';
import { AssistantPanel } from '../../components/AssistantPanel';
import { TotalsCard } from '../../components/TotalsCard';
import { QuoteFlowBar } from '../../components/QuoteFlowBar';
import { NotFoundPage } from '../NotFoundPage';
import {
  addLines,
  applyMarginToQuote,
  applyTemplate,
  blankLine,
  finalizeQuote,
  lineFromCatalog,
  moveLine,
  removeLine,
  updateLine,
  updateQuote,
} from '../../features/quotes/actions';
import { saveQuoteAsTemplate } from '../../features/templates/actions';
import { isQuoteLocked } from '../../features/projects/status';
import { clientDisplayName } from '../../features/clients/format';
import { buildProjectContext } from '../../features/ai/context';
import { getAIProvider } from '../../services/ai';
import { analytics } from '../../services/analytics/AnalyticsProvider';
import { LINE_KINDS, QUANTITY_RULES, UNITS, defaultUnitForRule, unitShort } from '../../features/catalog/units';
import { zoneArea } from '../../features/measurements/geometry';
import type { ComputedLine } from '../../features/quotes/pricing';
import { formatMoney, formatNumber } from '../../utils/number';
import type { LineKind, MeasureRef, Project, QuantityRule, QuoteLine, Unit } from '../../types';

export function ServicesPage() {
  const { id } = useParams();
  const { project, quote, client, photos, totals, settings, catalog, templates } = useProjectData(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [picker, setPicker] = useState(false);
  const [labor, setLabor] = useState(false);
  const [saveTpl, setSaveTpl] = useState(false);
  const [openLine, setOpenLine] = useState<string | null>(null);
  const [describing, setDescribing] = useState(false);

  if (!project || !quote || !totals) return <NotFoundPage />;
  const locked = isQuoteLocked(quote);
  const sortedCatalog = [...catalog].sort((a, b) => a.section.localeCompare(b.section) || a.label.localeCompare(b.label));
  const ai = getAIProvider(settings.aiMode);
  const laborCost = (unit: 'hour' | 'day') => catalog.find((c) => c.kind === 'labor' && c.unit === unit)?.costPrice ?? 0;

  const added = (n: number) => toast(`✓ ${n} prestation${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}`);

  const createQuote = () => {
    if (quote.lines.length === 0) return toast('Ajoutez au moins une prestation.', 'danger');
    if (totals.missingCount > 0) return toast('Complétez les quantités manquantes avant de créer le devis.', 'danger');
    finalizeQuote(quote.id);
    toast('✓ Devis enregistré');
    navigate(`/projects/${project.id}/quote`);
  };

  const describe = async () => {
    setDescribing(true);
    const text = await ai.generateQuoteDescription(
      buildProjectContext(project, photos.length, catalog),
      quote.lines.map((l) => l.label),
    );
    setDescribing(false);
    analytics.track('ai_used', { feature: 'quote_description' });
    if (!text) return toast('Ajoutez d’abord des prestations.', 'info');
    updateQuote(quote.id, { description: text });
    toast('✓ Description générée — relisez-la avant d’envoyer.');
  };

  return (
    <div className="space-y-5">
      <PageHeader back={`/projects/${project.id}`} title="Prestations & prix" subtitle={clientDisplayName(client)} />
      <QuoteFlowBar current="price" projectId={project.id} quote={quote} />

      {locked && <Alert tone="info">Ce devis a été accepté ou signé : les prestations ne sont plus modifiables.</Alert>}

      {!locked && (
        <>
          <AssistantPanel
            project={project}
            photoCount={photos.length}
            existingCatalogIds={quote.lines.map((l) => l.catalogItemId).filter((x): x is string => !!x)}
            onAdd={(items) => {
              addLines(quote.id, items.map(lineFromCatalog));
              added(items.length);
            }}
          />

          {templates.length > 0 && (
            <Card>
              <CardTitle icon={<LayoutTemplate className="h-5 w-5" />}>Partir d’un modèle</CardTitle>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <Chip
                    key={t.id}
                    selected={false}
                    onClick={() => {
                      const before = quote.lines.length;
                      const missing = applyTemplate(quote.id, t);
                      toast(missing.length ? `Modèle ajouté. Absent du catalogue : ${missing.join(', ')}.` : `✓ Modèle « ${t.name} » ajouté`, missing.length ? 'info' : 'success');
                      if (before === 0) window.scrollTo({ top: document.body.scrollHeight / 3, behavior: 'smooth' });
                    }}
                  >
                    + {t.name}
                  </Chip>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-2 [&>button]:flex-col [&>button]:gap-1 [&>button]:px-1 [&>button]:py-2 [&>button]:text-sm">
            <Button variant="soft" icon={<BookOpen className="h-5 w-5" />} onClick={() => setPicker(true)}>
              Catalogue
            </Button>
            <Button variant="soft" icon={<Clock className="h-5 w-5" />} onClick={() => setLabor(true)}>
              Main-d’œuvre
            </Button>
            <Button
              variant="soft"
              icon={<Plus className="h-5 w-5" />}
              onClick={() => {
                const l = blankLine();
                addLines(quote.id, [l]);
                setOpenLine(l.id);
              }}
            >
              Ligne libre
            </Button>
          </div>
        </>
      )}

      <section aria-label="Lignes du devis" className="space-y-3">
        {quote.lines.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-7 w-7" />} title="Aucune prestation pour l’instant">
            Partez d’un modèle, utilisez les suggestions ou votre catalogue. Les quantités sont calculées automatiquement depuis vos mesures.
          </EmptyState>
        ) : (
          totals.lines.map((cl, i) => (
            <LineCard
              key={cl.line.id}
              computed={cl}
              project={project}
              locked={locked}
              sapEnabled={settings.company.sap.enabled}
              open={openLine === cl.line.id}
              first={i === 0}
              last={i === totals.lines.length - 1}
              onToggle={() => setOpenLine(openLine === cl.line.id ? null : cl.line.id)}
              onChange={(patch) => updateLine(quote.id, cl.line.id, patch)}
              onMove={(d) => moveLine(quote.id, cl.line.id, d)}
              onDelete={() => removeLine(quote.id, cl.line.id)}
            />
          ))
        )}
      </section>

      {quote.lines.length > 0 && (
        <>
          <TotalsCard
            totals={totals}
            vatExempt={quote.vatExempt}
            locked={locked}
            defaultMargin={settings.defaultMarginPercent}
            onApplyMargin={(m) => {
              applyMarginToQuote(quote.id, m);
              toast(`✓ Prix de vente recalculés : coût + ${formatNumber(m)} %`);
            }}
          />

          <Card>
            <CardTitle
              icon={<Sparkles className="h-5 w-5" />}
              action={
                !locked && (
                  <Button variant="soft" size="sm" onClick={describe} disabled={describing} icon={describing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>
                    Générer la description
                  </Button>
                )
              }
            >
              Description des travaux
            </CardTitle>
            <TextArea
              label="Texte affiché sur le devis (modifiable)"
              value={quote.description}
              onChange={(v) => updateQuote(quote.id, { description: v })}
              rows={4}
              disabled={locked}
              placeholder="Ex. Préparation complète du terrain, fourniture et pose d’un gazon en plaques…"
              hint={ai.simulated ? 'Mode démonstration : texte proposé automatiquement, à relire.' : 'Suggestion automatique à partir de vos prestations : relisez avant validation.'}
            />
          </Card>

          {!locked && (
            <Button variant="ghost" block icon={<Save className="h-4 w-4" />} onClick={() => setSaveTpl(true)}>
              Enregistrer ces prestations comme modèle
            </Button>
          )}
        </>
      )}

      <StickyActions>
        {quote.number ? (
          <Button block size="lg" icon={<FileCheck2 className="h-5 w-5" />} onClick={() => navigate(`/projects/${project.id}/quote`)}>
            Voir le devis {quote.number}
          </Button>
        ) : (
          <Button block size="lg" icon={<FileCheck2 className="h-5 w-5" />} onClick={createQuote} disabled={quote.lines.length === 0}>
            Créer le devis
          </Button>
        )}
      </StickyActions>

      <CatalogPicker
        open={picker}
        catalog={sortedCatalog}
        onClose={() => setPicker(false)}
        onAdd={(items) => {
          addLines(quote.id, items.map(lineFromCatalog));
          added(items.length);
        }}
      />
      {labor && (
        <LaborDialog
          hourlyRate={settings.hourlyRate}
          dailyRate={settings.dailyRate}
          hourlyCost={laborCost('hour')}
          dailyCost={laborCost('day')}
          onClose={() => setLabor(false)}
          onAdd={(line) => {
            addLines(quote.id, [line]);
            setLabor(false);
            toast('✓ Main-d’œuvre ajoutée');
          }}
        />
      )}
      {saveTpl && (
        <SaveTemplateDialog
          defaultName={project.title}
          onClose={() => setSaveTpl(false)}
          onSave={(name) => {
            saveQuoteAsTemplate(quote, name, project.categories);
            setSaveTpl(false);
            toast('✓ Modèle enregistré');
          }}
        />
      )}
    </div>
  );
}

function SaveTemplateDialog({ defaultName, onClose, onSave }: { defaultName: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(defaultName);
  return (
    <Dialog
      open
      onClose={onClose}
      title="Enregistrer comme modèle"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={!name.trim()} onClick={() => onSave(name)}>
            Enregistrer
          </Button>
        </>
      }
    >
      <TextField label="Nom du modèle" value={name} onChange={setName} placeholder="Ex. Pelouse + massif" />
      <p className="mt-2 text-sm text-muted">Les prestations, prix et coûts sont repris. Les quantités se recalculeront avec les mesures de chaque chantier.</p>
    </Dialog>
  );
}

function refValue(ref: MeasureRef): string {
  return ref.type === 'zone' || ref.type === 'linear' ? `${ref.type}:${ref.id}` : ref.type;
}

function parseRef(v: string): MeasureRef {
  if (v.startsWith('zone:')) return { type: 'zone', id: v.slice(5) };
  if (v.startsWith('linear:')) return { type: 'linear', id: v.slice(7) };
  return v === 'total' ? { type: 'total' } : { type: 'manual' };
}

function sourceOptions(rule: QuantityRule, project: Project) {
  const opts: { value: string; label: string }[] = [];
  if (rule === 'area' || rule === 'volume') {
    opts.push({ value: 'total', label: 'Surface totale du chantier' });
    for (const z of project.zones) {
      const r = zoneArea(z);
      if (!z.subtract) opts.push({ value: `zone:${z.id}`, label: `${z.name}${r.ok ? ` (${formatNumber(r.area)} m²)` : ''}` });
    }
  }
  if (rule === 'length') {
    opts.push({ value: 'total', label: 'Longueur totale' });
    for (const l of project.linears) opts.push({ value: `linear:${l.id}`, label: `${l.name}${l.length ? ` (${formatNumber(l.length)} m)` : ''}` });
  }
  opts.push({ value: 'manual', label: 'Saisie manuelle' });
  return opts;
}

function LineCard({
  computed,
  project,
  locked,
  sapEnabled,
  open,
  first,
  last,
  onToggle,
  onChange,
  onMove,
  onDelete,
}: {
  computed: ComputedLine;
  project: Project;
  locked: boolean;
  sapEnabled: boolean;
  open: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onChange: (p: Partial<QuoteLine>) => void;
  onMove: (d: -1 | 1) => void;
  onDelete: () => void;
}) {
  const { line } = computed;
  const manual = line.quantityRule === 'manual' || line.measureRef.type === 'manual';
  const u = unitShort(line.unit);
  return (
    <Card className="p-0! overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink">
            {line.label || 'Nouvelle ligne'}
            {sapEnabled && line.sapEligible && <span className="ml-2 rounded border border-line px-1.5 py-0.5 align-middle text-[0.65rem] font-semibold uppercase tracking-wider text-muted">SAP</span>}
          </div>
          {computed.status === 'missing' ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-warning">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> {computed.message}
            </div>
          ) : (
            <div className="mt-0.5 text-sm text-muted tabular-nums">
              {computed.formula} × {formatMoney(line.unitPrice)}
              {computed.status === 'estimated' && <span className="ml-1 font-medium text-warning">· estimation à confirmer</span>}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-semibold tabular-nums">{formatMoney(computed.saleTotal)}</div>
          {hasFeature('profitability') && <div className={`text-xs tabular-nums ${computed.marginTotal < 0 ? 'text-danger' : 'text-muted'}`}>marge {formatMoney(computed.marginTotal)}</div>}
        </div>
        {open ? <ChevronUp className="mt-0.5 h-5 w-5 text-muted" aria-hidden /> : <ChevronDown className="mt-0.5 h-5 w-5 text-muted" aria-hidden />}
      </button>
      {open && (
        <fieldset disabled={locked} className="space-y-3 border-t border-line bg-surface-2/40 p-4">
          <TextField label="Désignation" value={line.label} onChange={(v) => onChange({ label: v })} />
          <TextField label="Détail affiché au client (facultatif)" value={line.description} onChange={(v) => onChange({ description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Calcul de la quantité"
              value={line.quantityRule}
              onChange={(v) => {
                const rule = v as QuantityRule;
                onChange({
                  quantityRule: rule,
                  measureRef: rule === 'manual' ? { type: 'manual' } : { type: 'total' },
                  unit: defaultUnitForRule(rule),
                  thicknessCm: rule === 'volume' ? (line.thicknessCm ?? 10) : line.thicknessCm,
                });
              }}
              options={QUANTITY_RULES}
            />
            {line.quantityRule !== 'manual' ? (
              <SelectField label="Mesure utilisée" value={refValue(line.measureRef)} onChange={(v) => onChange({ measureRef: parseRef(v) })} options={sourceOptions(line.quantityRule, project)} />
            ) : (
              <SelectField label="Unité" value={line.unit} onChange={(v) => onChange({ unit: v as Unit })} options={UNITS.map((x) => ({ value: x.value, label: x.label }))} />
            )}
            {manual && <NumberField label="Quantité" suffix={u} value={line.manualQuantity} onChange={(v) => onChange({ manualQuantity: v })} />}
            {line.quantityRule === 'volume' && <NumberField label="Épaisseur" suffix="cm" value={line.thicknessCm} onChange={(v) => onChange({ thicknessCm: v })} />}
            <NumberField label="Pertes" suffix="%" max={100} value={line.wastePercent} onChange={(v) => onChange({ wastePercent: v ?? 0 })} />
            <SelectField label="Catégorie" value={line.kind} onChange={(v) => onChange({ kind: v as LineKind })} options={LINE_KINDS} />
            <NumberField label={`Prix de vente HT / ${u}`} suffix="€" value={line.unitPrice} onChange={(v) => onChange({ unitPrice: v ?? 0 })} />
            <NumberField label={`Coût HT / ${u} (interne)`} suffix="€" value={line.unitCost} onChange={(v) => onChange({ unitCost: v ?? 0 })} hint="Jamais visible par le client." />
          </div>
          {sapEnabled && (
            <Checkbox checked={line.sapEligible === true} onChange={(v) => onChange({ sapEligible: v })}>
              SAP éligible (services à la personne)
            </Checkbox>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex">
              <IconButton label="Monter" disabled={first} onClick={() => onMove(-1)}>
                <ArrowUp className="h-5 w-5" />
              </IconButton>
              <IconButton label="Descendre" disabled={last} onClick={() => onMove(1)}>
                <ArrowDown className="h-5 w-5" />
              </IconButton>
            </div>
            <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>
              Supprimer la ligne
            </Button>
          </div>
        </fieldset>
      )}
    </Card>
  );
}

function LaborDialog({
  hourlyRate,
  dailyRate,
  hourlyCost,
  dailyCost,
  onClose,
  onAdd,
}: {
  hourlyRate: number;
  dailyRate: number;
  hourlyCost: number;
  dailyCost: number;
  onClose: () => void;
  onAdd: (line: QuoteLine) => void;
}) {
  const [mode, setMode] = useState<'hour' | 'day'>('hour');
  const [amount, setAmount] = useState<number | null>(null);
  const [people, setPeople] = useState<number | null>(1);
  const [rate, setRate] = useState<number | null>(hourlyRate);
  const [cost, setCost] = useState<number | null>(hourlyCost);
  const qty = amount !== null && people !== null ? amount * people : null;
  const total = qty !== null && rate !== null ? qty * rate : null;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Main-d’œuvre"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!qty || rate === null}
            onClick={() =>
              onAdd({
                ...blankLine(),
                label: mode === 'hour' ? 'Main-d’œuvre' : 'Journées d’équipe',
                description: people && people > 1 ? `${people} personnes` : '',
                kind: 'labor',
                unit: mode,
                manualQuantity: qty,
                unitPrice: rate ?? 0,
                unitCost: cost ?? 0,
              })
            }
          >
            Ajouter
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented
          label="Unité"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setRate(v === 'hour' ? hourlyRate : dailyRate);
            setCost(v === 'hour' ? hourlyCost : dailyCost);
          }}
          options={[
            { value: 'hour', label: 'À l’heure' },
            { value: 'day', label: 'À la journée' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label={mode === 'hour' ? 'Nombre d’heures' : 'Nombre de jours'} value={amount} onChange={setAmount} />
          <NumberField label="Personnes" value={people} onChange={setPeople} />
          <NumberField label={mode === 'hour' ? 'Tarif horaire facturé' : 'Tarif journalier facturé'} suffix="€" value={rate} onChange={setRate} />
          <NumberField label="Coût interne" suffix="€" value={cost} onChange={setCost} hint="Salaire chargé, non visible du client." />
        </div>
        <div className="rounded-xl bg-brand-soft p-3 text-brand">
          {total !== null ? (
            <span className="font-semibold tabular-nums">
              {formatNumber(qty)} {mode === 'hour' ? 'h' : 'j'} × {formatMoney(rate)} = {formatMoney(total)} HT
            </span>
          ) : (
            <span className="text-sm">Renseignez la durée et le tarif.</span>
          )}
        </div>
      </div>
    </Dialog>
  );
}
