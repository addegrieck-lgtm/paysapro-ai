import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Segmented } from '../../components/ui/Form';
import { updateSettings } from '../../features/settings/actions';
import type { TextSize, ThemePreference } from '../../types';

export function AppearancePage() {
  const { settings } = useAppState();
  return (
    <div className="space-y-5">
      <PageHeader back="/settings" title="Apparence" />
      <Card>
        <h2 className="mb-3 font-semibold">Thème</h2>
        <Segmented<ThemePreference>
          label="Thème"
          value={settings.theme}
          onChange={(v) => updateSettings({ theme: v })}
          options={[
            { value: 'system', label: 'Automatique' },
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
          ]}
        />
        <p className="mt-2 text-sm text-muted">Le thème clair est plus lisible en plein soleil. Les devis restent toujours sur fond blanc.</p>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Taille du texte</h2>
        <Segmented<TextSize>
          label="Taille du texte"
          value={settings.textSize}
          onChange={(v) => updateSettings({ textSize: v })}
          options={[
            { value: 'normal', label: 'Normale' },
            { value: 'large', label: 'Grande' },
          ]}
        />
      </Card>
    </div>
  );
}
