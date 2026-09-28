import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Logo } from '../../components/Logo';
import { isStandalone } from '../../lib/pwa';

export function AboutPage() {
  const installed = isStandalone();
  return (
    <div className="space-y-4">
      <PageHeader back="/more" title="À propos" />
      <Card>
        <Logo />
        <p className="mt-3 text-muted">Devis et gestion de chantiers pour paysagistes. Version 1.0 (MVP).</p>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Installer l’application</h2>
        {installed ? (
          <p className="text-muted">✅ L’application est installée sur cet appareil.</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-muted">
            <li>
              <strong className="text-ink">iPhone / iPad (Safari)</strong> : bouton Partager → « Sur l’écran d’accueil ».
            </li>
            <li>
              <strong className="text-ink">Android (Chrome)</strong> : menu ⋮ → « Installer l’application ».
            </li>
            <li>
              <strong className="text-ink">Ordinateur (Chrome, Edge)</strong> : icône d’installation dans la barre d’adresse.
            </li>
          </ul>
        )}
        <p className="mt-2 text-sm text-muted">Une fois installée et ouverte une première fois, l’application fonctionne sans réseau.</p>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Limites de cette version</h2>
        <ul className="list-inside list-disc space-y-1 text-muted">
          <li>Données sur un seul appareil (pas de synchronisation) : exportez régulièrement.</li>
          <li>Le client consulte et signe le devis sur votre appareil (pas encore de lien public en ligne).</li>
          <li>Signature simple du devis, non qualifiée au sens eIDAS.</li>
          <li>Pas de paiement en ligne : les acomptes reçus sont enregistrés manuellement.</li>
          <li>Pas d’analyse automatique des photos : les surfaces viennent de vos mesures.</li>
        </ul>
      </Card>
    </div>
  );
}
