import type { PaymentRecord, Project, Quote, QuoteLine } from '../../types';
import { getState, persist, setState, upsert } from '../../lib/store';
import { storage } from '../../services/storage';
import { signatureProvider } from '../../services/signature/SignatureProvider';
import { paymentProvider, type PaymentRequest } from '../../services/payments/PaymentProvider';
import { publicToken } from '../../utils/id';
export { blankLine, lineFromCatalog } from './lines';
import { logActivity } from '../activity';
import { clientDisplayName } from '../clients/format';
import { nextQuoteNumber } from './numbering';
import { isQuoteLocked } from '../projects/status';
import { analytics } from '../../services/analytics/AnalyticsProvider';
import { applyMarginToLines } from './pricing';
import { linesFromTemplate } from './lines';
import type { QuoteTemplate } from '../../types';

function save(quote: Quote): Quote {
  const saved = { ...quote, updatedAt: new Date().toISOString() };
  setState({ quotes: upsert(getState().quotes, saved) });
  void persist(() => storage.saveQuote(saved));
  return saved;
}

function find(id: string): Quote | undefined {
  return getState().quotes.find((q) => q.id === id);
}

function clientName(quote: Quote): string {
  return clientDisplayName(getState().clients.find((c) => c.id === quote.clientId));
}

export function updateQuote(id: string, patch: Partial<Quote>): void {
  const q = find(id);
  if (q) save({ ...q, ...patch });
}

export function addLines(quoteId: string, lines: QuoteLine[]): void {
  const q = find(quoteId);
  if (!q || isQuoteLocked(q) || lines.length === 0) return;
  save({ ...q, lines: [...q.lines, ...lines] });
}

export function updateLine(quoteId: string, lineId: string, patch: Partial<QuoteLine>): void {
  const q = find(quoteId);
  if (!q || isQuoteLocked(q)) return;
  save({ ...q, lines: q.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) });
}

export function removeLine(quoteId: string, lineId: string): void {
  const q = find(quoteId);
  if (!q || isQuoteLocked(q)) return;
  save({ ...q, lines: q.lines.filter((l) => l.id !== lineId) });
}

export function moveLine(quoteId: string, lineId: string, delta: -1 | 1): void {
  const q = find(quoteId);
  if (!q || isQuoteLocked(q)) return;
  const i = q.lines.findIndex((l) => l.id === lineId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= q.lines.length) return;
  const lines = q.lines.slice();
  [lines[i], lines[j]] = [lines[j]!, lines[i]!];
  save({ ...q, lines });
}

/** « Créer le devis » : attribue un numéro, une date et un lien client. */
export function finalizeQuote(quoteId: string): Quote | undefined {
  const q = find(quoteId);
  if (!q) return undefined;
  if (q.number) return save({ ...q, status: q.status === 'draft' ? 'ready' : q.status });
  const { settings } = getState();
  const { number, counter } = nextQuoteNumber(settings.quoteCounter);
  const newSettings = { ...settings, quoteCounter: counter };
  setState({ settings: newSettings });
  void persist(() => storage.saveSettings(newSettings));
  const saved = save({
    ...q,
    number,
    publicToken: q.publicToken ?? publicToken(),
    issueDate: new Date().toISOString(),
    status: 'ready',
  });
  logActivity(`Devis ${number} créé pour ${clientName(saved)}.`, saved.projectId);
  analytics.track('quote_created', { lines: saved.lines.length });
  return saved;
}

/** Le devis est présenté / transmis au client. */
export function markSent(quoteId: string): void {
  const q = find(quoteId);
  if (!q || !q.number) return;
  if (q.status === 'draft' || q.status === 'ready' || q.status === 'refused') {
    save({ ...q, status: 'sent', sentAt: q.sentAt ?? new Date().toISOString(), refusedAt: null });
    logActivity(`Devis ${q.number} envoyé à ${clientName(q)}.`, q.projectId);
    analytics.track('quote_sent');
  }
}

