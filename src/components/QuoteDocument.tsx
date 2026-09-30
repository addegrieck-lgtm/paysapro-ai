import type { PublicQuoteView } from '../features/quotes/publicView';
import { unitShort } from '../features/catalog/units';
import { formatDate, formatLongDate, formatTime, fromInputDate } from '../utils/date';
import { formatMoney, formatNumber, formatPercent } from '../utils/number';
import { PhotoThumb } from './PhotoThumb';
import { DEFAULT_BRAND_COLOR } from '../data/defaults';

/**
 * Rendu « papier » du devis (aperçu pro, page client).
 * Il ne reçoit que la vue publique : coûts, marges et notes internes ne peuvent pas y apparaître.
 */
export function QuoteDocument({ view }: { view: PublicQuoteView }) {
  const { company, client, project, totals } = view;
  const brand = /^#[0-9a-f]{6}$/i.test(company.brandColor) ? company.brandColor : DEFAULT_BRAND_COLOR;
  const companyCity = [company.postalCode, company.city].filter(Boolean).join(' ');

  return (
    <article className="paper overflow-hidden rounded-2xl border border-line text-[0.95rem] shadow-card" style={{ ['--brand' as string]: brand }}>
      <div className="h-2" style={{ backgroundColor: brand }} aria-hidden />
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
          <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: brand }}>
            Devis
          </div>
          <div className="text-2xl font-bold tracking-tight text-ink">N° {view.number ?? 'brouillon'}</div>
          <div className="mt-1 text-sm text-muted">
            <div>Date : {formatDate(view.issueDate ?? new Date())}</div>
            {view.validUntil && <div>Valable jusqu’au {formatDate(view.validUntil)}</div>}
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 sm:p-8">
        {/* Client & projet */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-2 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Client</div>
            <div className="mt-1 font-semibold text-ink">{client.displayName}</div>
            <div className="text-sm text-muted">{client.address}</div>
            {client.phone && <div className="text-sm text-muted">{client.phone}</div>}
            {client.email && <div className="break-all text-sm text-muted">{client.email}</div>}
          </div>
          <div className="rounded-xl bg-surface-2 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Chantier</div>
            <div className="mt-1 font-semibold text-ink">{project.title}</div>
            {project.siteAddress && <div className="text-sm text-muted">{project.siteAddress}</div>}
          </div>
        </div>

        {view.description.trim() && (
          <section>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider" style={{ color: brand }}>
              Description des travaux
            </h3>
            <p className="whitespace-pre-line text-ink">{view.description}</p>
          </section>
        )}

        {view.photos.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider" style={{ color: brand }}>
              Photos du chantier
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {view.photos.map((p) => (
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
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider" style={{ color: brand }}>
            Prestations
          </h3>
          <div className="hidden grid-cols-[1fr_5rem_6.5rem_7rem] gap-3 border-b-2 border-ink/80 pb-2 text-xs font-semibold uppercase tracking-wider text-muted sm:grid">
            <span>Désignation</span>
            <span className="text-right">Qté</span>
            <span className="text-right">P.U. HT</span>
            <span className="text-right">Total HT</span>
          </div>
          <ul className="divide-y divide-line">
            {view.lines.map((l, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 py-3 sm:grid-cols-[1fr_5rem_6.5rem_7rem] sm:items-baseline">
                <div className="min-w-0">
                  <div className="font-medium text-ink">
                    {l.label}
                    {l.sap && <span className="ml-2 rounded border border-line px-1.5 py-0.5 align-middle text-[0.65rem] font-semibold uppercase tracking-wider text-muted">SAP</span>}
                  </div>
                  {l.description && <div className="text-sm text-muted">{l.description}</div>}
                  {l.estimated && <div className="text-xs font-medium text-warning">Quantité estimée — à confirmer</div>}
                </div>
                <div className="col-start-1 text-sm text-muted tabular-nums sm:col-start-auto sm:text-right sm:text-ink">
                  <span className="sm:hidden">
                    {formatNumber(l.quantity)} {unitShort(l.unit)} × {formatMoney(l.unitPrice)}
                  </span>
                  <span className="hidden sm:inline">
                    {formatNumber(l.quantity)} {unitShort(l.unit)}
                  </span>
                </div>
                <div className="hidden text-right tabular-nums sm:block">{formatMoney(l.unitPrice)}</div>
                <div className="col-start-2 row-span-2 row-start-1 text-right font-semibold tabular-nums text-ink sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                  {formatMoney(l.total)}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Totaux */}
        <section className="ml-auto w-full max-w-sm space-y-1.5">
          <Row label="Total HT" value={formatMoney(totals.totalHT)} />
          {view.vatExempt ? (
            <p className="text-sm text-muted">TVA non applicable, art. 293 B du CGI</p>
          ) : (
            <Row label={`TVA ${formatPercent(totals.vatRate)}`} value={formatMoney(totals.vatAmount)} />
          )}
          <div className="flex items-baseline justify-between gap-4 rounded-xl px-4 py-3 text-white" style={{ backgroundColor: brand }}>
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

        {view.sap && (
          <section className="rounded-xl bg-surface-2 p-4 text-sm">
            <h3 className="mb-1 font-semibold uppercase tracking-wider" style={{ color: brand }}>
              Informations SAP — services à la personne
            </h3>
            <p className="text-ink">
              Déclaration SAP n° {view.sap.number}
              {fromInputDate(view.sap.declarationDate) && <> enregistrée le {formatDate(fromInputDate(view.sap.declarationDate))}</>}
              {view.sap.activity && <> — {view.sap.activity}</>}
            </p>
            <p className="text-muted">
              Prestations concernées (marquées SAP) : {formatMoney(view.sap.totalHT)} HT, soit {formatMoney(view.sap.totalTTC)} TTC.
            </p>
            {view.sap.notes && <p className="mt-1 whitespace-pre-line text-muted">{view.sap.notes}</p>}
          </section>
        )}

        {totals.hasEstimates && (
          <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">
            Certaines quantités sont estimées et seront confirmées par un métré sur place avant le démarrage des travaux.
          </p>
        )}

        {view.terms.trim() && (
          <section>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider" style={{ color: brand }}>
              Conditions
            </h3>
            <p className="whitespace-pre-line text-sm text-muted">{view.terms}</p>
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
            {view.signature ? (
              <div className="mt-1">
                <img src={view.signature.imageDataUrl} alt={`Signature de ${view.signature.signerName}`} className="h-20 max-w-[240px] object-contain" />
                <div className="text-muted">
                  Signé par {view.signature.signerName}, le {formatLongDate(view.signature.signedAt)} à {formatTime(view.signature.signedAt)}
                </div>
              </div>
            ) : (
              <div className="mt-2 h-16 rounded-lg border border-dashed border-line" />
            )}
          </div>
        </section>

        {company.quoteFooter.trim() && <p className="border-t border-line pt-4 text-center text-xs text-muted">{company.quoteFooter}</p>}
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
