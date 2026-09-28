// Assistant local : règles métier transparentes, 100 % hors-ligne, aucune donnée envoyée.
// Ce n'est pas une IA « qui voit » les photos : il raisonne sur les catégories, la description
// et les mesures saisies, et explique chaque proposition.
import type { ProjectCategory } from '../../types';
import { formatNumber, round } from '../../utils/number';
import type {
  AIProvider,
  Confidence,
  PhotoAnalysis,
  ProjectContext,
  ProjectEstimate,
  ServiceSuggestion,
  VisualizationResult,
} from './AIProvider';

type Need = 'area' | 'length' | 'none';

interface Rule {
  /** mot-clé cherché dans le libellé du catalogue (sans accents, minuscules) */
  match: string;
  label: string;
  need: Need;
}

const BY_CATEGORY: Partial<Record<ProjectCategory, Rule[]>> = {
  lawn: [
    { match: 'preparation du terrain', label: 'Préparation du terrain', need: 'area' },
    { match: 'pose de gazon', label: 'Pose de gazon', need: 'area' },
    { match: 'gazon en plaques', label: 'Gazon en plaques (fourniture)', need: 'area' },
    { match: 'evacuation', label: 'Évacuation des déchets verts', need: 'none' },
  ],
  creation: [
    { match: 'preparation du terrain', label: 'Préparation du terrain', need: 'area' },
    { match: 'terre vegetale', label: 'Terre végétale', need: 'area' },
    { match: 'plantation', label: 'Plantation', need: 'none' },
    { match: 'bordures', label: 'Pose de bordures', need: 'length' },
    { match: 'evacuation', label: 'Évacuation', need: 'none' },
  ],
  full_landscaping: [
    { match: 'preparation du terrain', label: 'Préparation du terrain', need: 'area' },
    { match: 'pose de gazon', label: 'Pose de gazon', need: 'area' },
    { match: 'plantation', label: 'Plantation', need: 'none' },
    { match: 'bordures', label: 'Pose de bordures', need: 'length' },
    { match: 'transport', label: 'Transport / déplacement', need: 'none' },
    { match: 'evacuation', label: 'Évacuation', need: 'none' },
  ],
  terrace: [
    { match: 'terrassement', label: 'Terrassement / décaissement', need: 'area' },
    { match: 'terrasse bois', label: 'Terrasse bois', need: 'area' },
  ],
  planting: [
    { match: 'fourniture plant', label: 'Fourniture plant', need: 'none' },
    { match: 'plantation', label: 'Plantation', need: 'none' },
  ],
  fence: [
    { match: 'pose de cloture', label: 'Pose de clôture', need: 'length' },
    { match: 'fourniture cloture', label: 'Fourniture clôture', need: 'length' },
  ],
  earthwork: [
    { match: 'terrassement', label: 'Terrassement / décaissement', need: 'area' },
    { match: 'mini-pelle', label: 'Location mini-pelle', need: 'none' },
    { match: 'evacuation', label: 'Évacuation', need: 'none' },
  ],
  pruning_trees: [
    { match: 'elagage', label: 'Élagage d’arbre', need: 'none' },
    { match: 'evacuation', label: 'Évacuation', need: 'none' },
  ],
  hedge_trimming: [
    { match: 'taille de haie', label: 'Taille de haie', need: 'length' },
    { match: 'evacuation', label: 'Évacuation', need: 'none' },
  ],
  maintenance: [
    { match: 'tonte', label: 'Tonte', need: 'area' },
    { match: 'taille de haie', label: 'Taille de haie', need: 'length' },
  ],
};

const BY_KEYWORD: { words: string[]; rule: Rule }[] = [
  { words: ['gravier', 'gravillon'], rule: { match: 'gravier', label: 'Gravier décoratif', need: 'area' } },
  { words: ['bordure'], rule: { match: 'bordures', label: 'Pose de bordures', need: 'length' } },
  { words: ['haie'], rule: { match: 'taille de haie', label: 'Taille de haie', need: 'length' } },
  { words: ['olivier', 'arbuste', 'massif', 'fleur', 'plante'], rule: { match: 'plantation', label: 'Plantation', need: 'none' } },
  { words: ['gazon', 'pelouse'], rule: { match: 'pose de gazon', label: 'Pose de gazon', need: 'area' } },
  { words: ['terrasse'], rule: { match: 'terrasse bois', label: 'Terrasse bois', need: 'area' } },
  { words: ['cloture', 'grillage', 'palissade'], rule: { match: 'pose de cloture', label: 'Pose de clôture', need: 'length' } },
  { words: ['souche', 'arbre'], rule: { match: 'elagage', label: 'Élagage d’arbre', need: 'none' } },
];

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .toLowerCase();
}

