import { Cpu, FlaskConical, Globe } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Feedback';
import { Checkbox } from '../../components/ui/Form';
import { updateSettings } from '../../features/settings/actions';
import type { AIMode } from '../../types';

function Option({ selected, onSelect, icon, title, children, disabled }: { selected: boolean; onSelect?: () => void; icon: ReactNode; title: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${selected ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-brand/40'}`}
    >
      <span className="mt-0.5 text-brand">{icon}</span>
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{children}</span>
      </span>
    </button>
  );
}

export function AISettingsPage() {
  const { settings } = useAppState();
  const set = (m: AIMode) => updateSettings({ aiMode: m });
  return (
    <div className="space-y-5">
      <PageHeader back="/settings" title="Assistance IA" subtitle="L’application fonctionne entièrement sans IA externe." />
      <div role="radiogroup" aria-label="Mode d’assistance" className="space-y-3">
        <Option selected={settings.aiMode === 'local'} onSelect={() => set('local')} icon={<Cpu className="h-6 w-6" />} title="Assistant local (recommandé)">
          Propositions de prestations à partir du type de projet, des notes et de vos mesures, avec explication et niveau de confiance. 100 % hors-ligne, gratuit, aucune donnée envoyée.
        </Option>
        <Option selected={settings.aiMode === 'demo'} onSelect={() => set('demo')} icon={<FlaskConical className="h-6 w-6" />} title="Simulation / démonstration">
          Réponses fictives pour découvrir l’interface (analyse de photo simulée). Clairement signalé comme simulation.
        </Option>
        <Option selected={false} disabled icon={<Globe className="h-6 w-6" />} title="Service d’IA externe — disponible prochainement">
          Analyse de photos, fourchette de surface, rendu du projet. Nécessitera un petit serveur sécurisé pour ne jamais exposer de clé d’API.
        </Option>
      </div>
      <Card>
        <h2 className="mb-2 font-semibold">Consentement</h2>
        <Checkbox checked={settings.externalAIConsent} onChange={(v) => updateSettings({ externalAIConsent: v })}>
          J’accepte, lorsqu’un service d’IA externe sera activé, que les photos que je choisis d’analyser lui soient envoyées.
        </Checkbox>
        <p className="mt-2 text-sm text-muted">
          Aucun service externe n’est actif aujourd’hui : ce choix ne transmet rien. Aucune photo ne sera jamais envoyée automatiquement.
        </p>
      </Card>
      <Alert tone="info">
        Une IA ne remplace jamais une mesure : toute estimation est affichée comme indicative, avec une fourchette, et chaque proposition doit être validée par vous.
      </Alert>
    </div>
  );
}
