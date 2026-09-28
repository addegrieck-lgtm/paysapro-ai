import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { ButtonLink } from '../../components/ui/Button';

const SECTIONS: [string, string][] = [
  [
    'Où sont vos données ?',
    'Toutes les données (clients, chantiers, devis, photos, réglages) sont enregistrées uniquement dans le navigateur de cet appareil (IndexedDB). Aucun serveur Paysapro ne les reçoit : il n’y a ni compte, ni base de données en ligne.',
  ],
  [
    'Photos',
    'Les photos sont compressées sur l’appareil puis stockées localement. Elles ne sont jamais envoyées à un service externe. Si un service d’IA externe est ajouté plus tard, votre accord explicite sera demandé avant tout envoi, photo par photo.',
  ],
  [
    'Données de vos clients',
    'Vous êtes responsable du traitement des données de vos clients (nom, coordonnées, adresse). Ne collectez que ce qui est utile au devis et au chantier, et supprimez les fiches qui ne sont plus nécessaires.',
  ],
  [
    'Partage',
    'Rien n’est envoyé automatiquement. Un message ou un PDF n’est transmis que lorsque vous choisissez de le copier, de le partager ou de l’envoyer depuis vos propres applications (e-mail, SMS…).',
  ],
  [
    'Hébergement',
    'L’application est un site statique (GitHub Pages). L’hébergeur peut enregistrer des journaux techniques (adresse IP) lors du chargement des fichiers de l’application, comme pour tout site web. Aucun cookie ni outil de mesure d’audience n’est utilisé.',
  ],
  [
    'Vos droits',
    'Vous pouvez à tout moment exporter l’intégralité de vos données (format JSON) ou les supprimer définitivement depuis « Données ». Désinstaller l’application ou effacer les données du site dans le navigateur supprime aussi tout.',
  ],
];

export function PrivacyPage() {
  return (
    <div className="space-y-4">
      <PageHeader back="/more" title="Confidentialité" subtitle="Politique de confidentialité de Paysapro AI" />
      {SECTIONS.map(([title, text]) => (
        <Card key={title}>
          <h2 className="mb-1 font-semibold">{title}</h2>
          <p className="leading-relaxed text-muted">{text}</p>
        </Card>
      ))}
      <ButtonLink to="/settings/data" variant="soft" block>
        Exporter ou supprimer mes données
      </ButtonLink>
    </div>
  );
}
