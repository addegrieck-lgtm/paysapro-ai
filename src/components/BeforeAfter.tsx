import { useState } from 'react';
import { usePhotoUrl } from '../hooks/useData';

/** Comparaison avant / après avec curseur (clavier et tactile via un champ range natif). */
export function BeforeAfterSlider({ beforeId, afterId }: { beforeId: string; afterId: string }) {
  const before = usePhotoUrl(beforeId, 'medium');
  const after = usePhotoUrl(afterId, 'medium');
  const [pos, setPos] = useState(50);
  if (!before || !after) return <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-surface-2" aria-hidden />;
  return (
    <div className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-2xl bg-surface-2">
      <img src={after} alt="Après les travaux" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt="Avant les travaux" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${pos}%` }} aria-hidden>
        <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm font-bold text-ink shadow-lg">↔</span>
      </div>
      <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-semibold text-white">Avant</span>
      <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-semibold text-white">Après</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Comparer avant et après"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
