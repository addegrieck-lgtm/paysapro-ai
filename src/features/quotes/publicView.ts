// Vue PUBLIQUE d'un devis : exactement ce que le client a le droit de voir.
//
// Utilisée par la page client (/quote/:token), l'aperçu et le PDF. Elle ne contient JAMAIS :
// coût d'achat, marge, notes privées du chantier, notes internes du client, paiements détaillés,
// ni aucune donnée d'un autre client. Le jour où la page sera servie par un backend, c'est cet
// objet (et lui seul) que l'API renverra pour un jeton donné.
import type { Client, CompanySettings, PhotoMeta, Project, Quote, QuoteStatus, Unit } from '../../types';
import { computeTotals } from './pricing';
import { clientAddress, clientDisplayName } from '../clients/format';
import { categoriesText, hasDepositPaid } from '../projects/status';
import { addDays } from '../../utils/date';

export interface PublicQuoteLine {
  label: string;
  description: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  total: number;
  estimated: boolean;
}

export interface PublicQuoteView {
  token: string | null;
  number: string | null;
  status: QuoteStatus;
  issueDate: string | null;
  validUntil: string | null;
  company: Omit<CompanySettings, 'terms'>;
  client: { displayName: string; firstName: string; lastName: string; address: string; phone: string; email: string };
  project: { title: string; siteAddress: string };
  description: string;
  lines: PublicQuoteLine[];
  totals: {
    totalHT: number;
    vatRate: number;
    vatAmount: number;
    totalTTC: number;
    depositPercent: number;
    depositAmount: number;
    balanceAmount: number;
    hasEstimates: boolean;
  };
  vatExempt: boolean;
  terms: string;
  photos: Pick<PhotoMeta, 'id' | 'caption'>[];
  signature: { signerName: string; signedAt: string; imageDataUrl: string } | null;
  depositPaid: boolean;
}

export function toPublicQuote(args: {
  quote: Quote;
  project: Project;
  client: Client | undefined;
  company: CompanySettings;
  photos: PhotoMeta[];
}): PublicQuoteView {
  const { quote, project, client, company, photos } = args;
  const totals = computeTotals(quote, project);
  const { terms: _companyTerms, ...companyPublic } = company;
  return {
    token: quote.publicToken,
    number: quote.number,
    status: quote.status,
    issueDate: quote.issueDate,
    validUntil: quote.issueDate ? addDays(quote.issueDate, quote.validityDays).toISOString() : null,
    company: companyPublic,
    client: {
      displayName: clientDisplayName(client),
      firstName: client?.firstName ?? '',
      lastName: client?.lastName ?? '',
      address: clientAddress(client),
      phone: client?.phone ?? '',
      email: client?.email ?? '',
    },
    project: { title: project.title.trim() || categoriesText(project.categories), siteAddress: project.siteAddress },
    description: quote.description,
    lines: totals.lines.map((l) => ({
      label: l.line.label || 'Prestation',
      description: l.line.description,
      quantity: l.quantity,
      unit: l.line.unit,
      unitPrice: l.saleUnitPrice,
      total: l.saleTotal,
      estimated: l.status === 'estimated',
    })),
    totals: {
      totalHT: totals.totalHT,
      vatRate: totals.vatRate,
      vatAmount: totals.vatAmount,
      totalTTC: totals.totalTTC,
      depositPercent: totals.depositPercent,
      depositAmount: totals.depositAmount,
      balanceAmount: totals.balanceAmount,
      hasEstimates: totals.hasEstimates,
    },
    vatExempt: quote.vatExempt,
    terms: quote.terms,
    photos: photos.filter((p) => quote.includedPhotoIds.includes(p.id)).map((p) => ({ id: p.id, caption: p.caption })),
    signature: quote.signature
      ? { signerName: quote.signature.signerName, signedAt: quote.signature.signedAt, imageDataUrl: quote.signature.imageDataUrl }
      : null,
    depositPaid: hasDepositPaid(quote),
  };
}
