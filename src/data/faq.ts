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
    a: 'Le client consulte le devis dans un écran dédié, touche « Accepter le devis », signe avec le doigt et confirme. Nom, date et heure sont enregistrés. Il s’agit d’une validation simple du devis, pas d’une signature électronique qualifiée.',
  },
  {
    q: 'Mes données sont-elles sauvegardées ?',
    a: 'Pendant la bêta, vos données sont enregistrées sur votre appareil (elles restent après fermeture de l’application, même sans réseau). Elles ne sont pas encore synchronisées en ligne : pensez à télécharger régulièrement une sauvegarde depuis Paramètres → Données.',
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
    a: 'Rien pendant la bêta : toutes les fonctionnalités (Premium Max) sont ouvertes gratuitement, sans carte bancaire. Le prix définitif sera annoncé avant la fin de la bêta.',
  },
];
