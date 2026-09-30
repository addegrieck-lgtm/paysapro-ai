-- Paysapro AI — migration 0001 : comptes, entreprises, données métier, RLS, stockage des photos.
--
-- À exécuter une seule fois dans Supabase → SQL Editor (ou `supabase db push`).
-- Non destructive : ne supprime ni ne modifie aucune table existante.
--
-- Principe d'isolation :  utilisateur → company_members → company_id → données.
-- Chaque table métier porte company_id ; RLS est activée partout ; aucune politique n'accorde
-- d'accès au rôle « anon ». Le navigateur n'utilise que la clé publique « anon ».
--
-- Les objets métier (client, chantier, devis…) sont stockés dans une colonne `data jsonb`
-- (mêmes objets TypeScript que l'application), avec les colonnes utiles aux relations et aux
-- recherches sorties à part (client_id, project_id, status, number, public_token).

create extension if not exists pgcrypto;

-- ───────────────────────── Utilitaires ─────────────────────────

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────── Profils ─────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null default '',
  first_name  text not null default '',
  last_name   text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Crée le profil à l'inscription (prénom / nom transmis dans les métadonnées d'inscription).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 80),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 80)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ───────────────────────── Entreprises et membres ─────────────────────────

create table if not exists public.companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default '',
  legal_name   text not null default '',
  siret        text not null default '',
  address      text not null default '',
  postal_code  text not null default '',
  city         text not null default '',
  phone        text not null default '',
  email        text not null default '',
  logo_url     text,
  -- Réglages de l'application (objet AppSettings : TVA, acompte, numérotation, mode SAP…)
  settings     jsonb not null default '{}'::jsonb,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger companies_updated before update on public.companies for each row execute function public.set_updated_at();

create table if not exists public.company_members (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'field' check (role in ('admin', 'office', 'field', 'read_only')),
  created_at  timestamptz not null default now(),
  unique (company_id, user_id)
);
create index if not exists company_members_user_idx on public.company_members (user_id);

-- Fonctions d'appartenance (security definer : évitent la récursion des politiques RLS).
create or replace function public.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members m where m.company_id = cid and m.user_id = auth.uid());
$$;

create or replace function public.has_role(cid uuid, roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = auth.uid() and m.role = any (roles)
  );
$$;

revoke all on function public.is_member(uuid) from public;
revoke all on function public.has_role(uuid, text[]) from public;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.has_role(uuid, text[]) to authenticated;

-- ───────────────────────── Abonnements ─────────────────────────

create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null unique references public.companies (id) on delete cascade,
  plan_id                 text not null default 'beta' check (plan_id in ('beta', 'starter', 'pro', 'business')),
  status                  text not null default 'beta' check (status in ('beta', 'active', 'trialing', 'past_due', 'canceled', 'inactive')),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();

