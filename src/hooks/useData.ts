import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../lib/store';
import { storage } from '../services/storage';
import { computeTotals } from '../features/quotes/pricing';

/** Toutes les données d'un chantier. */
export function useProjectData(projectId: string | undefined) {
  const s = useAppState();
  return useMemo(() => {
    const project = s.projects.find((p) => p.id === projectId);
    const quote = project?.quoteId ? s.quotes.find((q) => q.id === project.quoteId) : undefined;
    const client = project ? s.clients.find((c) => c.id === project.clientId) : undefined;
    const photos = project
      ? s.photos.filter((p) => p.projectId === project.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      : [];
    const totals = quote && project ? computeTotals(quote, project) : undefined;
    return { project, quote, client, photos, totals, settings: s.settings, catalog: s.catalog, templates: s.templates };
  }, [s.projects, s.quotes, s.clients, s.photos, s.settings, s.catalog, s.templates, projectId]);
}

// Cache des URL d'images : une vignette n'est chargée qu'une fois par session.
const urlCache = new Map<string, string>();

export function forgetPhotoUrls(photoId: string) {
  for (const q of ['thumb', 'medium'] as const) {
    const key = `${photoId}:${q}`;
    const url = urlCache.get(key);
    if (url) URL.revokeObjectURL(url);
    urlCache.delete(key);
  }
}

/** URL affichable d'une photo stockée dans IndexedDB. */
export function usePhotoUrl(photoId: string | undefined, quality: 'thumb' | 'medium' = 'thumb'): string | null {
  const key = photoId ? `${photoId}:${quality}` : '';
  const [url, setUrl] = useState<string | null>(() => (key ? (urlCache.get(key) ?? null) : null));
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setUrl(key ? (urlCache.get(key) ?? null) : null);
  }
  useEffect(() => {
    if (!photoId || urlCache.has(key)) return;
    let cancelled = false;
    void storage.getPhoto(photoId).then((rec) => {
      if (!rec || cancelled) return;
      const u = URL.createObjectURL(quality === 'thumb' ? rec.thumb : rec.medium);
      urlCache.set(key, u);
      setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [photoId, quality, key]);
  return url;
}
