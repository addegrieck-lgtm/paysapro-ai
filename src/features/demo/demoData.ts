// Données de démonstration (entreprise fictive) : utilisées uniquement dans l'espace démo,
// séparé des vraies données (cf. services/storage/index.ts).
import type { ActivityEvent, AppSettings, CatalogItem, Client, CompanySettings, MeasureZone, Project, Quote, QuoteLine } from '../../types';
import { uid, publicToken } from '../../utils/id';
import { nextQuoteNumber } from '../quotes/numbering';
import { lineFromCatalog } from '../quotes/lines';
import { DEFAULT_CHECKLIST } from '../projects/status';

const DEMO_SIGNATURE =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><path d="M10 70 C 40 10, 60 90, 90 50 S 140 20, 160 60 S 220 80, 290 30" stroke="#1f2a24" stroke-width="3" fill="none"/></svg>',
  );

export const DEMO_OWNER = { firstName: 'Thomas', lastName: 'Lefèvre' };

export const DEMO_COMPANY: Partial<CompanySettings> = {
  name: 'Les Jardins de Thomas (démo)',
  address: '12 route des Vergers',
  postalCode: '69000',
  city: 'Lyon',
  phone: '04 00 00 00 00',
  email: 'contact@jardins-demo.fr',
  siret: '000 000 000 00000',
  vatNumber: 'FR00 000000000',
  iban: 'FR76 0000 0000 0000 0000 0000 000',
  quoteFooter: 'Entreprise fictive — données de démonstration.',
};

export interface DemoData {
  clients: Client[];
  projects: Project[];
  quotes: Quote[];
  activity: ActivityEvent[];
  settings: AppSettings;
}

function zone(name: string, length: number, width: number): MeasureZone {
  return { id: uid(), name, shape: 'rectangle', length, width, radius: null, manualArea: null, subtract: false, approximate: false };
}

