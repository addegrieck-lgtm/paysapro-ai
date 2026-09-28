import type { Client, CompanySettings, PhotoMeta, Project, Quote } from '../../types';
import type { QuoteTotals } from './pricing';
import { storage } from '../../services/storage';
import { quoteFileName } from './numbering';

/** Génère le PDF du devis (jsPDF chargé à la demande pour garder l'application légère). */
export async function buildQuotePdf(args: {
  quote: Quote;
  project: Project;
  client: Client | undefined;
  company: CompanySettings;
  totals: QuoteTotals;
  photos: PhotoMeta[];
  prefix: string;
}): Promise<File> {
  const { generateQuotePdf } = await import('../../services/pdf/quotePdf');
  const blob = await generateQuotePdf({
    ...args,
    loadPhoto: async (id) => (await storage.getPhoto(id))?.medium,
  });
  return new File([blob], quoteFileName(args.prefix, args.quote.number), { type: 'application/pdf' });
}
