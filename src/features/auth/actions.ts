// Authentification en ligne (Supabase Auth) : inscription, connexion, déconnexion, mot de passe.
//
// Les messages d'erreur affichés sont volontairement génériques : jamais de détail technique,
// et jamais d'indication permettant de savoir si une adresse e-mail possède un compte.
import { authRedirectUrl, clearCloudSession, supabase } from '../../services/cloud/client';
import { loadAll, setState } from '../../lib/store';
import { analytics } from '../../services/analytics/AnalyticsProvider';
import { isValidEmail } from '../../utils/validation';

export const PASSWORD_MIN_LENGTH = 10;

export class AuthFormError extends Error {}

function client() {
  if (!supabase) throw new AuthFormError('Les comptes en ligne ne sont pas activés sur cette installation.');
  return supabase;
}

/** Traduit une erreur Supabase en message lisible, sans exposer de détail interne. */
export function authMessage(error: { code?: string; status?: number; message?: string } | null | undefined): string {
  const code = error?.code ?? '';
  if (code === 'invalid_credentials') return 'E-mail ou mot de passe incorrect.';
  if (code === 'email_not_confirmed') return 'Confirmez votre adresse e-mail : ouvrez le lien reçu par e-mail, puis reconnectez-vous.';
  if (code === 'user_already_exists' || code === 'email_exists') return 'Un compte existe déjà avec cette adresse. Connectez-vous ou réinitialisez votre mot de passe.';
  if (code === 'weak_password') return `Mot de passe trop simple : ${PASSWORD_MIN_LENGTH} caractères minimum, évitez les mots de passe courants.`;
  if (code === 'same_password') return 'Le nouveau mot de passe doit être différent de l’ancien.';
  if (code.startsWith('over_') || error?.status === 429) return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
  if (error?.message === 'Failed to fetch' || error?.status === 0) return 'Connexion au serveur impossible. Vérifiez votre connexion Internet.';
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

export function checkCredentials(email: string, password: string): string | null {
  if (!email.trim() || !isValidEmail(email)) return 'Adresse e-mail invalide.';
  if (password.length < PASSWORD_MIN_LENGTH) return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  if (password.length > 72) return 'Le mot de passe ne peut pas dépasser 72 caractères.';
  return null;
}

async function reload(): Promise<void> {
  setState({ ready: false });
  await loadAll();
}

/** Inscription. Renvoie « confirm » si un e-mail de confirmation doit être validé avant la connexion. */
export async function signUp(input: { firstName: string; lastName: string; email: string; password: string }): Promise<'signed_in' | 'confirm'> {
  const invalid = checkCredentials(input.email, input.password);
  if (invalid) throw new AuthFormError(invalid);
  const { data, error } = await client().auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: authRedirectUrl(),
      data: { first_name: input.firstName.trim().slice(0, 80), last_name: input.lastName.trim().slice(0, 80) },
    },
  });
  if (error) throw new AuthFormError(authMessage(error));
  analytics.track('account_created');
  if (!data.session) return 'confirm';
  await reload();
  return 'signed_in';
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!email.trim() || !password) throw new AuthFormError('Renseignez votre e-mail et votre mot de passe.');
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new AuthFormError(authMessage(error));
  await reload();
}

export async function signOut(): Promise<void> {
  const { error } = await client().auth.signOut();
  if (error) console.error(error.message);
  clearCloudSession();
  await reload();
}

/** Envoie l'e-mail de réinitialisation. Ne révèle jamais si l'adresse possède un compte. */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!email.trim() || !isValidEmail(email)) throw new AuthFormError('Adresse e-mail invalide.');
  // « ?reset=1 » : au retour, l'application ouvre l'écran « Nouveau mot de passe » quoi qu'il arrive.
  const { error } = await client().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${authRedirectUrl()}?reset=1` });
  if (error && (error.status === 429 || (error.code ?? '').startsWith('over_'))) throw new AuthFormError(authMessage(error));
  if (error) console.error(error.message);
}

export async function updatePassword(password: string): Promise<void> {
  if (password.length < PASSWORD_MIN_LENGTH) throw new AuthFormError(`Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`);
  if (password.length > 72) throw new AuthFormError('Le mot de passe ne peut pas dépasser 72 caractères.');
  const { error } = await client().auth.updateUser({ password });
  if (error) throw new AuthFormError(authMessage(error));
}

export type AuthLinkResult = 'none' | 'recovery' | 'confirmed' | 'invalid';

/**
 * Lien reçu par e-mail (confirmation d'inscription, mot de passe oublié), traité AVANT le chargement.
 *  • « ?token_hash=…&type=… » : vérifié ici. Fonctionne même si le lien est ouvert dans un autre
 *    navigateur ou sur un autre appareil que celui de la demande (modèles d'e-mails Supabase adaptés).
 *  • « ?code=… » (ancien format) : échangé automatiquement par le client Supabase ; « reset=1 » indique
 *    qu'il s'agit d'un mot de passe oublié.
 * Les paramètres sont ensuite retirés de l'adresse.
 */
export async function handleAuthLink(): Promise<AuthLinkResult> {
  if (!supabase || typeof window === 'undefined') return 'none';
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  const reset = params.get('reset') === '1';
  const hasCode = params.has('code');
  if (!tokenHash && !reset && !hasCode && !params.has('error_description')) return 'none';

  let result: AuthLinkResult;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'recovery' | 'email' | 'signup' | 'invite' | 'magiclink' | 'email_change' });
    result = error ? 'invalid' : type === 'recovery' ? 'recovery' : 'confirmed';
  } else if (params.has('error_description')) {
    result = 'invalid';
  } else {
    // Attend la fin de l'échange du code par le client Supabase.
    const { data } = await supabase.auth.getSession();
    result = data.session ? (reset ? 'recovery' : 'confirmed') : reset ? 'invalid' : 'none';
  }
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
  return result;
}

/**
 * À appeler une fois au démarrage : suit les changements de session (autre onglet, expiration,
 * lien « mot de passe oublié ») et ouvre l'écran de nouveau mot de passe quand il le faut.
 */
export function watchAuth(onRecovery: () => void): () => void {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((event) => {
    // Pas d'appel Supabase directement dans ce rappel (risque de blocage) : on diffère.
    if (event === 'PASSWORD_RECOVERY') setTimeout(onRecovery, 0);
    if (event === 'SIGNED_OUT') {
      clearCloudSession();
      setTimeout(() => void loadAll(), 0);
    }
  });
  return () => data.subscription.unsubscribe();
}
