import type {
  LinearMeasure,
  MeasureZone,
  PhotoRecord,
  PhotoTag,
  Project,
  ProjectCategory,
  Quote,
  WorkTracking,
} from '../../types';
import { getState, persist, setState, upsert, without } from '../../lib/store';
import { storage } from '../../services/storage';
import { compressImage } from '../../services/images/compress';
import { uid } from '../../utils/id';
import { logActivity } from '../activity';
import { categoriesText, DEFAULT_CHECKLIST, workStageLabel } from './status';

export interface NewProjectInput {
  clientId: string;
  title: string;
  categories: ProjectCategory[];
  description: string;
  siteAddress: string;
}

export function projectTitle(p: Pick<Project, 'title' | 'categories'>): string {
  return p.title.trim() || categoriesText(p.categories);
}

/** Crée le chantier et son devis brouillon (paramètres par défaut de l'entreprise). */
export function createProject(input: NewProjectInput): Project {
  const { settings } = getState();
  const now = new Date().toISOString();
  const projectId = uid();
  const quote: Quote = {
    id: uid(),
    projectId,
    clientId: input.clientId,
    number: null,
    publicToken: null,
    status: 'draft',
    issueDate: null,
    validityDays: settings.quoteValidityDays,
    description: input.description,
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
    createdAt: now,
    updatedAt: now,
  };
  const project: Project = {
    id: projectId,
    clientId: input.clientId,
    title: input.title,
    categories: input.categories,
    description: input.description,
    siteAddress: input.siteAddress,
    estimateMode: 'precise',
    zones: [],
    linears: [],
    quoteId: quote.id,
    work: null,
    createdAt: now,
    updatedAt: now,
  };
  setState({ projects: upsert(getState().projects, project), quotes: upsert(getState().quotes, quote) });
  void persist(async () => {
    await storage.saveProject(project);
    await storage.saveQuote(quote);
  });
  logActivity(`Nouveau chantier créé : ${projectTitle(project)}.`, project.id);
  return project;
}

export function updateProject(id: string, patch: Partial<Project>): void {
  const current = getState().projects.find((p) => p.id === id);
  if (!current) return;
  const project = { ...current, ...patch, updatedAt: new Date().toISOString() };
  setState({ projects: upsert(getState().projects, project) });
  void persist(() => storage.saveProject(project));
}

/** Supprime le chantier, son devis et ses photos. */
export async function deleteProject(id: string): Promise<void> {
  const s = getState();
  const project = s.projects.find((p) => p.id === id);
  if (!project) return;
  const quotes = s.quotes.filter((q) => q.projectId === id);
  setState({
    projects: without(s.projects, id),
    quotes: s.quotes.filter((q) => q.projectId !== id),
    photos: s.photos.filter((p) => p.projectId !== id),
  });
  await persist(async () => {
    await storage.deleteProject(id); // supprime aussi les photos
    for (const q of quotes) await storage.deleteQuote(q.id);
  });
}

// ───────────── Mesures ─────────────

export function newZone(index: number, approximate = false): MeasureZone {
  return {
    id: uid(),
    name: `Zone ${String.fromCharCode(65 + (index % 26))}`,
    shape: 'rectangle',
    length: null,
    width: null,
    radius: null,
    manualArea: null,
    subtract: false,
    approximate,
  };
}

export function newLinear(index: number, approximate = false): LinearMeasure {
  return { id: uid(), name: `Longueur ${index + 1}`, length: null, approximate };
}

// ───────────── Photos ─────────────

export async function addPhotos(projectId: string, files: File[], tag: PhotoTag): Promise<string[]> {
  const added: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await compressImage(file);
      const record: PhotoRecord = {
        id: uid(),
        projectId,
        tag,
        caption: '',
        width: img.width,
        height: img.height,
        createdAt: new Date().toISOString(),
        thumb: img.thumb,
        medium: img.medium,
      };
      const ok = await persist(() => storage.savePhoto(record));
      if (!ok) break;
      const { thumb: _t, medium: _m, ...meta } = record;
      setState({ photos: [...getState().photos, meta] });
      added.push(record.id);
    } catch (e) {
      console.error(e);
    }
  }
  return added;
}

export async function updatePhoto(id: string, patch: { caption?: string; tag?: PhotoTag }): Promise<void> {
  const meta = getState().photos.find((p) => p.id === id);
  if (!meta) return;
  const updated = { ...meta, ...patch };
  setState({ photos: upsert(getState().photos, updated) });
  await persist(async () => {
    const record = await storage.getPhoto(id);
    if (record) await storage.savePhoto({ ...record, ...patch });
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const s = getState();
  setState({
    photos: without(s.photos, id),
    quotes: s.quotes.map((q) =>
      q.includedPhotoIds.includes(id) ? { ...q, includedPhotoIds: q.includedPhotoIds.filter((x) => x !== id) } : q,
    ),
  });
  await persist(() => storage.deletePhoto(id));
}

// ───────────── Suivi de chantier ─────────────

export function startWork(projectId: string): void {
  const project = getState().projects.find((p) => p.id === projectId);
  if (!project || project.work) return;
  const work: WorkTracking = {
    stage: 'planned',
    startDate: null,
    endDate: null,
    checklist: DEFAULT_CHECKLIST.map((label) => ({ id: uid(), label, done: false })),
    notes: '',
    createdAt: new Date().toISOString(),
  };
  updateProject(projectId, { work });
  logActivity(`Devis transformé en chantier : ${projectTitle(project)}.`, projectId);
}

export function updateWork(projectId: string, patch: Partial<WorkTracking>): void {
  const project = getState().projects.find((p) => p.id === projectId);
  if (!project?.work) return;
  if (patch.stage && patch.stage !== project.work.stage) {
    logActivity(`${projectTitle(project)} : étape « ${workStageLabel(patch.stage)} ».`, projectId);
  }
  updateProject(projectId, { work: { ...project.work, ...patch } });
}
