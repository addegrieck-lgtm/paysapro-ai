import { useState, type ReactNode } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardTitle } from '../components/ui/Card';
import { NumberField } from '../components/ui/Form';
import { borders, fence, gravel, lawn, planting, terrace, volume, labor, type CalcResult } from '../features/measurements/calculators';
import { formatMoney, formatNumber } from '../utils/number';
import { useAppState } from '../lib/store';

/** Résultat d'un calculateur : valeur ou message humain (jamais NaN). */
function Result<T>({ res, render, empty }: { res: CalcResult<T>; render: (v: T) => ReactNode; empty: boolean }) {
  return (
    <div className={`mt-3 rounded-xl px-4 py-3 ${res.ok ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-muted'}`} aria-live="polite">
      {res.ok ? <span className="font-semibold tabular-nums">{render(res.value)}</span> : <span className="text-sm">{empty ? 'Renseignez les valeurs.' : res.error}</span>}
    </div>
  );
}

const isEmpty = (...v: (number | null)[]) => v.some((x) => x === null);

export function ToolsPage() {
  const { settings } = useAppState();
  const [lawnArea, setLawnArea] = useState<number | null>(null);
  const [lawnWaste, setLawnWaste] = useState<number | null>(8);
  const [soilArea, setSoilArea] = useState<number | null>(null);
  const [soilThick, setSoilThick] = useState<number | null>(20);
  const [gravArea, setGravArea] = useState<number | null>(null);
  const [gravThick, setGravThick] = useState<number | null>(5);
  const [gravDensity, setGravDensity] = useState<number | null>(1.6);
  const [b1, setB1] = useState<number | null>(null);
  const [b2, setB2] = useState<number | null>(null);
  const [b3, setB3] = useState<number | null>(null);
  const [fLen, setFLen] = useState<number | null>(null);
  const [fPanel, setFPanel] = useState<number | null>(2.5);
  const [fCorners, setFCorners] = useState<number | null>(0);
  const [tArea, setTArea] = useState<number | null>(null);
  const [tPrice, setTPrice] = useState<number | null>(95);
  const [pCount, setPCount] = useState<number | null>(null);
  const [pPrice, setPPrice] = useState<number | null>(35);
  const [hours, setHours] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(settings.hourlyRate);

  return (
    <div className="space-y-4">
      <PageHeader back="/more" title="Calculateurs" subtitle="Quantités et montants en un coup d’œil." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>🌱 Gazon</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Surface" suffix="m²" value={lawnArea} onChange={setLawnArea} />
            <NumberField label="Pertes" suffix="%" max={100} value={lawnWaste} onChange={setLawnWaste} />
          </div>
          <Result res={lawn(lawnArea, lawnWaste)} empty={isEmpty(lawnArea, lawnWaste)} render={(v) => `${formatNumber(lawnArea)} m² + ${formatNumber(lawnWaste)} % = ${formatNumber(v)} m² à commander`} />
        </Card>

        <Card>
          <CardTitle>🟫 Terre végétale</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Surface" suffix="m²" value={soilArea} onChange={setSoilArea} />
            <NumberField label="Épaisseur" suffix="cm" value={soilThick} onChange={setSoilThick} />
          </div>
          <Result res={volume(soilArea, soilThick)} empty={isEmpty(soilArea, soilThick)} render={(v) => `Volume : ${formatNumber(v)} m³`} />
        </Card>

        <Card>
          <CardTitle>🪨 Gravier</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Surface" suffix="m²" value={gravArea} onChange={setGravArea} />
            <NumberField label="Épaisseur" suffix="cm" value={gravThick} onChange={setGravThick} />
            <NumberField label="Densité (facultatif)" suffix="t/m³" value={gravDensity} onChange={setGravDensity} className="col-span-2" hint="≈ 1,5 à 1,7 t/m³ selon le gravier : vérifiez auprès du fournisseur." />
          </div>
          <Result
            res={gravel(gravArea, gravThick, gravDensity)}
            empty={isEmpty(gravArea, gravThick)}
            render={(v) => `Volume : ${formatNumber(v.volume)} m³${v.weight !== null ? ` · Poids estimé : ${formatNumber(v.weight)} t` : ''}`}
          />
        </Card>

        <Card>
          <CardTitle>📏 Bordures</CardTitle>
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Longueur 1" suffix="m" value={b1} onChange={setB1} />
            <NumberField label="Longueur 2" suffix="m" value={b2} onChange={setB2} />
            <NumberField label="Longueur 3" suffix="m" value={b3} onChange={setB3} />
          </div>
          <Result res={borders([b1, b2, b3])} empty={b1 === null && b2 === null && b3 === null} render={(v) => `Total : ${formatNumber(v)} ml`} />
        </Card>

        <Card>
          <CardTitle>🚧 Clôture</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Longueur" suffix="m" value={fLen} onChange={setFLen} />
            <NumberField label="Largeur panneau" suffix="m" value={fPanel} onChange={setFPanel} />
            <NumberField label="Angles" value={fCorners} onChange={setFCorners} className="col-span-2" hint="Un poteau supplémentaire par angle." />
          </div>
          <Result res={fence(fLen, fPanel, fCorners)} empty={isEmpty(fLen, fPanel)} render={(v) => `${v.panels} panneaux · ${v.posts} poteaux`} />
        </Card>

        <Card>
          <CardTitle>🪵 Terrasse</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Surface" suffix="m²" value={tArea} onChange={setTArea} />
            <NumberField label="Prix au m²" suffix="€" value={tPrice} onChange={setTPrice} />
          </div>
          <Result res={terrace(tArea, tPrice)} empty={isEmpty(tArea, tPrice)} render={(v) => `${formatNumber(tArea)} m² × ${formatMoney(tPrice)} = ${formatMoney(v)} HT`} />
        </Card>

        <Card>
          <CardTitle>🌳 Plantation</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Nombre de plantes" value={pCount} onChange={setPCount} />
            <NumberField label="Prix unitaire" suffix="€" value={pPrice} onChange={setPPrice} />
          </div>
          <Result res={planting(pCount, pPrice)} empty={isEmpty(pCount, pPrice)} render={(v) => `${formatNumber(pCount)} × ${formatMoney(pPrice)} = ${formatMoney(v)} HT`} />
        </Card>

        <Card>
          <CardTitle>⏱️ Main-d’œuvre</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Heures" suffix="h" value={hours} onChange={setHours} />
            <NumberField label="Tarif horaire" suffix="€" value={rate} onChange={setRate} />
          </div>
          <Result res={labor(hours, rate)} empty={isEmpty(hours, rate)} render={(v) => `${formatNumber(hours)} h × ${formatMoney(rate)} = ${formatMoney(v)} HT`} />
        </Card>
      </div>
    </div>
  );
}
