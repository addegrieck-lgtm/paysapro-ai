import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, BadgeCheck, Download, Landmark, Loader2, PenLine, Phone, Wallet } from 'lucide-react';
import { useAppState } from '../lib/store';
import { setPublicPhotoSource, useProjectData } from '../hooks/useData';
import { QuoteDocument } from '../components/QuoteDocument';
import { SignaturePad } from '../components/SignaturePad';
import { PhotoThumb } from '../components/PhotoThumb';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Checkbox, TextArea, TextField } from '../components/ui/Form';
import { Alert, Dialog, EmptyState, useToast } from '../components/ui/Feedback';
import { LogoMark } from '../components/Logo';
import { markAccepted, markViewed, signQuote } from '../features/quotes/actions';
import { toPublicQuote, type PublicQuoteView } from '../features/quotes/publicView';
import { fetchPublicQuote, loadPublicPhoto, refusePublicQuote, signPublicQuote, type RemoteQuote } from '../features/quotes/publish';
import { CLOUD_ENABLED } from '../services/cloud/client';
import { isDemoSpace } from '../services/storage';
import { buildQuotePdf } from '../features/quotes/pdf';
import { isQuoteExpired } from '../features/projects/status';
import { paymentProvider } from '../services/payments/PaymentProvider';
import { downloadBlob } from '../lib/share';
import { formatMoney, formatPercent } from '../utils/number';
import { formatLongDate, formatTime } from '../utils/date';
import { DEFAULT_BRAND_COLOR } from '../data/defaults';

/**
 * Espace client : « Votre projet avec [Entreprise] ».
 * N'affiche que la vue publique du devis (jamais coûts, marges ni notes internes).
 *  • sur l'appareil du professionnel (« Présenter au client ») : données locales ;
 *  • via le lien public (mode cloud) : le client, sans compte, lit et signe par jeton.
 */
export function ClientQuotePage() {
  const { token } = useParams();
  const { quotes } = useAppState();
  const local = quotes.some((q) => q.publicToken === token);
  if (!local && CLOUD_ENABLED && !isDemoSpace()) return <RemoteClientQuote token={token ?? ''} />;
  return <LocalClientQuote token={token} />;
}

interface ScreenProps {
  view: PublicQuoteView;
  expired: boolean;
  /** Lien « Retour à l'application » (uniquement sur l'appareil du professionnel) */
  proBackTo: string | null;
  onAccept: () => void;
  onSign: (name: string, imageDataUrl: string) => Promise<void>;
  onRefuse?: (comment: string) => Promise<void>;
  buildPdf: () => Promise<File>;
}

function NotFound({ proBackTo, children }: { proBackTo: string | null; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      {proBackTo && <ProBar to={proBackTo} />}
      <div className="mx-auto max-w-lg p-6 pt-16">
        <EmptyState icon={<PenLine className="h-7 w-7" />} title="Devis introuvable">
          {children}
        </EmptyState>
      </div>
    </div>
  );
}

function ProBar({ to }: { to: string }) {
  return (
    <div className="no-print flex items-center justify-between gap-3 bg-ink px-4 py-2 text-sm text-bg">
      <span>Présentation au client</span>
      <Link to={to} className="inline-flex min-h-10 items-center gap-1.5 font-semibold underline-offset-2 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Retour à l’application
      </Link>
    </div>
  );
}

function LocalClientQuote({ token }: { token: string | undefined }) {
  const { quotes } = useAppState();
  const quoteRef = useMemo(() => quotes.find((q) => q.publicToken === token), [quotes, token]);
  const { project, quote, client, photos, settings } = useProjectData(quoteRef?.projectId);
  const view = useMemo(
    () => (quote && project && quote.number ? toPublicQuote({ quote, project, client, company: settings.company, photos }) : null),
    [quote, project, client, settings.company, photos],
  );

  useEffect(() => {
    if (quoteRef?.status === 'sent') markViewed(quoteRef.id);
  }, [quoteRef?.id, quoteRef?.status]);

  if (!quote || !view) {
    return (
      <NotFound proBackTo="/app">
        Ce devis n’existe pas sur cet appareil.
      </NotFound>
    );
  }
  return (
    <ClientQuoteScreen
      view={view}
      expired={isQuoteExpired(quote)}
      proBackTo={project ? `/projects/${project.id}/quote` : '/app'}
      onAccept={() => {
        if (quote.status !== 'accepted') markAccepted(quote.id, 'client');
      }}
      onSign={async (name, image) => {
        await signQuote(quote.id, name, image);
      }}
      buildPdf={() => buildQuotePdf(view, settings.quotePrefix)}
    />
  );
}

