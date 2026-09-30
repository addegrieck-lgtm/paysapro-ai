import { useMemo, useState } from 'react';
import { Check, Download, Loader2, TriangleAlert } from 'lucide-react';
import type { Client } from '../types';
import { useAppState } from '../lib/store';
import { Alert, Dialog, useToast } from './ui/Feedback';
import { Button } from './ui/Button';
import { SelectField } from './ui/Form';
import { buildSapAttestation, SAP_DISCLAIMER, sapAttestationFileName, sapYears } from '../features/sap/sap';
import { downloadBlob } from '../lib/share';
import { formatMoney } from '../utils/number';

/** Fiche client → Documents → Attestation fiscale SAP : vérification puis génération du PDF. */
export function SapAttestationDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const { settings, projects, quotes } = useAppState();
  const toast = useToast();
  const years = useMemo(() => sapYears(quotes, client.id), [quotes, client.id]);
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const [busy, setBusy] = useState(false);
  const attestation = useMemo(
    () => buildSapAttestation({ company: settings.company, client, projects, quotes, year }),
    [settings.company, client, projects, quotes, year],
  );

  const generate = async () => {
    setBusy(true);
    try {
      const { generateSapAttestationPdf } = await import('../services/pdf/sapAttestationPdf');
      const blob = await generateSapAttestationPdf(attestation);
      const name = sapAttestationFileName(attestation);
      downloadBlob(blob, name);
      toast(`✓ ${name} téléchargé`);
      onClose();
    } catch (e) {
      console.error(e);
      toast('La génération du PDF a échoué. Réessayez.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Attestation fiscale SAP"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button disabled={!attestation.ready || busy} onClick={generate} icon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}>
            Générer le PDF
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField label="Année concernée" value={String(year)} onChange={(v) => setYear(Number(v))} options={years.map((y) => ({ value: String(y), label: String(y) }))} />

        <ul className="space-y-2">
          {attestation.checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2.5">
              {c.ok ? <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden /> : <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />}
              <div>
                <div className="font-medium">{c.label}</div>
                {!c.ok && <div className="text-sm text-warning">Information manquante : {c.detail}</div>}
              </div>
            </li>
          ))}
        </ul>

        {attestation.ready ? (
          <div className="rounded-xl bg-brand-soft p-3.5 text-brand">
            <div className="text-sm">Montant acquitté en {year} pour les prestations SAP</div>
            <div className="text-xl font-bold tabular-nums">{formatMoney(attestation.totalPaidSap)} TTC</div>
          </div>
        ) : (
          <Alert tone="warning" title="Information manquante avant génération">
            Complétez les points signalés : l’attestation n’est générée qu’à partir de données réellement enregistrées.
          </Alert>
        )}

        {attestation.ready && attestation.hasMixedQuotes && (
          <p className="text-sm text-muted">Un devis comporte aussi des prestations hors SAP : ses règlements sont répartis au prorata des prestations SAP. Vérifiez ce montant.</p>
        )}
        <p className="text-xs text-muted">{SAP_DISCLAIMER}</p>
      </div>
    </Dialog>
  );
}
