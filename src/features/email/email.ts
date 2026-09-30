// Envoi d'e-mails (devis au client, invitation d'un collègue) via la fonction serveur « send-email ».
//
// Le navigateur n'envoie qu'un identifiant : le destinataire et le texte sont déterminés côté
// serveur à partir de la base. Actif seulement si VITE_EMAIL_ENABLED vaut « true ».
import { CLOUD_ENABLED, supabase } from '../../services/cloud/client';
import { isDemoSpace } from '../../services/storage';

export function emailEnabled(): boolean {
  return CLOUD_ENABLED && !isDemoSpace() && import.meta.env?.VITE_EMAIL_ENABLED === 'true';
}

const MESSAGES: Record<string, string> = {
  not_configured: 'L’envoi d’e-mails n’est pas encore configuré.',
  forbidden: 'Vous n’avez pas le droit d’envoyer cet e-mail.',
  quote_not_published: 'Le lien du devis n’a pas pu être créé. Réessayez.',
  client_email_missing: 'Ce client n’a pas d’adresse e-mail valide : complétez sa fiche.',
  invitation_not_found: 'Invitation introuvable.',
  rate_limited: 'Limite d’envois atteinte pour aujourd’hui. Réessayez demain.',
  send_failed: 'L’e-mail n’a pas pu être envoyé. Réessayez dans un instant.',
};

export class EmailError extends Error {}

async function send(body: Record<string, string>): Promise<void> {
  if (!supabase) throw new EmailError(MESSAGES.not_configured!);
  const { data, error } = await supabase.functions.invoke('send-email', { body });
  if (!error && (data as { ok?: boolean } | null)?.ok) return;
  let code = (data as { error?: string } | null)?.error;
  // En cas de refus, supabase-js place la réponse du serveur dans error.context.
  const context = (error as { context?: Response } | null)?.context;
  if (!code && context && typeof context.json === 'function') {
    code = await context
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => undefined);
  }
  throw new EmailError((code && MESSAGES[code]) || 'L’e-mail n’a pas pu être envoyé. Vérifiez votre connexion.');
}

export function sendQuoteEmail(quoteId: string): Promise<void> {
  return send({ type: 'quote', quoteId });
}

export function sendInvitationEmail(invitationId: string): Promise<void> {
  return send({ type: 'invitation', invitationId });
}
