# Migration vers le cloud (Supabase) — guide de préparation

> Statut : **préparé, non activé**. La bêta fonctionne à 0 €, 100 % dans le navigateur (IndexedDB).
> Ce document décrit comment brancher un backend sans réécrire l'application.

## Pourquoi migrer ?

| Besoin | Impossible sans backend | Apporté par Supabase |
|---|---|---|
| Lien public `/quote/:token` ouvert par le client chez lui | ✔ | Table `quotes` + lecture par jeton |
| Multi-appareils, sauvegarde automatique | ✔ | PostgreSQL + Auth |
| Équipes (plusieurs utilisateurs par entreprise) | ✔ | Auth + RLS |
| Notification quand le client signe (même application fermée) | ✔ | Realtime / Edge Functions + e-mail |
| Collecte réelle des inscriptions bêta | ✔ | Table `beta_leads` (insertion publique) |
| IA distante (analyse photo) sans exposer de clé | ✔ | Edge Function qui détient la clé |

Offre gratuite Supabase suffisante pour démarrer (projet unique, quotas limités).

## Ce qui est déjà prêt dans le code

| Abstraction | Implémentation bêta | À créer |
|---|---|---|
| `StorageProvider` (`src/services/storage`) | `IndexedDBProvider` | `CloudStorageProvider` : implémenter `CloudApi` |
| `AuthProvider` (`src/services/auth`) | `LocalAuthProvider` (sans mot de passe) | `CloudAuthProvider` avec `supabase.auth` |
| `BetaLeadProvider`, `ContactProvider` (`src/services/forms`) | stockage local + e-mail pré-rempli | `SupabaseBetaLeadProvider` |
| `AnalyticsProvider` | `LocalAnalyticsProvider` | fournisseur distant **avec consentement** |
| `AIProvider` | `LocalAIProvider`, `MockAIProvider` | `ExternalAIProvider` → Edge Function |
| `PaymentProvider` | `ManualPaymentProvider`, `MockPaymentProvider` | `StripeProvider` (webhooks côté serveur) |
| `SignatureProvider` | `LocalSignatureProvider` | prestataire eIDAS (Yousign…) |
| Vue publique du devis | `toPublicQuote()` (`src/features/quotes/publicView.ts`) | exposée telle quelle par l'API |
| Plans | `getCurrentPlan()`, `hasFeature()`, `canUseFeature()` | plan lu depuis le compte |

## 1. Auth

- Activer l'authentification e-mail (lien magique ou mot de passe).
- `CloudAuthProvider.signUp/signIn/signOut/getCurrentUser/resetPassword` → `supabase.auth.*`.
- Au premier login : proposer d'**importer la sauvegarde locale** (`storage.exportAll()` du `IndexedDBProvider` → insertion cloud).

## 2. PostgreSQL (schéma indicatif)

Chaque table porte `user_id uuid references auth.users` et une colonne `data jsonb` (les objets TypeScript actuels), ce qui permet une migration très rapide ; on normalisera ensuite ce qui doit être requêté.

```sql
create table public.settings  (user_id uuid primary key references auth.users, data jsonb not null);
create table public.clients   (id uuid primary key, user_id uuid not null references auth.users, data jsonb not null, updated_at timestamptz default now());
create table public.projects  (id uuid primary key, user_id uuid not null references auth.users, data jsonb not null, updated_at timestamptz default now());
create table public.quotes    (id uuid primary key, user_id uuid not null references auth.users, public_token text unique, data jsonb not null, updated_at timestamptz default now());
create table public.catalog   (id uuid primary key, user_id uuid not null references auth.users, data jsonb not null);
create table public.templates (id text primary key, user_id uuid not null references auth.users, data jsonb not null);
create table public.activity  (id uuid primary key, user_id uuid not null references auth.users, data jsonb not null, created_at timestamptz default now());
create table public.beta_leads (id uuid primary key default gen_random_uuid(), data jsonb not null, created_at timestamptz default now());

alter table public.clients enable row level security;
create policy "propriétaire" on public.clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- idem pour settings, projects, quotes, catalog, templates, activity

alter table public.beta_leads enable row level security;
create policy "inscription publique" on public.beta_leads for insert with check (true);  -- lecture réservée à l'équipe
```

### Page client publique

Ne **jamais** ouvrir la table `quotes` en lecture publique : elle contient coûts et marges.
Créer une fonction (RPC ou Edge Function) `get_public_quote(token)` qui renvoie **uniquement** l'objet `PublicQuoteView` (même logique que `toPublicQuote()`), et `sign_public_quote(token, signature)` pour enregistrer la signature.

## 3. Storage (photos)

- Bucket privé `photos/{user_id}/{photo_id}/thumb.jpg|medium.jpg`.
- Les photos choisies pour le devis sont servies au client via des URL signées générées par `get_public_quote`.

## 4. Realtime

- Abonnement aux changements de `quotes` (statut `viewed` / `signed`) → notification « 🎉 Jean Dupont vient de signer le devis #2026-008 » en direct, et e-mail via Edge Function.

## 5. Sécurité

- Seule la clé **publique** (`anon`) va dans `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ; jamais la clé `service_role`.
- Toutes les règles d'accès reposent sur RLS.
- Les clés d'API tierces (IA, Stripe, e-mail) restent dans les secrets des Edge Functions.

## 6. Bascule

1. Implémenter `CloudApi` avec `@supabase/supabase-js`.
2. Dans `src/services/storage/index.ts`, `createProvider()` renvoie `new CloudStorageProvider(api)` quand l'utilisateur est connecté, `IndexedDBProvider` sinon (mode hors-ligne à conserver comme cache).
3. Remplacer `auth` par `new CloudAuthProvider()`.
4. Passer `APP_CONFIG.subscriptionsEnabled` à `true` uniquement le jour du lancement commercial.
