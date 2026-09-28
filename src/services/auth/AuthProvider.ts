// Abstraction du compte utilisateur.
//
//   AuthProvider
//   ├── LocalAuthProvider  (bêta : profil stocké sur l'appareil, aucun mot de passe)
//   └── CloudAuthProvider  (futur : Supabase Auth — e-mail + mot de passe / lien magique)
//
// En local, « s'inscrire » crée le profil du professionnel sur cet appareil. Aucun mot de passe
// n'est demandé ni stocké : la protection repose sur le verrouillage du téléphone.
import type { User } from '../../types';
import { storage } from '../storage';
import { uid } from '../../utils/id';
import { isValidEmail } from '../../utils/validation';

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
}

export interface AuthProvider {
  readonly mode: 'local' | 'cloud';
  /** Mot de passe géré ? (non en local) */
  readonly supportsPassword: boolean;
  signUp(input: SignUpInput): Promise<User>;
  signIn(email: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  resetPassword(email: string): Promise<void>;
}

export class AuthError extends Error {}

export class LocalAuthProvider implements AuthProvider {
  readonly mode = 'local' as const;
  readonly supportsPassword = false;

  async signUp(input: SignUpInput): Promise<User> {
    const email = input.email.trim();
    if (email && !isValidEmail(email)) throw new AuthError('Adresse e-mail invalide.');
    const existing = await storage.getUser();
    const user: User = {
      id: existing?.id ?? uid(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      provider: 'local',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    await storage.saveUser(user);
    return user;
  }

  async signIn(email: string): Promise<User> {
    const user = await storage.getUser();
    if (!user || (email.trim() && user.email.toLowerCase() !== email.trim().toLowerCase())) {
      throw new AuthError('Aucun compte avec cet e-mail sur cet appareil.');
    }
    return user;
  }

  async signOut(): Promise<void> {
    // En local, les données restent sur l'appareil : rien à révoquer.
  }

  getCurrentUser(): Promise<User | null> {
    return storage.getUser();
  }

  async resetPassword(): Promise<void> {
    throw new AuthError('Pas de mot de passe en mode local : votre espace est lié à cet appareil.');
  }
}

/** Réservé à la future version en ligne (Supabase Auth). */
export class CloudAuthProvider implements AuthProvider {
  readonly mode = 'cloud' as const;
  readonly supportsPassword = true;
  private fail(): never {
    throw new AuthError('Les comptes en ligne seront disponibles dans une prochaine version.');
  }
  async signUp(): Promise<User> {
    this.fail();
  }
  async signIn(): Promise<User> {
    this.fail();
  }
  async signOut(): Promise<void> {
    this.fail();
  }
  async getCurrentUser(): Promise<User | null> {
    return null;
  }
  async resetPassword(): Promise<void> {
    this.fail();
  }
}

export const auth: AuthProvider = new LocalAuthProvider();
