import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/Form';
import { updateSettings } from '../../features/settings/actions';
import type { AppSettings } from '../../types';

const ITEMS: { key: keyof AppSettings['notificationPrefs']; label: string }[] = [
  { key: 'signed', label: 'Devis signé par un client' },
  { key: 'viewed', label: 'Devis consulté par un client' },
  { key: 'expired', label: 'Devis bientôt expiré ou expiré' },
  { key: 'work_done', label: 'Chantier terminé' },
  { key: 'new_client', label: 'Nouveau client' },
];

export function NotificationSettingsPage() {
  const { settings } = useAppState();
  return (
    <div className="space-y-5">
      <PageHeader back="/settings" title="Notifications" subtitle="Affichées dans la cloche de l’application." />
      <Card>
        {ITEMS.map((i) => (
          <Checkbox key={i.key} checked={settings.notificationPrefs[i.key]} onChange={(v) => updateSettings({ notificationPrefs: { ...settings.notificationPrefs, [i.key]: v } })}>
            {i.label}
          </Checkbox>
        ))}
      </Card>
      <p className="text-sm text-muted">Les notifications push et e-mail (même application fermée) arriveront avec la version en ligne.</p>
    </div>
  );
}
