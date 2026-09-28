// Abstraction des paiements (acompte, solde).
//
// MVP : ManualPaymentProvider — le professionnel enregistre un paiement reçu (virement, chèque,
// espèces…). Aucun compte Stripe n'est nécessaire.
// Plus tard : StripeProvider (paiement en ligne) — nécessite un backend pour la clé secrète
// et les webhooks ; impossible à faire proprement depuis GitHub Pages seul.
import type { PaymentMethod, PaymentRecord } from '../../types';
import { uid } from '../../utils/id';

export interface PaymentRequest {
  quoteId: string;
  kind: 'deposit' | 'balance';
  amount: number;
  method: PaymentMethod;
  reference?: string;
  date?: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface PaymentProvider {
  readonly id: string;
  readonly label: string;
  /** Paiement en ligne par le client (carte) disponible ? */
  readonly supportsOnlinePayment: boolean;
  createPayment(request: PaymentRequest): Promise<PaymentRecord>;
  getPaymentStatus(payment: PaymentRecord): Promise<PaymentStatus>;
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'transfer', label: 'Virement' },
  { value: 'check', label: 'Chèque' },
  { value: 'cash', label: 'Espèces' },
  { value: 'card', label: 'Carte (TPE)' },
  { value: 'other', label: 'Autre' },
];

export function paymentMethodLabel(m: PaymentMethod): string {
  return PAYMENT_METHODS.find((x) => x.value === m)?.label ?? '';
}

function validate(request: PaymentRequest) {
  if (!Number.isFinite(request.amount) || request.amount <= 0) {
    throw new Error('Veuillez renseigner un montant supérieur à 0.');
  }
}

/** Enregistrement manuel d'un paiement reçu : réel, sans intermédiaire. */
export class ManualPaymentProvider implements PaymentProvider {
  readonly id = 'manual';
  readonly label = 'Paiement enregistré manuellement';
  readonly supportsOnlinePayment = false;

  async createPayment(request: PaymentRequest): Promise<PaymentRecord> {
    validate(request);
    return {
      id: uid(),
      kind: request.kind,
      amount: Math.round(request.amount * 100) / 100,
      method: request.method,
      date: request.date ?? new Date().toISOString(),
      provider: this.id,
      reference: request.reference?.trim() ?? '',
    };
  }

  async getPaymentStatus(): Promise<PaymentStatus> {
    return 'paid'; // un paiement manuel n'est enregistré qu'une fois reçu
  }
}

/** Fournisseur fictif pour les tests automatisés et les démonstrations. */
export class MockPaymentProvider implements PaymentProvider {
  readonly id = 'mock';
  readonly label = 'Paiement simulé (démonstration)';
  readonly supportsOnlinePayment = false;
  private statuses = new Map<string, PaymentStatus>();

  async createPayment(request: PaymentRequest): Promise<PaymentRecord> {
    validate(request);
    const record: PaymentRecord = {
      id: uid(),
      kind: request.kind,
      amount: request.amount,
      method: request.method,
      date: request.date ?? new Date().toISOString(),
      provider: this.id,
      reference: 'SIMULATION',
    };
    this.statuses.set(record.id, 'paid');
    return record;
  }

  async getPaymentStatus(payment: PaymentRecord): Promise<PaymentStatus> {
    return this.statuses.get(payment.id) ?? 'pending';
  }
}

export const paymentProvider: PaymentProvider = new ManualPaymentProvider();
