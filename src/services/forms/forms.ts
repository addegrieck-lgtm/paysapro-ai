// Formulaires publics : inscription bêta, contact, feedback.
//
//   BetaLeadProvider  ├── LocalBetaLeadProvider (bêta)   └── SupabaseBetaLeadProvider (futur)
//   ContactProvider   ├── LocalContactProvider  (bêta)   └── (futur : table / e-mail transactionnel)
//
// GitHub Pages n'a pas de serveur : une inscription faite sur le téléphone d'un prospect est
// enregistrée sur SON appareil. Pour que l'équipe la reçoive réellement, deux options gratuites :
//  1. VITE_CONTACT_EMAIL : l'utilisateur est invité à envoyer sa demande par e-mail (pré-rempli) ;
//  2. brancher plus tard SupabaseBetaLeadProvider (insertion dans une table, clé publique + RLS).
// Aucun identifiant ni secret n'est placé dans le code.
import type { BetaLead, ContactMessage, FeedbackEntry } from '../../types';
import { storage } from '../storage';
import { uid } from '../../utils/id';
import { isValidEmail } from '../../utils/validation';
import { APP_CONFIG } from '../../config/app';

export interface SubmitResult {
  /** Enregistré sur cet appareil */
  storedLocally: boolean;
  /** Transmis à l'équipe Paysapro (faux tant qu'aucun backend n'est branché) */
  delivered: boolean;
  /** Lien e-mail pré-rempli pour transmettre la demande, si une adresse est configurée */
  mailto: string | null;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Nettoie une saisie : espaces superflus, caractères de contrôle, longueur maximale. */
export function sanitize(value: string, max = 2000): string {
  return value
    // eslint-disable-next-line no-control-regex -- on retire volontairement les caractères de contrôle
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

// ───────────── Inscription bêta ─────────────

export type BetaLeadInput = Omit<BetaLead, 'id' | 'createdAt'>;

export function emptyLead(): BetaLeadInput {
  return {
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    activity: '',
    teamSize: '',
    quotesPerMonth: '',
    currentSoftware: '',
    mainProblem: '',
    comment: '',
  };
}

export function validateLead(input: BetaLeadInput): FieldErrors<BetaLeadInput> {
  const errors: FieldErrors<BetaLeadInput> = {};
  if (!sanitize(input.firstName)) errors.firstName = 'Veuillez indiquer votre prénom.';
  if (!sanitize(input.lastName)) errors.lastName = 'Veuillez indiquer votre nom.';
  if (!sanitize(input.email)) errors.email = 'Veuillez indiquer votre e-mail.';
  else if (!isValidEmail(input.email)) errors.email = 'Adresse e-mail invalide.';
  if (input.phone && !/^[\d\s+().-]{6,20}$/.test(input.phone.trim())) errors.phone = 'Numéro de téléphone invalide.';
  return errors;
}

function mailtoFor(subject: string, lines: [string, string][]): string | null {
  if (!APP_CONFIG.contactEmail) return null;
  const body = lines.filter(([, v]) => v).map(([k, v]) => `${k} : ${v}`).join('\n');
  return `mailto:${encodeURIComponent(APP_CONFIG.contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export interface BetaLeadProvider {
  submit(input: BetaLeadInput): Promise<SubmitResult>;
  list(): Promise<BetaLead[]>;
}

export class LocalBetaLeadProvider implements BetaLeadProvider {
  async submit(input: BetaLeadInput): Promise<SubmitResult> {
    const clean = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, sanitize(v, 1000)])) as BetaLeadInput;
    const lead: BetaLead = { ...clean, id: uid(), createdAt: new Date().toISOString() };
    await storage.addRecord('leads', lead);
    return {
      storedLocally: true,
      delivered: false,
      mailto: mailtoFor(`Inscription bêta Paysapro AI — ${lead.company || `${lead.firstName} ${lead.lastName}`}`, [
        ['Prénom', lead.firstName],
        ['Nom', lead.lastName],
        ['Entreprise', lead.company],
        ['E-mail', lead.email],
        ['Téléphone', lead.phone],
        ['Activité', lead.activity],
        ['Taille de l’équipe', lead.teamSize],
        ['Devis par mois', lead.quotesPerMonth],
        ['Logiciel actuel', lead.currentSoftware],
        ['Principal problème', lead.mainProblem],
        ['Commentaire', lead.comment],
      ]),
    };
  }
  list(): Promise<BetaLead[]> {
    return storage.getRecords('leads');
  }
}

/** Futur : insertion dans une table Supabase « beta_leads » (clé publique + politique d'insertion RLS). */
export class SupabaseBetaLeadProvider implements BetaLeadProvider {
  async submit(): Promise<SubmitResult> {
    throw new Error('Collecte en ligne non configurée.');
  }
  async list(): Promise<BetaLead[]> {
    return [];
  }
}

export const betaLeads: BetaLeadProvider = new LocalBetaLeadProvider();

// ───────────── Contact ─────────────

export type ContactInput = Omit<ContactMessage, 'id' | 'createdAt'>;

export function validateContact(input: ContactInput): FieldErrors<ContactInput> {
  const errors: FieldErrors<ContactInput> = {};
  if (!sanitize(input.name)) errors.name = 'Veuillez indiquer votre nom.';
  if (!isValidEmail(input.email) || !input.email.trim()) errors.email = 'Adresse e-mail invalide.';
  if (sanitize(input.message).length < 5) errors.message = 'Votre message est trop court.';
  return errors;
}

export interface ContactProvider {
  send(input: ContactInput): Promise<SubmitResult>;
}

export class LocalContactProvider implements ContactProvider {
  async send(input: ContactInput): Promise<SubmitResult> {
    const msg: ContactMessage = {
      id: uid(),
      name: sanitize(input.name, 200),
      email: sanitize(input.email, 200),
      message: sanitize(input.message, 5000),
      createdAt: new Date().toISOString(),
    };
    await storage.addRecord('messages', msg);
    return {
      storedLocally: true,
      delivered: false,
      mailto: mailtoFor('Question — Paysapro AI', [
        ['Nom', msg.name],
        ['E-mail', msg.email],
        ['Message', msg.message],
      ]),
    };
  }
}

export const contact: ContactProvider = new LocalContactProvider();

// ───────────── Feedback produit ─────────────

export type FeedbackInput = Omit<FeedbackEntry, 'id' | 'createdAt'>;

export async function submitFeedback(input: FeedbackInput): Promise<SubmitResult> {
  const entry: FeedbackEntry = {
    id: uid(),
    rating: input.rating !== null && input.rating >= 1 && input.rating <= 5 ? Math.round(input.rating) : null,
    likes: sanitize(input.likes),
    missing: sanitize(input.missing),
    timeWasters: sanitize(input.timeWasters),
    wishedFeature: sanitize(input.wishedFeature),
    createdAt: new Date().toISOString(),
  };
  await storage.addRecord('feedback', entry);
  return {
    storedLocally: true,
    delivered: false,
    mailto: mailtoFor('Avis sur Paysapro AI', [
      ['Note', entry.rating ? `${entry.rating}/5` : ''],
      ['Ce que j’aime', entry.likes],
      ['Ce qui me manque', entry.missing],
      ['Ce qui me fait perdre du temps', entry.timeWasters],
      ['Fonctionnalité souhaitée', entry.wishedFeature],
    ]),
  };
}
