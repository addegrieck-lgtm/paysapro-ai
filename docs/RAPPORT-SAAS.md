# Paysapro AI — état du passage en SaaS

> Mis à jour le 30/09/2026. Application : https://app.paysapro-ai.fr · Site commercial : https://www.paysapro-ai.fr

Légende : ✅ fait et vérifié · 🟡 fait, pas (ou partiellement) vérifié · 🔴 à faire ou action externe nécessaire

## 1. Audit initial (résumé)

- **Stack** : React 19, TypeScript strict, Vite 8, Tailwind 4, `HashRouter`, PWA. Conservée.
- **Avant** : tout dans le navigateur (IndexedDB), aucun compte, aucun serveur, aucun appel réseau.
- **Déjà fonctionnel** : clients, chantiers, photos, mesures, calculs, catalogue, modèles, devis, PDF, signature sur
  l'appareil, suivi, planning, statistiques, mode SAP, démo, sauvegarde JSON.
- **Sécurité constatée** : aucun secret dans Git ni son historique, pas de `dangerouslySetInnerHTML` / `eval`.
  Manquaient : comptes, isolation entre entreprises, contrôle d'accès, en-têtes de sécurité.

## 2. Modifications (par domaine)

| Domaine | Fichiers principaux |
|---|---|
| Client Supabase, session | `src/services/cloud/client.ts`, `SupabaseApi.ts` |
| Stockage cloud | `src/services/storage/CloudStorageProvider.ts`, `index.ts` |
| Comptes | `src/features/auth/actions.ts`, `src/pages/AuthPages.tsx` |
| Lien public, signature | `src/features/quotes/publish.ts`, `src/pages/ClientQuotePage.tsx` |
| Plans, abonnement | `src/features/plans/plans.ts`, `billing.ts`, `src/pages/settings/SubscriptionPage.tsx` |
| Équipe, suppression de compte | `src/features/team/actions.ts`, `src/pages/settings/TeamPage.tsx`, `AccountPage.tsx` |
| Pages légales | `src/pages/public/LegalPages.tsx` |
| Suivi des erreurs | `src/services/monitoring.ts` |
| Hébergement | `vercel.json` |
| Base | `supabase/migrations/0001` à `0004` |
| Fonctions serveur | `supabase/functions/stripe-*` |

## 3. Base de données

Tables : `profiles`, `companies`, `company_members`, `company_invitations`, `subscriptions`, `subscription_events`,
`usage_tracking`, `clients`, `projects`, `quotes`, `catalog_items`, `quote_templates`, `project_photos`,
`activity_events`, `signatures`. Bucket privé `photos`.

- Relations : tout porte `company_id` → `companies` ; `projects.client_id`, `quotes.project_id`, `quotes.client_id`,
  `project_photos.project_id`, `signatures.quote_id`.
- RLS activée sur toutes les tables ; accès par appartenance (`is_member`) et par rôle (`has_role`).
- Écart assumé : lignes de devis et mesures restent dans le JSON du devis / chantier (pas de tables
  `quote_items`, `project_measurements`, `documents`, `company_settings` séparées).

## 4. Sécurité

| Élément | État |
|---|---|
| Aucun secret dans Git ni dans le bundle | ✅ |
| Accès anonyme refusé sur toutes les tables et sur les photos | ✅ vérifié par requêtes directes |
| Fonctions internes fermées aux visiteurs | ✅ vérifié |
| Isolation entre deux entreprises | 🟡 règles en place ; test automatique écrit, jamais lancé (il faut deux comptes) |
| Rôles appliqués par la base | 🟡 non testé avec un second utilisateur |
| Lien public : jeton de 24 caractères, vue sans coûts ni marges | 🟡 signature testée par vous, pas par un test automatique |
| Devis signé non modifiable | 🟡 déclencheur en place, non testé |
| En-têtes de sécurité et CSP | ✅ servis par Vercel, écran de connexion sans erreur |
| Messages d'erreur sans détail interne | ✅ |
| Validation des fichiers (type, taille) | ✅ côté bucket, 🟡 refus d'un fichier non-image non testé en réel |
| Limitation de débit | 🟡 celle de Supabase Auth ; rien de spécifique pour le lien public |
| Schémas de validation (Zod) | 🔴 validation faite à la main |

## 5. Abonnements

```
BÊTA — 0 € (Premium Max, sans carte bancaire)
STARTER — 19 € HT/mois
PRO — 39 € HT/mois
BUSINESS — 69 € HT/mois

Paiement à l'année : −25 % (171 €, 351 €, 621 € HT/an)
```

Configuration unique : `src/features/plans/plans.ts`. Limite d'utilisateurs appliquée par la base (`company_user_limit`).

## 6. Stripe

| Élément | État |
|---|---|
| Fonctions paiement, portail, webhook | 🟡 écrites, jamais exécutées |
| Vérification de signature du webhook | ✅ testée |
| Compte Stripe, produits, tarifs, webhook, secrets | 🔴 action externe (`docs/STRIPE-SETUP.md`) |

## 7. Supabase

| Élément | État |
|---|---|
| Migrations 0001 à 0004 | ✅ exécutées |
| Comptes (inscription, confirmation, connexion) | ✅ utilisés par vous |
| Mot de passe oublié, changement de mot de passe, suppression de compte | 🟡 non testés en réel |
| Stockage des photos | 🟡 utilisé par vous ; accès croisé non testé |
| E-mails d'authentification | 🔴 service intégré limité à quelques envois par heure : prévoir un SMTP |
| Sauvegardes de la base | 🔴 à vérifier selon l'offre Supabase |

## 8. Tests

- `npm test` : 102 tests verts, 1 ignoré (isolation entre entreprises, en attente de deux comptes de test).
- `npm run lint`, `npm run build` : verts.
- Vérifications manuelles : routes protégées, écrans de compte, page Abonnement, mise en ligne Vercel.
- Non couvert : parcours complet automatisé dans un navigateur, tests mobiles du mode cloud.

## 9. Variables d'environnement

Navigateur (Vercel) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BETA_MODE`, `VITE_STRIPE_ENABLED`,
`VITE_LEGAL_NAME`, `VITE_LEGAL_FORM`, `VITE_LEGAL_ADDRESS`, `VITE_LEGAL_SIRET`, `VITE_LEGAL_DIRECTOR`, `VITE_LEGAL_EMAIL`,
`VITE_DATA_REGION`, `VITE_SENTRY_DSN`, `VITE_CONTACT_EMAIL`, `VITE_APP_NAME`, `VITE_DEMO_MODE`, `VITE_AI_DEMO_MODE`.

Serveur (Supabase → Edge Functions → Secrets, jamais ailleurs) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID`, `APP_URL`.

## 10. Déploiement

GitHub (`main`) → Vercel (déploiement automatique) → `app.paysapro-ai.fr`. Base : scripts SQL collés dans Supabase.
Stripe : voir `docs/STRIPE-SETUP.md`.

## 11. Reste à faire

1. Renseigner l'identité juridique (`VITE_LEGAL_*`, `VITE_DATA_REGION`) et faire relire les pages légales.
2. Créer un second compte et lancer le test d'isolation.
3. Brancher un service d'e-mail (SMTP Supabase, envoi des devis et des invitations).
4. Ouvrir Stripe en mode test et dérouler `docs/STRIPE-SETUP.md`.
5. IA distante avec quotas (clé d'API, fonction serveur, consentement).
6. Masquer les actions interdites selon le rôle ; blocage par offre des fonctionnalités restantes.
7. Vérifier les conditions de l'offre Vercel avant d'encaisser.
