-- Paysapro AI — migration 0003 : lien public du devis et signature enregistrée côté serveur.
--
-- Non destructive (ajout de colonnes, d'une table et de fonctions).
--
-- Principe :
--  • quand le professionnel envoie un devis, l'application enregistre sa « vue publique »
--    (quotes.public_view) : exactement ce que le client a le droit de voir — jamais les coûts,
--    la marge ni les notes internes ;
--  • le client ouvre le lien /quote/<jeton>. Sans compte, il ne peut appeler que les trois fonctions
--    ci-dessous, qui ne renvoient que cette vue publique pour ce jeton précis ;
--  • la table quotes reste inaccessible aux visiteurs.

alter table public.quotes add column if not exists public_view jsonb;
alter table public.quotes add column if not exists published_at timestamptz;

-- ───────────────────────── Signatures ─────────────────────────

create table if not exists public.signatures (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  quote_id        uuid not null references public.quotes (id) on delete cascade,
  signer_name     text not null,
  signed_at       timestamptz not null default now(),
  image_data_url  text not null,
  -- Empreinte SHA-256 de la vue publique du devis au moment de la signature
  content_hash    text not null,
  user_agent      text not null default '',
  source          text not null default 'public_link',
  created_at      timestamptz not null default now()
);
create index if not exists signatures_quote_idx on public.signatures (quote_id);

alter table public.signatures enable row level security;
-- Lecture par les membres de l'entreprise ; aucune écriture depuis le navigateur (uniquement sign_public_quote).
create policy signatures_select on public.signatures for select to authenticated using (public.is_member(company_id));

-- ───────────────────────── Un devis signé ne peut plus être modifié ─────────────────────────
-- Protège contre l'écrasement d'une signature par une application restée ouverte avec d'anciennes données.
-- Les paiements et le suivi restent modifiables.

create or replace function public.protect_signed_quote() returns trigger
language plpgsql as $$
begin
  if old.status = 'signed' and old.data ? 'signature' and jsonb_typeof(old.data -> 'signature') = 'object' then
    new.status := 'signed';
    new.data := new.data || jsonb_build_object(
      'status', 'signed',
      'signature', old.data -> 'signature',
      'acceptedAt', old.data -> 'acceptedAt',
      'lines', old.data -> 'lines',
      'description', old.data -> 'description',
      'terms', old.data -> 'terms',
      'vatRate', old.data -> 'vatRate',
      'vatExempt', old.data -> 'vatExempt',
      'depositPercent', old.data -> 'depositPercent',
      'number', old.data -> 'number'
    );
    new.number := old.number;
    if old.public_view is not null then
      new.public_view := old.public_view;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists quotes_protect_signed on public.quotes;
create trigger quotes_protect_signed before update on public.quotes for each row execute function public.protect_signed_quote();

-- ───────────────────────── Fonctions publiques (par jeton) ─────────────────────────

-- Ligne du devis publié correspondant au jeton (usage interne).
create or replace function public.published_quote(p_token text) returns public.quotes
language sql stable security definer set search_path = public as $$
  select q.* from public.quotes q
  where p_token is not null
    and length(p_token) between 20 and 64
    and q.public_token = p_token
    and q.published_at is not null
    and q.public_view is not null
    and q.deleted_at is null
  limit 1;
$$;

create or replace function public.log_quote_event(p_quote public.quotes, p_message text, p_kind text) returns void
language sql security definer set search_path = public as $$
  insert into public.activity_events (id, company_id, data)
  select e.id, p_quote.company_id, jsonb_build_object(
    'id', e.id, 'projectId', p_quote.project_id, 'message', left(p_message, 600),
    'kind', p_kind, 'notify', true, 'read', false, 'createdAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  from (select gen_random_uuid() as id) e;
$$;

-- Consultation : renvoie la vue publique ; marque le devis « vu » à la première ouverture.
create or replace function public.get_public_quote(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q public.quotes;
  now_iso text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  q := public.published_quote(p_token);
  if q.id is null then
    return null;
  end if;
  if q.status = 'sent' then
    update public.quotes
      set status = 'viewed',
          data = data || jsonb_build_object('status', 'viewed', 'viewedAt', now_iso),
          public_view = public_view || jsonb_build_object('status', 'viewed')
      where id = q.id
      returning * into q;
    perform public.log_quote_event(q, '👀 ' || coalesce(q.public_view #>> '{client,displayName}', 'Le client') || ' a consulté le devis #' || coalesce(q.number, '') || '.', 'viewed');
  end if;
  return jsonb_build_object('view', q.public_view, 'companyId', q.company_id);
end $$;

-- Signature : date et heure du serveur, empreinte calculée par le serveur.
create or replace function public.sign_public_quote(p_token text, p_signer_name text, p_image text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q public.quotes;
  v_name text := btrim(coalesce(p_signer_name, ''));
  v_now timestamptz := now();
  now_iso text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_hash text;
  v_agent text := '';
  v_sig jsonb;
  v_until text;
begin
  q := public.published_quote(p_token);
  if q.id is null then
    raise exception 'quote_not_found';
  end if;
  if q.status not in ('sent', 'viewed', 'accepted') then
    raise exception 'quote_not_signable';
  end if;
  v_until := q.public_view ->> 'validUntil';
  if q.status <> 'accepted' and v_until is not null and v_until::timestamptz < v_now then
    raise exception 'quote_expired';
  end if;
  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'invalid_name';
  end if;
  if p_image is null or p_image !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' or length(p_image) > 400000 then
    raise exception 'invalid_signature';
  end if;
  begin
    v_agent := left(coalesce(current_setting('request.headers', true)::json ->> 'user-agent', ''), 300);
  exception when others then
    v_agent := '';
  end;
  v_hash := encode(sha256(convert_to(q.public_view::text, 'UTF8')), 'hex');

  insert into public.signatures (company_id, quote_id, signer_name, signed_at, image_data_url, content_hash, user_agent)
  values (q.company_id, q.id, v_name, v_now, p_image, v_hash, v_agent);

  v_sig := jsonb_build_object('provider', 'online', 'signerName', v_name, 'signedAt', now_iso, 'imageDataUrl', p_image, 'contentHash', v_hash, 'userAgent', v_agent);
  update public.quotes
    set status = 'signed',
        data = data || jsonb_build_object(
          'status', 'signed',
          'signature', v_sig,
          'acceptedAt', case when coalesce(data ->> 'acceptedAt', '') = '' then to_jsonb(now_iso) else data -> 'acceptedAt' end),
        public_view = public_view || jsonb_build_object('status', 'signed', 'signature', jsonb_build_object('signerName', v_name, 'signedAt', now_iso, 'imageDataUrl', p_image))
    where id = q.id
    returning * into q;
  perform public.log_quote_event(q, '🎉 ' || v_name || ' vient de signer le devis #' || coalesce(q.number, '') || '.', 'signed');
  return jsonb_build_object('view', q.public_view, 'companyId', q.company_id);
end $$;

-- Refus, avec un commentaire facultatif transmis au professionnel.
create or replace function public.refuse_public_quote(p_token text, p_comment text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q public.quotes;
  now_iso text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_comment text := left(btrim(coalesce(p_comment, '')), 500);
begin
  q := public.published_quote(p_token);
  if q.id is null then
    raise exception 'quote_not_found';
  end if;
  if q.status not in ('sent', 'viewed') then
    raise exception 'quote_not_refusable';
  end if;
  update public.quotes
    set status = 'refused',
        data = data || jsonb_build_object('status', 'refused', 'refusedAt', now_iso),
        public_view = public_view || jsonb_build_object('status', 'refused')
    where id = q.id
    returning * into q;
  perform public.log_quote_event(
    q,
    coalesce(q.public_view #>> '{client,displayName}', 'Le client') || ' a refusé le devis #' || coalesce(q.number, '') || '.'
      || case when v_comment <> '' then ' Commentaire : « ' || v_comment || ' »' else '' end,
    'info');
  return jsonb_build_object('view', q.public_view, 'companyId', q.company_id);
end $$;

-- Photos choisies pour un devis publié : lisibles par le client via le lien (bucket toujours privé).
create or replace function public.is_published_photo(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.quotes q
    where q.company_id = public.storage_company(object_name)
      and q.published_at is not null
      and q.deleted_at is null
      and q.data -> 'includedPhotoIds' ? split_part(object_name, '/', 2)
  );
$$;

create policy photos_published_select on storage.objects for select to anon
  using (bucket_id = 'photos' and public.is_published_photo(name));

-- Droits : seules ces fonctions sont ouvertes aux visiteurs.
revoke all on function public.published_quote(text) from public, anon, authenticated;
revoke all on function public.log_quote_event(public.quotes, text, text) from public, anon, authenticated;
revoke all on function public.protect_signed_quote() from public, anon, authenticated;
revoke all on function public.get_public_quote(text) from public;
revoke all on function public.sign_public_quote(text, text, text) from public;
revoke all on function public.refuse_public_quote(text, text) from public;
revoke all on function public.is_published_photo(text) from public;
grant execute on function public.get_public_quote(text) to anon, authenticated;
grant execute on function public.sign_public_quote(text, text, text) to anon, authenticated;
grant execute on function public.refuse_public_quote(text, text) to anon, authenticated;
grant execute on function public.is_published_photo(text) to anon, authenticated;
grant execute on function public.storage_company(text) to anon;
