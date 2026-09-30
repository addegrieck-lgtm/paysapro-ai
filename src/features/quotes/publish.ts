// Lien public du devis (mode cloud).
//
// Côté professionnel : publication de la « vue publique » du devis (jamais coûts, marges ni notes).
// Côté client : lecture, signature et refus par jeton, via des fonctions de la base qui ne
// renvoient que cette vue publique (supabase/migrations/0003_public_quote.sql).
import type { Quote } from '../../types';
import { getState, persist } from '../../lib/store';
import { isDemoSpace, storage } from '../../services/storage';
import { CLOUD_ENABLED, supabase } from '../../services/cloud/client';
import { toPublicQuote, type PublicQuoteView } from './publicView';

/** Longueur minimale d'un jeton de lien public (24 caractères sur 32 symboles ≈ 120 bits). */
export const PUBLIC_TOKEN_MIN_LENGTH = 20;

export function canPublishOnline(): boolean {
  return CLOUD_ENABLED && !isDemoSpace() && typeof storage.publishQuote === 'function';
}

export function publicQuoteUrl(token: string): string {
  return `${window.location.origin}${window.location.pathname}#/quote/${token}`;
}

export function hasStrongToken(quote: Pick<Quote, 'publicToken'>): boolean {
  return (quote.publicToken?.length ?? 0) >= PUBLIC_TOKEN_MIN_LENGTH;
}

/** Le devis est-il dans un état où le client doit voir la dernière version ? */
export function shouldPublish(quote: Quote): boolean {
  return canPublishOnline() && !!quote.number && hasStrongToken(quote) && ['sent', 'viewed', 'accepted'].includes(quote.status);
}

/** Enregistre la vue publique du devis. Renvoie false si l'enregistrement a échoué (message affiché). */
export function publishQuote(quote: Quote): Promise<boolean> {
  const { projects, clients, photos, settings } = getState();
  const project = projects.find((p) => p.id === quote.projectId);
  if (!project || !storage.publishQuote) return Promise.resolve(false);
  const view = toPublicQuote({ quote, project, client: clients.find((c) => c.id === quote.clientId), company: settings.company, photos });
  return persist(() => storage.publishQuote!(quote.id, view));
}

// ───────────────────────── Côté client (visiteur sans compte) ─────────────────────────

export interface RemoteQuote {
  view: PublicQuoteView;
  companyId: string;
}

export class PublicQuoteError extends Error {}

const MESSAGES: Record<string, string> = {
  quote_not_found: 'Ce lien n’est plus valide.',
  quote_not_signable: 'Ce devis ne peut plus être signé. Contactez votre paysagiste.',
  quote_not_refusable: 'Ce devis ne peut plus être refusé en ligne. Contactez votre paysagiste.',
  quote_expired: 'Ce devis a dépassé sa date de validité. Contactez votre paysagiste pour une mise à jour.',
  invalid_name: 'Veuillez indiquer votre nom et votre prénom.',
  invalid_signature: 'La signature n’a pas pu être lue. Effacez-la et recommencez.',
};

async function call(fn: string, args: Record<string, unknown>): Promise<RemoteQuote | null> {
  if (!supabase) throw new PublicQuoteError('Service indisponible.');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new PublicQuoteError(MESSAGES[error.message] ?? 'Une erreur est survenue. Vérifiez votre connexion, puis réessayez.');
  const result = data as { view?: PublicQuoteView; companyId?: string } | null;
  return result?.view && result.companyId ? { view: result.view, companyId: result.companyId } : null;
}

export function fetchPublicQuote(token: string): Promise<RemoteQuote | null> {
  return call('get_public_quote', { p_token: token });
}

export async function signPublicQuote(token: string, signerName: string, imageDataUrl: string): Promise<RemoteQuote> {
  const result = await call('sign_public_quote', { p_token: token, p_signer_name: signerName.trim(), p_image: imageDataUrl });
  if (!result) throw new PublicQuoteError(MESSAGES.quote_not_found!);
  return result;
}

export async function refusePublicQuote(token: string, comment: string): Promise<RemoteQuote> {
  const result = await call('refuse_public_quote', { p_token: token, p_comment: comment });
  if (!result) throw new PublicQuoteError(MESSAGES.quote_not_found!);
  return result;
}

/** Photo d'un devis publié (bucket privé : seules les photos choisies pour ce devis sont lisibles). */
export async function loadPublicPhoto(companyId: string, photoId: string, quality: 'thumb' | 'medium'): Promise<Blob | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase.storage.from('photos').download(`${companyId}/${photoId}/${quality}`);
  return error || !data ? undefined : data;
}
