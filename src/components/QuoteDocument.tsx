import type { Client, CompanySettings, PhotoMeta, Project, Quote } from '../types';
import type { QuoteTotals } from '../features/quotes/pricing';
import { clientAddress, clientDisplayName } from '../features/clients/format';
import { projectTitle } from '../features/projects/actions';
import { unitShort } from '../features/catalog/units';
import { addDays, formatDate, formatLongDate, formatTime } from '../utils/date';
import { formatMoney, formatNumber, formatPercent } from '../utils/number';
import { PhotoThumb } from './PhotoThumb';

interface Props {
  quote: Quote;
  project: Project;
  client: Client | undefined;
  company: CompanySettings;
  totals: QuoteTotals;
  photos: PhotoMeta[];
}

/** Rendu « papier » du devis : aperçu professionnel et page client. */
export function QuoteDocument({ quote, project, client, company, totals, photos }: Props) {
  const included = photos.filter((p) => quote.includedPhotoIds.includes(p.id));
  const validUntil = quote.issueDate ? addDays(quote.issueDate, quote.validityDays) : null;
  const companyCity = [company.postalCode, company.city].filter(Boolean).join(' ');

  return (
    <article className="paper overflow-hidden rounded-2xl border border-line text-[0.95rem] shadow-card">
      {/* En-tête */}
      <header className="flex flex-col gap-5 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between sm:p-8">
        <div className="min-w-0">
          {company.logoDataUrl && <img src={company.logoDataUrl} alt="" className="mb-3 max-h-16 max-w-[180px] object-contain" />}
          <div className="text-lg font-bold text-ink">{company.name || 'Votre entreprise'}</div>
          <div className="mt-1 space-y-0.5 text-sm text-muted">
            {company.address && <div>{company.address}</div>}
            {companyCity && <div>{companyCity}</div>}
            {company.phone && <div>Tél. {company.phone}</div>}
            {company.email && <div className="break-all">{company.email}</div>}
            {company.siret && <div>SIRET {company.siret}</div>}
            {company.vatNumber && !company.vatExempt && <div>TVA {company.vatNumber}</div>}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Devis</div>
          <div className="text-2xl font-bold tracking-tight text-ink">N° {quote.number ?? 'brouillon'}</div>
          <div className="mt-1 text-sm text-muted">
            <div>Date : {formatDate(quote.issueDate ?? new Date())}</div>
            {validUntil && <div>Valable jusqu’au {formatDate(validUntil)}</div>}
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 sm:p-8">
        {/* Client & projet */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-2 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Client</div>
            <div className="mt-1 font-semibold text-ink">{clientDisplayName(client)}</div>
            <div className="text-sm text-muted">{clientAddress(client)}</div>
            {client?.phone && <div className="text-sm text-muted">{client.phone}</div>}
            {client?.email && <div className="break-all text-sm text-muted">{client.email}</div>}
          </div>
          <div className="rounded-xl bg-surface-2 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Projet</div>
            <div className="mt-1 font-semibold text-ink">{projectTitle(project)}</div>
            {project.siteAddress && <div className="text-sm text-muted">Chantier : {project.siteAddress}</div>}
          </div>
        </div>

        {quote.description.trim() && (
          <section>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-brand">Description des travaux</h3>
            <p className="whitespace-pre-line text-ink">{quote.description}</p>
          </section>
        )}

        {included.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand">Photos du chantier</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {included.map((p) => (
                <figure key={p.id}>
                  <PhotoThumb photoId={p.id} quality="medium" alt={p.caption || 'Photo du chantier'} className="aspect-[4/3] w-full rounded-lg" />
                  {p.caption && <figcaption className="mt-1 text-xs text-muted">{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Prestations */}
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand">Prestations</h3>
          <div className="hidden grid-cols-[1fr_5rem_6.5rem_7rem] gap-3 border-b-2 border-ink/80 pb-2 text-xs font-semibold uppercase tracking-wider text-muted sm:grid">
            <span>Désignation</span>
            <span className="text-right">Qté</span>
            <span className="text-right">P.U. HT</span>
            <span className="text-right">Total HT</span>
          </div>
          <ul className="divide-y divide-line">
            {totals.lines.map((l) => (
              <li key={l.line.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 py-3 sm:grid-cols-[1fr_5rem_6.5rem_7rem] sm:items-baseline">
                <div className="min-w-0">
                  <div className="font-medium text-ink">{l.line.label || 'Prestation'}</div>
                  {l.line.description && <div className="text-sm text-muted">{l.line.description}</div>}
                  {l.status === 'estimated' && <div className="text-xs font-medium text-warning">Quantité estimée — à confirmer</div>}
                </div>
                <div className="col-start-1 text-sm text-muted tabular-nums sm:col-start-auto sm:text-right sm:text-ink">
                  <span className="sm:hidden">
                    {formatNumber(l.quantity)} {unitShort(l.line.unit)} × {formatMoney(l.saleUnitPrice)}
                  </span>
                  <span className="hidden sm:inline">
                    {formatNumber(l.quantity)} {unitShort(l.line.unit)}
                  </span>
                </div>
                <div className="hidden text-right tabular-nums sm:block">{formatMoney(l.saleUnitPrice)}</div>
                <div className="col-start-2 row-span-2 row-start-1 text-right font-semibold tabular-nums text-ink sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                  {formatMoney(l.saleTotal)}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Totaux */}
        <section className="ml-auto w-full max-w-sm space-y-1.5">
          <Row label="Total HT" value={formatMoney(totals.totalHT)} />
          {quote.vatExempt ? (
            <p className="text-sm text-muted">TVA non applicable, art. 293 B du CGI</p>
          ) : (
            <Row label={`TVA ${formatPercent(totals.vatRate)}`} value={formatMoney(totals.vatAmount)} />
          )}
          <div className="flex items-baseline justify-between gap-4 rounded-xl bg-brand px-4 py-3 text-white">
            <span className="font-semibold">Total TTC</span>
            <span className="text-xl font-bold tabular-nums">{formatMoney(totals.totalTTC)}</span>
          </div>
          {totals.depositPercent > 0 && (
            <>
              <Row label={`Acompte à la signature (${formatPercent(totals.depositPercent)})`} value={formatMoney(totals.depositAmount)} />
              <Row label="Solde à la fin des travaux" value={formatMoney(totals.balanceAmount)} />
            </>
          )}
        </section>

        {totals.hasEstimates && (
          <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">
            Certaines quantités sont estimées et seront confirmées par un métré sur place avant le démarrage des travaux.
          </p>
        )}

        {quote.terms.trim() && (
          <section>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-brand">Conditions</h3>
            <p className="whitespace-pre-line text-sm text-muted">{quote.terms}</p>
            {company.iban && <p className="mt-2 text-sm text-muted">Règlement par virement — IBAN : {company.iban}</p>}
          </section>
        )}

        {/* Signature */}
        <section className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <div className="text-sm text-muted">
            <div className="font-semibold text-ink">L’entreprise</div>
            {company.name}
          </div>
          <div className="text-sm">
            <div className="font-semibold text-ink">Bon pour accord — le client</div>
            {quote.signature ? (
              <div className="mt-1">
                <img src={quote.signature.imageDataUrl} alt={`Signature de ${quote.signature.signerName}`} className="h-20 max-w-[240px] object-contain" />
                <div className="text-muted">
                  Signé par {quote.signature.signerName}, le {formatLongDate(quote.signature.signedAt)} à {formatTime(quote.signature.signedAt)}
                </div>
              </div>
            ) : (
              <div className="mt-2 h-16 rounded-lg border border-dashed border-line" />
            )}
          </div>
        </section>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums text-ink">{value}</span>
    </div>
  );
}
