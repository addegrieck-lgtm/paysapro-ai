// Données de démonstration : permettent de tester l'application immédiatement.
// Toutes les fiches créées portent isDemo = true et peuvent être retirées en un clic.
import type { AppSettings, CatalogItem, Client, MeasureZone, Project, Quote, QuoteLine } from '../../types';
import { uid, publicToken } from '../../utils/id';
import { nextQuoteNumber } from '../quotes/numbering';
import { lineFromCatalog } from '../quotes/lines';
import { DEFAULT_CHECKLIST } from '../projects/status';

const DEMO_SIGNATURE =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><path d="M10 70 C 40 10, 60 90, 90 50 S 140 20, 160 60 S 220 80, 290 30" stroke="#1f2a24" stroke-width="3" fill="none"/></svg>',
  );

export interface DemoData {
  clients: Client[];
  projects: Project[];
  quotes: Quote[];
  settings: AppSettings;
}

function zone(name: string, length: number, width: number): MeasureZone {
  return { id: uid(), name, shape: 'rectangle', length, width, radius: null, manualArea: null, subtract: false, approximate: false };
}

export function buildDemoData(catalog: CatalogItem[], settings: AppSettings, now = new Date()): DemoData {
  const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  const find = (label: string) => catalog.find((c) => c.label.toLowerCase().startsWith(label.toLowerCase()));
  const line = (label: string, patch: Partial<QuoteLine> = {}): QuoteLine[] => {
    const item = find(label);
    return item ? [{ ...lineFromCatalog(item), ...patch }] : [];
  };
  let counter = settings.quoteCounter;
  const number = () => {
    const res = nextQuoteNumber(counter, now);
    counter = res.counter;
    return res.number;
  };

  const client = (firstName: string, lastName: string, companyName: string, city: string, address: string, phone: string): Client => ({
    id: uid(),
    firstName,
    lastName,
    companyName,
    phone,
    email: '',
    address,
    postalCode: '69000',
    city,
    notes: '',
    isDemo: true,
    createdAt: iso(20),
    updatedAt: iso(20),
  });
  const dupont = client('Jean', 'Dupont', '', 'Lyon', '10 rue Exemple', '06 00 00 00 01');
  const martin = client('Marie', 'Martin', '', 'Villeurbanne', '4 allée des Tilleuls', '06 00 00 00 02');
  const entreprise = client('', '', 'Entreprise Exemple', 'Vénissieux', '1 zone d’activité', '04 00 00 00 03');

  const baseQuote = (projectId: string, clientId: string, daysAgo: number): Quote => ({
    id: uid(),
    projectId,
    clientId,
    number: null,
    publicToken: null,
    status: 'draft',
    issueDate: null,
    validityDays: settings.quoteValidityDays,
    description: '',
    lines: [],
    marginPercent: settings.defaultMarginPercent,
    vatRate: settings.vatRate,
    vatExempt: settings.company.vatExempt,
    depositPercent: settings.defaultDepositPercent,
    terms: settings.company.terms,
    includedPhotoIds: [],
    sentAt: null,
    viewedAt: null,
    acceptedAt: null,
    refusedAt: null,
    signature: null,
    payments: [],
    isDemo: true,
    createdAt: iso(daysAgo),
    updatedAt: iso(daysAgo),
  });
  const baseProject = (clientId: string, title: string, categories: Project['categories'], daysAgo: number): Project => ({
    id: uid(),
    clientId,
    title,
    categories,
    description: '',
    siteAddress: '',
    estimateMode: 'precise',
    zones: [],
    linears: [],
    quoteId: null,
    work: null,
    isDemo: true,
    createdAt: iso(daysAgo),
    updatedAt: iso(daysAgo),
  });

  // 1. Jean Dupont — gazon, devis consulté
  const p1 = baseProject(dupont.id, 'Création de pelouse et massifs', ['lawn', 'planting'], 6);
  p1.description = 'Création d’une pelouse en rouleaux, massif avec un olivier et bordures acier.';
  p1.zones = [zone('Pelouse', 12, 8)];
  p1.linears = [{ id: uid(), name: 'Bordure massif', length: 14, approximate: false }];
  const q1 = baseQuote(p1.id, dupont.id, 6);
  q1.description = p1.description;
  q1.lines = [
    ...line('Préparation du terrain'),
    ...line('Pose de gazon'),
    ...line('Pose de bordures'),
    ...line('Fourniture plant', { manualQuantity: 5 }),
    ...line('Plantation', { manualQuantity: 5 }),
    ...line('Évacuation'),
  ];
  Object.assign(q1, { number: number(), publicToken: publicToken(), issueDate: iso(5), status: 'viewed', sentAt: iso(5), viewedAt: iso(1) });
  p1.quoteId = q1.id;

  // 2. Marie Martin — terrasse signée, acompte reçu, chantier en cours
  const p2 = baseProject(martin.id, 'Terrasse bois 20 m²', ['terrace'], 18);
  p2.zones = [zone('Terrasse', 5, 4)];
  const q2 = baseQuote(p2.id, martin.id, 18);
  q2.description = 'Terrasse en pin traité classe 4 sur lambourdes, décaissement et géotextile.';
  q2.lines = [...line('Terrassement'), ...line('Terrasse bois'), ...line('Consommables'), ...line('Transport')];
  Object.assign(q2, {
    number: number(),
    publicToken: publicToken(),
    issueDate: iso(16),
    status: 'signed',
    sentAt: iso(16),
    viewedAt: iso(15),
    acceptedAt: iso(14),
    signature: {
      provider: 'local',
      signerName: 'Marie Martin',
      signedAt: iso(14),
      imageDataUrl: DEMO_SIGNATURE,
      contentHash: 'démonstration',
      userAgent: 'démonstration',
    },
    payments: [{ id: uid(), kind: 'deposit', amount: 1000, method: 'transfer', date: iso(12), provider: 'manual', reference: 'Démo' }],
  });
  p2.quoteId = q2.id;
  p2.work = {
    stage: 'in_progress',
    startDate: iso(2).slice(0, 10),
    endDate: null,
    checklist: DEFAULT_CHECKLIST.map((label, i) => ({ id: uid(), label, done: i < 4 })),
    notes: '',
    createdAt: iso(13),
  };

  // 3. Entreprise Exemple — entretien, devis en préparation
  const p3 = baseProject(entreprise.id, 'Entretien annuel des espaces verts', ['maintenance', 'hedge_trimming'], 2);
  p3.zones = [zone('Pelouses', 30, 15)];
  p3.linears = [{ id: uid(), name: 'Haie de façade', length: 40, approximate: false }];
  const q3 = baseQuote(p3.id, entreprise.id, 2);
  q3.lines = [...line('Tonte'), ...line('Taille de haie')];
  p3.quoteId = q3.id;

  return {
    clients: [dupont, martin, entreprise],
    projects: [p1, p2, p3],
    quotes: [q1, q2, q3],
    settings: { ...settings, quoteCounter: counter },
  };
}
