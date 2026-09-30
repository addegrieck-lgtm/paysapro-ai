// Mode SAP (services à la personne) : fonctions pures, testées (tests/sap.test.ts).
//
// Règles :
//  • rien n'est déduit : une prestation est SAP uniquement si l'entreprise l'a cochée ;
//  • aucune mention SAP si le mode est désactivé, si le numéro est absent ou si le devis ne contient
//    aucune prestation SAP ;
//  • l'attestation ne reprend que des données réellement enregistrées (paiements, dates du suivi de
//    chantier). Une donnée absente est signalée, jamais inventée.
import type { Client, CompanySettings, PaymentMethod, Project, Quote, Unit } from '../../types';
import { computeTotals } from '../quotes/pricing';
import { clientAddress, clientDisplayName } from '../clients/format';
import { categoriesText } from '../projects/status';
import { round } from '../../utils/number';

export const SAP_DISCLAIMER =
  'Document généré à partir des informations renseignées par l’entreprise. L’entreprise reste responsable de la vérification des informations et de ses obligations réglementaires.';

export const SAP_VERIFY_HINT = 'Vérifiez vos informations SAP avant de les utiliser sur vos documents.';

/** Les mentions SAP peuvent-elles apparaître sur un document ? */
export function sapActive(company: CompanySettings): boolean {
  return company.sap.enabled && company.sap.number.trim() !== '';
}

/** Informations manquantes pour des documents SAP complets (libellés affichables). */
export function sapMissingFields(company: CompanySettings): string[] {
  const { sap } = company;
  const missing: string[] = [];
  if (!sap.number.trim()) missing.push('Numéro SAP');
  if (!sap.declarationDate.trim()) missing.push('Date d’enregistrement de la déclaration');
  if (!sap.activity.trim()) missing.push('Activité SAP déclarée');
  if (!company.name.trim()) missing.push('Nom de l’entreprise');
  if (!company.address.trim() || !company.city.trim()) missing.push('Adresse de l’entreprise');
  if (!company.siret.trim()) missing.push('SIREN / SIRET');
  return missing;
}

export function hasSapLines(quote: Pick<Quote, 'lines'>): boolean {
  return quote.lines.some((l) => l.sapEligible === true);
}

export interface SapAttestationLine {
  label: string;
  quantity: number;
  unit: Unit;
  totalHT: number;
}

export interface SapAttestationPayment {
  date: string;
  method: PaymentMethod;
  /** Montant encaissé (tout le devis) */
  amount: number;
  /** Part correspondant aux prestations SAP */
  sapAmount: number;
}

export interface SapAttestationEntry {
  quoteNumber: string | null;
  projectTitle: string;
  /** Dates du suivi de chantier (AAAA-MM-JJ) ; null = non enregistrées */
  startDate: string | null;
  endDate: string | null;
  lines: SapAttestationLine[];
  sapTotalTTC: number;
  quoteTotalTTC: number;
  /** Le devis contient aussi des prestations non SAP : paiements répartis au prorata */
  mixed: boolean;
  payments: SapAttestationPayment[];
  paidSap: number;
}

export type SapCheckKey = 'client' | 'company' | 'number' | 'services' | 'interventions' | 'amounts';

export interface SapCheck {
  key: SapCheckKey;
  label: string;
  ok: boolean;
  /** Ce qui manque, quand ok = false */
  detail: string;
}

export interface SapAttestation {
  year: number;
  company: Pick<CompanySettings, 'name' | 'address' | 'postalCode' | 'city' | 'phone' | 'email' | 'siret' | 'logoDataUrl' | 'brandColor' | 'sap'>;
  client: { displayName: string; address: string };
  entries: SapAttestationEntry[];
  totalPaidSap: number;
  /** Part SAP réglée par moyen de paiement (CESU, espèces… uniquement s'ils sont enregistrés) */
  byMethod: Partial<Record<PaymentMethod, number>>;
  hasMixedQuotes: boolean;
  checks: SapCheck[];
  ready: boolean;
}

function inYear(date: string | null | undefined, year: number): boolean {
  if (!date) return false;
  const d = new Date(date);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === year;
}

/** Années proposées : année en cours + années où un paiement de ce client a été enregistré. */
export function sapYears(quotes: Quote[], clientId: string, now = new Date()): number[] {
  const years = new Set<number>([now.getFullYear()]);
  for (const q of quotes) {
    if (q.clientId !== clientId) continue;
    for (const p of q.payments) {
      const d = new Date(p.date);
      if (!Number.isNaN(d.getTime())) years.add(d.getFullYear());
    }
  }
  return [...years].sort((a, b) => b - a);
}

