import type { PublicQuoteView } from './publicView';
import { storage } from '../../services/storage';
import { analytics } from '../../services/analytics/AnalyticsProvider';
import { quoteFileName } from './numbering';

/** Génère le PDF du devis (jsPDF chargé à la demande pour garder l'application légère). */
export async function buildQuotePdf(view: PublicQuoteView, prefix: string): Promise<File> {
  const { generateQuotePdf } = await import('../../services/pdf/quotePdf');
  const blob = await generateQuotePdf({ view, loadPhoto: async (id) => (await storage.getPhoto(id))?.medium });
  analytics.track('pdf_generated');
  return new File([blob], quoteFileName(prefix, view.number), { type: 'application/pdf' });
}
