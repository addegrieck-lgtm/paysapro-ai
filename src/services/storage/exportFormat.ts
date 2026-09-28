// Format d'export / import JSON (sauvegarde complète des données locales).
import type { ExportFile } from '../../types';

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Image invalide dans le fichier importé.');
  const [, type = '', isBase64, payload = ''] = match;
  if (!isBase64) return new Blob([decodeURIComponent(payload)], { type });
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export type ParseResult = { ok: true; data: ExportFile } | { ok: false; error: string };

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

/** Vérifie qu'un fichier importé est bien une sauvegarde Paysapro AI. */
export function parseExportFile(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "Ce fichier n'est pas un fichier JSON valide." };
  }
  if (!json || typeof json !== 'object') return { ok: false, error: 'Fichier vide ou illisible.' };
  const f = json as Record<string, unknown>;
  if (f.app !== 'paysapro-ai') return { ok: false, error: "Ce fichier n'est pas une sauvegarde Paysapro AI." };
  if (f.version !== 1) return { ok: false, error: 'Version de sauvegarde non prise en charge.' };
  for (const key of ['clients', 'projects', 'quotes', 'catalog', 'photos', 'activity']) {
    if (!isArray(f[key])) return { ok: false, error: `Sauvegarde incomplète (section « ${key} » manquante).` };
  }
  return { ok: true, data: json as ExportFile };
}
