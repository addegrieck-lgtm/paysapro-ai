import { useState, useSyncExternalStore } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Ellipsis,
  FileText,
  FlaskConical,
  House,
  LayoutDashboard,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { ButtonLink } from '../components/ui/Button';
import { NotificationBell } from '../components/NotificationBell';
import { QuickActionsDrawer } from '../components/QuickActions';
import { useAppState } from '../lib/store';
import { exitDemo } from '../features/settings/dataActions';
import { getCurrentPlan, priceLabel } from '../features/plans/plans';
import { APP_CONFIG } from '../config/app';
import { CLOUD_ENABLED } from '../services/cloud/client';

const SIDEBAR = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Users, end: false },
  { to: '/projects', label: 'Chantiers', icon: ClipboardList, end: false },
  { to: '/quotes', label: 'Devis', icon: FileText, end: false },
  { to: '/catalog', label: 'Catalogue', icon: BookOpen, end: false },
  { to: '/planning', label: 'Planning', icon: CalendarDays, end: false },
  { to: '/stats', label: 'Statistiques', icon: BarChart3, end: false },
  { to: '/company', label: 'Entreprise', icon: Building2, end: false },
  { to: '/settings', label: 'Paramètres', icon: Settings, end: false },
];

const BOTTOM_LEFT = [
  { to: '/app', label: 'Accueil', icon: House, end: true },
  { to: '/clients', label: 'Clients', icon: Users, end: false },
];
const BOTTOM_RIGHT = [
  { to: '/projects', label: 'Chantiers', icon: ClipboardList, end: false },
  { to: '/quotes', label: 'Devis', icon: FileText, end: false },
  { to: '/more', label: 'Plus', icon: Ellipsis, end: false },
];

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

/** Mode cloud : sans réseau, rien ne peut être enregistré. On le dit clairement. */
export function OfflineBanner() {
  const { demo } = useAppState();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);
  if (!CLOUD_ENABLED || demo || online) return null;
  return (
    <div role="status" className="bg-warning-soft px-4 py-2 text-center text-sm font-medium text-warning">
      Hors connexion : vos modifications ne seront pas enregistrées tant que le réseau n’est pas revenu.
    </div>
  );
}

export function DemoBanner() {
  const { demo } = useAppState();
  const navigate = useNavigate();
  if (!demo) return null;
  return (
    <div className="no-print sticky top-0 z-40 flex items-center justify-center gap-3 bg-accent px-4 py-2 text-sm font-medium text-white">
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
      <span>Mode démo : données fictives</span>
      <button
        type="button"
        onClick={async () => {
          await exitDemo();
          navigate('/', { replace: true });
        }}
        className="rounded-lg bg-white/20 px-2.5 py-1 font-semibold hover:bg-white/30"
      >
        Quitter la démo
      </button>
    </div>
  );
}

function BottomItem({ to, label, icon: Icon, end }: (typeof BOTTOM_LEFT)[number]) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) => `flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold ${isActive ? 'text-brand' : 'text-muted'}`}
      >
        {({ isActive }) => (
          <>
            <span className={`flex h-8 w-12 items-center justify-center rounded-full ${isActive ? 'bg-brand-soft' : ''}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            {label}
          </>
        )}
      </NavLink>
    </li>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  const [quick, setQuick] = useState(false);
  const plan = getCurrentPlan();

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">
        Aller au contenu
      </a>

      {/* Barre latérale (ordinateur, tablette paysage) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface p-4 lg:flex">
        <div className="mb-5 flex items-center justify-between px-1 pt-1">
          <Logo />
          <NotificationBell />
        </div>
        <ButtonLink to="/quotes/new" icon={<Plus className="h-5 w-5" />} block>
          Nouveau devis
        </ButtonLink>
        <nav aria-label="Navigation principale" className="mt-5 flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {SIDEBAR.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium ${isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink'}`
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings/subscription" className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-sm hover:border-brand/40">
          <span className="block font-semibold text-ink">{APP_CONFIG.betaMode ? `BÊTA — ${plan.name} offert` : plan.name}</span>
          <span className="text-muted">{APP_CONFIG.betaMode ? 'Gratuit, sans carte bancaire' : priceLabel(plan)}</span>
        </NavLink>
      </aside>

      <div className="lg:ml-64">
        <DemoBanner />
        <OfflineBanner />
        <main id="main" className="px-4 pb-28 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 lg:pb-12 lg:pt-8">
          <div className="animate-in mx-auto max-w-3xl xl:max-w-4xl" key={pathname}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Navigation inférieure (téléphone) */}
      <nav aria-label="Navigation principale" className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-xl grid-cols-[1fr_1fr_auto_1fr_1fr_1fr] items-center">
          {BOTTOM_LEFT.map((i) => (
            <BottomItem key={i.to} {...i} />
          ))}
          <li className="px-1.5">
            <button
              type="button"
              onClick={() => setQuick(true)}
              aria-label="Créer : devis, client, chantier ou photo"
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-on-brand shadow-lg ring-4 ring-bg active:scale-95"
            >
              <Plus className="h-7 w-7" />
            </button>
          </li>
          {BOTTOM_RIGHT.map((i) => (
            <BottomItem key={i.to} {...i} />
          ))}
        </ul>
      </nav>
      <QuickActionsDrawer open={quick} onClose={() => setQuick(false)} />
    </div>
  );
}
