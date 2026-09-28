// Photos d'illustration de l'espace démo, dessinées localement (aucune image téléchargée).
import type { PhotoRecord, PhotoTag, Project } from '../../types';
import { uid } from '../../utils/id';

type Scene = 'lawn_before' | 'lawn_after' | 'terrace' | 'fence_after';

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, scene: Scene) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  sky.addColorStop(0, '#a9d3ee');
  sky.addColorStop(1, '#e3f1f8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // haie du fond
  ctx.fillStyle = '#3f6b33';
  for (let x = -40; x < w + 40; x += 70) {
    ctx.beginPath();
    ctx.ellipse(x, h * 0.46, 60, 45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // sol
  const ground = ctx.createLinearGradient(0, h * 0.48, 0, h);
  if (scene === 'lawn_before') {
    ground.addColorStop(0, '#9c8a5c');
    ground.addColorStop(1, '#7a6a43');
  } else {
    ground.addColorStop(0, '#78b04f');
    ground.addColorStop(1, '#4f8a33');
  }
  ctx.fillStyle = ground;
  ctx.fillRect(0, h * 0.48, w, h * 0.52);
  if (scene === 'lawn_before') {
    ctx.fillStyle = 'rgba(90,120,60,0.55)';
    for (let i = 0; i < 90; i++) {
      const x = (i * 97) % w;
      const y = h * 0.55 + ((i * 53) % (h * 0.42));
      ctx.beginPath();
      ctx.ellipse(x, y, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (scene === 'lawn_after') {
    // bande de tonte + olivier + bordure
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let x = 0; x < w; x += 120) ctx.fillRect(x, h * 0.48, 60, h * 0.52);
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(w * 0.72, h * 0.38, 16, h * 0.2);
    ctx.fillStyle = '#8fae7a';
    ctx.beginPath();
    ctx.ellipse(w * 0.725, h * 0.34, 90, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w * 0.55, h);
    ctx.quadraticCurveTo(w * 0.62, h * 0.7, w * 0.95, h * 0.62);
    ctx.stroke();
  }
  if (scene === 'terrace') {
    ctx.fillStyle = '#b07a45';
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h);
    ctx.lineTo(w * 0.3, h * 0.62);
    ctx.lineTo(w * 0.9, h * 0.62);
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,45,15,0.5)';
    ctx.lineWidth = 3;
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      ctx.beginPath();
      ctx.moveTo(w * (0.3 + 0.6 * t), h * 0.62);
      ctx.lineTo(w * (0.1 + 0.9 * t), h);
      ctx.stroke();
    }
  }
  if (scene === 'fence_after') {
    ctx.strokeStyle = '#2f3b36';
    ctx.lineWidth = 4;
    for (let x = 0; x < w; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.3);
      ctx.lineTo(x, h * 0.55);
      ctx.stroke();
    }
    ctx.lineWidth = 6;
    [0.33, 0.43, 0.53].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, h * y);
      ctx.lineTo(w, h * y);
      ctx.stroke();
    });
  }
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(16, h - 52, 250, 36);
  ctx.fillStyle = '#fff';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('Photo de démonstration', 28, h - 27);
}

async function render(scene: Scene, max: number, quality: number): Promise<Blob> {
  const w = max;
  const h = Math.round(max * 0.75);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  draw(ctx, w, h, scene);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', quality));
}

export async function generateDemoPhotos(projects: Project[]): Promise<PhotoRecord[]> {
  if (typeof document === 'undefined') return [];
  const plan: { projectIndex: number; scene: Scene; tag: PhotoTag; caption: string }[] = [
    { projectIndex: 0, scene: 'lawn_before', tag: 'before', caption: 'Terrain actuel' },
    { projectIndex: 1, scene: 'lawn_after', tag: 'before', caption: 'Emplacement de la terrasse' },
    { projectIndex: 1, scene: 'terrace', tag: 'during', caption: 'Pose des lames' },
    { projectIndex: 3, scene: 'lawn_after', tag: 'before', caption: 'Fond de jardin avant' },
    { projectIndex: 3, scene: 'fence_after', tag: 'after', caption: 'Clôture posée' },
  ];
  const out: PhotoRecord[] = [];
  for (const [i, item] of plan.entries()) {
    const project = projects[item.projectIndex];
    if (!project) continue;
    try {
      out.push({
        id: uid(),
        projectId: project.id,
        tag: item.tag,
        caption: item.caption,
        width: 1200,
        height: 900,
        createdAt: new Date(Date.now() - (plan.length - i) * 60_000).toISOString(),
        thumb: await render(item.scene, 360, 0.72),
        medium: await render(item.scene, 1200, 0.8),
      });
    } catch {
      /* canvas indisponible : la démo fonctionne sans photos */
    }
  }
  return out;
}
