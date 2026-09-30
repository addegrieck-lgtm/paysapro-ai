import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { MailCheck } from 'lucide-react';
import { useAppState } from '../lib/store';
import { LogoMark } from '../components/Logo';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Form';
import { Alert } from '../components/ui/Feedback';
import { AuthFormError, PASSWORD_MIN_LENGTH, requestPasswordReset, signIn, signUp, updatePassword } from '../features/auth/actions';
import { CLOUD_ENABLED } from '../services/cloud/client';
import { APP_CONFIG } from '../config/app';

function Shell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-bg px-4 pb-10 pt-[calc(2rem+env(safe-area-inset-top))]">
      <div className="w-full max-w-md">
        <Link to="/" aria-label={`${APP_CONFIG.name} — accueil`} className="mb-6 inline-block">
          <LogoMark className="h-11 w-11" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        <Card className="mt-5">{children}</Card>
        {footer && <div className="mt-5 text-center text-muted">{footer}</div>}
      </div>
    </div>
  );
}

function useSubmit(action: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      if (!(err instanceof AuthFormError)) console.error(err);
      setError(err instanceof AuthFormError ? err.message : 'Une erreur est survenue. Réessayez dans un instant.');
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, onSubmit };
}

const linkClass = 'font-semibold text-brand underline';

/** Les écrans de compte n'existent qu'en mode cloud ; un utilisateur connecté est renvoyé vers son espace. */
function useAuthGate(): ReactNode | null {
  const { user, settings, demo } = useAppState();
  if (!CLOUD_ENABLED) return <Navigate to="/onboarding" replace />;
  if (user && !demo) return <Navigate to={settings.onboardingDone ? '/app' : '/onboarding'} replace />;
  return null;
}

export function LoginPage() {
  const gate = useAuthGate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, onSubmit } = useSubmit(() => signIn(email, password));
  if (gate) return gate;
  return (
    <Shell
      title="Connexion"
      subtitle="Retrouvez vos chantiers et vos devis."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link to="/signup" className={linkClass}>
            Créer mon compte
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextField label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" required />
        <TextField label="Mot de passe" type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" block size="lg" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </Button>
        <p className="text-center">
          <Link to="/forgot-password" className={linkClass}>
            Mot de passe oublié ?
          </Link>
        </p>
      </form>
    </Shell>
  );
}

export function SignupPage() {
  const gate = useAuthGate();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, error, onSubmit } = useSubmit(async () => {
    const result = await signUp({ firstName, lastName, email, password });
    if (result === 'confirm') setSent(true);
    else navigate('/onboarding', { replace: true });
  });
  if (gate) return gate;
  if (sent) {
    return (
      <Shell title="Vérifiez votre boîte mail">
        <div className="flex items-start gap-3">
          <MailCheck className="mt-0.5 h-6 w-6 shrink-0 text-brand" aria-hidden />
          <p>
            Si cette adresse peut être utilisée, un e-mail de confirmation vient d’être envoyé à <strong className="break-all">{email.trim()}</strong>. Ouvrez le lien qu’il contient pour activer votre compte,
            puis connectez-vous.
          </p>
        </div>
        <p className="mt-3 text-sm text-muted">Rien reçu ? Regardez dans les courriers indésirables.</p>
        <p className="mt-2 text-sm text-muted">
          Cette adresse a peut-être déjà un compte : dans ce cas, aucun e-mail n’est envoyé.{' '}
          <Link to="/login" className="font-semibold text-brand underline">
            Connectez-vous
          </Link>{' '}
          ou utilisez{' '}
          <Link to="/forgot-password" className="font-semibold text-brand underline">
            Mot de passe oublié
          </Link>
          .
        </p>
        <Link to="/login" className={`mt-4 inline-block ${linkClass}`}>
          Aller à la connexion
        </Link>
      </Shell>
    );
  }
  return (
    <Shell
      title="Créer mon compte"
      subtitle="Bêta — Premium Max offert, sans carte bancaire."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link to="/login" className={linkClass}>
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Prénom" value={firstName} onChange={setFirstName} autoComplete="given-name" maxLength={80} />
          <TextField label="Nom" value={lastName} onChange={setLastName} autoComplete="family-name" maxLength={80} />
        </div>
        <TextField label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" required />
        <TextField
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={`${PASSWORD_MIN_LENGTH} caractères minimum.`}
          required
        />
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" block size="lg" disabled={busy}>
          {busy ? 'Création…' : 'Créer mon compte'}
        </Button>
        <p className="text-sm text-muted">
          En créant un compte, vous acceptez les{' '}
          <Link to="/terms" className="underline">
            conditions d’utilisation
          </Link>{' '}
          et la{' '}
          <Link to="/privacy" className="underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </form>
    </Shell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, error, onSubmit } = useSubmit(async () => {
    await requestPasswordReset(email);
    setSent(true);
  });
  if (!CLOUD_ENABLED) return <Navigate to="/onboarding" replace />;
  return (
    <Shell
      title="Mot de passe oublié"
      subtitle="Recevez un lien pour en choisir un nouveau."
      footer={
        <Link to="/login" className={linkClass}>
          Retour à la connexion
        </Link>
      }
    >
      {sent ? (
        <p>Si un compte existe avec cette adresse, un e-mail contenant un lien de réinitialisation vient d’être envoyé. Le lien est valable une heure. Pensez à regarder dans les courriers indésirables.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextField label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" required />
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" block size="lg" disabled={busy}>
            {busy ? 'Envoi…' : 'Envoyer le lien'}
          </Button>
        </form>
      )}
    </Shell>
  );
}

/** Ouvert depuis le lien « mot de passe oublié » (session de récupération) ou depuis Paramètres → Compte. */
export function ResetPasswordPage() {
  const { user } = useAppState();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const { busy, error, onSubmit } = useSubmit(async () => {
    if (password !== confirm) throw new AuthFormError('Les deux mots de passe ne sont pas identiques.');
    await updatePassword(password);
    setDone(true);
  });
  if (!CLOUD_ENABLED) return <Navigate to="/onboarding" replace />;
  if (!user) {
    // Lien expiré, déjà utilisé, ou ouvert sans session : on l'explique au lieu de renvoyer à la connexion.
    return (
      <Shell
        title="Lien expiré ou invalide"
        footer={
          <Link to="/login" className={linkClass}>
            Retour à la connexion
          </Link>
        }
      >
        <p>Ce lien de réinitialisation n’est plus valable : il a peut-être déjà servi ou a expiré (il est valable une heure).</p>
        <Button className="mt-4" block onClick={() => navigate('/forgot-password')}>
          Recevoir un nouveau lien
        </Button>
      </Shell>
    );
  }
  return (
    <Shell title="Nouveau mot de passe">
      {done ? (
        <div className="space-y-4">
          <p>✓ Votre mot de passe a été modifié.</p>
          <Button block onClick={() => navigate('/app', { replace: true })}>
            Ouvrir mon espace
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextField label="Nouveau mot de passe" type="password" value={password} onChange={setPassword} autoComplete="new-password" hint={`${PASSWORD_MIN_LENGTH} caractères minimum.`} required />
          <TextField label="Confirmer le mot de passe" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" required />
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" block size="lg" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      )}
    </Shell>
  );
}
