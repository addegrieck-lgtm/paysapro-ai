// Migrations de données (fonctions pures, testées) : une sauvegarde ou une base créée par une
// version précédente est mise à niveau au chargement, sans rien perdre.
//
// v1 (MVP) → v2 (bêta) :
//  • catalogue : « unitPrice » était un coût avant marge → devient costPrice ; le prix de vente
//    est calculé avec la marge par défaut ;
//  • devis : la marge globale (marginPercent) est répartie sur chaque ligne (unitCost + unitPrice),
//    les totaux restent strictement identiques ;
//  • chantiers : ajout des notes privées ;
//  • réglages : nouveaux champs avec leurs valeurs par défaut.
import type { AppSettings, CatalogItem, Project, Quote, QuoteLine } from '../types';
import { defaultSettings, SCHEMA_VERSION } from '../data/defaults';
import { applyMargin } from './quotes/pricing';

type LegacyLine = Omit<QuoteLine, 'unitCost'> & { unitCost?: number };
type LegacyQuote = Omit<Quote, 'lines'> & { lines: LegacyLine[]; marginPercent?: number };
type LegacyItem = Omit<CatalogItem, 'costPrice'> & { costPrice?: number };
type LegacyProject = Omit<Project, 'privateNotes'> & { privateNotes?: string };
type LegacySettings = Omit<Partial<AppSettings>, 'company'> & { company?: Partial<Omit<AppSettings['company'], 'sap'>> & { sap?: Partial<AppSettings['company']['sap']> } };

export function migrateSettings(s: LegacySettings | null | undefined): AppSettings {
  const d = defaultSettings();
  if (!s) return d;
  return {
    ...d,
    ...s,
    company: { ...d.company, ...(s.company ?? {}), sap: { ...d.company.sap, ...(s.company?.sap ?? {}) } },
    owner: { ...d.owner, ...(s.owner ?? {}) },
    notificationPrefs: { ...d.notificationPrefs, ...(s.notificationPrefs ?? {}) },
    schemaVersion: SCHEMA_VERSION,
  };
}

export function migrateCatalogItem(item: LegacyItem, defaultMarginPercent: number): CatalogItem {
  if (typeof item.costPrice === 'number') return item as CatalogItem;
  return { ...item, costPrice: item.unitPrice, unitPrice: applyMargin(item.unitPrice, defaultMarginPercent) };
}

export function migrateQuote(q: LegacyQuote): Quote {
  const legacyMargin = typeof q.marginPercent === 'number' ? q.marginPercent : null;
  const { marginPercent: _drop, ...rest } = q;
  const lines: QuoteLine[] = q.lines.map((l) => {
    if (typeof l.unitCost === 'number') return l as QuoteLine;
    return legacyMargin !== null
      ? { ...l, unitCost: l.unitPrice, unitPrice: applyMargin(l.unitPrice, legacyMargin) }
      : { ...l, unitCost: 0 };
  });
  return { ...rest, lines };
}

export function migrateProject(p: LegacyProject): Project {
  return { ...p, privateNotes: p.privateNotes ?? '' };
}

export function needsMigration(settings: { schemaVersion?: number } | null | undefined): boolean {
  return !settings || (settings.schemaVersion ?? 1) < SCHEMA_VERSION;
}
