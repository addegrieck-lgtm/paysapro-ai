import { getState, persist, setState } from '../lib/store';
import { storage } from '../services/storage';
import { uid } from '../utils/id';

/** Ajoute un événement au journal d'activité (affiché dans les notifications). */
export function logActivity(message: string, projectId: string | null = null): void {
  const event = { id: uid(), projectId, message, createdAt: new Date().toISOString() };
  setState({ activity: [...getState().activity, event].slice(-300) });
  void persist(() => storage.addActivity(event));
}
