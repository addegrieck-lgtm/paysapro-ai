import { BarChart3, BookOpen, Building2, Calculator, CalendarDays, LayoutTemplate, MessageSquareHeart, Settings } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { SettingsList } from './settings/SettingsPage';
import { NotificationBell } from '../components/NotificationBell';
import { Button } from '../components/ui/Button';
import { FeedbackDialog } from '../components/FeedbackDialog';

const TOOLS = [
  { to: '/catalog', icon: BookOpen, label: 'Catalogue', hint: 'Vos prestations et vos prix' },
  { to: '/templates', icon: LayoutTemplate, label: 'Modèles de devis', hint: 'Pelouse, terrasse, clôture…' },
  { to: '/planning', icon: CalendarDays, label: 'Planning', hint: 'Vos chantiers à venir' },
  { to: '/stats', icon: BarChart3, label: 'Statistiques', hint: 'Devis, signatures, marges' },
  { to: '/tools', icon: Calculator, label: 'Calculateurs', hint: 'Gazon, terre, gravier, clôture…' },
  { to: '/company', icon: Building2, label: 'Mon entreprise', hint: 'Logo, coordonnées, couleurs' },
  { to: '/settings', icon: Settings, label: 'Paramètres', hint: 'Compte, devis, données, apparence…' },
];

export function MorePage() {
  const [feedback, setFeedback] = useState(false);
  return (
    <div className="space-y-5">
      <PageHeader title="Plus" actions={<NotificationBell />} />
      <SettingsList items={TOOLS} />
      <Button variant="soft" block icon={<MessageSquareHeart className="h-5 w-5" />} onClick={() => setFeedback(true)}>
        Donner mon avis sur la bêta
      </Button>
      <FeedbackDialog open={feedback} onClose={() => setFeedback(false)} />
    </div>
  );
}
