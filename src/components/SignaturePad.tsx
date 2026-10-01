import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';

/** Zone de signature au doigt / stylet / souris. Renvoie une image PNG (data URL) ou null. */
/** Image de la signature, réduite à 600 px de large au plus : quelques Ko au lieu de ~80 Ko. */
function exportSignature(source: HTMLCanvasElement): string {
  const scale = Math.min(1, 600 / source.width);
  if (scale === 1) return source.toDataURL('image/png');
  const out = document.createElement('canvas');
  out.width = Math.round(source.width * scale);
  out.height = Math.round(source.height * scale);
  out.getContext('2d')?.drawImage(source, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = () => {
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1d2421';
      setEmpty(true);
      onChange(null);
    };
    setup();
    window.addEventListener('resize', setup);
    return () => window.removeEventListener('resize', setup);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialisation unique du canvas
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = e.currentTarget.getContext('2d');
    if (ctx && last.current) {
      ctx.beginPath();
      ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#1d2421';
      ctx.fill();
    }
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setEmpty(false);
    onChange(canvasRef.current ? exportSignature(canvasRef.current) : null);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setEmpty(true);
    onChange(null);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-line bg-white">
        <canvas
          ref={canvasRef}
          aria-label="Zone de signature : dessinez votre signature avec le doigt"
          role="img"
          className="block h-60 w-full touch-none cursor-crosshair sm:h-56"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
            Signez ici avec le doigt ✍️
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-neutral-300" />
      </div>
      <div className="mt-2 flex justify-end">
        <Button variant="secondary" size="sm" onClick={clear} disabled={empty} icon={<RotateCcw className="h-4 w-4" />}>
          Effacer et recommencer
        </Button>
      </div>
    </div>
  );
}
