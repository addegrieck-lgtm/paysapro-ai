import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ButtonLink } from '../components/ui/Button';
import { useAppState } from '../lib/store';
import { APP_CONFIG } from '../config/app';

const NAV = [
  { to: '/#fonctionnalites', label: 'Fonctionnalités' },
  { to: '/pricing', label: 'Tarifs' },
  { to: '/beta', label: 'Bêta' },
  { to: '/contact', label: 'Contact' },
];

/** CTA principal : ouvre l'espace si déjà créé, sinon l'inscription. */
export function useStartLink(): { to: string; label: string } {
  const { settings, demo } = useAppState();
  // Depuis la démo, l'inscription crée toujours un vrai espace (l'onboarding quitte la démo).
  return settings.onboardingDone && !demo ? { to: '/app', label: 'Ouvrir mon espace' } : { to: '/onboarding', label: 'Essayer gratuitement' };
}

export function PublicLayout() {
  const start = useStartLink();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Paysapro AI — accueil">
            <Logo compact />
          </Link>
          <nav aria-label="Navigation du site" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className="rounded-lg px-3 py-2 font-medium text-muted hover:text-ink">
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <ButtonLink to={start.to} size="sm">
                {start.label}
              </ButtonLink>
            </span>
            <span className="sm:hidden">
              <ButtonLink to={start.to} size="sm">
                {start.label === 'Ouvrir mon espace' ? 'Mon espace' : 'Essayer'}
              </ButtonLink>
            </span>
            <button type="button" className="rounded-lg p-2 text-ink md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {open && (
          <nav aria-label="Navigation du site" className="border-t border-line bg-bg px-4 pb-4 md:hidden">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 font-medium text-ink">
                {n.label}
              </Link>
            ))}
            <ButtonLink to={start.to} block className="mt-2">
              {start.label}
            </ButtonLink>
          </nav>
        )}
      </header>

      <main id="main" key={pathname}>
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted">{APP_CONFIG.tagline}</p>
            <p className="mt-1 text-sm text-muted">Version {APP_CONFIG.version}</p>
          </div>
          <FooterCol
            title="Produit"
            links={[
              ['/#fonctionnalites', 'Fonctionnalités'],
              ['/#comment', 'Comment ça marche'],
              ['/pricing', 'Tarifs'],
              ['/beta', 'Programme bêta'],
            ]}
          />
          <FooterCol
            title="Aide"
            links={[
              ['/contact', 'Contact'],
              ['/#faq', 'Questions fréquentes'],
              ['/onboarding', 'Créer mon espace'],
            ]}
          />
          <FooterCol
            title="Informations"
            links={[
              ['/privacy', 'Confidentialité'],
              ['/legal', 'Mentions légales'],
              ['/terms', 'CGU'],
              ['/cookies', 'Cookies'],
            ]}
          />
        </div>
        <p className="border-t border-line px-4 py-4 text-center text-xs text-muted">© {new Date().getFullYear()} Paysapro AI — Bêta</p>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-ink">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="text-muted hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
