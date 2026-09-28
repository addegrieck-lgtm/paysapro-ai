import type { AppSettings, CatalogItem, CompanySettings } from '../../types';
import { getState, persist, setState, upsert, without } from '../../lib/store';
import { storage } from '../../services/storage';
import { uid } from '../../utils/id';

export function updateSettings(patch: Partial<AppSettings>): void {
  const settings = { ...getState().settings, ...patch };
  setState({ settings });
  void persist(() => storage.saveSettings(settings));
}

export function updateCompany(patch: Partial<CompanySettings>): void {
  updateSettings({ company: { ...getState().settings.company, ...patch } });
}

export function saveCatalogItem(item: CatalogItem): void {
  const saved = { ...item, updatedAt: new Date().toISOString() };
  setState({ catalog: upsert(getState().catalog, saved) });
  void persist(() => storage.saveCatalogItem(saved));
}

export function duplicateCatalogItem(item: CatalogItem): CatalogItem {
  const now = new Date().toISOString();
  const copy: CatalogItem = { ...item, id: uid(), label: `${item.label} (copie)`, createdAt: now, updatedAt: now };
  saveCatalogItem(copy);
  return copy;
}

export function deleteCatalogItem(id: string): void {
  setState({ catalog: without(getState().catalog, id) });
  void persist(() => storage.deleteCatalogItem(id));
}
