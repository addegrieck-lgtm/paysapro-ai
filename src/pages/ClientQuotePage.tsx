import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, BadgeCheck, Landmark, Phone, PenLine, Wallet } from 'lucide-react';
import { useAppState } from '../lib/store';
import { useProjectData } from '../hooks/useData';
import { QuoteDocument } from '../components/QuoteDocument';
import { SignaturePad } from '../components/SignaturePad';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Checkbox, TextField } from '../components/ui/Form';
import { Alert, Dialog, EmptyState } from '../components/ui/Feedback';
import { LogoMark } from '../components/Logo';
import { markAccepted, markViewed, signQuote } from '../features/quotes/actions';
import { hasDepositPaid, isQuoteExpired } from '../features/projects/status';
import { paymentProvider } from '../services/payments/PaymentProvider';
import { formatMoney, formatPercent } from '../utils/number';
import { formatLongDate, formatTime } from '../utils/date';

/**
 * Expérience client : « Votre projet paysager ».
 * MVP local : la page s'ouvre sur l'appareil du professionnel (présentation au client).
 * Avec un futur backend, la même page sera servie à l'adresse publique /quote/:token.
 */
export function ClientQuotePage() {
  const { token } = useParams();
  const { quotes } = useAppState();
  const quoteRef = useMemo(() => quotes.find((q) => q.publicToken === token), [quotes, token]);
  const { project, quote, client, photos, totals, settings } = useProjectData(quoteRef?.projectId);
  const company = settings.company;

  const [signing, setSigning] = useState(false);
  const [name, setName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    if (quoteRef?.status === 'sent') markViewed(quoteRef.id);
  }, [quoteRef?.id, quoteRef?.status]);

  const proBar = (
    <div className="no-print flex items-center justify-between gap-3 bg-ink px-4 py-2 text-sm text-bg">
      <span>Mode présentation client</span>
      <Link to={project ? `/projects/${project.id}/quote` : '/'} className="inline-flex min-h-10 items-center gap-1.5 font-semibold underline-offset-2 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Retour à l’application
      </Link>
    </div>
  );

  if (!quote || !project || !totals || !quote.number) {
    return (
      <div className="min-h-dvh bg-bg">
        {proBar}
        <div className="mx-auto max-w-lg p-6 pt-16">
          <EmptyState icon={<PenLine className="h-7 w-7" />} title="Devis introuvable">
            Ce devis n’existe pas sur cet appareil. Dans la version actuelle, les devis sont stockés localement sur l’appareil du professionnel.
          </EmptyState>
        </div>
      </div>
    );
  }

  const greetingName = client ? [client.firstName, client.lastName].filter(Boolean).join(' ') || client.companyName : '';
  const signed = quote.status === 'signed' && quote.signature;
  const expired = isQuoteExpired(quote);
  const depositPaid = hasDepositPaid(quote);

  const startSigning = () => {
    if (quote.status !== 'accepted') markAccepted(quote.id, 'client');
    setName(greetingName);
    setSigning(true);
    setTimeout(() => document.getElementById('signature')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const sign = async () => {
    if (!name.trim()) return setError('Veuillez indiquer votre nom.');
    if (!signature) return setError('Veuillez dessiner votre signature.');
    if (!agree) return setError('Veuillez cocher « Je confirme accepter le devis ».');
    setBusy(true);
    try {
      await signQuote(quote.id, name, signature);
      setSigning(false);
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La signature a échoué.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg pb-16">
      {proBar}
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          {company.logoDataUrl ? <img src={company.logoDataUrl} alt="" className="h-10 max-w-[120px] object-contain" /> : <LogoMark />}
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">{company.name || 'Votre paysagiste'}</div>
            {company.phone && <div className="text-sm text-muted">{company.phone}</div>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-6">
        <section className="animate-in">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Votre projet paysager</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Bonjour{greetingName ? ` ${greetingName}` : ''},</h1>
          <p className="mt-2 text-lg text-muted">Voici la proposition pour votre projet.</p>
        </section>

        {signed && quote.signature ? (
          <Card className="border-success/50 bg-success-soft">
            <div className="flex items-start gap-3">
              <BadgeCheck className="h-8 w-8 shrink-0 text-success" aria-hidden />
              <div>
                <h2 className="text-lg font-bold text-success">Devis signé</h2>
                <p className="text-ink">
                  Par {quote.signature.signerName}, le {formatLongDate(quote.signature.signedAt)} à {formatTime(quote.signature.signedAt)}.
                </p>
                <p className="mt-1 text-sm text-muted">Merci pour votre confiance !</p>
              </div>
            </div>
          </Card>
        ) : expired ? (
          <Alert tone="warning">Ce devis a dépassé sa date de validité. Contactez votre paysagiste pour une mise à jour.</Alert>
        ) : null}

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted">Total</div>
            <div className="text-3xl font-bold tabular-nums text-ink">{formatMoney(totals.totalTTC)} TTC</div>
          </div>
          {!signed && !expired && !signing && (
            <Button size="lg" onClick={startSigning} icon={<PenLine className="h-5 w-5" />}>
              Accepter le devis
            </Button>
          )}
          {signing && !signed && <p className="text-sm font-medium text-brand">Signez le devis en bas de page ↓</p>}
        </Card>

        {/* Acompte */}
        {signed && totals.depositPercent > 0 && (
          <Card>
            <h2 className="flex items-center gap-2 font-semibold">
              <Wallet className="h-5 w-5 text-brand" aria-hidden /> Acompte
            </h2>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between">
                <dt className="text-muted">Acompte demandé</dt>
                <dd>{formatPercent(totals.depositPercent)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Montant</dt>
                <dd className="font-semibold tabular-nums">{formatMoney(totals.depositAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Statut</dt>
                <dd className={depositPaid ? 'font-semibold text-success' : 'font-semibold text-warning'}>{depositPaid ? 'Reçu' : 'En attente'}</dd>
              </div>
            </dl>
            {!depositPaid && (
              <Button className="mt-4" block onClick={() => setPayOpen(true)} icon={<Wallet className="h-5 w-5" />}>
                Payer l’acompte
              </Button>
            )}
          </Card>
        )}

        <QuoteDocument quote={quote} project={project} client={client} company={company} totals={totals} photos={photos} />

        {/* Signature */}
        {signing && !signed && (
          <Card className="scroll-mt-4 border-brand/40" >
            <div id="signature" className="scroll-mt-4" />
            <h2 className="mb-1 text-xl font-bold">Signature du devis</h2>
            <p className="mb-4 text-sm text-muted">
              Devis n° {quote.number} — {formatMoney(totals.totalTTC)} TTC
              {totals.depositPercent > 0 && `, dont acompte de ${formatMoney(totals.depositAmount)}`}.
            </p>
            <div className="space-y-4">
              <TextField label="Nom et prénom du signataire" value={name} onChange={setName} autoComplete="name" />
              <div>
                <p className="mb-1.5 text-sm font-medium">Signature</p>
                <SignaturePad
                  onChange={(v) => {
                    setSignature(v);
                    if (v) setError(null);
                  }}
                />
              </div>
              <Checkbox
                checked={agree}
                onChange={(v) => {
                  setAgree(v);
                  if (v) setError(null);
                }}
              >
                <strong>Je confirme accepter le devis</strong> n° {quote.number} et ses conditions.
              </Checkbox>
              {error && <Alert tone="danger">{error}</Alert>}
              <Button block size="lg" onClick={sign} disabled={busy} icon={<PenLine className="h-5 w-5" />}>
                Signer le devis
              </Button>
              <p className="text-xs leading-relaxed text-muted">
                Validation du devis par signature manuscrite sur écran. La date, l’heure, le nom et une empreinte du devis sont enregistrés. Il ne
                s’agit pas d’une signature électronique qualifiée au sens du règlement européen eIDAS.
              </p>
            </div>
          </Card>
        )}

        {company.phone && (
          <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl text-brand">
            <Phone className="h-5 w-5" aria-hidden /> Une question ? Appeler {company.name || 'votre paysagiste'}
          </a>
        )}
      </main>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} title="Payer l’acompte">
        <div className="space-y-4">
          <p className="text-2xl font-bold tabular-nums">{formatMoney(totals.depositAmount)}</p>
          {company.iban ? (
            <div className="rounded-xl bg-surface-2 p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Landmark className="h-5 w-5 text-brand" aria-hidden /> Par virement bancaire
              </p>
              <p className="mt-2 break-all text-sm">
                IBAN : <strong>{company.iban}</strong>
              </p>
              <p className="text-sm">Bénéficiaire : {company.name}</p>
              <p className="text-sm">Référence : Devis {quote.number}</p>
            </div>
          ) : (
            <p className="text-muted">Votre paysagiste vous indiquera le moyen de paiement (virement, chèque…).</p>
          )}
          <Button block variant="secondary" disabled={!paymentProvider.supportsOnlinePayment}>
            Paiement par carte en ligne — disponible prochainement
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
