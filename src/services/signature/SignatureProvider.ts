// Abstraction de la signature du devis.
//
// MVP : LocalSignatureProvider — le client dessine sa signature sur l'appareil du professionnel,
// coche « Je confirme accepter le devis », et l'application enregistre nom, date, heure, image
// et une empreinte SHA-256 du contenu du devis signé.
// ⚠️ Il s'agit d'une validation / signature simple du devis, PAS d'une signature électronique
// qualifiée au sens du règlement eIDAS. Pour cela, brancher plus tard un prestataire conforme
// (Yousign, Docusign…) via ElectronicSignatureProvider — nécessite un backend.
import type { Quote, SignatureRecord } from '../../types';

export interface SignatureRequest {
  quote: Quote;
  signerName: string;
  imageDataUrl: string;
}

export interface SignatureProvider {
  readonly id: 'local' | 'electronic';
  readonly label: string;
  readonly available: boolean;
  sign(request: SignatureRequest): Promise<SignatureRecord>;
}

/** Contenu du devis qui fait foi (ordre stable) : sert au calcul de l'empreinte. */
export function canonicalQuoteContent(quote: Quote): string {
  return JSON.stringify({
    number: quote.number,
    issueDate: quote.issueDate,
    clientId: quote.clientId,
    description: quote.description,
    lines: quote.lines.map((l) => [l.label, l.unit, l.quantityRule, l.measureRef, l.manualQuantity, l.wastePercent, l.thicknessCm, l.unitPrice]),
    marginPercent: quote.marginPercent,
    vatRate: quote.vatRate,
    vatExempt: quote.vatExempt,
    depositPercent: quote.depositPercent,
    terms: quote.terms,
  });
}

export async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return 'indisponible';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export class LocalSignatureProvider implements SignatureProvider {
  readonly id = 'local' as const;
  readonly label = 'Validation du devis sur l’appareil (signature simple)';
  readonly available = true;

  async sign({ quote, signerName, imageDataUrl }: SignatureRequest): Promise<SignatureRecord> {
    const name = signerName.trim();
    if (!name) throw new Error('Veuillez indiquer le nom du signataire.');
    if (!imageDataUrl.startsWith('data:image/')) throw new Error('Veuillez dessiner votre signature.');
    return {
      provider: 'local',
      signerName: name,
      signedAt: new Date().toISOString(),
      imageDataUrl,
      contentHash: await sha256Hex(canonicalQuoteContent(quote)),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
  }
}

/** Réservé à un futur prestataire de signature électronique conforme (non disponible dans le MVP). */
export class FutureElectronicSignatureProvider implements SignatureProvider {
  readonly id = 'electronic' as const;
  readonly label = 'Signature électronique avancée (disponible prochainement)';
  readonly available = false;

  async sign(): Promise<SignatureRecord> {
    throw new Error('La signature électronique certifiée sera disponible dans une prochaine version.');
  }
}

export const signatureProvider: SignatureProvider = new LocalSignatureProvider();
