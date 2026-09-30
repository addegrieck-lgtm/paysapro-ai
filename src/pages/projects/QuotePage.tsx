import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  BadgeCheck,
  Download,
  Hammer,
  Loader2,
  MessageSquare,
  MonitorSmartphone,
  Pencil,
  RotateCcw,
  Send,
  Settings2,
  Share2,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useProjectData } from '../../hooks/useData';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge, Card, CardTitle } from '../../components/ui/Card';
import { Button, ButtonLink } from '../../components/ui/Button';
import { NumberField, SelectField, TextArea } from '../../components/ui/Form';
import { Alert, ConfirmDialog, Dialog, useToast } from '../../components/ui/Feedback';
import { QuoteDocument } from '../../components/QuoteDocument';
import { FollowUpDialog } from '../../components/FollowUpDialog';
import { NotFoundPage } from '../NotFoundPage';
import { finalizeQuote, markAccepted, markRefused, markSent, reopenQuote, updateQuote } from '../../features/quotes/actions';
import { buildQuotePdf } from '../../features/quotes/pdf';
import { toPublicQuote } from '../../features/quotes/publicView';
import { QuoteFlowBar } from '../../components/QuoteFlowBar';
import { startWork } from '../../features/projects/actions';
import { isQuoteLocked, QUOTE_STATUS } from '../../features/projects/status';
import { clientDisplayName } from '../../features/clients/format';
import { canShareFiles, downloadBlob, shareNative } from '../../lib/share';
import { formatMoney } from '../../utils/number';
import { formatLongDate, formatTime } from '../../utils/date';
import { hasSapLines, sapMissingFields } from '../../features/sap/sap';

