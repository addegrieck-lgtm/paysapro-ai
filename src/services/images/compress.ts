// Compression des photos dans le navigateur, avant stockage : rien n'est envoyé sur Internet.
// Deux qualités sont conservées : vignette (listes) et moyenne (devis, PDF, plein écran).
// L'original n'est pas conservé pour préserver l'espace de stockage du téléphone.

export const THUMB_MAX = 360;
export const MEDIUM_MAX = 1600;

export interface CompressedImage {
  thumb: Blob;
  medium: Blob;
  width: number;
  height: number;
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // l'orientation EXIF (photo prise en portrait) est appliquée automatiquement
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* repli sur <img> (certains formats / anciens Safari) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function resize(source: ImageBitmap | HTMLImageElement, max: number, quality: number): Promise<Blob> {
  const w = source.width;
  const h = source.height;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas indisponible'));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compression impossible'))), 'image/jpeg', quality),
  );
}

export async function compressImage(file: Blob): Promise<CompressedImage> {
  const source = await loadBitmap(file);
  try {
    const [thumb, medium] = await Promise.all([resize(source, THUMB_MAX, 0.72), resize(source, MEDIUM_MAX, 0.82)]);
    const scale = Math.min(1, MEDIUM_MAX / Math.max(source.width, source.height));
    return { thumb, medium, width: Math.round(source.width * scale), height: Math.round(source.height * scale) };
  } finally {
    if ('close' in source) source.close();
  }
}