function RemoteClientQuote({ token }: { token: string }) {
  const [remote, setRemote] = useState<RemoteQuote | null>(null);
  const [status, setStatus] = useState<'loading' | 'missing' | 'error' | 'ready'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPublicQuote(token)
      .then((result) => {
        if (cancelled) return;
        if (result) setPublicPhotoSource((id, quality) => loadPublicPhoto(result.companyId, id, quality));
        setRemote(result);
        setStatus(result ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      setPublicPhotoSource(null);
    };
  }, [token, attempt]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg" aria-busy="true" aria-label="Chargement du devis">
        <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <p className="max-w-sm text-muted">Le devis n’a pas pu être chargé. Vérifiez votre connexion Internet.</p>
        <Button
          onClick={() => {
            setStatus('loading');
            setAttempt((n) => n + 1);
          }}
        >
          Réessayer
        </Button>
      </div>
    );
  }
  if (!remote) return <NotFound proBackTo={null}>Ce lien n’est pas valide ou le devis n’est plus disponible. Contactez votre paysagiste.</NotFound>;

  const { view, companyId } = remote;
  const expired = view.status !== 'signed' && view.status !== 'accepted' && !!view.validUntil && new Date(view.validUntil).getTime() < Date.now();
  return (
    <ClientQuoteScreen
      view={view}
      expired={expired}
      proBackTo={null}
      onAccept={() => undefined}
      onSign={async (name, image) => setRemote(await signPublicQuote(token, name, image))}
      onRefuse={view.status === 'sent' || view.status === 'viewed' ? async (comment) => setRemote(await refusePublicQuote(token, comment)) : undefined}
      buildPdf={() => buildQuotePdf(view, 'DEVIS', (id) => loadPublicPhoto(companyId, id, 'medium'))}
    />
  );
}

