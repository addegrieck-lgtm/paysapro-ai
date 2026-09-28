import { NavLink, Outlet, useLocation } from 'react-router';
import { ClipboardList, Ellipsis, FileText, House, Plus, Users } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ButtonLink } from '../components/ui/Button';

const NAV = [
  { to: '/', label: 'Accueil', icon: House, end: true },
  { to: '/projects', label: 'Chantiers', icon: ClipboardList, end: false },
  { to: '/clients', label: 'Clients', icon: Users, end: false },
  { to: '/quotes', label: 'Devis', icon: FileText, end: false },
  { to: '/more', label: 'Plus', icon: Ellipsis, end: false },
];

/** Écrans où le bouton flottant « Nouveau chantier » est utile. */
const FAB_PATHS = ['/projects', '/clients'];

export function AppLayout() {
  const { pathname } = useLocation();
  const showFab = FAB_PATHS.includes(pathname);

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">
        Aller au contenu
      </a>

      {/* Barre latérale (tablette paysage / ordinateur) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface p-4 lg:flex">
        <div className="mb-6 px-2 pt-2">
          <Logo />
        </div>
        <ButtonLink to="/projects/new" icon={<Plus className="h-5 w-5" />} block>
          Nouveau chantier
        </ButtonLink>
        <nav aria-label="Navigation principale" className="mt-6 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium ${
                  isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main id="main" className="px-4 pb-28 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 lg:ml-64 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-3xl animate-in" key={pathname}>
          <Outlet />
        </div>
      </main>

      {showFab && (
        <ButtonLink
          to="/projects/new"
          aria-label="Nouveau chantier"
          className="no-print fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 rounded-full! px-5 shadow-lg lg:hidden"
          icon={<Plus className="h-5 w-5" />}
        >
          Nouveau chantier
        </ButtonLink>
      )}

      {/* Navigation inférieure (téléphone) */}
      <nav
        aria-label="Navigation principale"
        className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[0.72rem] font-semibold ${
                    isActive ? 'text-brand' : 'text-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex h-8 w-14 items-center justify-center rounded-full ${isActive ? 'bg-brand-soft' : ''}`}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
