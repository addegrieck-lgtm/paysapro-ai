# Mode cloud (Supabase) — mise en route

> Phase 1 : comptes, entreprise, données et photos en ligne, isolation par entreprise (RLS).
> Sans les deux variables `VITE_SUPABASE_*`, l'application reste en mode local, comme avant.

## 1. Créer la base

1. Supabase → votre projet → **SQL Editor** → *New query*.
2. Collez tout le contenu de `supabase/migrations/0001_init.sql`, puis **Run**.
   La migration ne supprime rien. Elle crée les tables, les règles RLS et le bucket privé `photos`.

## 2. Régler l'authentification

Supabase → **Authentication** :

- *URL Configuration* → **Site URL** : l'adresse de l'application (en développement : `http://localhost:5188`).
- *URL Configuration* → **Redirect URLs** : ajoutez `http://localhost:5188/**` et l'adresse de production.
- *Sign In / Providers* → **Email** : laissez « Confirm email » activé ; longueur minimale du mot de passe : 10.
- L'envoi d'e-mails intégré à Supabase est limité à quelques messages par heure : suffisant pour tester,
  pas pour de vrais utilisateurs (prévoir un service SMTP avant l'ouverture).

## 3. Brancher l'application

Dans `.env.local` (jamais envoyé sur GitHub) :

```
VITE_SUPABASE_URL=https://<projet>.supabase.co
VITE_SUPABASE_ANON_KEY=<clé « anon » / « publishable »>
```

La clé `anon` est publique par conception. La clé `service_role` ne doit **jamais** être copiée dans ce projet.

## 4. Vérifier l'isolation entre entreprises

1. Créez deux comptes (A et B) dans l'application, chacun avec son entreprise.
2. Dans un terminal, définissez `RLS_TEST_URL`, `RLS_TEST_ANON_KEY`, `RLS_TEST_A_EMAIL`, `RLS_TEST_A_PASSWORD`,
   `RLS_TEST_B_EMAIL`, `RLS_TEST_B_PASSWORD`, puis lancez `npm test`.
   Le test `tests/rls.integration.test.ts` vérifie que B ne peut ni lire, ni modifier, ni supprimer les données
   et les photos de A, et qu'un visiteur non connecté ne voit rien.

## Ce que fait la phase 1

| Élément | Détail |
|---|---|
| Tables | `profiles`, `companies`, `company_members`, `subscriptions`, `subscription_events`, `usage_tracking`, `clients`, `projects`, `quotes`, `catalog_items`, `quote_templates`, `project_photos`, `activity_events` |
| Isolation | `company_id` partout, RLS activée sur toutes les tables, aucun accès anonyme |
| Rôles | `admin`, `office`, `field`, `read_only` (appliqués par la base) |
| Photos | bucket privé, 5 Mo max, JPEG / PNG / WebP uniquement |
| Abonnement | une ligne `beta` créée avec l'entreprise ; modifiable uniquement côté serveur |

Les objets métier sont stockés en `jsonb` (mêmes objets que l'application), avec les colonnes de relation à part.
Les lignes de devis et les mesures restent donc dans le devis et le chantier : pas encore de tables
`quote_items` / `project_measurements` séparées.

## Pas encore fait

Lien public du devis et signature côté serveur, envoi par e-mail, invitations d'équipe, Stripe, IA distante,
suppression de compte, import automatique des données locales (l'import d'une sauvegarde JSON fonctionne).