function ClientQuoteScreen({ view, expired, proBackTo, onAccept, onSign, onRefuse, buildPdf }: ScreenProps) {
  const toast = useToast();
  const [signing, setSigning] = useState(false);
  const [justSigned, setJustSigned] = useState(false);
  const [name, setName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [comment, setComment] = useState('');

  const proBar = proBackTo ? <ProBar to={proBackTo} /> : null;

  const company = view.company;
  const brand = /^#[0-9a-f]{6}$/i.test(company.brandColor) ? company.brandColor : DEFAULT_BRAND_COLOR;
  const greetingName = [view.client.firstName, view.client.lastName].filter(Boolean).join(' ') || view.client.displayName;
  const signed = !!view.signature;

  const startSigning = () => {
    onAccept();
    setName(greetingName);
    setSigning(true);
    setTimeout(() => document.getElementById('signature')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const sign = async () => {
    if (!name.trim()) return setError('Veuillez indiquer votre nom.');
    if (!signature) return setError('Veuillez dessiner votre signature.');
    if (!agree) return setError('Veuillez cocher « Je confirme accepter le devis ».');
    setBusy(true);
    try {
      await onSign(name, signature);
      setSigning(false);
      setJustSigned(true);
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La signature n’a pas pu être enregistrée. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const file = await buildPdf();
      downloadBlob(file, file.name);
    } catch {
      toast('Le PDF n’a pas pu être généré. Réessayez.', 'danger');
    } finally {
      setPdfBusy(false);
    }
  };

  // ───── Confirmation après signature ─────
  if (justSigned && view.signature) {
    return (
      <div className="min-h-dvh bg-bg">
        {proBar}
        <main className="mx-auto max-w-lg px-4 pb-16 pt-10 text-center">
          <div className="animate-in">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white" style={{ backgroundColor: brand }}>
              <BadgeCheck className="h-10 w-10" aria-hidden />
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight">Merci !</h1>
            <p className="mt-2 text-lg text-muted">Votre devis a bien été signé.</p>
            <Card className="mt-6 text-left">
              <dl className="space-y-2">
                <Info label="Entreprise" value={company.name || 'Votre paysagiste'} />
                <Info label="Projet" value={view.project.title} />
                <Info label="Montant" value={`${formatMoney(view.totals.totalTTC)} TTC`} />
                <Info label="Date" value={`${formatLongDate(view.signature.signedAt)} à ${formatTime(view.signature.signedAt)}`} />
                <Info label="Signé par" value={view.signature.signerName} />
              </dl>
            </Card>
            <p className="mt-6 text-muted">Votre artisan va maintenant pouvoir organiser votre chantier.</p>
            <div className="mt-6 grid gap-2">
              <Button onClick={downloadPdf} disabled={pdfBusy} icon={pdfBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}>
                Télécharger le devis signé
              </Button>
              <Button variant="ghost" onClick={() => setJustSigned(false)}>
                Revoir le devis
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg pb-16">
      {proBar}
      <header className="text-white" style={{ backgroundColor: brand }}>
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-5">
          <div className="flex items-center gap-3">
            {company.logoDataUrl ? (
              <img src={company.logoDataUrl} alt="" className="h-11 max-w-[130px] rounded-lg bg-white object-contain p-1" />
            ) : (
              <LogoMark className="h-10 w-10" />
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold">{company.name || 'Votre paysagiste'}</div>
              {company.phone && <div className="text-sm opacity-85">{company.phone}</div>}
            </div>
          </div>
          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] opacity-85">Votre projet avec {company.name || 'votre paysagiste'}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Bonjour {greetingName},</h1>
          <p className="mt-1 text-lg opacity-90">Voici la proposition pour votre projet : {view.project.title.toLowerCase()}.</p>
        </div>
      </header>

      <main className="mx-auto -mt-5 max-w-3xl space-y-5 px-4">
        <Card className="animate-in">
          {signed && view.signature ? (
            <div className="flex items-start gap-3">
              <BadgeCheck className="h-8 w-8 shrink-0 text-success" aria-hidden />
              <div>
                <h2 className="text-lg font-bold text-success">Devis signé</h2>
                <p className="text-ink">
                  Par {view.signature.signerName}, le {formatLongDate(view.signature.signedAt)} à {formatTime(view.signature.signedAt)}.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted">Montant total</div>
              <div className="text-3xl font-bold tabular-nums text-ink">{formatMoney(view.totals.totalTTC)} TTC</div>
              {view.totals.depositPercent > 0 && (
                <p className="text-sm text-muted">
                  dont acompte à la signature : {formatMoney(view.totals.depositAmount)} ({formatPercent(view.totals.depositPercent)})
                </p>
              )}
              {expired ? (
                <div className="mt-4">
                  <Alert tone="warning">Ce devis a dépassé sa date de validité. Contactez votre paysagiste pour une mise à jour.</Alert>
                </div>
              ) : signing ? (
                <p className="mt-4 text-sm font-semibold" style={{ color: brand }}>
                  Signez le devis en bas de page ↓
                </p>
              ) : (
                <>
                  {view.status === 'refused' ? (
                    <div className="mt-4">
                      <Alert tone="info">Vous avez refusé ce devis. Contactez votre paysagiste si vous changez d’avis.</Alert>
                    </div>
                  ) : (
                    <Button size="lg" block className="mt-4" onClick={startSigning} icon={<PenLine className="h-5 w-5" />}>
                      Accepter le devis
                    </Button>
                  )}
                  {onRefuse && (
                    <Button variant="ghost" block className="mt-1" onClick={() => setRefuseOpen(true)}>
                      Refuser le devis
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </Card>

        {view.photos.length > 0 && (
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1" aria-label="Photos du chantier">
            {view.photos.map((p) => (
              <PhotoThumb key={p.id} photoId={p.id} quality="medium" alt={p.caption || 'Photo du chantier'} className="h-40 w-56 shrink-0 snap-start rounded-2xl" />
            ))}
          </div>
        )}

        {/* Acompte */}
        {signed && view.totals.depositPercent > 0 && (
          <Card>
            <h2 className="flex items-center gap-2 font-semibold">
              <Wallet className="h-5 w-5 text-brand" aria-hidden /> Acompte
            </h2>
            <dl className="mt-2 space-y-1">
              <Info label="Acompte demandé" value={formatPercent(view.totals.depositPercent)} />
              <Info label="Montant" value={formatMoney(view.totals.depositAmount)} />
              <Info label="Statut" value={view.depositPaid ? 'Reçu' : 'En attente'} />
            </dl>
            {!view.depositPaid && (
              <Button className="mt-4" block onClick={() => setPayOpen(true)} icon={<Wallet className="h-5 w-5" />}>
                Payer l’acompte
              </Button>
            )}
          </Card>
        )}

        <QuoteDocument view={view} />

        {/* Signature */}
        {signing && !signed && (
          <Card className="border-2" >
            <div id="signature" className="scroll-mt-4" />
            <h2 className="mb-1 text-xl font-bold">Signer le devis</h2>
            <p className="mb-4 text-sm text-muted">
              Devis n° {view.number} — {formatMoney(view.totals.totalTTC)} TTC
              {view.totals.depositPercent > 0 && `, dont acompte de ${formatMoney(view.totals.depositAmount)}`}.
            </p>
            <div className="space-y-4">
              <TextField label="Nom et prénom du signataire" value={name} onChange={setName} autoComplete="name" />
              <div>
                <p className="mb-1.5 text-sm font-medium">Votre signature</p>
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
                <strong>Je confirme accepter le devis</strong> n° {view.number} et ses conditions.
              </Checkbox>
              {error && <Alert tone="danger">{error}</Alert>}
              <Button block size="lg" onClick={sign} disabled={busy} icon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PenLine className="h-5 w-5" />}>
                Valider et signer le devis
              </Button>
              <p className="text-xs leading-relaxed text-muted">
                Validation du devis par signature manuscrite sur écran : la date, l’heure, le nom et une empreinte du devis sont enregistrés. Il ne s’agit pas d’une signature électronique
                qualifiée au sens du règlement européen eIDAS.
              </p>
            </div>
          </Card>
        )}

        {signed && (
          <Button variant="secondary" block onClick={downloadPdf} disabled={pdfBusy} icon={pdfBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}>
            Télécharger le devis
          </Button>
        )}

        {company.phone && (
          <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl font-medium" style={{ color: brand }}>
            <Phone className="h-5 w-5" aria-hidden /> Une question ? Appeler {company.name || 'votre paysagiste'}
          </a>
        )}
      </main>

      <Dialog
        open={refuseOpen}
        onClose={() => setRefuseOpen(false)}
        title="Refuser le devis"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefuseOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (!onRefuse) return;
                setBusy(true);
                try {
                  await onRefuse(comment);
                  setRefuseOpen(false);
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Le refus n’a pas pu être enregistré. Réessayez.', 'danger');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirmer le refus
            </Button>
          </>
        }
      >
        <TextArea label="Un commentaire pour votre paysagiste ? (facultatif)" value={comment} onChange={setComment} rows={3} maxLength={500} />
      </Dialog>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} title="Payer l’acompte">
        <div className="space-y-4">
          <p className="text-2xl font-bold tabular-nums">{formatMoney(view.totals.depositAmount)}</p>
          {company.iban ? (
            <div className="rounded-xl bg-surface-2 p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Landmark className="h-5 w-5 text-brand" aria-hidden /> Par virement bancaire
              </p>
              <p className="mt-2 break-all text-sm">
                IBAN : <strong>{company.iban}</strong>
              </p>
              <p className="text-sm">Bénéficiaire : {company.name}</p>
              <p className="text-sm">Référence : Devis {view.number}</p>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
