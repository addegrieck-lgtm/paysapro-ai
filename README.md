# 🌿 Paysapro AI

**Devis et gestion de chantiers pour paysagistes.**

Une application web installable sur téléphone (PWA). Elle transforme une visite chez le client en devis professionnel signé, puis en chantier suivi :

```
Photos → Client → Mesures → Surfaces → Prestations (catalogue) → Estimation
→ Devis → PDF → Présentation au client → Signature → Acompte → Suivi du chantier
```

- **0 € obligatoire** : aucun serveur, aucun abonnement, aucune API payante.
- **100 % locale** : les données restent sur l'appareil (IndexedDB) et l'application fonctionne **hors-ligne**.
- **Mobile d'abord** : gros boutons, utilisable d'une main, installable sur iPhone et Android.

---

## Sommaire

1. [Fonctionnalités](#1-fonctionnalités)
2. [Installation sur votre ordinateur](#2-installation-sur-votre-ordinateur)
3. [Commandes](#3-commandes)
4. [Comment mettre gratuitement l'application en ligne](#4-comment-mettre-gratuitement-lapplication-en-ligne)
5. [Installer l'application sur un téléphone (PWA)](#5-installer-lapplication-sur-un-téléphone-pwa)
6. [Stockage des données](#6-stockage-des-données)
7. [Intelligence artificielle](#7-intelligence-artificielle)
8. [Limites de GitHub Pages et de cette version](#8-limites-de-github-pages-et-de-cette-version)
9. [Architecture](#9-architecture)
10. [Évolution future](#10-évolution-future)

---

## 1. Fonctionnalités

| Domaine | Ce qui est disponible |
|---|---|
| **Tableau de bord** | Nombre de devis, montant total, devis acceptés, montant signé, chantiers en cours, montant encaissé, taux de transformation. Tout est calculé à partir de vos vraies données. Alertes « à suivre » et activité récente. |
| **Chantiers** | Création en 2 étapes (client, types de projet à choix multiples), recherche, filtres, timeline d'avancement avec bouton « Continuer ». |
| **Clients** | Fiche, chantiers, devis, montants, historique. Appel et e-mail en un geste. |
| **Photos** | « Prendre une photo » (appareil photo) ou importer plusieurs photos. Étiquettes Avant / Zone concernée / Vue générale / Élément particulier / Pendant / Après. Description. Choix des photos affichées dans le devis. Compression automatique : vignette et qualité moyenne. |
| **Mesures** | Plusieurs zones (rectangle, triangle, cercle, surface connue), zones à déduire, longueurs (bordures, clôtures, haies). Calcul automatique, par exemple 12 m × 8 m = 96 m². Mode **précis** ou mode **rapide** (mesures approximatives, marquées « à confirmer »). |
| **Calculateurs** | Gazon (+ pertes), terre (volume), gravier (volume et poids), bordures, clôture (panneaux et poteaux), terrasse, plantation, main-d'œuvre. |
| **Catalogue** | 22 prestations types modifiables : ajouter, modifier, dupliquer, supprimer. Unités m², m, ml, m³, unité, forfait, heure, jour. Pertes en %, épaisseur par défaut. |
| **Estimation** | Les quantités sont calculées depuis les mesures (surface totale, zone précise, longueur, volume = surface × épaisseur). Détail par catégorie, coût estimé, marge modifiable, prix de vente, TVA, TTC, acompte. **Une donnée manquante est signalée, jamais inventée.** |
| **Assistant** | « Analyser le chantier » propose des prestations. Pour chacune : la raison (« Pourquoi ? ») et la confiance (faible, moyenne, élevée). Chaque proposition doit être cochée par le professionnel. |
| **Devis** | Numérotation `2026-001`, logo, SIRET, TVA (ou « TVA non applicable, art. 293 B du CGI »), photos, conditions, IBAN, validité, acompte et solde. Aperçu professionnel. |
| **PDF** | Généré dans le navigateur, nommé `DEVIS-2026-001.pdf`. Partage natif (e-mail, WhatsApp…) ou téléchargement. |
| **Page client** | Écran dédié, sans le menu de l'application : « Votre projet paysager », total, photos, prestations, bouton « Accepter le devis ». |
| **Signature** | Signature au doigt, bouton « Effacer et recommencer », case « Je confirme accepter le devis ». Sont enregistrés : nom, date, heure et empreinte SHA-256 du devis. |
| **Acompte** | Montant et statut (en attente ou reçu). Le professionnel enregistre les paiements reçus : virement, chèque, espèces… |
| **Suivi de chantier** | Étapes Planifié, En préparation, En cours, En attente, Terminé, Archivé. Dates, checklist modifiable, paiements, galerie avant / pendant / après, notes. |
| **Relances** | Modèles de messages (envoi, relance, expiration, début des travaux), modifiables. Copier, partager, e-mail ou SMS. |
| **Visualiser le projet** | Choix des éléments (gazon, terrasse, olivier, éclairage…), puis génération d'une description de la transformation, réutilisable dans le devis. |
| **Paramètres** | Entreprise, catalogue, TVA et devis, données, IA, apparence (thème clair ou sombre, grand texte), confidentialité, à propos. |
| **Données** | Export et import JSON (photos comprises), données de démonstration, suppression totale avec confirmation forte. |
| **Première ouverture** | 5 étapes rapides, avec « Passer pour l'instant ». |

---

## 2. Installation sur votre ordinateur

1. **Installer Node.js** (gratuit) : https://nodejs.org → version « LTS ». Vérifiez dans un terminal :
   ```bash
   node -v
   ```
   Vous devez voir `v20` ou plus.
2. **Ouvrir un terminal dans le dossier du projet**, puis installer les dépendances :
   ```bash
   npm install
   ```
3. **Lancer l'application en mode développement** :
   ```bash
   npm run dev
   ```
   Ouvrez l'adresse affichée (par exemple http://localhost:5173). Sur votre téléphone connecté au même Wi-Fi, utilisez l'adresse « Network ».

> Astuce : dans l'application, **Plus → Données → Charger des données de démonstration** pour tester immédiatement.

---

## 3. Commandes

| Commande | Rôle |
|---|---|
| `npm install` | Installe les dépendances (une fois). |
| `npm run dev` | Lance l'application en développement. |
| `npm run build` | Vérifie TypeScript puis crée la version de production dans `dist/`. |
| `npm run preview` | Sert la version de production en local (service worker et hors-ligne actifs). |
| `npm run lint` | Vérifie la qualité du code (ESLint). |
| `npm run test` | Lance les tests automatiques (Vitest). |
| `npm run icons` | Régénère les icônes PNG de l'application. |

---

## 4. Comment mettre gratuitement l'application en ligne

Résultat : votre application sera accessible à l'adresse `https://MONCOMPTE.github.io/MONREPOSITORY/`, sans serveur à payer ni nom de domaine à acheter.

### Étape 1 : créer un compte et un dépôt GitHub

1. Créez un compte gratuit sur https://github.com.
2. Cliquez sur **New repository** (bouton « + » en haut à droite).
3. Nom : par exemple `paysapro-ai`. Visibilité : **Public**. GitHub Pages est gratuit pour les dépôts publics. Vos données clients ne sont **pas** dans le dépôt : elles restent sur votre téléphone.
4. Ne cochez **rien** d'autre (pas de README ni de .gitignore), puis cliquez sur **Create repository**.

### Étape 2 : installer Git

Téléchargez Git sur https://git-scm.com, puis configurez-le une fois :

```bash
git config --global user.name "Votre Nom"
```

```bash
git config --global user.email "vous@exemple.fr"
```

### Étape 3 : envoyer le code sur GitHub

Dans un terminal ouvert dans le dossier du projet :

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Première version de Paysapro AI"
```

```bash
git branch -M main
```

Remplacez `MONCOMPTE` et `MONREPOSITORY` par les vôtres :

```bash
git remote add origin https://github.com/MONCOMPTE/MONREPOSITORY.git
```

```bash
git push -u origin main
```

La première fois, Git vous demande de vous connecter à GitHub : une fenêtre de navigateur s'ouvre.

### Étape 4 : activer GitHub Pages

1. Sur la page de votre dépôt : **Settings** → **Pages** (menu de gauche).
2. Sous « Build and deployment », à la ligne **Source**, choisissez **GitHub Actions**.
3. Ouvrez l'onglet **Actions** du dépôt. Le workflow **Deploy** se lance, ou relancez-le avec « Run workflow ». Il installe, vérifie (lint et tests), construit puis publie l'application en 1 à 2 minutes.

### Étape 5 : ouvrir l'application

Rendez-vous sur `https://MONCOMPTE.github.io/MONREPOSITORY/` 🎉

### Mettre à jour l'application ensuite

Après chaque modification, envoyez-la sur GitHub : le site se met à jour automatiquement.

```bash
git add .
```

```bash
git commit -m "Description de la modification"
```

```bash
git push
```

> Rien n'est à configurer pour le sous-dossier `/MONREPOSITORY/`. L'application utilise des chemins relatifs (`base: './'`) et des adresses du type `/#/projects`, qui fonctionnent sur GitHub Pages sans règle serveur.

---

## 5. Installer l'application sur un téléphone (PWA)

- **iPhone ou iPad** : ouvrez l'adresse dans **Safari**, touchez **Partager** puis **Sur l'écran d'accueil**.
- **Android** : ouvrez l'adresse dans **Chrome**, menu **⋮** puis **Installer l'application**.
- **Ordinateur** (Chrome, Edge) : cliquez sur l'icône d'installation dans la barre d'adresse.

Après une première ouverture avec du réseau, l'application fonctionne **sans connexion** : consulter, créer un chantier, ajouter des photos, créer et modifier un devis, faire signer.

---

## 6. Stockage des données

- Toutes les données (clients, chantiers, devis, photos, catalogue, réglages) sont stockées dans **IndexedDB**, le stockage du navigateur. Elles restent après la fermeture du navigateur.
- Elles **ne quittent jamais l'appareil**. Il n'y a ni compte, ni cloud, ni cookie de suivi.
- ⚠️ **Il n'y a pas de synchronisation.** Un téléphone et un ordinateur ont chacun leurs propres données. Si le navigateur est désinstallé ou ses données effacées, tout est perdu. **Exportez régulièrement une sauvegarde** : Plus → Données → Exporter (fichier JSON, photos comprises), et gardez-la en lieu sûr.
- Les photos sont compressées avant stockage : vignette de 360 px, qualité moyenne de 1600 px. L'original n'est pas conservé, pour économiser l'espace du téléphone.
- L'application demande au navigateur un stockage « persistant » pour limiter les effacements automatiques.

**Confidentialité (RGPD)** : une politique de confidentialité est intégrée (Plus → Confidentialité), avec l'export et la suppression complète des données. Aucune photo n'est jamais envoyée à un service externe. Si un tel service est ajouté plus tard, un consentement explicite sera demandé.

---

## 7. Intelligence artificielle

L'application **fonctionne sans aucune IA externe**. Deux modes sont disponibles (Plus → IA) :

| Mode | Description |
|---|---|
| **Assistant local** (par défaut) | Règles métier transparentes, hors-ligne. Il propose des prestations selon les types de projet, les mots de la description (« olivier », « gravier », « haie »…) et vos mesures. Il indique pourquoi et avec quelle confiance. Il ne prétend pas « voir » les photos. |
| **Simulation / démonstration** | Réponses fictives pour découvrir l'interface, dont une analyse de photo simulée. Un bandeau signale en permanence que ce sont des résultats fictifs. |

Principes respectés :

- une photo ne remplace jamais une mesure ;
- une surface estimée est toujours donnée en fourchette (« 72–98 m² ») avec la mention « à confirmer » ;
- chaque proposition doit être validée par le professionnel ;
- rien n'est envoyé hors de l'appareil.

**Pourquoi pas d'API d'IA payante dans le code ?** Une clé d'API placée dans un site statique serait visible par tout le monde, qui pourrait l'utiliser à vos frais. Il faudra un petit serveur intermédiaire : voir la section Évolution.

---

## 8. Limites de GitHub Pages et de cette version

GitHub Pages héberge uniquement des **fichiers statiques** : pas de serveur, pas de base de données, pas de secret. Conséquences :

| Limite | Contournement dans le MVP |
|---|---|
| Pas de lien public `/quote/ABC123` consultable par le client depuis chez lui | Le client consulte et signe **sur l'appareil du professionnel** (« Présenter au client »), ou reçoit le **PDF** par e-mail ou WhatsApp. La page `/#/quote/:token` existe déjà : elle deviendra publique avec un backend. |
| Pas de synchronisation entre appareils | Export et import JSON. |
| Pas de paiement en ligne | Enregistrement manuel des acomptes reçus (virement, chèque…). L'IBAN est affiché au client. |
| Signature simple, **non qualifiée eIDAS** | Nom, date, heure, image et empreinte SHA-256 du devis sont enregistrés. C'est une validation du devis, pas une signature électronique certifiée. |
| Pas d'e-mail ni de SMS automatiques | Messages préparés à copier ou partager via vos propres applications. |
| Pas d'analyse automatique des photos | Surfaces issues de vos mesures (le calcul est exact). |
| Notifications uniquement dans l'application | Alertes « À suivre » : devis consulté, devis qui expire bientôt, chantier qui commence demain, relance à faire. |
| Plusieurs onglets ouverts en même temps | Chaque onglet a sa propre copie en mémoire. Utilisez un seul onglet ou l'application installée. |

Tout ce qui n'est pas disponible est affiché comme **« Disponible prochainement »** (bouton désactivé). Aucun bouton n'est factice.

---

## 9. Architecture

```
src/
├── types/            Types métier stricts (Client, Project, Quote, CatalogItem…)
├── utils/            Nombres (jamais de NaN), dates, validation, identifiants
├── data/             Réglages et catalogue par défaut
├── lib/              État global (store), PWA, partage et téléchargement
├── hooks/            useProjectData, usePhotoUrl
├── features/         Logique métier, sans interface
│   ├── measurements/   geometry.ts (surfaces), calculators.ts (gazon, terre, clôture…)
│   ├── quotes/         quantity.ts, pricing.ts (marge, TVA, acompte), numbering.ts, actions, PDF
│   ├── projects/       statuts, timeline, actions (photos, suivi de chantier)
│   ├── clients/        fiche client
│   ├── catalog/        unités, catégories, règles de quantité
│   ├── ai/             contexte envoyé à l'assistant
│   ├── notifications/  alertes locales calculées
│   ├── stats/          statistiques du tableau de bord
│   ├── demo/           données de démonstration
│   └── settings/       réglages, export/import, suppression
├── services/         Fournisseurs interchangeables (abstractions)
│   ├── storage/        StorageProvider → IndexedDBProvider (MVP) · FutureCloudProvider
│   ├── ai/             AIProvider → LocalAIProvider · MockAIProvider · ExternalAIProvider
│   ├── payments/       PaymentProvider → ManualPaymentProvider · MockPaymentProvider
│   ├── signature/      SignatureProvider → LocalSignatureProvider · FutureElectronicSignatureProvider
│   ├── pdf/            génération du PDF (jsPDF, chargé à la demande)
│   └── images/         compression des photos, logo
├── components/       Composants réutilisables (ui/ = design system)
├── layouts/          Mise en page (navigation inférieure mobile, barre latérale sur ordinateur)
├── pages/            Écrans
└── styles/           Design system (Tailwind CSS v4, thèmes clair et sombre)
tests/                Tests Vitest (calculs, stockage, import/export, IA, signature, PDF)
.github/workflows/    Déploiement GitHub Pages
```

**Choix techniques** : React 19, TypeScript strict, Vite, Tailwind CSS v4, `idb` (IndexedDB), jsPDF, lucide-react (icônes), vite-plugin-pwa (service worker Workbox), React Router en mode `HashRouter`.

**Règles de calcul** :

- Prix du catalogue = prix HT **avant marge**.
- Prix de vente unitaire = prix × (1 + marge).
- TVA calculée sur le total HT.
- Acompte = % du TTC.

Exemple testé : 10 × 8 m = 80 m², gazon 80 × 18 € = 1 440 €, préparation 80 × 8 € = 640 €, transport 150 €. Coût 2 230 €, marge 30 %, **prix de vente 2 899 € HT**.

**Tests** (`npm test`, 63 tests) :

- surfaces, volumes, quantités, pertes ;
- marge, TVA, total, acompte ;
- numérotation ;
- stockage IndexedDB, export/import aller-retour (photos comprises) ;
- statistiques, notifications ;
- IA (confiance, fourchettes, consentement) ;
- signature, paiement, génération PDF.

---

## 10. Évolution future

L'architecture est prête. Chaque service externe se branche en implémentant une interface existante, sans réécrire l'application.

| Évolution | Comment | Coût de départ |
|---|---|---|
| Comptes, cloud, multi-appareils, équipes | `SupabaseProvider` implémentant `StorageProvider`, avec authentification et règles RLS | Offre gratuite Supabase |
| Lien public client `/quote/ABC123` | Table de devis publiés (lecture par jeton), même page `ClientQuotePage` | Inclus avec Supabase |
| IA (analyse photo, fourchette de surface, rendu « après ») | `ExternalAIProvider` appelant une fonction serveur (Supabase Edge Function ou Cloudflare Worker) qui détient la clé. Consentement déjà prévu. | Selon l'API choisie |
| Paiement en ligne de l'acompte | `StripeProvider` implémentant `PaymentProvider`, avec webhooks côté serveur | Commission par paiement |
| Signature électronique qualifiée | Prestataire conforme eIDAS (Yousign…) via `SignatureProvider` | Abonnement du prestataire |
| E-mails, SMS, notifications push | Fonctions serveur (Resend, Brevo…) et Web Push | Offres gratuites limitées |

Idées pour la suite : facturation (devis → facture), planning et météo, trajets et tournées, catalogue fournisseurs, reconnaissance des plantes, plan 2D, demande d'avis Google, statistiques avancées.

---

Licence : à définir par l'auteur (MIT recommandée pour un projet open source).
