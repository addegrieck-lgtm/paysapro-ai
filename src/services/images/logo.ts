// Logo de l'entreprise : petit et léger, car il est enregistré avec les réglages et recopié dans
// chaque devis envoyé (vue client, PDF). Objectif : quelques dizaines de Ko au maximum.

/** Au-delà de cette taille (caractères de la data URL), le logo est recompressé. */
export const LOGO_MAX_CHARS = 60_000;

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/**
 * Redimensionne (max 320 px) et compresse un logo. PNG s'il reste léger (transparence conservée),
 * sinon JPEG sur fond blanc (le devis est imprimé sur fond blanc ; jsPDF ne lit que PNG et JPEG).
 */
async function compressLogo(img: HTMLImageElement, max = 320): Promise<string> {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const png = canvas.toDataURL('image/png');
  if (png.length <= LOGO_MAX_CHARS) return png;
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const quality of [0.88, 0.75, 0.6]) {
    const jpeg = canvas.toDataURL('image/jpeg', quality);
    if (jpeg.length <= LOGO_MAX_CHARS) return jpeg;
  }
  return canvas.toDataURL('image/jpeg', 0.5);
}

/** Logo choisi par l'utilisateur → data URL légère, pour le devis et le PDF. */
export async function fileToLogoDataUrl(file: File, max = 320): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    return await compressLogo(await loadImage(url), max);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Recompresse un logo déjà enregistré s'il est trop lourd (anciennes versions). null si rien à faire. */
export async function shrinkLogoIfNeeded(dataUrl: string | null): Promise<string | null> {
  if (!dataUrl || dataUrl.length <= LOGO_MAX_CHARS || typeof document === 'undefined') return null;
  try {
    const smaller = await compressLogo(await loadImage(dataUrl));
    return smaller.length < dataUrl.length ? smaller : null;
  } catch {
    return null;
  }
}