export function buildDemoData(catalog: CatalogItem[], settings: AppSettings, now = new Date()): DemoData {
  const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  const day = (offset: number) => iso(-offset).slice(0, 10);
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

  const client = (firstName: string, lastName: string, companyName: string, city: string, address: string, phone: string, email = ''): Client => ({
    id: uid(),
    firstName,
    lastName,
    companyName,
    phone,
    email,
    address,
    postalCode: '69000',
    city,
    notes: '',
    isDemo: true,
    createdAt: iso(25),
    updatedAt: iso(25),
  });
  const dupont = client('Jean', 'Dupont', '', 'Lyon', '10 rue Exemple', '06 00 00 00 01', 'jean.dupont@exemple.fr');
  const martin = client('Marie', 'Martin', '', 'Villeurbanne', '4 allée des Tilleuls', '06 00 00 00 02');
  const entreprise = client('', '', 'Entreprise Exemple', 'Vénissieux', '1 zone d’activité', '04 00 00 00 03');
  const bernard = client('Sophie', 'Bernard', '', 'Caluire', '8 chemin des Roses', '06 00 00 00 04');

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
    privateNotes: '',
    estimateMode: 'precise',
    zones: [],
    linears: [],
    quoteId: null,
    work: null,
    isDemo: true,
    createdAt: iso(daysAgo),
    updatedAt: iso(daysAgo),
  });
  const signature = (name: string, daysAgo: number) => ({
    provider: 'local' as const,
    signerName: name,
    signedAt: iso(daysAgo),
    imageDataUrl: DEMO_SIGNATURE,
    contentHash: 'démonstration',
    userAgent: 'démonstration',
  });

  // 1. Jean Dupont — pelouse, devis consulté
  const p1 = baseProject(dupont.id, 'Création de pelouse et massifs', ['lawn', 'planting'], 6);
  p1.description = 'Création d’une pelouse en plaques, massif avec un olivier et bordures acier.';
  p1.privateNotes = 'Accès par le portail latéral. Client pressé avant l’été.';
  p1.zones = [zone('Pelouse', 12, 8)];
  p1.linears = [{ id: uid(), name: 'Bordure massif', length: 14, approximate: false }];
  const q1 = baseQuote(p1.id, dupont.id, 6);
  q1.description = 'Préparation complète du terrain, fourniture et pose d’un gazon en plaques, création d’un massif planté avec un olivier et pose de bordures.';
  q1.lines = [
    ...line('Préparation du terrain'),
    ...line('Gazon en plaques'),
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
  q2.description = 'Décaissement, pose d’un géotextile et réalisation d’une terrasse en pin traité classe 4 sur lambourdes.';
  q2.lines = [...line('Terrassement'), ...line('Terrasse bois'), ...line('Consommables'), ...line('Transport')];
  Object.assign(q2, {
    number: number(),
    publicToken: publicToken(),
    issueDate: iso(16),
    status: 'signed',
    sentAt: iso(16),
    viewedAt: iso(15),
    acceptedAt: iso(14),
    signature: signature('Marie Martin', 14),
    payments: [{ id: uid(), kind: 'deposit', amount: 1000, method: 'transfer', date: iso(12), provider: 'manual', reference: 'Démo' }],
  });
  p2.quoteId = q2.id;
  p2.work = {
    stage: 'in_progress',
    startDate: day(-2),
    endDate: day(3),
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

  // 4. Sophie Bernard — clôture signée, chantier terminé
  const p4 = baseProject(bernard.id, 'Clôture fond de jardin', ['fence'], 40);
  p4.linears = [{ id: uid(), name: 'Fond de jardin', length: 25, approximate: false }];
  const q4 = baseQuote(p4.id, bernard.id, 40);
  q4.description = 'Fourniture et pose d’une clôture en panneaux rigides sur 25 mètres.';
  q4.lines = [...line('Fourniture clôture'), ...line('Pose de clôture'), ...line('Transport')];
  Object.assign(q4, {
    number: number(),
    publicToken: publicToken(),
    issueDate: iso(38),
    status: 'signed',
    sentAt: iso(38),
    viewedAt: iso(37),
    acceptedAt: iso(36),
    signature: signature('Sophie Bernard', 36),
    payments: [
      { id: uid(), kind: 'deposit', amount: 800, method: 'transfer', date: iso(35), provider: 'manual', reference: 'Démo' },
      { id: uid(), kind: 'balance', amount: 1882, method: 'check', date: iso(20), provider: 'manual', reference: 'Démo' },
    ],
  });
  p4.quoteId = q4.id;
  p4.work = {
    stage: 'done',
    startDate: day(-25),
    endDate: day(-22),
    checklist: DEFAULT_CHECKLIST.map((label) => ({ id: uid(), label, done: true })),
    notes: '',
    createdAt: iso(35),
  };

  const event = (message: string, projectId: string, daysAgo: number, kind: ActivityEvent['kind'] = 'info', notify = false): ActivityEvent => ({
    id: uid(),
    projectId,
    message,
    kind,
    notify,
    read: daysAgo > 3,
    createdAt: iso(daysAgo),
  });

  return {
    clients: [dupont, martin, entreprise, bernard],
    projects: [p1, p2, p3, p4],
    quotes: [q1, q2, q3, q4],
    activity: [
      event(`Devis ${q4.number} créé pour Sophie Bernard.`, p4.id, 38),
      event(`🎉 Sophie Bernard vient de signer le devis #${q4.number}.`, p4.id, 36, 'signed', true),
      event('✅ Chantier terminé : Clôture fond de jardin.', p4.id, 22, 'work_done', true),
      event(`🎉 Marie Martin vient de signer le devis #${q2.number}.`, p2.id, 14, 'signed', true),
      event(`Devis ${q1.number} envoyé à Jean Dupont.`, p1.id, 5),
      event(`👀 Jean Dupont a consulté le devis #${q1.number}.`, p1.id, 1, 'viewed', true),
    ],
    settings: { ...settings, quoteCounter: counter },
  };
}
