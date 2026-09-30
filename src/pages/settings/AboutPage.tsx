import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Logo } from '../../components/Logo';
import { isStandalone } from '../../lib/pwa';
import { isOnlineSpace } from '../../lib/space';
import { APP_CONFIG } from '../../config/app';

export function AboutPage() {
  const installed = isStandalone();
  return (
    <div className="space-y-4">
      <PageHeader back="/settings" title="À propos" />
      <Card>
        <Logo />
        <p className="mt-3 font-semibold">{APP_CONFIG.name}</p>
        <p className="text-sm text-muted">Version {APP_CONFIG.version}</p>
        <p className="mt-3 text-muted">
          Paysapro AI est actuellement en phase bêta. Nous construisons l’outil avec des professionnels du paysage afin de créer une solution réellement adaptée à leur quotidien.
        </p>
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
        <p className="mt-2 text-sm text-muted">
          {isOnlineSpace()
            ? 'Une connexion Internet est nécessaire pour enregistrer vos modifications.'
            : 'Une fois installée et ouverte une première fois, l’application fonctionne sans réseau.'}
        </p>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Limites de la bêta</h2>
        <ul className="list-inside list-disc space-y-1 text-muted">
          {isOnlineSpace() ? (
            <>
              <li>Connexion Internet nécessaire pour enregistrer : pas de mode hors-ligne.</li>
              <li>Envoi du devis par lien à copier ou par PDF ; l’envoi automatique par e-mail dépend de la configuration.</li>
            </>
          ) : (
            <>
              <li>Données sur un seul appareil (pas de synchronisation) : téléchargez régulièrement une sauvegarde.</li>
              <li>Le client consulte et signe le devis sur votre appareil ou reçoit le PDF.</li>
            </>
          )}
          <li>Signature simple du devis, non qualifiée au sens du règlement eIDAS.</li>
          <li>Pas de paiement en ligne : les paiements reçus sont enregistrés manuellement.</li>
          <li>Pas d’analyse automatique des photos : les surfaces viennent de vos mesures.</li>
        </ul>
      </Card>
    </div>
  );
}
