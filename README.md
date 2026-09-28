# 🌿 Paysapro AI — v0.1 Bêta

**Le devis paysagiste, directement depuis le chantier.**
*Photographiez. Chiffrez. Envoyez. Faites signer.*

Paysapro AI est une application web installable sur téléphone (PWA). Elle permet aux paysagistes, jardiniers et entreprises d’aménagement extérieur de transformer une visite chez le client en devis professionnel signé, puis en chantier suivi.

```
Chantier → Photos → Mesures → Prix → Devis (PDF) → Présentation au client → Signature → Suivi du chantier
```

- **0 € obligatoire** : GitHub Pages, aucun serveur, aucune API payante.
- **Bêta : Premium Max gratuit pour tous** (`testMode`), sans paiement ni abonnement.
- **Local et hors-ligne** : les données restent sur l’appareil (IndexedDB).
- **Prête pour le cloud** : chaque service externe se branche derrière une interface (voir [docs/MIGRATION-SUPABASE.md](docs/MIGRATION-SUPABASE.md)).

En ligne : **https://addegrieck-lgtm.github.io/paysapro-ai/**

---

## Sommaire

1. [Fonctionnalités](#1-fonctionnalités)
2. [Installation et développement](#2-installation-et-développement)
3. [Mise en ligne gratuite (GitHub Pages)](#3-mise-en-ligne-gratuite-github-pages)
4. [PWA : installation sur téléphone et hors-ligne](#4-pwa--installation-sur-téléphone-et-hors-ligne)
5. [Mode bêta, Premium Max et plans](#5-mode-bêta-premium-max-et-plans)
6. [Stockage et données](#6-stockage-et-données)
7. [Providers : IA, paiement, signature, analytics, compte](#7-providers--ia-paiement-signature-analytics-compte)
8. [Architecture](#8-architecture)
9. [Tests](#9-tests)
10. [Limites de la bêta](#10-limites-de-la-bêta)
11. [Avant le lancement commercial](#11-avant-le-lancement-commercial)

---

## 1. Fonctionnalités

### Site public

| Page | Contenu |
|---|---|
| `/` Landing | Proposition de valeur, parcours animé Photo → Chiffrage → Devis → Client → Signature, « Comment ça marche », section IA (« L’IA vous assiste. Vous gardez toujours le contrôle »), « Pourquoi Paysapro AI », bêta, FAQ, bouton « Explorer la démo » |
| `/pricing` | Bêta 0 €/mois, accès Premium Max ; offres futures « À venir », sans prix inventé |
| `/beta` | Programme bêta et formulaire d’inscription (11 champs, validation) |
| `/contact` | Formulaire « Une question ? » |
| `/privacy`, `/legal`, `/terms`, `/cookies` | Modèles à adapter, clairement signalés comme tels |

### Application professionnelle

| Fonction | Détail |
|---|---|
| **Onboarding** | 6 écrans : bienvenue ; entreprise (prénom, nom, entreprise, téléphone, e-mail, adresse, logo) ; activités ; prestations principales ; objectif ; « Votre espace est prêt ». Possibilité de passer. |
| **Tableau de bord** | « Bonjour [Prénom] », bouton **+ Nouveau devis**, actions rapides, brouillon à reprendre, « Votre activité » (devis du mois, acceptés, montant, chantiers en cours), premiers pas, alertes, chantiers récents, activité récente |
| **Nouveau devis** | Parcours guidé Client → Chantier → Mesures → Prix → Devis → Envoi, avec barre de progression. Retour possible sans perte. Brouillon enregistré automatiquement ; s’il est interrompu, il est restauré avec le message « Votre brouillon a été sauvegardé ». Départ possible depuis un modèle. |
| **Photos** | Prise de vue ou import multiple, étiquettes (avant, après…), compression, choix des photos affichées dans le devis, **curseur avant / après** |
| **Mesures** | Zones (rectangle, triangle, cercle, surface connue), zones à déduire, longueurs, mode précis ou rapide (quantités marquées « à confirmer ») |
| **Prix** | Chaque ligne a un **prix de vente** et un **coût interne**. Quantités calculées depuis les mesures (80 m² × 12 € = 960 €). Totaux par famille : matériaux, main-d’œuvre, autres. Encadré « visible uniquement par vous » : coût, marge en € et en %, outil « appliquer une marge ». Main-d’œuvre à l’heure ou à la journée. |
| **Assistant** | « ✨ Analyser le chantier » : chaque suggestion indique pourquoi et avec quelle confiance, et le pro choisit « Ajouter au devis » ou « Ignorer ». « Générer la description » rédige un texte modifiable. |
| **Modèles de devis** | 5 modèles fournis (pelouse, terrasse, clôture, plantation, entretien) ; « Enregistrer ces prestations comme modèle » |
| **Catalogue** | Prix d’achat, prix de vente et marge par prestation ; créer, modifier, dupliquer, supprimer ; recherche |
| **Devis et PDF** | Logo, **couleur de l’entreprise**, pied de page, client, chantier, numéro, date, validité, photos, prestations, TVA (ou mention art. 293 B), total, acompte, conditions, signature. PDF `DEVIS-2026-001.pdf`. |
| **Espace client** (`/quote/:token`) | « Votre projet avec [Entreprise] », total, photos, devis, **Accepter le devis**, grande zone de signature (Effacer / Valider), page « Merci ! Votre devis a bien été signé », acompte |
| **Statuts automatiques** | Brouillon → Envoyé → Vu → Accepté → Signé, puis Planifié → En cours → Terminé |
| **Notifications** | Cloche avec badge. Événements : devis signé (« 🎉 Jean Dupont vient de signer le devis #2026-001 »), devis vu, chantier terminé, nouveau client. Alertes : devis bientôt expiré, chantier qui commence. Chaque type se règle dans les préférences. |
| **Chantiers** | Timeline, **notes internes 🔒**, suivi des travaux, checklist, paiements reçus, galerie avant/après |
| **Clients (CRM)** | Informations, chantiers, devis, montants, historique, dernière activité |
| **Planning** | En cours, à venir, à planifier, terminés |
| **Statistiques** | Devis émis et signés, taux de transformation, devis moyen, montant signé par mois, marge des devis signés, progression (entonnoir) |
| **Paramètres** | Compte, Entreprise, Devis, Catalogue, Notifications, Données, Assistant IA, Apparence, Bêta, Aide, Confidentialité, À propos |
| **Bêta** | Page « Programme bêta » (plan Premium Max gratuit), fenêtre de feedback (1 à 5 étoiles + 4 questions), inscriptions reçues sur l’appareil exportables en CSV |
| **Démo** | Espace **séparé** avec entreprise, clients, chantiers, devis et photos fictifs ; boutons « Quitter la démo » et « Réinitialiser » |
| **Données** | Télécharger une sauvegarde (JSON, photos comprises), import, suppression totale (il faut taper « SUPPRIMER ») |

**Navigation**
- **Mobile** : barre du bas (Accueil, Clients, **+**, Chantiers, Devis, Plus). Le **+** propose : Nouveau devis, client, chantier ou photo.
- **Ordinateur** : barre latérale (Dashboard, Clients, Chantiers, Devis, Catalogue, Planning, Statistiques, Entreprise, Paramètres).

---

## 2. Installation et développement

Prérequis : [Node.js](https://nodejs.org) 20 ou plus (version LTS).

```bash
npm install
```

```bash
npm run dev
```

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification TypeScript + build de production dans `dist/` |
| `npm run preview` | Sert le build (service worker et hors-ligne actifs) |
| `npm run lint` | ESLint |
| `npm run test` | Tests Vitest |
| `npm run icons` | Régénère les icônes PWA |

**Configuration (facultative)** : copiez `.env.example` en `.env.local`. Aucune variable n’est obligatoire. **Ne mettez jamais de secret** dans une variable `VITE_*` : elle serait visible dans le navigateur.

| Variable | Défaut | Rôle |
|---|---|---|
| `VITE_TEST_MODE` | `true` | Premium Max pour tous |
| `VITE_DEMO_MODE` | `false` | Ouvre directement l’espace démo (salon, démonstration) |
| `VITE_AI_DEMO_MODE` | `false` | Assistant en mode démonstration par défaut |
| `VITE_CONTACT_EMAIL` | vide | Adresse publique à qui les visiteurs envoient leur inscription bêta ou leur message, via un e-mail pré-rempli |

---

## 3. Mise en ligne gratuite (GitHub Pages)

Le dépôt contient `.github/workflows/deploy.yml`. À chaque `git push` sur `main`, GitHub installe, lance lint et tests, construit puis publie le site.

1. Créez un dépôt **public** sur GitHub.
2. Envoyez le code :

   ```bash
   git init
   ```

   ```bash
   git add .
   ```

   ```bash
   git commit -m "Paysapro AI"
   ```

   ```bash
   git branch -M main
   ```

   ```bash
   git remote add origin https://github.com/MONCOMPTE/MONREPOSITORY.git
   ```

   ```bash
   git push -u origin main
   ```

3. **Settings → Pages → Source : « GitHub Actions »**.
4. Si le premier déploiement a échoué parce que Pages n’était pas encore activé : **Actions → Deploy → Re-run jobs**.
5. Ouvrez `https://MONCOMPTE.github.io/MONREPOSITORY/`.

Routage : `HashRouter` (URL du type `/#/app`) et chemins relatifs (`base: './'`). Aucune configuration serveur n’est nécessaire, et l’application fonctionne dans n’importe quel sous-dossier.

---

## 4. PWA : installation sur téléphone et hors-ligne

- **iPhone (Safari)** : Partager → « Sur l’écran d’accueil ».
- **Android (Chrome)** : ⋮ → « Installer l’application ».
- `manifest.webmanifest` : `start_url` = `./#/app`, icônes 192, 512 et maskable, icône Apple.
- Service worker (vite-plugin-pwa / Workbox) : tous les écrans sont mis en cache. Après une première visite, l’application s’ouvre **sans réseau**.

---

## 5. Mode bêta, Premium Max et plans

```ts
// src/config/app.ts
export const APP_CONFIG = {
  testMode: true,            // VITE_TEST_MODE
  testPlan: 'PREMIUM_MAX',
  paymentsEnabled: false,
  subscriptionsEnabled: false,
  // …
};
```

`src/features/plans/plans.ts` définit les plans Free (« Starter »), Pro, Premium et Premium Max, avec `getCurrentPlan()`, `hasFeature()` et `canUseFeature()`. **Pendant la bêta, tout le monde reçoit PREMIUM_MAX : aucun paywall.** Les autres plans restent affichés « À venir », sans prix.

---

## 6. Stockage et données

- **IndexedDB**, via `IndexedDBProvider`. Deux bases distinctes :
  - `paysapro-ai` : les vraies données ;
  - `paysapro-demo` : l’espace de démonstration.
- **Migration automatique** : les données du MVP sont mises à niveau au chargement, sans perte (`src/features/migrations.ts`, testé).
  - Les anciens prix deviennent des coûts.
  - Les prix de vente sont recalculés avec la marge d’origine, donc les totaux restent identiques.
- **Modèle conceptuel** : User → Company (réglages) → Clients → Projects → Quotes, plus Photos, Catalog et Templates. Tout est prêt pour un stockage par utilisateur dans le cloud.
- **Données publiques** : la page client et le PDF reçoivent uniquement `toPublicQuote()`. Ni coût, ni marge, ni notes internes, ni paiements ; c’est vérifié par un test automatique.
- **Sauvegarde** : Paramètres → Données → « Télécharger une sauvegarde ».

---

## 7. Providers : IA, paiement, signature, analytics, compte

| Interface | Bêta | Plus tard |
|---|---|---|
| `StorageProvider` | `IndexedDBProvider` | `CloudStorageProvider` (squelette prêt) |
| `AuthProvider` | `LocalAuthProvider` : profil sur l’appareil, **aucun mot de passe stocké** | `CloudAuthProvider` (Supabase Auth) |
| `AIProvider` | `LocalAIProvider` (règles métier), `MockAIProvider` (« Mode démonstration », réponses fictives signalées) | `ExternalAIProvider` via Edge Function ; consentement obligatoire déjà prévu |
| `PaymentProvider` | `ManualPaymentProvider` (paiements reçus), `MockPaymentProvider` | `StripeProvider` |
| `SignatureProvider` | `LocalSignatureProvider` : nom, date, image, empreinte SHA-256 | `FutureElectronicSignatureProvider` (eIDAS) |
| `AnalyticsProvider` | `LocalAnalyticsProvider` : événements sur l’appareil uniquement | fournisseur distant, avec consentement |
| `BetaLeadProvider` / `ContactProvider` | local, plus e-mail pré-rempli si `VITE_CONTACT_EMAIL` | `SupabaseBetaLeadProvider` |

**Honnêteté de l’IA** : aucune mesure n’est inventée. Toute estimation est indicative, avec sa fourchette. Chaque suggestion est validée par le pro. Le mode démonstration est toujours signalé, et la génération d’image est affichée « disponible prochainement ».

Événements analytics enregistrés en local : `app_opened`, `onboarding_completed`, `client_created`, `project_created`, `quote_created`, `quote_sent`, `quote_viewed`, `quote_signed`, `pdf_generated`, `ai_used`, `beta_form_submitted`, `contact_submitted`, `feedback_submitted`, `demo_opened`.

---

## 8. Architecture

```
src/
├── config/app.ts        APP_CONFIG (testMode, PREMIUM_MAX, paiements désactivés)
├── types/               Types métier stricts (User, Client, Project, Quote, CatalogItem, QuoteTemplate…)
├── data/                Réglages, catalogue (achat/vente), modèles, FAQ
├── features/            Logique métier pure (testée)
│   ├── quotes/            quantity, pricing (vente/coût/marge), publicView, numbering, templates, PDF
│   ├── measurements/      surfaces, calculateurs
│   ├── plans/             getCurrentPlan, hasFeature, canUseFeature
│   ├── migrations.ts      mise à niveau des données
│   ├── notifications/     alertes + centre de notifications
│   ├── stats/, demo/, projects/, clients/, templates/, settings/
├── services/            Fournisseurs interchangeables (storage, auth, ai, payments, signature, analytics, forms, pdf, images)
├── lib/                 État global (store), PWA, partage
├── components/          Composants métier + ui/ (design system : Button, Form, Card, Badge, Dialog, Drawer, Toast, Skeleton, Avatar, StatCard, EmptyState, ConfirmDialog)
├── layouts/             AppLayout (barre latérale ordinateur, barre du bas mobile, bouton +), PublicLayout (site)
└── pages/               public/, projects/, clients/, settings/…
docs/MIGRATION-SUPABASE.md
tests/                   Vitest
```

Les écrans sont chargés à la demande (bundle initial d’environ 100 Ko gzip).

---

## 9. Tests

`npm test` lance 83 tests :

- **Calculs** : surfaces, volumes, pertes, prix de vente et coût, marge, TVA, TTC, acompte, numérotation.
- **Stockage** : IndexedDB, export/import aller-retour avec photos, suppression.
- **Migration** des données du MVP vers la bêta.
- **Vue publique** : aucune fuite de coût, de marge ou de note interne.
- **Plans** (Premium Max), modèles de devis, formulaires (validation, nettoyage), analytics local, compte local.
- **Assistant IA**, signature, paiements, notifications, statistiques, génération du PDF.

---

## 10. Limites de la bêta

- Données sur **un seul appareil**, sans synchronisation : il faut télécharger régulièrement une sauvegarde.
- La page client s’ouvre sur l’appareil du professionnel (présentation) ou le client reçoit le PDF. Le lien public à distance nécessite un backend.
- Les inscriptions bêta et messages envoyés depuis le site public restent sur l’appareil du visiteur. Pour les recevoir, configurez `VITE_CONTACT_EMAIL` (e-mail pré-rempli) ou branchez Supabase.
- Signature simple, **non qualifiée eIDAS**. Pas de paiement en ligne. Pas d’analyse automatique des photos.
- Pages juridiques : **modèles à faire valider**.
- Plusieurs onglets ouverts sur la même adresse ne se synchronisent pas entre eux.

## 11. Avant le lancement commercial

1. Backend Supabase : comptes, synchronisation, lien public du devis, collecte des inscriptions ([guide](docs/MIGRATION-SUPABASE.md)).
2. Validation juridique : CGU, confidentialité (RGPD), mentions légales, mentions obligatoires des devis selon l’activité.
3. Signature électronique conforme (prestataire eIDAS) si nécessaire.
4. Paiement de l’acompte en ligne (Stripe), puis activation des abonnements (`subscriptionsEnabled`).
5. E-mails transactionnels : envoi du devis, notification de signature.
6. IA distante (analyse photo) via un serveur, avec consentement.
7. Facturation (devis → facture) et exports comptables.
