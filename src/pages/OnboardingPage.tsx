import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Check, FileText, FlaskConical, LayoutDashboard } from 'lucide-react';
import { useAppState } from '../lib/store';
import { LogoMark } from '../components/Logo';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Chip, TextField } from '../components/ui/Form';
import { Alert } from '../components/ui/Feedback';
import { CompanyFields } from '../components/CompanyFields';
import { completeOnboarding, exitDemo, openDemo } from '../features/settings/dataActions';
import { APP_CONFIG } from '../config/app';
import { isValidEmail } from '../utils/validation';
import type { Activity, CompanySettings, Goal } from '../types';

const ACTIVITIES: { value: Activity; label: string }[] = [
  { value: 'landscaper', label: 'Paysagiste' },
  { value: 'gardener', label: 'Jardinier' },
  { value: 'maintenance', label: 'Entretien' },
  { value: 'garden_design', label: 'Création de jardins' },
  { value: 'earthwork', label: 'Terrassement' },
  { value: 'tree_care', label: 'Élagage' },
  { value: 'fencing', label: 'Clôture' },
  { value: 'other', label: 'Autre' },
];

const SERVICES = ['Gazon', 'Terrasse', 'Clôture', 'Plantation', 'Entretien', 'Terrassement', 'Taille', 'Débroussaillage', 'Évacuation', 'Autre'];

const GOALS: { value: Goal; label: string }[] = [
  { value: 'faster_quotes', label: 'Faire mes devis plus rapidement' },
  { value: 'clients', label: 'Centraliser mes clients' },
  { value: 'site_tracking', label: 'Améliorer mon suivi de chantier' },
  { value: 'margins', label: 'Mieux gérer mes marges' },
  { value: 'ai', label: 'Tester l’IA' },
  { value: 'all', label: 'Tout cela' },
];

const TITLES = ['Bienvenue', 'Votre entreprise', 'Votre activité', 'Vos prestations principales', 'Votre objectif', 'C’est parti'];

export function OnboardingPage() {
  const { settings, user, demo } = useAppState();
  const navigate = useNavigate();
  const [step, setStep] = useState(settings.onboardingDone ? 5 : 0);
  const [firstName, setFirstName] = useState(settings.owner.firstName || user?.firstName || '');
  const [lastName, setLastName] = useState(settings.owner.lastName || user?.lastName || '');
  const [company, setCompany] = useState<CompanySettings>(settings.company);
  const [activities, setActivities] = useState<Activity[]>(settings.activities);
  const [services, setServices] = useState<string[]>(settings.mainServices);
  const [goal, setGoal] = useState<Goal | null>(settings.goal);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // L'inscription se fait toujours dans le vrai espace, jamais dans la démo.
  useEffect(() => {
    if (demo) void exitDemo();
  }, [demo]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const finish = async () => {
    setBusy(true);
    await completeOnboarding({ firstName, lastName, company, activities, mainServices: services, goal });
    setBusy(false);
    setStep(5);
  };

  const next = async () => {
    setError(null);
    if (step === 1) {
      if (!firstName.trim() && !company.name.trim()) return setError('Indiquez au moins votre prénom ou le nom de votre entreprise.');
      if (!isValidEmail(company.email)) return setError('Adresse e-mail invalide.');
    }
    if (step === 4) return finish();
    setStep(step + 1);
  };

  return (
    <div className="min-h-dvh bg-bg px-4 pb-10 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <LogoMark className="h-10 w-10" />
          {step > 0 && step < 5 && (
            <button type="button" onClick={finish} disabled={busy} className="min-h-11 rounded-xl px-3 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
              Passer pour l’instant
            </button>
          )}
        </div>

        {step > 0 && (
          <>
            <div className="mb-2 flex gap-1.5" aria-hidden>
              {TITLES.slice(1).map((s, i) => (
                <div key={s} className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? 'bg-brand' : 'bg-line'}`} />
              ))}
            </div>
            <p className="mb-4 text-sm font-medium text-muted">
              Étape {step} sur 5 · <span className="text-ink">{TITLES[step]}</span>
            </p>
          </>
        )}

        <div className="animate-in space-y-4" key={step}>
          {step === 0 && (
            <div className="pt-6 text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bienvenue sur Paysapro AI 🌿</h1>
              <p className="mt-3 text-lg text-muted">Votre nouvel assistant pour transformer vos chantiers en devis professionnels.</p>
              <p className="mt-2 font-semibold text-brand">{APP_CONFIG.punchline}</p>
              <div className="mt-8 space-y-3">
                <Button block size="lg" onClick={() => setStep(1)} icon={<ArrowRight className="h-5 w-5" />}>
                  Commencer
                </Button>
                <Button
                  block
                  variant="ghost"
                  icon={<FlaskConical className="h-5 w-5" />}
                  onClick={async () => {
                    await openDemo();
                    navigate('/app', { replace: true });
                  }}
                >
                  Voir d’abord la démo
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted">Gratuit pendant la bêta · sans carte bancaire · vos données restent sur votre appareil</p>
            </div>
          )}

          {step === 1 && (
            <Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Prénom" value={firstName} onChange={setFirstName} autoComplete="given-name" />
                <TextField label="Nom" value={lastName} onChange={setLastName} autoComplete="family-name" />
              </div>
              <div className="mt-4 space-y-4">
                <CompanyFields value={company} onChange={setCompany} sections={['identity', 'contact']} />
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <p className="mb-3 text-muted">Plusieurs choix possibles.</p>
              <div className="flex flex-wrap gap-2">
                {ACTIVITIES.map((a) => (
                  <Chip key={a.value} selected={activities.includes(a.value)} onClick={() => setActivities(toggle(activities, a.value))}>
                    {a.label}
                  </Chip>
                ))}
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <p className="mb-3 text-muted">Nous préparons votre catalogue et vos modèles de devis en conséquence. Tout reste modifiable.</p>
              <div className="flex flex-wrap gap-2">
                {SERVICES.map((s) => (
                  <Chip key={s} selected={services.includes(s)} onClick={() => setServices(toggle(services, s))}>
                    {s}
                  </Chip>
                ))}
              </div>
            </Card>
          )}

          {step === 4 && (
            <div role="radiogroup" aria-label="Votre objectif" className="space-y-2">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  role="radio"
                  aria-checked={goal === g.value}
                  onClick={() => setGoal(g.value)}
                  className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left font-medium ${
                    goal === g.value ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink hover:border-brand/40'
                  }`}
                >
                  {g.label}
                  {goal === g.value && <Check className="h-5 w-5" aria-hidden />}
                </button>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="pt-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
                <Check className="h-8 w-8" aria-hidden />
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">Votre espace est prêt{firstName ? `, ${firstName}` : ''} !</h1>
              <p className="mt-2 text-muted">Catalogue de prestations et modèles de devis déjà en place. Premier devis en quelques minutes.</p>
              <div className="mt-8 space-y-3">
                <Button block size="lg" icon={<FileText className="h-5 w-5" />} onClick={() => navigate('/quotes/new', { replace: true })}>
                  Créer mon premier devis
                </Button>
                <Button block variant="secondary" icon={<LayoutDashboard className="h-5 w-5" />} onClick={() => navigate('/app', { replace: true })}>
                  Aller au tableau de bord
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}

        {step > 0 && step < 5 && (
          <div className="mt-6 flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
              Retour
            </Button>
            <Button block size="lg" onClick={next} disabled={busy} icon={<ArrowRight className="h-5 w-5" />}>
              {step === 4 ? 'Terminer' : 'Continuer'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
