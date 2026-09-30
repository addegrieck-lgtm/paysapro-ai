// Export / import / suppression des données, onboarding et espace de démonstration.
import type { Activity, CompanySettings, Goal } from '../../types';
import { getState, loadAll, persist, setState } from '../../lib/store';
import { isDemoSpace, setDemoSpace, storage } from '../../services/storage';
import { parseExportFile } from '../../services/storage/exportFormat';
import { auth } from '../../services/auth/AuthProvider';
import { analytics } from '../../services/analytics/AnalyticsProvider';
import { migrateCatalogItem, migrateProject, migrateQuote, migrateSettings } from '../migrations';
import { builtInTemplates, defaultCatalog } from '../../data/defaults';
import { buildDemoData, DEMO_COMPANY, DEMO_OWNER } from '../demo/demoData';
import { generateDemoPhotos } from '../demo/demoPhotos';
import { CLOUD_ENABLED, createCompany, getCloudSession } from '../../services/cloud/client';

export async function exportData(): Promise<{ blob: Blob; fileName: string }> {
  const data = await storage.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const date = new Date().toISOString().slice(0, 10);
  return { blob, fileName: `paysapro-sauvegarde-${date}.json` };
}

export async function importData(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = parseExportFile(await file.text());
  if (!parsed.ok) return parsed;
  const d = parsed.data;
  const settings = migrateSettings(d.settings);
  const migrated = {
    ...d,
    settings,
    catalog: d.catalog.map((c) => migrateCatalogItem(c, settings.defaultMarginPercent)),
    projects: d.projects.map(migrateProject),
    quotes: d.quotes.map(migrateQuote),
    templates: d.templates ?? builtInTemplates(),
  };
  try {
    await storage.importAll(migrated);
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

// ───────────── Onboarding ─────────────

export interface OnboardingProfile {
  firstName: string;
  lastName: string;
  company: CompanySettings;
  activities: Activity[];
  mainServices: string[];
  goal: Goal | null;
}

/** Crée le compte local et l'espace entreprise. */
export async function completeOnboarding(profile: OnboardingProfile): Promise<void> {
  if (CLOUD_ENABLED) return completeCloudOnboarding(profile);
  const user = await auth.signUp({ firstName: profile.firstName, lastName: profile.lastName, email: profile.company.email });
  const settings = {
    ...getState().settings,
    company: profile.company,
    owner: { firstName: profile.firstName.trim(), lastName: profile.lastName.trim() },
    activities: profile.activities,
    mainServices: profile.mainServices,
    goal: profile.goal,
    onboardingDone: true,
  };
  setState({ settings, user });
  await persist(() => storage.saveSettings(settings));
  analytics.track('onboarding_completed', { activities: profile.activities.length, services: profile.mainServices.length });
}

/**
 * Mode cloud : l'utilisateur est déjà inscrit et connecté. Crée son entreprise (il en devient
 * administrateur), puis le catalogue et les modèles de départ. Toute erreur remonte à l'écran.
 */
async function completeCloudOnboarding(profile: OnboardingProfile): Promise<void> {
  const session = getCloudSession();
  if (!session) throw new Error('Connectez-vous pour créer votre espace.');
  const settings = {
    ...migrateSettings(null),
    company: profile.company,
    owner: { firstName: profile.firstName.trim(), lastName: profile.lastName.trim() },
    activities: profile.activities,
    mainServices: profile.mainServices,
    goal: profile.goal,
    onboardingDone: true,
  };
  if (!session.companyId) await createCompany(profile.company.name.trim(), settings);
  await storage.saveSettings(settings);
  await storage.saveUser({ id: session.userId, firstName: profile.firstName, lastName: profile.lastName, email: session.email, provider: 'cloud', createdAt: new Date().toISOString() });
  if ((await storage.getCatalog()).length === 0) for (const c of defaultCatalog()) await storage.saveCatalogItem(c);
  if ((await storage.getTemplates()).length === 0) for (const t of builtInTemplates()) await storage.saveTemplate(t);
  await loadAll();
  analytics.track('onboarding_completed', { activities: profile.activities.length, services: profile.mainServices.length });
}

// ───────────── Espace de démonstration ─────────────

/**
 * Ouvre l'espace de démonstration : une base séparée, remplie d'une entreprise, de clients,
 * de chantiers, de devis et de photos fictifs. Les vraies données ne sont jamais modifiées.
 */
export async function openDemo(): Promise<void> {
  setDemoSpace(true);
  setState({ ready: false });
  const existing = await storage.getSettings();
  if (!existing?.onboardingDone) await seedDemoSpace();
  await loadAll();
  analytics.track('demo_opened');
}

export async function exitDemo(): Promise<void> {
  setDemoSpace(false);
  setState({ ready: false });
  await loadAll();
}

/** Réinitialise l'espace démo (données fictives d'origine). */
export async function resetDemo(): Promise<void> {
  if (!isDemoSpace()) return;
  await storage.clearAll();
  await seedDemoSpace();
  await loadAll();
}

async function seedDemoSpace(): Promise<void> {
  const base = migrateSettings(null);
  const catalog = defaultCatalog();
  const settings = { ...base, company: { ...base.company, ...DEMO_COMPANY }, owner: DEMO_OWNER, activities: ['landscaper' as const], onboardingDone: true };
  const demo = buildDemoData(catalog, settings);
  const photos = await generateDemoPhotos(demo.projects);
  // Les photos générées sont ajoutées aux devis concernés
  const quotes = demo.quotes.map((q) => ({
    ...q,
    includedPhotoIds: photos.filter((p) => p.projectId === q.projectId && p.tag !== 'after' && p.tag !== 'during').map((p) => p.id),
  }));
  await storage.saveSettings(demo.settings);
  await storage.saveUser({ id: 'demo', firstName: DEMO_OWNER.firstName, lastName: DEMO_OWNER.lastName, email: DEMO_COMPANY.email ?? '', provider: 'local', createdAt: new Date().toISOString() });
  for (const c of catalog) await storage.saveCatalogItem(c);
  for (const t of builtInTemplates()) await storage.saveTemplate(t);
  for (const c of demo.clients) await storage.saveClient(c);
  for (const p of demo.projects) await storage.saveProject(p);
  for (const q of quotes) await storage.saveQuote(q);
  for (const p of photos) await storage.savePhoto(p);
  for (const a of demo.activity) await storage.addActivity(a);
}

