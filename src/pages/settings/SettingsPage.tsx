import { Bell, BookOpen, Building2, Database, FileText, Info, LifeBuoy, Palette, Rocket, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ListLink } from '../../components/ui/Card';

export const SETTINGS_ITEMS = [
  { to: '/settings/account', icon: UserRound, label: 'Compte', hint: 'Profil, plan Premium Max' },
  { to: '/company', icon: Building2, label: 'Entreprise', hint: 'Logo, coordonnées, couleurs des devis' },
  { to: '/settings/quotes', icon: FileText, label: 'Devis', hint: 'TVA, acompte, validité, numérotation' },
  { to: '/catalog', icon: BookOpen, label: 'Catalogue', hint: 'Prestations, prix d’achat et de vente' },
  { to: '/settings/notifications', icon: Bell, label: 'Notifications', hint: 'Devis signés, vus, expirés…' },
  { to: '/settings/data', icon: Database, label: 'Données', hint: 'Sauvegarde, import, démo, suppression' },
  { to: '/settings/ai', icon: Sparkles, label: 'Assistant IA', hint: 'Suggestions, mode démonstration' },
  { to: '/settings/appearance', icon: Palette, label: 'Apparence', hint: 'Thème, taille du texte' },
  { to: '/settings/beta', icon: Rocket, label: 'Bêta', hint: 'Programme bêta, donner mon avis' },
  { to: '/help', icon: LifeBuoy, label: 'Aide', hint: 'Questions fréquentes, contact' },
  { to: '/privacy', icon: ShieldCheck, label: 'Confidentialité', hint: 'Vos données et vos photos' },
  { to: '/about', icon: Info, label: 'À propos', hint: 'Version, installation, limites' },
];

export function SettingsList({ items = SETTINGS_ITEMS }: { items?: typeof SETTINGS_ITEMS }) {
  return (
    <nav className="space-y-2" aria-label="Paramètres">
      {items.map(({ to, icon: Icon, label, hint }) => (
        <ListLink key={to} to={to}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="font-semibold">{label}</div>
              <div className="truncate text-sm text-muted">{hint}</div>
            </div>
          </div>
        </ListLink>
      ))}
    </nav>
  );
}

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Paramètres" />
      <SettingsList />
    </div>
  );
}
