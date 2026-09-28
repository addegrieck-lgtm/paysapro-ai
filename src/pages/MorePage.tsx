import { BookOpen, Building2, Calculator, Database, FileText, Info, Palette, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ListLink } from '../components/ui/Card';

const ITEMS = [
  { to: '/tools', icon: Calculator, label: 'Calculateurs', hint: 'Gazon, terre, gravier, clôture…' },
  { to: '/settings/company', icon: Building2, label: 'Entreprise', hint: 'Logo, coordonnées, SIRET, IBAN' },
  { to: '/settings/catalog', icon: BookOpen, label: 'Catalogue', hint: 'Vos prestations et tarifs' },
  { to: '/settings/quotes', icon: FileText, label: 'TVA & devis', hint: 'TVA, marge, acompte, numérotation' },
  { to: '/settings/data', icon: Database, label: 'Données', hint: 'Export, import, démonstration, suppression' },
  { to: '/settings/ai', icon: Sparkles, label: 'IA', hint: 'Assistant local, mode démonstration' },
  { to: '/settings/appearance', icon: Palette, label: 'Apparence', hint: 'Thème, taille du texte' },
  { to: '/privacy', icon: ShieldCheck, label: 'Confidentialité', hint: 'Vos données et vos photos' },
  { to: '/about', icon: Info, label: 'À propos', hint: 'Version, installation, limites' },
];

export function MorePage() {
  return (
    <div>
      <PageHeader title="Plus" subtitle="Outils et paramètres" />
      <nav className="space-y-2" aria-label="Paramètres">
        {ITEMS.map(({ to, icon: Icon, label, hint }) => (
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
    </div>
  );
}