export function QuotePage() {
  const { id } = useParams();
  const { project, quote, client, photos, totals, settings } = useProjectData(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmRefuse, setConfirmRefuse] = useState(false);
  const view = useMemo(
    () => (project && quote ? toPublicQuote({ quote, project, client, company: settings.company, photos }) : null),
    [project, quote, client, settings.company, photos],
  );

  if (!project || !quote || !totals || !view) return <NotFoundPage />;
  const locked = isQuoteLocked(quote);
  const status = QUOTE_STATUS[quote.status];

  if (!quote.number) {
    return (
      <div className="space-y-5">
        <PageHeader back={`/projects/${project.id}`} title="Devis" subtitle={clientDisplayName(client)} />
        <Alert tone="info" title="Le devis n’est pas encore créé">
          Ajoutez vos prestations, vérifiez l’estimation, puis cliquez sur « Créer le devis ».
        </Alert>
        {quote.lines.length > 0 && totals.missingCount === 0 ? (
          <Button block size="lg" onClick={() => finalizeQuote(quote.id)}>
            Créer le devis
          </Button>
        ) : (
          <ButtonLink to={`/projects/${project.id}/services`} block size="lg">
            Aller aux prestations
          </ButtonLink>
        )}
      </div>
    );
  }

  const pdf = async () => {
    setPdfBusy(true);
    try {
      return await buildQuotePdf(view, settings.quotePrefix);
    } catch (e) {
      console.error(e);
      toast('La génération du PDF a échoué. Réessayez.', 'danger');
      return null;
    } finally {
      setPdfBusy(false);
    }
  };

  // Mode SAP : avertir avant génération si les informations nécessaires sont incomplètes
  const sapConcerned = settings.company.sap.enabled && hasSapLines(quote);
  const sapMissing = sapConcerned ? sapMissingFields(settings.company) : [];

  const download = async () => {
    if (sapMissing.length > 0) toast(view.sap ? 'Informations SAP incomplètes : vérifiez-les avant d’envoyer.' : 'Numéro SAP absent : PDF généré sans mention SAP.', 'info');
    const file = await pdf();
    if (file) {
      downloadBlob(file, file.name);
      toast(`✓ ${file.name} téléchargé`);
    }
  };

  const presentToClient = () => {
    markSent(quote.id);
    navigate(`/quote/${quote.publicToken}`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        back={`/projects/${project.id}`}
        title={`Devis ${quote.number}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {clientDisplayName(client)} · {formatMoney(totals.totalTTC)} TTC <Badge tone={status.tone}>{status.label}</Badge>
          </span>
        }
      />
      <QuoteFlowBar current={quote.sentAt ? 'send' : 'quote'} projectId={project.id} quote={quote} />

      {/* Actions principales */}
      <div className="no-print grid grid-cols-3 gap-2">
        <Button variant="secondary" disabled={locked} onClick={() => setEditOpen(true)} icon={<Pencil className="h-5 w-5" />} className="flex-col gap-1! py-2 text-sm">
          Modifier
        </Button>
        <Button variant="secondary" disabled={pdfBusy} onClick={download} icon={pdfBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />} className="flex-col gap-1! py-2 text-sm">
          PDF
        </Button>
        <Button onClick={() => setSendOpen(true)} icon={<Send className="h-5 w-5" />} className="flex-col gap-1! py-2 text-sm">
          Envoyer
        </Button>
      </div>

      {/* Suivi commercial */}
      {quote.status === 'signed' && quote.signature ? (
        <Card className="border-success/40">
          <CardTitle icon={<BadgeCheck className="h-5 w-5" />}>✅ Devis signé</CardTitle>
          <p className="text-muted">
            Par <strong className="text-ink">{quote.signature.signerName}</strong> le {formatLongDate(quote.signature.signedAt)} à {formatTime(quote.signature.signedAt)}.
          </p>
          <p className="mt-1 text-xs text-muted">Validation simple du devis (signature non qualifiée au sens eIDAS). Empreinte du contenu : {quote.signature.contentHash.slice(0, 16)}…</p>
          <div className="mt-4">
            {project.work ? (
              <ButtonLink to={`/projects/${project.id}/work`} block icon={<Hammer className="h-5 w-5" />}>
                Suivre le chantier
              </ButtonLink>
            ) : (
              <Button
                block
                size="lg"
                icon={<Hammer className="h-5 w-5" />}
                onClick={() => {
                  startWork(project.id);
                  navigate(`/projects/${project.id}/work`);
                }}
              >
                Transformer en chantier
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="no-print">
          <CardTitle>Suivi du devis</CardTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="soft" icon={<MonitorSmartphone className="h-5 w-5" />} onClick={presentToClient}>
              Présenter au client
            </Button>
            {(quote.status === 'sent' || quote.status === 'viewed') && (
              <Button variant="soft" icon={<MessageSquare className="h-5 w-5" />} onClick={() => setFollowUp(true)}>
                Relancer le client
              </Button>
            )}
            {quote.status !== 'accepted' && quote.status !== 'refused' && (
              <Button variant="soft" icon={<ThumbsUp className="h-5 w-5" />} onClick={() => markAccepted(quote.id, 'pro')}>
                Accepté (accord oral)
              </Button>
            )}
            {quote.status === 'accepted' && (
              <>
                <Button variant="soft" icon={<Hammer className="h-5 w-5" />} disabled={!!project.work} onClick={() => { startWork(project.id); navigate(`/projects/${project.id}/work`); }}>
                  Transformer en chantier
                </Button>
                <Button variant="secondary" icon={<RotateCcw className="h-5 w-5" />} onClick={() => reopenQuote(quote.id)}>
                  Annuler l’acceptation
                </Button>
              </>
            )}
            {quote.status === 'refused' ? (
              <Button variant="secondary" icon={<RotateCcw className="h-5 w-5" />} onClick={() => reopenQuote(quote.id)}>
                Rouvrir le devis
              </Button>
            ) : (
              quote.status !== 'accepted' && (
                <Button variant="secondary" icon={<X className="h-5 w-5" />} onClick={() => setConfirmRefuse(true)}>
                  Refusé par le client
                </Button>
              )
            )}
          </div>
          {quote.status === 'accepted' && (
            <p className="mt-3 text-sm text-muted">Pour faire signer le devis, utilisez « Présenter au client ».</p>
          )}
        </Card>
      )}

      {sapConcerned && (
        <Card className="no-print">
          <CardTitle>Informations SAP</CardTitle>
          {view.sap ? (
            <p className="text-sm text-muted">
              Ce devis contient {quote.lines.filter((l) => l.sapEligible).length} prestation(s) SAP pour {formatMoney(view.sap.totalTTC)} TTC. La déclaration n° {view.sap.number} est imprimée sur le devis et son PDF.
            </p>
          ) : (
            <p className="text-sm text-muted">Ce devis contient des prestations SAP, mais aucune mention SAP n’est imprimée tant que le numéro SAP n’est pas renseigné.</p>
          )}
          {sapMissing.length > 0 && (
            <div className="mt-3">
              <Alert tone="warning" title="Information manquante avant génération">
                {sapMissing.join(' · ')}.{' '}
                <a className="font-semibold underline" href="#/company">
                  Compléter les informations SAP
                </a>
              </Alert>
            </div>
          )}
        </Card>
      )}

      <QuoteDocument view={view} />

      {!settings.company.name && (
        <Alert tone="warning">
          Les informations de votre entreprise ne sont pas renseignées.{' '}
          <a className="font-semibold underline" href="#/company">
            Compléter mon profil
          </a>
        </Alert>
      )}

      {/* Envoi */}
      <Dialog open={sendOpen} onClose={() => setSendOpen(false)} title="Envoyer le devis">
        <div className="space-y-3">
          <Button block size="lg" icon={<MonitorSmartphone className="h-5 w-5" />} onClick={presentToClient}>
            Présenter au client sur cet appareil
          </Button>
          <p className="-mt-1 text-sm text-muted">Le client consulte le devis, l’accepte et signe directement sur votre téléphone ou tablette.</p>
          <Button
            block
            variant="soft"
            disabled={pdfBusy}
            icon={pdfBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
            onClick={async () => {
              const file = await pdf();
              if (!file) return;
              if (canShareFiles(file)) {
                if (await shareNative({ files: [file], title: file.name, text: `Devis ${quote.number}` })) {
                  markSent(quote.id);
                  setSendOpen(false);
                }
              } else {
                downloadBlob(file, file.name);
                markSent(quote.id);
                toast('PDF téléchargé : joignez-le à votre e-mail.');
              }
            }}
          >
            {typeof navigator !== 'undefined' && 'share' in navigator ? 'Partager le PDF (e-mail, WhatsApp…)' : 'Télécharger le PDF à envoyer'}
          </Button>
          <Button
            block
            variant="soft"
            icon={<MessageSquare className="h-5 w-5" />}
            onClick={() => {
              setSendOpen(false);
              setFollowUp(true);
            }}
          >
            Écrire un message au client
          </Button>
          <Button block variant="secondary" disabled>
            Lien public en ligne — disponible prochainement
          </Button>
          <p className="text-xs text-muted">
            Le lien public (/quote/{quote.publicToken}) nécessitera la future version en ligne : aujourd’hui, vos données restent sur cet appareil.
          </p>
        </div>
      </Dialog>

      {followUp && (
        <FollowUpDialog
          open
          onClose={() => setFollowUp(false)}
          client={client}
          company={settings.company}
          quoteNumber={quote.number}
          total={formatMoney(totals.totalTTC)}
          initialTemplate={quote.sentAt ? 'followup' : 'send'}
          onUsed={() => markSent(quote.id)}
        />
      )}

      {editOpen && <QuoteSettingsDialog quoteId={quote.id} projectId={project.id} onClose={() => setEditOpen(false)} />}

      <ConfirmDialog
        open={confirmRefuse}
        title="Marquer le devis comme refusé ?"
        message={<p>Vous pourrez le rouvrir plus tard pour le modifier.</p>}
        confirmLabel="Marquer refusé"
        onClose={() => setConfirmRefuse(false)}
        onConfirm={() => {
          markRefused(quote.id);
          setConfirmRefuse(false);
        }}
      />
    </div>
  );
}

function QuoteSettingsDialog({ quoteId, projectId, onClose }: { quoteId: string; projectId: string; onClose: () => void }) {
  const { quote, settings } = useProjectData(projectId);
  const navigate = useNavigate();
  const [description, setDescription] = useState(quote?.description ?? '');
  const [terms, setTerms] = useState(quote?.terms ?? '');
  const [validity, setValidity] = useState<number | null>(quote?.validityDays ?? 30);
  const [deposit, setDeposit] = useState<number | null>(quote?.depositPercent ?? 30);
  const [vat, setVat] = useState(String(quote?.vatRate ?? 20));
  if (!quote) return null;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Modifier le devis"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              updateQuote(quoteId, {
                description: description.trim(),
                terms: terms.trim(),
                validityDays: Math.max(1, Math.round(validity ?? 30)),
                depositPercent: deposit ?? 0,
                vatRate: Number(vat),
              });
              onClose();
            }}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Button variant="soft" block icon={<Settings2 className="h-5 w-5" />} onClick={() => navigate(`/projects/${projectId}/services`)}>
          Modifier les prestations et la marge
        </Button>
        <TextArea label="Description des travaux" value={description} onChange={setDescription} rows={4} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Validité" suffix="jours" value={validity} onChange={setValidity} min={1} />
          <NumberField label="Acompte" suffix="%" max={100} value={deposit} onChange={setDeposit} />
          {!settings.company.vatExempt && (
            <SelectField
              label="Taux de TVA"
              value={vat}
              onChange={setVat}
              className="col-span-2"
              options={[
                { value: '20', label: '20 % (taux normal)' },
                { value: '10', label: '10 % (taux intermédiaire)' },
                { value: '5.5', label: '5,5 % (taux réduit)' },
                { value: '0', label: '0 %' },
              ]}
            />
          )}
        </div>
        <TextArea label="Conditions" value={terms} onChange={setTerms} rows={5} />
      </div>
    </Dialog>
  );
}
