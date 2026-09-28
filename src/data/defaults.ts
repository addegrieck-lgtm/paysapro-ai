import type { AppSettings, CatalogItem, LineKind, QuantityRule, Unit } from '../types';
import { uid } from '../utils/id';

export const DEFAULT_TERMS = [
  'Devis valable pour la durée indiquée à compter de sa date d’émission.',
  'Un acompte est demandé à la signature ; le solde est payable à la fin des travaux.',
  'Les quantités estimées seront confirmées sur place ; toute modification fera l’objet d’un avenant.',
  'Les végétaux sont garantis sous réserve d’un arrosage conforme aux conseils fournis.',
].join('\n');

export function defaultSettings(): AppSettings {
  return {
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
    },
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
    onboardingDone: false,
  };
}

type Seed = [
  section: string,
  label: string,
  unit: Unit,
  price: number,
  kind: LineKind,
  rule: QuantityRule,
  waste?: number,
  thicknessCm?: number,
];

// Tarifs indicatifs : chaque professionnel les adapte dans Paramètres → Catalogue.
const SEED: Seed[] = [
  ['Gazon', 'Préparation du terrain', 'm2', 8, 'service', 'area'],
  ['Gazon', 'Pose de gazon', 'm2', 18, 'service', 'area'],
  ['Gazon', 'Gazon en rouleaux (fourniture)', 'm2', 6, 'plant', 'area', 8],
  ['Gazon', 'Évacuation des déchets verts', 'flat', 150, 'disposal', 'manual'],
  ['Terrasse', 'Terrasse bois', 'm2', 95, 'service', 'area'],
  ['Terrasse', 'Terrasse composite', 'm2', 120, 'service', 'area'],
  ['Clôture', 'Pose de clôture', 'ml', 35, 'service', 'length'],
  ['Clôture', 'Fourniture clôture', 'ml', 50, 'material', 'length', 5],
  ['Bordures', 'Pose de bordures', 'ml', 25, 'service', 'length'],
  ['Plantation', 'Fourniture plant', 'unit', 35, 'plant', 'manual'],
  ['Plantation', 'Plantation', 'unit', 20, 'service', 'manual'],
  ['Terre & gravier', 'Terre végétale (fourniture)', 'm3', 45, 'material', 'volume', 10, 20],
  ['Terre & gravier', 'Gravier décoratif (fourniture)', 'm3', 90, 'material', 'volume', 5, 5],
  ['Terrassement', 'Terrassement / décaissement', 'm3', 35, 'service', 'volume', 0, 20],
  ['Entretien', 'Tonte', 'm2', 0.5, 'service', 'area'],
  ['Taille & élagage', 'Taille de haie', 'ml', 6, 'service', 'length'],
  ['Taille & élagage', 'Élagage d’arbre', 'unit', 250, 'service', 'manual'],
  ["Main-d'œuvre", 'Main-d’œuvre', 'hour', 45, 'labor', 'manual'],
  ["Main-d'œuvre", 'Journée d’équipe', 'day', 350, 'labor', 'manual'],
  ['Divers', 'Transport / déplacement', 'flat', 150, 'transport', 'manual'],
  ['Divers', 'Location mini-pelle', 'day', 250, 'rental', 'manual'],
  ['Divers', 'Consommables (géotextile, fixations…)', 'flat', 60, 'consumable', 'manual'],
];

export function defaultCatalog(now = new Date().toISOString()): CatalogItem[] {
  return SEED.map(([section, label, unit, unitPrice, kind, quantityRule, waste = 0, thicknessCm]) => ({
    id: uid(),
    section,
    label,
    description: '',
    unit,
    unitPrice,
    kind,
    quantityRule,
    wastePercent: waste,
    thicknessCm: thicknessCm ?? null,
    createdAt: now,
    updatedAt: now,
  }));
}