export function buildSapAttestation(args: {
  company: CompanySettings;
  client: Client;
  projects: Project[];
  quotes: Quote[];
  year: number;
}): SapAttestation {
  const { company, client, projects, quotes, year } = args;
  const entries: SapAttestationEntry[] = [];

  for (const quote of quotes) {
    if (quote.clientId !== client.id || !hasSapLines(quote)) continue;
    const project = projects.find((p) => p.id === quote.projectId);
    if (!project) continue;
    const yearPayments = quote.payments.filter((p) => inYear(p.date, year));
    const work = project.work;
    const workedInYear = inYear(work?.startDate, year) || inYear(work?.endDate, year);
    if (yearPayments.length === 0 && !workedInYear) continue;

    const totals = computeTotals(quote, project);
    const sapLines = totals.lines.filter((l) => l.line.sapEligible === true);
    const sapHT = round(sapLines.reduce((s, l) => s + l.saleTotal, 0));
    const ratio = totals.totalHT > 0 ? sapHT / totals.totalHT : 0;
    const payments = yearPayments
      .map((p) => ({ date: p.date, method: p.method, amount: p.amount, sapAmount: round(p.amount * ratio) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    entries.push({
      quoteNumber: quote.number,
      projectTitle: project.title.trim() || categoriesText(project.categories),
      startDate: work?.startDate ?? null,
      endDate: work?.endDate ?? null,
      lines: sapLines.map((l) => ({ label: l.line.label || 'Prestation', quantity: l.quantity, unit: l.line.unit, totalHT: l.saleTotal })),
      sapTotalTTC: round(totals.totalTTC * ratio),
      quoteTotalTTC: totals.totalTTC,
      mixed: sapLines.length < totals.lines.length,
      payments,
      paidSap: round(payments.reduce((s, p) => s + p.sapAmount, 0)),
    });
  }

  const byMethod: Partial<Record<PaymentMethod, number>> = {};
  for (const e of entries) for (const p of e.payments) byMethod[p.method] = round((byMethod[p.method] ?? 0) + p.sapAmount);
  const totalPaidSap = round(entries.reduce((s, e) => s + e.paidSap, 0));

  const name = clientDisplayName(client);
  const address = clientAddress(client);
  const clientMissing = [
    !client.firstName.trim() && !client.lastName.trim() && !client.companyName.trim() ? 'nom du client' : '',
    !client.address.trim() || !client.city.trim() ? 'adresse du client' : '',
  ].filter(Boolean);
  const companyMissing = [
    !company.sap.enabled ? 'mode SAP désactivé' : '',
    !company.name.trim() ? 'nom de l’entreprise' : '',
    !company.address.trim() || !company.city.trim() ? 'adresse de l’entreprise' : '',
    !company.siret.trim() ? 'SIREN / SIRET' : '',
  ].filter(Boolean);
  const numberMissing = [
    !company.sap.number.trim() ? 'numéro SAP' : '',
    !company.sap.declarationDate.trim() ? 'date d’enregistrement' : '',
  ].filter(Boolean);
  const paidEntries = entries.filter((e) => e.payments.length > 0);
  const undated = paidEntries.filter((e) => !e.startDate);

  const clientHasSapLines = quotes.some((q) => q.clientId === client.id && hasSapLines(q));
  const checks: SapCheck[] = [
    { key: 'client', label: 'Client identifié', ok: clientMissing.length === 0, detail: clientMissing.join(', ') },
    { key: 'company', label: 'Entreprise SAP configurée', ok: companyMissing.length === 0, detail: companyMissing.join(', ') },
    { key: 'number', label: 'Numéro SAP renseigné', ok: numberMissing.length === 0, detail: numberMissing.join(', ') },
    {
      key: 'services',
      label: 'Prestations SAP identifiées',
      ok: clientHasSapLines,
      detail: 'aucune prestation marquée SAP dans les devis de ce client',
    },
    {
      key: 'interventions',
      label: 'Interventions enregistrées',
      ok: paidEntries.length > 0 && undated.length === 0,
      detail:
        undated.length > 0
          ? `dates d’intervention absentes du suivi de chantier (${undated.map((e) => e.projectTitle).join(', ')})`
          : `aucune intervention enregistrée en ${year}`,
    },
    { key: 'amounts', label: 'Montants enregistrés', ok: totalPaidSap > 0, detail: `aucun paiement enregistré en ${year}` },
  ];

  return {
    year,
    company: {
      name: company.name,
      address: company.address,
      postalCode: company.postalCode,
      city: company.city,
      phone: company.phone,
      email: company.email,
      siret: company.siret,
      logoDataUrl: company.logoDataUrl,
      brandColor: company.brandColor,
      sap: company.sap,
    },
    client: { displayName: name, address },
    entries,
    totalPaidSap,
    byMethod,
    hasMixedQuotes: entries.some((e) => e.mixed && e.payments.length > 0),
    checks,
    ready: checks.every((c) => c.ok),
  };
}

export function sapAttestationFileName(a: SapAttestation): string {
  const slug = a.client.displayName
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return `attestation-sap-${a.year}-${slug || 'client'}.pdf`;
}
