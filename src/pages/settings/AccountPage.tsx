import { useState } from 'react';
import { Cloud, ShieldCheck, UserRound } from 'lucide-react';
import { useAppState, setState } from '../../lib/store';
import { PageHeader, StickyActions } from '../../components/ui/PageHeader';
import { Badge, Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Feedback';
import { auth } from '../../services/auth/AuthProvider';
import { getCurrentPlan } from '../../features/plans/plans';
import { updateSettings } from '../../features/settings/actions';
import { APP_CONFIG } from '../../config/app';
import { formatDate } from '../../utils/date';

export function AccountPage() {
  const { user, settings } = useAppState();
  const toast = useToast();
  const plan = getCurrentPlan();
  const [firstName, setFirstName] = useState(user?.firstName ?? settings.owner.firstName);
  const [lastName, setLastName] = useState(user?.lastName ?? settings.owner.lastName);
  const [email, setEmail] = useState(user?.email ?? settings.company.email);

  return (
    <div className="space-y-5">
      <PageHeader back="/settings" title="Compte" />
      <Card>
        <CardTitle icon={<UserRound className="h-5 w-5" />}>Profil</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Prénom" value={firstName} onChange={setFirstName} autoComplete="given-name" />
          <TextField label="Nom" value={lastName} onChange={setLastName} autoComplete="family-name" />
          <TextField label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" className="sm:col-span-2" />
        </div>
        {user && <p className="mt-3 text-sm text-muted">Espace créé le {formatDate(user.createdAt)}.</p>}
      </Card>
      <Card>
        <CardTitle icon={<ShieldCheck className="h-5 w-5" />}>Plan</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold">{plan.name}</span>
          <Badge tone="success">Gratuit pendant la bêta</Badge>
          {APP_CONFIG.testMode && <Badge>Mode test</Badge>}
        </div>
        <p className="mt-2 text-sm text-muted">Toutes les fonctionnalités sont incluses. Aucun paiement ni abonnement n’est actif.</p>
      </Card>
      <Card>
        <CardTitle icon={<Cloud className="h-5 w-5" />}>Connexion et synchronisation</CardTitle>
        <p className="text-muted">
          Votre espace est lié à cet appareil ({auth.mode === 'local' ? 'compte local, sans mot de passe' : 'compte en ligne'}). La connexion depuis plusieurs appareils et la sauvegarde en ligne
          arriveront avec la version cloud. En attendant, utilisez Paramètres → Données pour transférer vos données.
        </p>
        <Button className="mt-3" variant="secondary" disabled>
          Connexion multi-appareils — disponible prochainement
        </Button>
      </Card>
      <StickyActions>
        <Button
          block
          size="lg"
          onClick={async () => {
            try {
              const u = await auth.signUp({ firstName, lastName, email });
              setState({ user: u });
              updateSettings({ owner: { firstName: firstName.trim(), lastName: lastName.trim() } });
              toast('✓ Profil enregistré');
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Impossible d’enregistrer.', 'danger');
            }
          }}
        >
          Enregistrer
        </Button>
      </StickyActions>
    </div>
  );
}
