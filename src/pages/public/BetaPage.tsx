import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button, ButtonLink } from '../../components/ui/Button';
import { SelectField, TextArea, TextField } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Feedback';
import { SubmitResultPanel } from '../../components/SubmitResultPanel';
import { betaLeads, emptyLead, validateLead, type BetaLeadInput, type FieldErrors, type SubmitResult } from '../../services/forms/forms';
import { analytics } from '../../services/analytics/AnalyticsProvider';
import { useStartLink } from '../../layouts/PublicLayout';

const ACTIVITIES = ['', 'Paysagiste', 'Jardinier', 'Entretien d’espaces verts', 'Création de jardins', 'Terrassement', 'Élagage', 'Clôture', 'Autre'];
const TEAM = ['', 'Seul(e)', '2 à 5 personnes', '6 à 20 personnes', 'Plus de 20 personnes'];
const QUOTES = ['', 'Moins de 5', '5 à 15', '15 à 40', 'Plus de 40'];

export function BetaPage() {
  const start = useStartLink();
  const [lead, setLead] = useState<BetaLeadInput>(emptyLead());
  const [errors, setErrors] = useState<FieldErrors<BetaLeadInput>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const set = (k: keyof BetaLeadInput) => (v: string) => setLead({ ...lead, [k]: v });

  const submit = async () => {
    const errs = validateLead(lead);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      setResult(await betaLeads.submit(lead));
      analytics.track('beta_form_submitted');
    } catch {
      setFailure('L’enregistrement a échoué. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Programme bêta</h1>
        <p className="mt-4 text-lg text-muted">
          Paysapro AI est actuellement en phase bêta. Les premiers professionnels peuvent tester gratuitement l’ensemble des fonctionnalités et nous aider à construire l’outil réellement adapté au métier.
        </p>
        <ul className="mt-6 space-y-3">
          {[
            'Accès Premium Max gratuit pendant toute la bêta',
            'Vos retours orientent directement les prochaines fonctionnalités',
            'Aucune carte bancaire, aucun engagement',
            'Information avant l’annonce des tarifs définitifs',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
          <p className="font-semibold">Envie de tester tout de suite ?</p>
          <p className="mt-1 text-sm text-muted">L’application est déjà utilisable : créez votre espace en 2 minutes.</p>
          <ButtonLink to={start.to} className="mt-3">
            {start.label}
          </ButtonLink>
        </div>
      </div>

      <div>
        {result ? (
          <SubmitResultPanel result={result} title="Merci, votre inscription est enregistrée !" onReset={() => { setResult(null); setLead(emptyLead()); }} />
        ) : (
          <form
            className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            noValidate
          >
            <h2 className="text-xl font-bold">Rejoindre la bêta</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <TextField label="Prénom *" value={lead.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" />
              <TextField label="Nom *" value={lead.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" />
              <TextField label="Entreprise" value={lead.company} onChange={set('company')} autoComplete="organization" className="sm:col-span-2" />
              <TextField label="E-mail *" type="email" value={lead.email} onChange={set('email')} error={errors.email} autoComplete="email" />
              <TextField label="Téléphone" type="tel" value={lead.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
              <SelectField label="Activité" value={lead.activity} onChange={set('activity')} options={ACTIVITIES.map((a) => ({ value: a, label: a || 'Choisir…' }))} />
              <SelectField label="Personnes dans l’entreprise" value={lead.teamSize} onChange={set('teamSize')} options={TEAM.map((a) => ({ value: a, label: a || 'Choisir…' }))} />
              <SelectField label="Devis par mois" value={lead.quotesPerMonth} onChange={set('quotesPerMonth')} options={QUOTES.map((a) => ({ value: a, label: a || 'Choisir…' }))} />
              <TextField label="Logiciel actuellement utilisé" value={lead.currentSoftware} onChange={set('currentSoftware')} placeholder="Excel, Word, logiciel…" />
              <TextArea label="Principal problème rencontré" value={lead.mainProblem} onChange={set('mainProblem')} rows={3} className="sm:col-span-2" />
              <TextArea label="Commentaire" value={lead.comment} onChange={set('comment')} rows={3} className="sm:col-span-2" />
            </div>
            {failure && (
              <div className="mt-4">
                <Alert tone="danger">{failure}</Alert>
              </div>
            )}
            <Button type="submit" block size="lg" className="mt-6" disabled={busy} icon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}>
              Rejoindre la bêta
            </Button>
            <p className="mt-3 text-xs text-muted">
              Vos informations servent uniquement à vous recontacter au sujet de la bêta. Voir la{' '}
              <a href="#/privacy" className="underline">
                politique de confidentialité
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
