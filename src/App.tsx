import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { loadAll, onStorageError, useAppState } from './lib/store';
import { requestPersistentStorage } from './lib/pwa';
import { ToastProvider, useToast } from './components/ui/Feedback';
import { Skeleton } from './components/ui/Extras';
import { LogoMark } from './components/Logo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { analytics } from './services/analytics/AnalyticsProvider';
import { APP_CONFIG } from './config/app';
import { openDemo } from './features/settings/dataActions';
import { isDemoSpace } from './services/storage';
import { CLOUD_ENABLED } from './services/cloud/client';
import { watchAuth } from './features/auth/actions';
const LoginPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.ResetPasswordPage })));
// Public
import { LandingPage } from './pages/public/LandingPage';
const PricingPage = lazy(() => import('./pages/public/PricingPage').then((m) => ({ default: m.PricingPage })));
const BetaPage = lazy(() => import('./pages/public/BetaPage').then((m) => ({ default: m.BetaPage })));
const ContactPage = lazy(() => import('./pages/public/ContactPage').then((m) => ({ default: m.ContactPage })));
const CookiesPage = lazy(() => import('./pages/public/LegalPages').then((m) => ({ default: m.CookiesPage })));
const LegalNoticePage = lazy(() => import('./pages/public/LegalPages').then((m) => ({ default: m.LegalNoticePage })));
const PrivacyPage = lazy(() => import('./pages/public/LegalPages').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/public/LegalPages').then((m) => ({ default: m.TermsPage })));
import { OnboardingPage } from './pages/OnboardingPage';
const ClientQuotePage = lazy(() => import('./pages/ClientQuotePage').then((m) => ({ default: m.ClientQuotePage })));
// Application
import { DashboardPage } from './pages/DashboardPage';
const NewQuotePage = lazy(() => import('./pages/projects/NewQuotePage').then((m) => ({ default: m.NewQuotePage })));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectPage = lazy(() => import('./pages/projects/ProjectPage').then((m) => ({ default: m.ProjectPage })));
const PhotosPage = lazy(() => import('./pages/projects/PhotosPage').then((m) => ({ default: m.PhotosPage })));
const MeasuresPage = lazy(() => import('./pages/projects/MeasuresPage').then((m) => ({ default: m.MeasuresPage })));
const ServicesPage = lazy(() => import('./pages/projects/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const QuotePage = lazy(() => import('./pages/projects/QuotePage').then((m) => ({ default: m.QuotePage })));
const WorkPage = lazy(() => import('./pages/projects/WorkPage').then((m) => ({ default: m.WorkPage })));
const VisualizePage = lazy(() => import('./pages/projects/VisualizePage').then((m) => ({ default: m.VisualizePage })));
const ClientsPage = lazy(() => import('./pages/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })));
const ClientPage = lazy(() => import('./pages/clients/ClientPage').then((m) => ({ default: m.ClientPage })));
const ClientFormPage = lazy(() => import('./pages/clients/ClientFormPage').then((m) => ({ default: m.ClientFormPage })));
const QuotesPage = lazy(() => import('./pages/QuotesPage').then((m) => ({ default: m.QuotesPage })));
const ToolsPage = lazy(() => import('./pages/ToolsPage').then((m) => ({ default: m.ToolsPage })));
const MorePage = lazy(() => import('./pages/MorePage').then((m) => ({ default: m.MorePage })));
const PlanningPage = lazy(() => import('./pages/PlanningPage').then((m) => ({ default: m.PlanningPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const CompanyPage = lazy(() => import('./pages/settings/CompanyPage').then((m) => ({ default: m.CompanyPage })));
const CatalogPage = lazy(() => import('./pages/settings/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const TemplatesPage = lazy(() => import('./pages/settings/TemplatesPage').then((m) => ({ default: m.TemplatesPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const AccountPage = lazy(() => import('./pages/settings/AccountPage').then((m) => ({ default: m.AccountPage })));
const QuoteSettingsPage = lazy(() => import('./pages/settings/QuoteSettingsPage').then((m) => ({ default: m.QuoteSettingsPage })));
const NotificationSettingsPage = lazy(() => import('./pages/settings/NotificationSettingsPage').then((m) => ({ default: m.NotificationSettingsPage })));
const DataPage = lazy(() => import('./pages/settings/DataPage').then((m) => ({ default: m.DataPage })));
const AISettingsPage = lazy(() => import('./pages/settings/AISettingsPage').then((m) => ({ default: m.AISettingsPage })));
const AppearancePage = lazy(() => import('./pages/settings/AppearancePage').then((m) => ({ default: m.AppearancePage })));
const BetaProgramPage = lazy(() => import('./pages/settings/BetaProgramPage').then((m) => ({ default: m.BetaProgramPage })));
const AboutPage = lazy(() => import('./pages/settings/AboutPage').then((m) => ({ default: m.AboutPage })));
import { NotFoundPage } from './pages/NotFoundPage';

function useAppearance() {
  const { settings } = useAppState();
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-text', settings.textSize);
  }, [settings.theme, settings.textSize]);
}

function Splash({ message }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center" aria-busy={!message}>
      <LogoMark className="h-14 w-14" />
      {message ? (
        <>
          <p className="max-w-sm text-muted">{message}</p>
          <button type="button" onClick={() => window.location.reload()} className="min-h-12 rounded-xl bg-brand px-5 font-semibold text-on-brand">
            Réessayer
          </button>
        </>
      ) : (
        <div className="w-56 space-y-2" aria-label="Chargement">
          <Skeleton className="h-3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      )}
    </div>
  );
}

/** Espace professionnel : nécessite d'avoir créé son espace (onboarding). */
function RequireWorkspace({ children }: { children: ReactNode }) {
  const { settings, user, demo } = useAppState();
  // Mode cloud : l'espace professionnel exige une session (la base refuse de toute façon tout accès anonyme).
  if (CLOUD_ENABLED && !demo && !user) return <Navigate to="/login" replace />;
  if (!settings.onboardingDone) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { ready, loadError } = useAppState();
  const toast = useToast();
  useAppearance();

  useEffect(() => {
    onStorageError((m) => toast(m, 'danger'));
  }, [toast]);

  // Mode cloud : au retour sur l'application, on relit la base (un client a pu signer entre-temps).
  useEffect(() => {
    if (!CLOUD_ENABLED) return;
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible' || isDemoSpace() || Date.now() - last < 30_000) return;
      last = Date.now();
      void loadAll();
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  useEffect(
    () =>
      watchAuth(() => {
        window.location.hash = '#/reset-password';
      }),
    [],
  );

  if (!ready) return <Splash />;
  if (loadError) return <Splash message={loadError} />;

  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Site public */}
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="beta" element={<BetaPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="legal" element={<LegalNoticePage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="cookies" element={<CookiesPage />} />
      </Route>
      <Route path="onboarding" element={<OnboardingPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="signup" element={<SignupPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      {/* Page client (lien du devis) : sans navigation de l'application */}
      <Route path="quote/:token" element={<ClientQuotePage />} />

      {/* Espace professionnel */}
      <Route
        element={
          <RequireWorkspace>
            <AppLayout />
          </RequireWorkspace>
        }
      >
        <Route path="app" element={<DashboardPage />} />
        <Route path="dashboard" element={<Navigate to="/app" replace />} />
        <Route path="quotes/new" element={<NewQuotePage mode="quote" />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<NewQuotePage mode="project" />} />
        <Route path="projects/:id" element={<ProjectPage />} />
        <Route path="projects/:id/photos" element={<PhotosPage />} />
        <Route path="projects/:id/measures" element={<MeasuresPage />} />
        <Route path="projects/:id/services" element={<ServicesPage />} />
        <Route path="projects/:id/quote" element={<QuotePage />} />
        <Route path="projects/:id/work" element={<WorkPage />} />
        <Route path="projects/:id/visualize" element={<VisualizePage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/new" element={<ClientFormPage />} />
        <Route path="clients/:id" element={<ClientPage />} />
        <Route path="clients/:id/edit" element={<ClientFormPage />} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="planning" element={<PlanningPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="company" element={<CompanyPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/account" element={<AccountPage />} />
        <Route path="settings/company" element={<Navigate to="/company" replace />} />
        <Route path="settings/catalog" element={<Navigate to="/catalog" replace />} />
        <Route path="settings/quotes" element={<QuoteSettingsPage />} />
        <Route path="settings/notifications" element={<NotificationSettingsPage />} />
        <Route path="settings/data" element={<DataPage />} />
        <Route path="settings/ai" element={<AISettingsPage />} />
        <Route path="settings/appearance" element={<AppearancePage />} />
        <Route path="settings/beta" element={<BetaProgramPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}

/** Pendant le chargement d'un écran (première visite) : squelette discret. */
function PageLoader() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4 pt-8" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  useEffect(() => {
    const start = async () => {
      if (APP_CONFIG.demoMode && !isDemoSpace()) await openDemo();
      else await loadAll();
      analytics.track('app_opened');
    };
    void start();
    void requestPersistentStorage();
  }, []);
  return (
    // HashRouter : fonctionne sur GitHub Pages sans configuration serveur (URL du type /#/projects)
    <HashRouter>
      <ToastProvider>
        <ScrollToTop />
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </ToastProvider>
    </HashRouter>
  );
}
