import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { loadAll, onStorageError, useAppState } from './lib/store';
import { requestPersistentStorage } from './lib/pwa';
import { ToastProvider, useToast } from './components/ui/Feedback';
import { LogoMark } from './components/Logo';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { NewProjectPage } from './pages/projects/NewProjectPage';
import { ProjectPage } from './pages/projects/ProjectPage';
import { PhotosPage } from './pages/projects/PhotosPage';
import { MeasuresPage } from './pages/projects/MeasuresPage';
import { ServicesPage } from './pages/projects/ServicesPage';
import { QuotePage } from './pages/projects/QuotePage';
import { WorkPage } from './pages/projects/WorkPage';
import { VisualizePage } from './pages/projects/VisualizePage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { ClientPage } from './pages/clients/ClientPage';
import { ClientFormPage } from './pages/clients/ClientFormPage';
import { QuotesPage } from './pages/QuotesPage';
import { ClientQuotePage } from './pages/ClientQuotePage';
import { ToolsPage } from './pages/ToolsPage';
import { MorePage } from './pages/MorePage';
import { CompanySettingsPage } from './pages/settings/CompanySettingsPage';
import { CatalogPage } from './pages/settings/CatalogPage';
import { QuoteSettingsPage } from './pages/settings/QuoteSettingsPage';
import { DataPage } from './pages/settings/DataPage';
import { AISettingsPage } from './pages/settings/AISettingsPage';
import { AppearancePage } from './pages/settings/AppearancePage';
import { PrivacyPage } from './pages/settings/PrivacyPage';
import { AboutPage } from './pages/settings/AboutPage';
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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoMark className="h-14 w-14" />
      <p className="max-w-sm text-muted">{message ?? 'Chargement…'}</p>
    </div>
  );
}

function AppRoutes() {
  const { ready, loadError, settings } = useAppState();
  const { pathname } = useLocation();
  const toast = useToast();
  useAppearance();

  useEffect(() => {
    onStorageError((m) => toast(m, 'danger'));
  }, [toast]);

  if (!ready) return <Splash />;
  if (loadError) return <Splash message={loadError} />;
  if (!settings.onboardingDone && pathname !== '/onboarding' && !pathname.startsWith('/quote/')) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      {/* Page client : sans navigation de l'application */}
      <Route path="/quote/:token" element={<ClientQuotePage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<NewProjectPage />} />
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
        <Route path="tools" element={<ToolsPage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="settings/company" element={<CompanySettingsPage />} />
        <Route path="settings/catalog" element={<CatalogPage />} />
        <Route path="settings/quotes" element={<QuoteSettingsPage />} />
        <Route path="settings/data" element={<DataPage />} />
        <Route path="settings/ai" element={<AISettingsPage />} />
        <Route path="settings/appearance" element={<AppearancePage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
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
    void loadAll();
    void requestPersistentStorage();
  }, []);
  return (
    // HashRouter : fonctionne sur GitHub Pages sans configuration serveur (URL du type /#/projects)
    <HashRouter>
      <ToastProvider>
        <ScrollToTop />
        <AppRoutes />
      </ToastProvider>
    </HashRouter>
  );
}