-- Journal des événements Stripe (écrit uniquement par le webhook, côté serveur).
create table if not exists public.subscription_events (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references public.companies (id) on delete cascade,
  stripe_event_id  text unique,
  type             text not null,
  payload          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

-- Compteurs d'usage par mois (IA, PDF…) : écrits uniquement côté serveur.
create table if not exists public.usage_tracking (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  kind        text not null,
  period      date not null,
  count       integer not null default 0 check (count >= 0),
  updated_at  timestamptz not null default now(),
  unique (company_id, kind, period)
);

-- ───────────────────────── Création d'une entreprise ─────────────────────────
-- Seul moyen de créer une entreprise : l'appelant en devient administrateur et reçoit
-- l'abonnement « bêta ». Une seule entreprise par utilisateur pour l'instant.

create or replace function public.create_company(p_name text, p_settings jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.company_members where user_id = auth.uid()) then
    raise exception 'already_member';
  end if;
  insert into public.companies (name, settings, created_by)
  values (left(coalesce(p_name, ''), 200), coalesce(p_settings, '{}'::jsonb), auth.uid())
  returning id into cid;
  insert into public.company_members (company_id, user_id, role) values (cid, auth.uid(), 'admin');
  insert into public.subscriptions (company_id, plan_id, status) values (cid, 'beta', 'beta');
  return cid;
end $$;

revoke all on function public.create_company(text, jsonb) from public;
grant execute on function public.create_company(text, jsonb) to authenticated;

-- ───────────────────────── Données métier ─────────────────────────

create table if not exists public.clients (
  id          uuid primary key,
  company_id  uuid not null references public.companies (id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists clients_company_idx on public.clients (company_id) where deleted_at is null;
create trigger clients_updated before update on public.clients for each row execute function public.set_updated_at();

create table if not exists public.projects (
  id          uuid primary key,
  company_id  uuid not null references public.companies (id) on delete cascade,
  client_id   uuid references public.clients (id) on delete set null,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists projects_company_idx on public.projects (company_id) where deleted_at is null;
create index if not exists projects_client_idx on public.projects (client_id);
create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();

create table if not exists public.quotes (
  id            uuid primary key,
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete set null,
  client_id     uuid references public.clients (id) on delete set null,
  number        text,
  status        text not null default 'draft',
  -- Jeton aléatoire du lien client : jamais l'identifiant interne
  public_token  text unique,
  data          jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists quotes_company_idx on public.quotes (company_id) where deleted_at is null;
create index if not exists quotes_project_idx on public.quotes (project_id);
create index if not exists quotes_client_idx on public.quotes (client_id);
create trigger quotes_updated before update on public.quotes for each row execute function public.set_updated_at();

create table if not exists public.catalog_items (
  id          uuid primary key,
  company_id  uuid not null references public.companies (id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists catalog_items_company_idx on public.catalog_items (company_id);
create trigger catalog_items_updated before update on public.catalog_items for each row execute function public.set_updated_at();

-- Les modèles fournis ont des identifiants lisibles (texte), propres à chaque entreprise.
create table if not exists public.quote_templates (
  company_id  uuid not null references public.companies (id) on delete cascade,
  id          text not null,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (company_id, id)
);
create trigger quote_templates_updated before update on public.quote_templates for each row execute function public.set_updated_at();

-- Métadonnées des photos ; les fichiers sont dans le bucket privé « photos ».
create table if not exists public.project_photos (
  id           uuid primary key,
  company_id   uuid not null references public.companies (id) on delete cascade,
  project_id   uuid references public.projects (id) on delete cascade,
  data         jsonb not null,
  created_at   timestamptz not null default now()
);
create index if not exists project_photos_company_idx on public.project_photos (company_id);
create index if not exists project_photos_project_idx on public.project_photos (project_id);

create table if not exists public.activity_events (
  id          uuid primary key,
  company_id  uuid not null references public.companies (id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists activity_events_company_idx on public.activity_events (company_id, created_at desc);

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.profiles            enable row level security;
alter table public.companies           enable row level security;
alter table public.company_members     enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.subscription_events enable row level security;
alter table public.usage_tracking      enable row level security;
alter table public.clients             enable row level security;
alter table public.projects            enable row level security;
alter table public.quotes              enable row level security;
alter table public.catalog_items       enable row level security;
alter table public.quote_templates     enable row level security;
alter table public.project_photos      enable row level security;
alter table public.activity_events     enable row level security;

-- Profils : le sien, et ceux des collègues de la même entreprise (lecture seule).
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.company_members me
      join public.company_members other on other.company_id = me.company_id
      where me.user_id = auth.uid() and other.user_id = profiles.id
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Entreprises : lecture par les membres, modification par les administrateurs.
-- Pas de politique INSERT ni DELETE : création via create_company(), suppression côté serveur.
create policy companies_select on public.companies for select to authenticated using (public.is_member(id));
create policy companies_update on public.companies for update to authenticated
  using (public.has_role(id, array['admin', 'office'])) with check (public.has_role(id, array['admin', 'office']));

-- Membres : visibles par les membres ; gérés par les administrateurs.
create policy members_select on public.company_members for select to authenticated using (public.is_member(company_id));
create policy members_insert on public.company_members for insert to authenticated
  with check (public.has_role(company_id, array['admin']));
create policy members_update on public.company_members for update to authenticated
  using (public.has_role(company_id, array['admin'])) with check (public.has_role(company_id, array['admin']));
create policy members_delete on public.company_members for delete to authenticated
  using (public.has_role(company_id, array['admin']) and user_id <> auth.uid());

-- Abonnement et usage : lecture seule pour les membres. Écriture réservée au serveur (webhook Stripe).
create policy subscriptions_select on public.subscriptions for select to authenticated using (public.is_member(company_id));
create policy usage_select on public.usage_tracking for select to authenticated using (public.is_member(company_id));
-- subscription_events : aucune politique → inaccessible depuis le navigateur.

-- Données métier : lecture par tous les membres ; écriture selon le rôle (read_only ne peut rien modifier).
do $$
declare
  t text;
begin
  foreach t in array array['clients', 'projects', 'quotes', 'project_photos', 'activity_events'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(company_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_role(company_id, array[''admin'', ''office'', ''field'']))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_role(company_id, array[''admin'', ''office'', ''field''])) with check (public.has_role(company_id, array[''admin'', ''office'', ''field'']))', t || '_update', t);
    -- Suppression : administration et bureau ; le terrain peut retirer une photo qu'il vient de prendre.
    if t = 'project_photos' then
      execute format('create policy %I on public.%I for delete to authenticated using (public.has_role(company_id, array[''admin'', ''office'', ''field'']))', t || '_delete', t);
    else
      execute format('create policy %I on public.%I for delete to authenticated using (public.has_role(company_id, array[''admin'', ''office'']))', t || '_delete', t);
    end if;
  end loop;
  -- Catalogue et modèles (prix de l'entreprise) : réservés à l'administration et au bureau.
  foreach t in array array['catalog_items', 'quote_templates'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(company_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_role(company_id, array[''admin'', ''office'']))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_role(company_id, array[''admin'', ''office''])) with check (public.has_role(company_id, array[''admin'', ''office'']))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_role(company_id, array[''admin'', ''office'']))', t || '_delete', t);
  end loop;
end $$;

-- Une ligne ne peut pas changer d'entreprise.
create or replace function public.forbid_company_change() returns trigger
language plpgsql as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'company_id is immutable';
  end if;
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['clients', 'projects', 'quotes', 'catalog_items', 'quote_templates', 'project_photos', 'activity_events', 'company_members'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.forbid_company_change()', t || '_company_lock', t);
  end loop;
end $$;

-- ───────────────────────── Stockage des photos ─────────────────────────
-- Bucket PRIVÉ. Chemin : {company_id}/{photo_id}/thumb.jpg | medium.jpg
-- Taille limitée à 5 Mo, images JPEG / PNG / WebP uniquement (contrôlé par Supabase, côté serveur).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Le premier dossier du chemin doit être une entreprise dont l'utilisateur est membre.
create or replace function public.storage_company(object_name text) returns uuid
language plpgsql immutable as $$
begin
  return (split_part(object_name, '/', 1))::uuid;
exception when others then
  return null;
end $$;

create policy photos_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_member(public.storage_company(name)));
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.has_role(public.storage_company(name), array['admin', 'office', 'field']));
create policy photos_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.has_role(public.storage_company(name), array['admin', 'office', 'field']))
  with check (bucket_id = 'photos' and public.has_role(public.storage_company(name), array['admin', 'office', 'field']));
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.has_role(public.storage_company(name), array['admin', 'office', 'field']));