const CATEGORY_NAMES: Record<ProjectCategory, string> = {
  creation: 'Création de jardin',
  maintenance: 'Entretien',
  terrace: 'Terrasse',
  lawn: 'Gazon',
  planting: 'Plantation',
  fence: 'Clôture',
  earthwork: 'Terrassement',
  pruning_trees: 'Élagage',
  hedge_trimming: 'Taille',
  full_landscaping: 'Aménagement complet',
  other: 'Autre',
};

function measureText(need: Need, ctx: ProjectContext): { ok: boolean; text: string } {
  if (need === 'area')
    return ctx.area
      ? { ok: true, text: `surface ${ctx.areaApproximate ? 'estimée ≈' : 'mesurée'} ${formatNumber(ctx.area)} m²` }
      : { ok: false, text: 'surface à mesurer' };
  if (need === 'length')
    return ctx.length ? { ok: true, text: `longueur ${formatNumber(ctx.length)} ml` } : { ok: false, text: 'longueur à mesurer' };
  return { ok: true, text: 'quantité à préciser' };
}

const ELEMENT_PHRASES: Record<string, string> = {
  gazon: 'la création d’un gazon dense et uniforme',
  'terrasse bois': 'une terrasse en bois chaleureuse',
  'terrasse composite': 'une terrasse en composite sans entretien',
  massif: 'des massifs plantés d’essences adaptées au sol et à l’exposition',
  olivier: 'la plantation d’un olivier comme point focal',
  haie: 'une haie végétale pour l’intimité',
  éclairage: 'un éclairage extérieur discret pour mettre en valeur le jardin le soir',
  gravier: 'des zones en gravier décoratif, faciles d’entretien',
  allée: 'une allée praticable reliant les différents espaces',
  clôture: 'une clôture neuve pour délimiter la propriété',
  bassin: 'un point d’eau / bassin',
  potager: 'un espace potager',
  bordures: 'des bordures nettes entre pelouse et massifs',
};

const LINE_PHRASES: [string, string][] = [
  ['preparation du terrain', 'préparation complète du terrain'],
  ['gazon en plaques', 'fourniture d’un gazon en plaques'],
  ['pose de gazon', 'pose du gazon'],
  ['terre vegetale', 'apport de terre végétale'],
  ['gravier', 'fourniture et mise en place de gravier décoratif'],
  ['terrassement', 'terrassement et décaissement'],
  ['terrasse bois', 'réalisation d’une terrasse en bois'],
  ['terrasse composite', 'réalisation d’une terrasse en composite'],
  ['fourniture cloture', 'fourniture de la clôture'],
  ['pose de cloture', 'pose de la clôture'],
  ['bordures', 'pose de bordures'],
  ['fourniture plant', 'fourniture des végétaux'],
  ['plantation', 'plantation'],
  ['tonte', 'tonte des pelouses'],
  ['taille de haie', 'taille des haies'],
  ['debroussaillage', 'débroussaillage'],
  ['elagage', 'élagage'],
  ['evacuation', 'évacuation des déchets verts'],
  ['main-d', ''],
  ['journee d', ''],
  ['transport', ''],
  ['consommables', ''],
  ['location', ''],
];

/** Phrase de description d'une prestation (vide = ligne purement administrative). */
function describeLine(label: string): string {
  const n = normalize(label);
  const hit = LINE_PHRASES.find(([k]) => n.includes(k));
  if (hit) return hit[1];
  return label.trim() ? label.trim().charAt(0).toLowerCase() + label.trim().slice(1) : '';
}

export const VISUALIZATION_ELEMENTS = Object.keys(ELEMENT_PHRASES);

export class LocalAIProvider implements AIProvider {
  readonly id = 'local' as const;
  readonly label = 'Assistant local (règles métier, hors-ligne)';
  readonly simulated = false;
  readonly sendsDataExternally = false;

  async analyzePhoto(): Promise<PhotoAnalysis> {
    return {
      available: false,
      message:
        'L’analyse automatique des photos nécessite un service d’IA externe, non activé. Entrez les dimensions dans « Mesures » : le calcul sera exact.',
    };
  }

