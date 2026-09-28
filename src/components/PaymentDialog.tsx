import { useState } from 'react';
import { Dialog, useToast } from './ui/Feedback';
import { Button } from './ui/Button';
import { NumberField, SelectField, TextField } from './ui/Form';
import { PAYMENT_METHODS } from '../services/payments/PaymentProvider';
import { recordPayment } from '../features/quotes/actions';
import type { PaymentMethod } from '../types';

/** Enregistrer un paiement reçu (acompte ou solde) — aucun prestataire de paiement requis. */
export function PaymentDialog({
  quoteId,
  kind,
  suggestedAmount,
  onClose,
}: {
  quoteId: string;
  kind: 'deposit' | 'balance';
  suggestedAmount: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState<number | null>(suggestedAmount > 0 ? suggestedAmount : null);
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open
      onClose={onClose}
      title={kind === 'deposit' ? 'Acompte reçu' : 'Paiement reçu'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={async () => {
              try {
                await recordPayment({ quoteId, kind, amount: amount ?? 0, method, reference, date: new Date(`${date}T12:00:00`).toISOString() });
                toast(kind === 'deposit' ? 'Acompte enregistré.' : 'Paiement enregistré.');
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
              }
            }}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <NumberField label="Montant reçu" suffix="€" value={amount} onChange={setAmount} requiredMessage="Veuillez renseigner un montant." />
        <SelectField label="Moyen de paiement" value={method} onChange={(v) => setMethod(v as PaymentMethod)} options={PAYMENT_METHODS} />
        <TextField label="Date" type="date" value={date} onChange={setDate} />
        <TextField label="Référence (facultatif)" value={reference} onChange={setReference} placeholder="N° de chèque, libellé du virement…" />
        {error && <p className="text-sm text-danger">{error}</p>}
        <p className="text-sm text-muted">Le paiement en ligne par carte sera proposé dans une prochaine version (nécessite un prestataire de paiement).</p>
      </div>
    </Dialog>
  );
}
