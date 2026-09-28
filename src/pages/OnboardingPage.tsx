import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Check, FlaskConical, Plus } from 'lucide-react';
import { useAppState } from '../lib/store';
import { LogoMark } from '../components/Logo';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Checkbox, NumberField } from '../components/ui/Form';
import { CompanyFields } from '../components/CompanyFields';
import { CatalogItemFields, newCatalogItem } from '../components/CatalogItemFields';
import { saveCatalogItem, updateSettings } from '../features/settings/actions';
import { loadDemoData } from '../features/settings/dataActions';
import type { CompanySettings } from '../types';

const STEPS = ['Votre entreprise', 'Vos coordonnées', 'Vos tarifs', 'Votre première prestation', 'Votre premier chantier'];

export function OnboardingPage() {
  const { settings, catalog } = useAppState();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState<CompanySettings>(settings.company);
  const [hourly, setHourly] = useState<number | null>(settings.hourlyRate);
  const [daily, setDaily] = useState<number | null>(settings.dailyRate);
  const [margin, setMargin] = useState<number | null>(settings.defaultMarginPercent);
  const [deposit, setDeposit] = useState<number | null>(settings.defaultDepositPercent);
  const [item, setItem] = useState(() => newCatalogItem('Mes prestations'));
  const [addItem, setAddItem] = useState(false);

  const finish = (to: string) => {
    updateSettings({
      company,
      hourlyRate: hourly ?? settings.hourlyRate,
      dailyRate: daily ?? settings.dailyRate,
      defaultMarginPercent: margin ?? settings.defaultMarginPercent,
      defaultDepositPercent: deposit ?? settings.defaultDepositPercent,
      onboardingDone: true,
    });
    if (addItem && item.label.trim()) saveCatalogItem({ ...item, label: item.label.trim() });
    navigate(to, { replace: true });
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const sections = [...new Set(catalog.map((c) => c.section))];

  return (
    <div className="min-h-dvh bg-bg px-4 pb-10 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <LogoMark className="h-10 w-10" />
          <button type="button" onClick={() => finish('/')} className="min-h-11 rounded-xl px-3 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
            Passer pour l’instant
          </button>
        </div>

        {step === 0 && (
          <div className="mb-6 animate-in">
            <h1 className="text-3xl font-bold tracking-tight">Bienvenue dans Paysapro AI 🌿</h1>
            <p className="mt-2 text-lg text-muted">Du rendez-vous chez le client au devis signé, directement depuis votre téléphone. Deux minutes pour démarrer.</p>
          </div>
        )}

        <div className="mb-2 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>
        <p className="mb-4 text-sm font-medium text-muted">
          Étape {step + 1} sur {STEPS.length} · <span className="text-ink">{STEPS[step]}</span>
        </p>

        <div className="animate-in space-y-4" key={step}>
          {step === 0 && (
            <Card>
              <CompanyFields value={company} onChange={setCompany} sections={['identity']} />
            </Card>
          )}
          {step === 1 && (
            <Card>
              <CompanyFields value={company} onChange={setCompany} sections={['contact', 'legal']} />
            </Card>
          )}
          {step === 2 && (
            <Card>
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Taux horaire" suffix="€/h" value={hourly} onChange={setHourly} />
                <NumberField label="Taux journalier" suffix="€/j" value={daily} onChange={setDaily} />
                <NumberField label="Marge par défaut" suffix="%" max={100} value={margin} onChange={setMargin} />
                <NumberField label="Acompte demandé" suffix="%" max={100} value={deposit} onChange={setDeposit} />
              </div>
              <p className="mt-3 text-sm text-muted">Modifiables à tout moment, et devis par devis.</p>
            </Card>
          )}
          {step === 3 && (
            <Card>
              <p className="mb-3 text-muted">
                <strong className="text-ink">{catalog.length} prestations types</strong> sont déjà prêtes (gazon, terrasse, clôture, plantation…). Vous pourrez ajuster leurs prix dans le catalogue.
              </p>
              <Checkbox checked={addItem} onChange={setAddItem}>
                Ajouter dès maintenant une prestation à moi
              </Checkbox>
              {addItem && (
                <div className="mt-3">
                  <CatalogItemFields value={item} onChange={setItem} sections={sections} />
                </div>
              )}
            </Card>
          )}
          {step === 4 && (
            <div className="space-y-3">
              <Button block size="lg" icon={<Plus className="h-5 w-5" />} onClick={() => finish('/projects/new')}>
                Créer mon premier chantier
              </Button>
              <Button
                block
                size="lg"
                variant="secondary"
                icon={<FlaskConical className="h-5 w-5" />}
                onClick={async () => {
                  finish('/');
                  await loadDemoData();
                }}
              >
                Explorer avec des données de démonstration
              </Button>
              <Button block variant="ghost" icon={<Check className="h-5 w-5" />} onClick={() => finish('/')}>
                Aller au tableau de bord
              </Button>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="mt-6 flex gap-2">
            {step > 0 && (
              <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
                Retour
              </Button>
            )}
            <Button block size="lg" onClick={next} icon={<ArrowRight className="h-5 w-5" />}>
              Continuer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
