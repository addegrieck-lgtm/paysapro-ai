-- Paysapro AI — migration 0004 : équipe (invitations, rôles), limites par offre, suppression de compte.
--
-- Non destructive pour les données existantes (ajout d'une table, de fonctions et de déclencheurs).

-- ───────────────────────── Offre de l'entreprise (source de vérité côté serveur) ─────────────────────────

-- Nombre d'utilisateurs autorisés par l'abonnement. Mêmes valeurs que src/features/plans/plans.ts.
create or replace function public.company_user_limit(cid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when s.status = 'beta' then 10
      when s.status not in ('active', 'trialing', 'past_due') then 1
      when s.plan_id = 'starter' then 1
      when s.plan_id = 'pro' then 3
      when s.plan_id = 'business' then 10
      else 1
    end
    from public.subscriptions s where s.company_id = cid
  ), 1);
$$;

-- ───────────────────────── Invitations ─────────────────────────

create table if not exists public.company_invitations (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  email        text not null check (email = lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and length(email) <= 254),
  role         text not null default 'field' check (role in ('admin', 'office', 'field', 'read_only')),
  invited_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  unique (company_id, email)
);
create index if not exists company_invitations_email_idx on public.company_invitations (email) where accepted_at is null;

alter table public.company_invitations enable row level security;
create policy invitations_select on public.company_invitations for select to authenticated using (public.has_role(company_id, array['admin']));
create policy invitations_delete on public.company_invitations for delete to authenticated using (public.has_role(company_id, array['admin']));
-- Pas de politique INSERT : création via invite_member(), qui vérifie la limite de l'offre.

create or replace function public.invite_member(p_email text, p_role text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_used integer;
  v_id uuid;
begin
  select m.company_id into cid from public.company_members m where m.user_id = auth.uid() and m.role = 'admin' order by m.created_at limit 1;
  if cid is null then
    raise exception 'not_admin';
  end if;
  if p_role not in ('admin', 'office', 'field', 'read_only') then
    raise exception 'invalid_role';
  end if;
  if exists (select 1 from public.company_members m join auth.users u on u.id = m.user_id where m.company_id = cid and lower(u.email) = v_email) then
    raise exception 'already_member';
  end if;
  select (select count(*) from public.company_members where company_id = cid)
       + (select count(*) from public.company_invitations where company_id = cid and accepted_at is null and email <> v_email)
    into v_used;
  if v_used >= public.company_user_limit(cid) then
    raise exception 'user_limit_reached';
  end if;
  insert into public.company_invitations (company_id, email, role, invited_by)
  values (cid, v_email, p_role, auth.uid())
  on conflict (company_id, email) do update set role = excluded.role, accepted_at = null, invited_by = excluded.invited_by, created_at = now()
  returning id into v_id;
  return v_id;
end $$;

-- Appelée à la connexion par un utilisateur sans entreprise : rejoint l'entreprise qui l'a invité.
-- L'adresse e-mail doit être confirmée : on ne rejoint pas une entreprise avec l'adresse de quelqu'un d'autre.
create or replace function public.accept_pending_invitation() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  inv public.company_invitations;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.company_members where user_id = auth.uid()) then
    return null;
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  if v_email is null then
    return null;
  end if;
  select * into inv from public.company_invitations i where i.email = v_email and i.accepted_at is null order by i.created_at desc limit 1;
  if inv.id is null then
    return null;
  end if;
  if (select count(*) from public.company_members where company_id = inv.company_id) >= public.company_user_limit(inv.company_id) then
    raise exception 'user_limit_reached';
  end if;
  insert into public.company_members (company_id, user_id, role) values (inv.company_id, auth.uid(), inv.role);
  update public.company_invitations set accepted_at = now() where id = inv.id;
  return inv.company_id;
end $$;

-- Une entreprise garde toujours au moins un administrateur.
create or replace function public.keep_one_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    -- (la suppression en cascade de l'entreprise entière reste possible)
    if exists (select 1 from public.companies c where c.id = old.company_id)
       and not exists (select 1 from public.company_members m where m.company_id = old.company_id and m.role = 'admin' and m.id <> old.id) then
      raise exception 'last_admin';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists company_members_keep_admin on public.company_members;
create trigger company_members_keep_admin before update or delete on public.company_members for each row execute function public.keep_one_admin();

-- ───────────────────────── Suppression de compte (RGPD) ─────────────────────────
-- • seul membre de son entreprise : l'entreprise et toutes ses données sont supprimées ;
-- • membre parmi d'autres : seul son accès est retiré (les données restent à l'entreprise) ;
-- • dernier administrateur d'une entreprise à plusieurs : refusé, il doit d'abord nommer un autre administrateur.
-- Les fichiers photo sont retirés par l'application juste avant l'appel (API Storage).

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  m record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  for m in select company_id, role from public.company_members where user_id = auth.uid() loop
    if (select count(*) from public.company_members where company_id = m.company_id) = 1 then
      delete from public.companies where id = m.company_id;
    elsif m.role = 'admin' and not exists (
      select 1 from public.company_members o where o.company_id = m.company_id and o.role = 'admin' and o.user_id <> auth.uid()
    ) then
      raise exception 'last_admin';
    else
      delete from public.company_members where company_id = m.company_id and user_id = auth.uid();
    end if;
  end loop;
  delete from auth.users where id = auth.uid();
end $$;

-- ───────────────────────── Droits ─────────────────────────

revoke all on function public.company_user_limit(uuid) from public, anon, authenticated;
revoke all on function public.invite_member(text, text) from public, anon;
revoke all on function public.accept_pending_invitation() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.keep_one_admin() from public, anon, authenticated;
grant execute on function public.invite_member(text, text) to authenticated;
grant execute on function public.accept_pending_invitation() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