  async suggestServices(ctx: ProjectContext): Promise<ServiceSuggestion[]> {
    const text = normalize(ctx.description);
    const out = new Map<string, ServiceSuggestion>();

    const add = (rule: Rule, origin: string, fromCategory: boolean) => {
      const item = ctx.catalog.find((c) => normalize(c.label).includes(rule.match));
      const key = item?.id ?? rule.match;
      if (out.has(key)) return;
      const m = measureText(rule.need, ctx);
      let confidence: Confidence = fromCategory ? (m.ok ? 'high' : 'medium') : m.ok ? 'medium' : 'low';
      if (rule.need !== 'none' && ctx.areaApproximate && confidence === 'high') confidence = 'medium';
      out.set(key, {
        id: key,
        label: item?.label ?? rule.label,
        catalogItemId: item?.id ?? null,
        reason: `${origin} · ${m.text}${item ? '' : ' · absent de votre catalogue'}`,
        confidence,
      });
    };

    for (const cat of ctx.categories) {
      for (const rule of BY_CATEGORY[cat] ?? []) add(rule, `Catégorie « ${CATEGORY_NAMES[cat]} » choisie`, true);
    }
    for (const { words, rule } of BY_KEYWORD) {
      const word = words.find((w) => text.includes(w));
      if (word) add(rule, `Le mot « ${word} » figure dans la description`, false);
    }
    const order: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
    return [...out.values()].sort((a, b) => order[a.confidence] - order[b.confidence]);
  }

  async estimateProject(ctx: ProjectContext): Promise<ProjectEstimate> {
    const known: string[] = [];
    const missing: string[] = [];
    let areaRange: [number, number] | null = null;
    if (ctx.area) {
      if (ctx.areaApproximate) {
        areaRange = [round(ctx.area * 0.85, 0), round(ctx.area * 1.15, 0)];
        known.push(`Surface approximative : ≈ ${formatNumber(ctx.area)} m² (fourchette ${areaRange[0]}–${areaRange[1]} m²)`);
      } else {
        known.push(`Surface mesurée : ${formatNumber(ctx.area)} m²`);
      }
    } else missing.push('Surface : information manquante (ajoutez les dimensions)');
    if (ctx.length) known.push(`Longueurs mesurées : ${formatNumber(ctx.length)} ml`);
    if (ctx.categories.length) known.push(`Travaux : ${ctx.categories.map((c) => CATEGORY_NAMES[c]).join(', ')}`);
    else missing.push('Type de travaux non précisé');
    if (ctx.photoCount === 0) missing.push('Aucune photo du chantier');
    return {
      areaRange,
      known,
      missing,
      warning: ctx.areaApproximate ? 'Estimation indicative — à confirmer par un métré sur place.' : null,
    };
  }

  async generateDescription(ctx: ProjectContext, elements: string[]): Promise<string> {
    const phrases = elements.map((e) => ELEMENT_PHRASES[e] ?? e).filter(Boolean);
    const surface = ctx.area
      ? ` sur une surface ${ctx.areaApproximate ? 'd’environ' : 'de'} ${formatNumber(ctx.area)} m²`
      : '';
    if (phrases.length === 0) {
      return `Projet d’aménagement extérieur${surface}. Le détail des travaux est présenté ci-dessous.`;
    }
    const list = phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(', ')} et ${phrases.at(-1)}`;
    return (
      `Transformation du jardin${surface} : ${list}. ` +
      'Les travaux comprennent la préparation du terrain, la fourniture et la mise en œuvre des matériaux, ' +
      'ainsi que le nettoyage du chantier en fin d’intervention.'
    );
  }

  async generateQuoteDescription(ctx: ProjectContext, lineLabels: string[]): Promise<string> {
    const phrases = [...new Set(lineLabels.map(describeLine).filter(Boolean))];
    if (phrases.length === 0) return '';
    const list = phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(', ')} et ${phrases.at(-1)}`;
    const surface = ctx.area ? ` sur une surface ${ctx.areaApproximate ? 'd’environ' : 'de'} ${formatNumber(ctx.area)} m²` : '';
    return `Travaux prévus${surface} : ${list}. Nettoyage du chantier en fin d’intervention.`;
  }

  async generateVisualization(): Promise<VisualizationResult> {
    return {
      available: false,
      message: 'La génération d’image du projet nécessite un service d’IA externe. Disponible prochainement.',
    };
  }
}
