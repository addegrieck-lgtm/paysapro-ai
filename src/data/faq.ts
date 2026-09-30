import { IS_BETA, IS_CLOUD_APP } from '../lib/space';
// Questions fréquentes : affichées sur la landing page et dans l'aide de l'application.
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Comment créer un devis ?',
    a: 'Touchez « + Nouveau devis » : choisissez le client, décrivez le chantier, ajoutez vos photos et vos mesures, puis sélectionnez vos prestations. Les quantités, la TVA et le total sont calculés automatiquement. « Créer le devis » attribue un numéro et génère l’aperçu.',
  },
  {
    q: 'Comment envoyer un devis ?',
    a: 'Depuis le devis, touchez « Envoyer » : vous pouvez le présenter à votre client sur votre téléphone ou votre tablette, partager le PDF (e-mail, WhatsApp, SMS) ou copier un message prêt à l’emploi.',
  },
  {
    q: 'Comment le client signe-t-il ?',
    a: IS_CLOUD_APP
      ? 'Envoyez-lui le lien du devis (ou présentez-le sur votre téléphone) : il consulte le devis sans créer de compte, touche « Accepter le devis », signe avec le doigt et confirme. Nom, date et heure sont enregistrés. Il s’agit d’une signature électronique simple, pas d’une signature qualifiée.'
      : 'Le client consulte le devis dans un écran dédié, touche « Accepter le devis », signe avec le doigt et confirme. Nom, date et heure sont enregistrés. Il s’agit d’une validation simple du devis, pas d’une signature électronique qualifiée.',
  },
  {
    q: 'Mes données sont-elles sauvegardées ?',
    a: IS_CLOUD_APP
      ? 'Oui : avec votre compte, vos données sont enregistrées en ligne dans l’espace de votre entreprise et accessibles depuis vos appareils. Une connexion Internet est nécessaire pour enregistrer. Vous pouvez aussi télécharger une sauvegarde depuis Paramètres → Données.'
      : 'Vos données sont enregistrées sur votre appareil (elles restent après fermeture de l’application, même sans réseau). Elles ne sont pas synchronisées en ligne : pensez à télécharger régulièrement une sauvegarde depuis Paramètres → Données.',
  },
  {
    q: 'Puis-je utiliser l’application sur téléphone ?',
    a: 'Oui, Paysapro AI est conçu d’abord pour le téléphone. Installez-le sur l’écran d’accueil (Safari : Partager → « Sur l’écran d’accueil » ; Android : menu → « Installer l’application »). Il fonctionne aussi sur ordinateur.',
  },
  {
    q: 'Comment exporter mes données ?',
    a: 'Paramètres → Données → « Télécharger une sauvegarde ». Le fichier contient clients, chantiers, devis, catalogue et photos, et peut être réimporté sur un autre appareil.',
  },
  {
    q: 'Combien ça coûte ?',
    a: IS_BETA
      ? 'Rien pendant la bêta : toutes les fonctionnalités (Premium Max) sont ouvertes gratuitement, sans carte bancaire. Les offres prévues ensuite (Starter 19 €, Pro 39 €, Business 69 € HT par mois, −25 % à l’année) figurent sur la page Tarifs ; rien n’est facturé sans votre accord.'
      : 'Trois offres : Starter 19 €, Pro 39 € et Business 69 € HT par mois, avec 25 % de réduction pour un paiement à l’année. Le détail est sur la page Tarifs.',
  },
];
