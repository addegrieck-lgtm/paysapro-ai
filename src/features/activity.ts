import type { NotificationKind } from '../types';
import { getState, persist, setState } from '../lib/store';
import { storage } from '../services/storage';
import { uid } from '../utils/id';

/**
 * Ajoute un événement au journal d'activité.
 * Avec `notify`, il apparaît aussi dans le centre de notifications (non lu).
 */
export function logActivity(message: string, projectId: string | null = null, options: { kind?: NotificationKind; notify?: boolean } = {}): void {
  const event = {
    id: uid(),
    projectId,
    message,
    kind: options.kind ?? 'info',
    notify: options.notify ?? false,
    read: false,
    createdAt: new Date().toISOString(),
  };
  setState({ activity: [...getState().activity, event].slice(-500) });
  void persist(() => storage.addActivity(event));
}

export function markNotificationsRead(): void {
  const s = getState();
  const changed = s.activity.filter((a) => a.notify && !a.read).map((a) => ({ ...a, read: true }));
  if (changed.length === 0) return;
  const ids = new Set(changed.map((c) => c.id));
  setState({ activity: s.activity.map((a) => (ids.has(a.id) ? { ...a, read: true } : a)) });
  void persist(async () => {
    for (const c of changed) await storage.addActivity(c);
  });
}
