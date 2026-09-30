import type { AppSettings, CatalogItem, LineKind, QuantityRule, QuoteTemplate, SapSettings, Unit } from '../types';
import { uid } from '../utils/id';

export const SCHEMA_VERSION = 2;

export const DEFAULT_TERMS = [
  'Devis valable pour la durée indiquée à compter de sa date d’émission.',
  'Un acompte est demandé à la signature ; le solde est payable à la fin des travaux.',
  'Les quantités estimées seront confirmées sur place ; toute modification fera l’objet d’un avenant.',
  'Les végétaux sont garantis sous réserve d’un arrosage conforme aux conseils fournis.',
].join('\n');

export const DEFAULT_BRAND_COLOR = '#1f5c44';

export function defaultSap(): SapSettings {
  return { enabled: false, number: '', declarationDate: '', activity: '', notes: '' };
}

export function defaultSettings(): AppSettings {
  return {
    schemaVersion: SCHEMA_VERSION,
    company: {
      name: '',
      logoDataUrl: null,
      address: '',
      postalCode: '',
      city: '',
      phone: '',
      email: '',
      siret: '',
      vatNumber: '',
      vatExempt: false,
      iban: '',
      terms: DEFAULT_TERMS,
      brandColor: DEFAULT_BRAND_COLOR,
      quoteFooter: '',
      sap: defaultSap(),
    },
    owner: { firstName: '', lastName: '' },
    activities: [],
    mainServices: [],
    goal: null,
    vatRate: 20,
    defaultMarginPercent: 30,
    defaultDepositPercent: 30,
    quoteValidityDays: 30,
    quotePrefix: 'DEVIS',
    quoteCounter: { year: new Date().getFullYear(), next: 1 },
    hourlyRate: 45,
    dailyRate: 350,
    theme: 'system',
    textSize: 'normal',
    aiMode: import.meta.env?.VITE_AI_DEMO_MODE === 'true' ? 'demo' : 'local',
    externalAIConsent: false,
    notificationPrefs: { signed: true, viewed: true, expired: true, work_done: true, new_client: true },
    onboardingDone: false,
  };
}

type Seed = [
  section: string,
  label: string,
  unit: Unit,
  cost: number,
  price: number,
  kind: LineKind,
  rule: QuantityRule,
  waste?: number,
  thicknessCm?: number,
];

// Tarifs indicatifs (coût / prix de vente HT) : chaque professionnel les adapte dans le catalogue.
const SEED: Seed[] = [
  ['Gazon', 'Préparation du terrain', 'm2', 5, 8, 'service', 'area'],
  ['Gazon', 'Pose de gazon', 'm2', 9, 18, 'service', 'area'],
  ['Gazon', 'Gazon en plaques (fourniture)', 'm2', 4, 12, 'plant', 'area', 8],
  ['Gazon', 'Évacuation des déchets verts', 'flat', 90, 150, 'disposal', 'manual'],
  ['Terrasse', 'Terrasse bois', 'm2', 60, 95, 'service', 'area'],
  ['Terrasse', 'Terrasse composite', 'm2', 80, 120, 'service', 'area'],
  ['Clôture', 'Pose de clôture', 'ml', 20, 35, 'service', 'length'],
  ['Clôture', 'Fourniture clôture', 'ml', 32, 50, 'material', 'length', 5],
  ['Bordures', 'Pose de bordures', 'ml', 14, 25, 'service', 'length'],
  ['Plantation', 'Fourniture plant', 'unit', 18, 35, 'plant', 'manual'],
  ['Plantation', 'Plantation', 'unit', 10, 20, 'service', 'manual'],
  ['Terre & gravier', 'Terre végétale (fourniture)', 'm3', 30, 45, 'material', 'volume', 10, 20],
  ['Terre & gravier', 'Gravier décoratif (fourniture)', 'm3', 55, 90, 'material', 'volume', 5, 5],
  ['Terrassement', 'Terrassement / décaissement', 'm3', 20, 35, 'service', 'volume', 0, 20],
  ['Entretien', 'Tonte', 'm2', 0.25, 0.5, 'service', 'area'],
  ['Entretien', 'Débroussaillage', 'm2', 0.8, 1.5, 'service', 'area'],
  ['Taille & élagage', 'Taille de haie', 'ml', 3, 6, 'service', 'length'],
  ['Taille & élagage', 'Élagage d’arbre', 'unit', 140, 250, 'service', 'manual'],
  ["Main-d'œuvre", 'Main-d’œuvre', 'hour', 28, 45, 'labor', 'manual'],
  ["Main-d'œuvre", 'Journée d’équipe', 'day', 220, 350, 'labor', 'manual'],
  ['Divers', 'Transport / déplacement', 'flat', 90, 150, 'transport', 'manual'],
  ['Divers', 'Location mini-pelle', 'day', 180, 250, 'rental', 'manual'],
  ['Divers', 'Consommables (géotextile, fixations…)', 'flat', 40, 60, 'consumable', 'manual'],
];

export function defaultCatalog(now = new Date().toISOString()): CatalogItem[] {
  return SEED.map(([section, label, unit, costPrice, unitPrice, kind, quantityRule, waste = 0, thicknessCm]) => ({
    id: uid(),
    section,
    label,
    description: '',
    unit,
    unitPrice,
    costPrice,
    kind,
    quantityRule,
    wastePercent: waste,
    thicknessCm: thicknessCm ?? null,
    createdAt: now,
    updatedAt: now,
  }));
}

/** Modèles de devis fournis : ils s'appuient sur les libellés du catalogue. */
export function builtInTemplates(now = new Date().toISOString()): QuoteTemplate[] {
  const t = (id: string, name: string, description: string, categories: QuoteTemplate['categories'], items: QuoteTemplate['items']): QuoteTemplate => ({
    id: `builtin-${id}`,
    name,
    description,
    categories,
    items,
    lines: [],
    builtIn: true,
    createdAt: now,
  });
  const i = (label: string, quantity: number | null = null) => ({ label, quantity });
  return [
    t(
      'lawn',
      'Création de pelouse',
      'Préparation complète du terrain, apport de terre végétale, fourniture et pose d’un gazon en plaques, évacuation des déchets verts.',
      ['lawn'],
      [i('Préparation du terrain'), i('Terre végétale (fourniture)'), i('Gazon en plaques (fourniture)'), i('Pose de gazon'), i('Évacuation des déchets verts')],
    ),
    t(
      'terrace',
      'Terrasse bois',
      'Décaissement, pose d’un géotextile et réalisation d’une terrasse en bois sur lambourdes.',
      ['terrace'],
      [i('Terrassement / décaissement'), i('Terrasse bois'), i('Consommables (géotextile, fixations…)'), i('Transport / déplacement')],
    ),
    t('fence', 'Clôture', 'Fourniture et pose d’une clôture, réglage et finitions.', ['fence'], [i('Fourniture clôture'), i('Pose de clôture'), i('Transport / déplacement')]),
    t(
      'planting',
      'Plantation',
      'Fourniture et plantation de végétaux adaptés au sol et à l’exposition, avec apport de terre végétale.',
      ['planting'],
      [i('Fourniture plant', 5), i('Plantation', 5), i('Terre végétale (fourniture)')],
    ),
    t(
      'maintenance',
      'Entretien',
      'Entretien des espaces verts : tonte, taille des haies et évacuation des déchets verts.',
      ['maintenance', 'hedge_trimming'],
      [i('Tonte'), i('Taille de haie'), i('Évacuation des déchets verts')],
    ),
  ];
}
