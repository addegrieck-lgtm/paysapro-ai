// Export / import / suppression des données et données de démonstration.
import { getState, loadAll, persist, setState } from '../../lib/store';
import { storage } from '../../services/storage';
import { parseExportFile } from '../../services/storage/exportFormat';
import { buildDemoData } from '../demo/demoData';
import { deleteClient } from '../clients/actions';
import { logActivity } from '../activity';

export async function exportData(): Promise<{ blob: Blob; fileName: string }> {
  const data = await storage.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const date = new Date().toISOString().slice(0, 10);
  return { blob, fileName: `paysapro-sauvegarde-${date}.json` };
}

export async function importData(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = parseExportFile(await file.text());
  if (!parsed.ok) return parsed;
  try {
    await storage.importAll(parsed.data);
  } catch (e) {
    console.error(e);
    return { ok: false, error: "L'import a échoué. Vos données actuelles n'ont pas été modifiées." };
  }
  await loadAll();
  return { ok: true };
}

export async function clearAllData(): Promise<void> {
  await storage.clearAll();
  setState({ ready: false });
  await loadAll();
}

export async function loadDemoData(): Promise<void> {
  const s = getState();
  const demo = buildDemoData(s.catalog, s.settings);
  setState({
    clients: [...s.clients, ...demo.clients],
    projects: [...s.projects, ...demo.projects],
    quotes: [...s.quotes, ...demo.quotes],
    settings: demo.settings,
  });
  await persist(async () => {
    for (const c of demo.clients) await storage.saveClient(c);
    for (const p of demo.projects) await storage.saveProject(p);
    for (const q of demo.quotes) await storage.saveQuote(q);
    await storage.saveSettings(demo.settings);
  });
  logActivity('Données de démonstration chargées.');
}

export async function removeDemoData(): Promise<void> {
  for (const c of getState().clients.filter((c) => c.isDemo)) await deleteClient(c.id);
}

export function hasDemoData(): boolean {
  return getState().clients.some((c) => c.isDemo);
}