/** Le client a ouvert la page du devis. */
export function markViewed(quoteId: string): void {
  const q = find(quoteId);
  if (!q || q.status !== 'sent') return;
  save({ ...q, status: 'viewed', viewedAt: new Date().toISOString() });
  logActivity(`👀 ${clientName(q)} a consulté le devis #${q.number}.`, q.projectId, { kind: 'viewed', notify: true });
  analytics.track('quote_viewed');
}

export function markAccepted(quoteId: string, source: 'client' | 'pro'): void {
  const q = find(quoteId);
  if (!q || !q.number || q.status === 'signed') return;
  save({ ...q, status: 'accepted', acceptedAt: new Date().toISOString(), sentAt: q.sentAt ?? new Date().toISOString() });
  logActivity(
    source === 'client'
      ? `${clientName(q)} a accepté le devis ${q.number}.`
      : `Devis ${q.number} marqué comme accepté.`,
    q.projectId,
  );
}

export function markRefused(quoteId: string): void {
  const q = find(quoteId);
  if (!q || q.status === 'signed') return;
  save({ ...q, status: 'refused', refusedAt: new Date().toISOString() });
  logActivity(`Devis ${q.number ?? ''} refusé par ${clientName(q)}.`, q.projectId);
}

/** Rouvre un devis refusé / envoyé pour le modifier (le numéro est conservé). */
export function reopenQuote(quoteId: string): void {
  const q = find(quoteId);
  if (!q || q.status === 'signed') return;
  save({ ...q, status: 'ready', acceptedAt: null, refusedAt: null });
}

export async function signQuote(quoteId: string, signerName: string, imageDataUrl: string): Promise<Quote> {
  const q = find(quoteId);
  if (!q || !q.number) throw new Error('Ce devis ne peut pas être signé.');
  const signature = await signatureProvider.sign({ quote: q, signerName, imageDataUrl });
  const saved = save({
    ...q,
    status: 'signed',
    signature,
    acceptedAt: q.acceptedAt ?? signature.signedAt,
    sentAt: q.sentAt ?? signature.signedAt,
  });
  logActivity(`🎉 ${clientName(q)} vient de signer le devis #${q.number}.`, q.projectId, { kind: 'signed', notify: true });
  analytics.track('quote_signed');
  return saved;
}

export async function recordPayment(request: PaymentRequest): Promise<PaymentRecord> {
  const q = find(request.quoteId);
  if (!q) throw new Error('Devis introuvable.');
  const payment = await paymentProvider.createPayment(request);
  save({ ...q, payments: [...q.payments, payment] });
  logActivity(
    `${request.kind === 'deposit' ? 'Acompte' : 'Paiement'} reçu de ${clientName(q)}.`,
    q.projectId,
  );
  return payment;
}

export function removePayment(quoteId: string, paymentId: string): void {
  const q = find(quoteId);
  if (q) save({ ...q, payments: q.payments.filter((p) => p.id !== paymentId) });
}

export function quoteForProject(project: Project | undefined): Quote | undefined {
  if (!project?.quoteId) return undefined;
  return getState().quotes.find((q) => q.id === project.quoteId);
}

/** Recalcule les prix de vente à partir des coûts avec une marge (%) — outil « Appliquer une marge ». */
export function applyMarginToQuote(quoteId: string, marginPercent: number): void {
  const q = find(quoteId);
  if (!q || isQuoteLocked(q)) return;
  save({ ...q, lines: applyMarginToLines(q.lines, marginPercent) });
}

/** Ajoute les prestations d'un modèle au devis. Renvoie les libellés introuvables dans le catalogue. */
export function applyTemplate(quoteId: string, template: QuoteTemplate): string[] {
  const q = find(quoteId);
  if (!q || isQuoteLocked(q)) return [];
  const { lines, missing } = linesFromTemplate(template, getState().catalog);
  save({ ...q, lines: [...q.lines, ...lines], description: q.description.trim() ? q.description : template.description });
  return missing;
}
