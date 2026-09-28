import { useParams } from 'react-router';
import { ArrowRight, Plus, Ruler, Trash2, TriangleAlert } from 'lucide-react';
import { useProjectData } from '../../hooks/useData';
import { PageHeader, StickyActions } from '../../components/ui/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button, ButtonLink, IconButton } from '../../components/ui/Button';
import { Checkbox, NumberField, Segmented, SelectField, TextField } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Feedback';
import { NotFoundPage } from '../NotFoundPage';
import { QuoteFlowBar } from '../../components/QuoteFlowBar';
import { newLinear, newZone, updateProject } from '../../features/projects/actions';
import { SHAPES, totalArea, totalLength, zoneArea } from '../../features/measurements/geometry';
import { clientDisplayName } from '../../features/clients/format';
import { formatNumber } from '../../utils/number';
import type { EstimateMode, LinearMeasure, MeasureZone, ZoneShape } from '../../types';

export function MeasuresPage() {
  const { id } = useParams();
  const { project, client, quote } = useProjectData(id);
  if (!project) return <NotFoundPage />;

  const quick = project.estimateMode === 'quick';
  const area = totalArea(project.zones);
  const length = totalLength(project.linears);

  const setZones = (zones: MeasureZone[]) => updateProject(project.id, { zones });
  const setLinears = (linears: LinearMeasure[]) => updateProject(project.id, { linears });
  const patchZone = (zid: string, patch: Partial<MeasureZone>) => setZones(project.zones.map((z) => (z.id === zid ? { ...z, ...patch } : z)));
  const patchLinear = (lid: string, patch: Partial<LinearMeasure>) => setLinears(project.linears.map((l) => (l.id === lid ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-5">
      <PageHeader back={`/projects/${project.id}`} title="Mesures du chantier" subtitle={clientDisplayName(client)} />
      <QuoteFlowBar current="measures" projectId={project.id} quote={quote} />

      <Card>
        <Segmented<EstimateMode>
          label="Mode d’estimation"
          value={project.estimateMode}
          onChange={(v) => updateProject(project.id, { estimateMode: v })}
          options={[
            { value: 'precise', label: 'Mode précis' },
            { value: 'quick', label: 'Mode rapide' },
          ]}
        />
        <p className="mt-3 text-sm text-muted">
          {quick
            ? 'Dimensions approximatives (au pas, à vue). Les quantités seront marquées « Estimation indicative — à confirmer ».'
            : 'Dimensions mesurées (décamètre, télémètre). Les calculs sont basés exactement sur vos saisies.'}
        </p>
      </Card>

      {/* Total */}
      <div className="rounded-2xl bg-brand p-5 text-on-brand shadow-card">
        <div className="text-sm opacity-85">Surface totale</div>
        <div className="text-4xl font-bold tabular-nums tracking-tight">
          {area.approximate && '≈ '}
          {formatNumber(area.total)} m²
        </div>
        {length.counted > 0 && <div className="mt-1 text-sm opacity-90">Longueurs : {formatNumber(length.total)} ml</div>}
        {area.approximate && <div className="mt-2 text-sm font-medium">⚠️ Estimation indicative — à confirmer</div>}
      </div>

      {area.incomplete.length > 0 && (
        <Alert tone="warning" title="Zones incomplètes (non comptées)">
          {area.incomplete.map(({ zone, error }) => (
            <div key={zone.id}>
              {zone.name} : {error}
            </div>
          ))}
        </Alert>
      )}

      <section className="space-y-3" aria-label="Surfaces">
        <h2 className="text-lg font-semibold">Surfaces</h2>
        {project.zones.map((z) => (
          <ZoneCard
            key={z.id}
            zone={z}
            onChange={(patch) => patchZone(z.id, patch)}
            onDelete={() => setZones(project.zones.filter((x) => x.id !== z.id))}
          />
        ))}
        <Button variant="soft" block icon={<Plus className="h-5 w-5" />} onClick={() => setZones([...project.zones, newZone(project.zones.length, quick)])}>
          {project.zones.length ? 'Ajouter une zone' : 'Ajouter une surface'}
        </Button>
      </section>

      <section className="space-y-3" aria-label="Longueurs">
        <h2 className="text-lg font-semibold">Longueurs</h2>
        <p className="-mt-2 text-sm text-muted">Bordures, clôtures, haies… (mètres linéaires)</p>
        {project.linears.map((l) => (
          <Card key={l.id}>
            <div className="flex items-end gap-2">
              <TextField label="Nom" value={l.name} onChange={(v) => patchLinear(l.id, { name: v })} className="min-w-0 flex-1" />
              <NumberField label="Longueur" suffix="m" value={l.length} onChange={(v) => patchLinear(l.id, { length: v })} className="w-32" />
              <IconButton label={`Supprimer ${l.name}`} onClick={() => setLinears(project.linears.filter((x) => x.id !== l.id))}>
                <Trash2 className="h-5 w-5" />
              </IconButton>
            </div>
            <Checkbox checked={l.approximate} onChange={(v) => patchLinear(l.id, { approximate: v })}>
              Mesure approximative
            </Checkbox>
          </Card>
        ))}
        <Button variant="soft" block icon={<Plus className="h-5 w-5" />} onClick={() => setLinears([...project.linears, newLinear(project.linears.length, quick)])}>
          Ajouter une longueur
        </Button>
      </section>

      <StickyActions>
        <ButtonLink to={`/projects/${project.id}/services`} block size="lg" icon={<ArrowRight className="h-5 w-5" />}>
          Continuer : prestations & prix
        </ButtonLink>
      </StickyActions>
    </div>
  );
}

function ZoneCard({ zone, onChange, onDelete }: { zone: MeasureZone; onChange: (p: Partial<MeasureZone>) => void; onDelete: () => void }) {
  const res = zoneArea(zone);
  return (
    <Card>
      <CardTitle
        icon={<Ruler className="h-5 w-5" />}
        action={
          <IconButton label={`Supprimer ${zone.name}`} onClick={onDelete}>
            <Trash2 className="h-5 w-5" />
          </IconButton>
        }
      >
        {zone.name}
      </CardTitle>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Nom" value={zone.name} onChange={(v) => onChange({ name: v })} />
        <SelectField label="Forme" value={zone.shape} onChange={(v) => onChange({ shape: v as ZoneShape })} options={SHAPES} />
        {(zone.shape === 'rectangle' || zone.shape === 'triangle') && (
          <>
            <NumberField label={zone.shape === 'rectangle' ? 'Longueur' : 'Base'} suffix="m" value={zone.length} onChange={(v) => onChange({ length: v })} />
            <NumberField label={zone.shape === 'rectangle' ? 'Largeur' : 'Hauteur'} suffix="m" value={zone.width} onChange={(v) => onChange({ width: v })} />
          </>
        )}
        {zone.shape === 'circle' && <NumberField label="Rayon" suffix="m" value={zone.radius} onChange={(v) => onChange({ radius: v })} />}
        {zone.shape === 'manual' && <NumberField label="Surface" suffix="m²" value={zone.manualArea} onChange={(v) => onChange({ manualArea: v })} />}
      </div>
      <div className={`mt-3 rounded-xl px-3.5 py-3 ${res.ok ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-muted'}`} aria-live="polite">
        {res.ok ? (
          <span className="font-semibold tabular-nums">
            {zone.subtract && '− '}
            {res.formula}
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> {res.error}
          </span>
        )}
      </div>
      <div className="mt-2 grid sm:grid-cols-2">
        <Checkbox checked={zone.subtract} onChange={(v) => onChange({ subtract: v })}>
          Zone à déduire (maison, bassin…)
        </Checkbox>
        <Checkbox checked={zone.approximate} onChange={(v) => onChange({ approximate: v })}>
          Mesure approximative
        </Checkbox>
      </div>
    </Card>
  );
}
