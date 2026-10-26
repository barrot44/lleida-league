-- ════════════════════════════════════════════════════════════════════════════
--  LLEIDA LEAGUE — esquema de Supabase
--  Executa aquest fitxer sencer al "SQL Editor" del teu projecte (és idempotent).
--
--  Model: tot l'estat de la lliga es guarda en UNA fila JSON (id = 'main').
--    · Lectura: pública (la web la necessita per mostrar les dades).
--    · Escriptura: només usuaris autenticats que figurin a la taula `admins`.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Administradors ----------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Sense polítiques: ningú no la pot llegir/escriure des de la web, només des del SQL Editor.
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2) Estat de la lliga ----------------------------------------------------------
create table if not exists public.league_state (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.league_state enable row level security;

drop policy if exists "Lectura pública"          on public.league_state;
drop policy if exists "Només admins insereixen"  on public.league_state;
drop policy if exists "Només admins actualitzen" on public.league_state;
drop policy if exists "Només admins esborren"    on public.league_state;

create policy "Lectura pública"
  on public.league_state for select to anon, authenticated
  using (true);

create policy "Només admins insereixen"
  on public.league_state for insert to authenticated
  with check (public.is_admin());

create policy "Només admins actualitzen"
  on public.league_state for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Només admins esborren"
  on public.league_state for delete to authenticated
  using (public.is_admin());

-- 3) Marca de temps i autor controlats pel servidor (base del control de conflictes) -------
create or replace function public.touch_league_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists league_state_touch on public.league_state;
create trigger league_state_touch
  before insert or update on public.league_state
  for each row execute function public.touch_league_state();

-- 4) Dóna permisos d'administrador a un usuari ----------------------------------
--    Primer crea l'usuari a  Authentication → Users → "Add user"  (marca "Auto Confirm User"),
--    i després executa això amb el seu correu:
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'EL-TEU-CORREU@exemple.com'
-- on conflict do nothing;

-- 4b) Fotos: bucket públic «fotos» (lectura per a tothom, pujada només per a admins) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Fotos: lectura pública"      on storage.objects;
drop policy if exists "Fotos: admins pugen"         on storage.objects;
drop policy if exists "Fotos: admins actualitzen"   on storage.objects;
drop policy if exists "Fotos: admins esborren"      on storage.objects;

create policy "Fotos: lectura pública"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'fotos');

create policy "Fotos: admins pugen"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.is_admin());

create policy "Fotos: admins actualitzen"
  on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.is_admin()) with check (bucket_id = 'fotos' and public.is_admin());

create policy "Fotos: admins esborren"
  on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.is_admin());

-- 4c) Directe (OBS): estat dels gràfics en una fila JSON, en temps real ---------------------
create table if not exists public.obs_state (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.obs_state enable row level security;

drop policy if exists "OBS: lectura pública"     on public.obs_state;
drop policy if exists "OBS: admins insereixen"   on public.obs_state;
drop policy if exists "OBS: admins actualitzen"  on public.obs_state;

create policy "OBS: lectura pública"
  on public.obs_state for select to anon, authenticated
  using (true);

create policy "OBS: admins insereixen"
  on public.obs_state for insert to authenticated
  with check (public.is_admin());

create policy "OBS: admins actualitzen"
  on public.obs_state for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists obs_state_touch on public.obs_state;
create trigger obs_state_touch
  before insert or update on public.obs_state
  for each row execute function public.touch_updated_at();

-- La capa d'OBS rep els canvis a l'instant (Realtime). Si ja hi era, no passa res.
do $$
begin
  alter publication supabase_realtime add table public.obs_state;
exception
  when duplicate_object then null;
end
$$;

-- 4d) Votació de l'MVP del públic ------------------------------------------------------
--    Els admins obren i tanquen votacions; qualsevol visitant pot votar UN cop per votació
--    i només mentre està oberta. Els resultats es llegeixen amb mvp_tally() (sense exposar els vots).
create table if not exists public.mvp_polls (
  id         text primary key,
  match_id   text,
  title      text not null default 'Vota l''MVP del partit',
  candidates jsonb not null default '[]'::jsonb,
  status     text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at  timestamptz
);

alter table public.mvp_polls enable row level security;

drop policy if exists "MVP: lectura pública"        on public.mvp_polls;
drop policy if exists "MVP: admins creen"           on public.mvp_polls;
drop policy if exists "MVP: admins actualitzen"     on public.mvp_polls;
drop policy if exists "MVP: admins esborren"        on public.mvp_polls;

create policy "MVP: lectura pública"    on public.mvp_polls for select to anon, authenticated using (true);
create policy "MVP: admins creen"       on public.mvp_polls for insert to authenticated with check (public.is_admin());
create policy "MVP: admins actualitzen" on public.mvp_polls for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "MVP: admins esborren"    on public.mvp_polls for delete to authenticated using (public.is_admin());

create table if not exists public.mvp_votes (
  poll_id    text not null references public.mvp_polls (id) on delete cascade,
  voter      text not null check (char_length(voter) between 8 and 64),
  player_id  text not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter)
);

alter table public.mvp_votes enable row level security;

drop policy if exists "MVP: vota si està oberta" on public.mvp_votes;
drop policy if exists "MVP: admins netegen vots" on public.mvp_votes;

create policy "MVP: vota si està oberta"
  on public.mvp_votes for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.mvp_polls p
      where p.id = poll_id
        and p.status = 'open'
        and p.candidates @> jsonb_build_array(jsonb_build_object('id', player_id))
    )
  );

create policy "MVP: admins netegen vots"
  on public.mvp_votes for delete to authenticated
  using (public.is_admin());

create or replace function public.mvp_tally(p_poll text)
returns table (player_id text, votes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.player_id, count(*) from public.mvp_votes v where v.poll_id = p_poll group by v.player_id;
$$;

grant execute on function public.mvp_tally(text) to anon, authenticated;

-- (Els missatges de l'afició ja no existeixen: si havies creat la taula, s'esborra.)
drop table if exists public.fan_messages;

-- 4e) Avisos al mòbil (notificacions push de l'app) -----------------------------------
--    Els visitants s'hi apunten i se'n desapunten amb dues funcions (no poden llegir la taula);
--    l'enviament el fa /api/push amb la sessió d'un admin.
create table if not exists public.push_subscriptions (
  endpoint   text primary key check (char_length(endpoint) between 20 and 1000),
  p256dh     text not null check (char_length(p256dh) < 200),
  auth       text not null check (char_length(auth) < 100),
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.push_subscriptions (endpoint, p256dh, auth) values (p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;
$$;

create or replace function public.push_unsubscribe(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

create or replace function public.push_targets()
returns setof public.push_subscriptions
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select * from public.push_subscriptions;
end;
$$;

create or replace function public.push_forget(p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
end;
$$;

revoke all on function public.push_subscribe(text, text, text) from public;
revoke all on function public.push_unsubscribe(text) from public;
revoke all on function public.push_targets() from public;
revoke all on function public.push_forget(text[]) from public;
grant execute on function public.push_subscribe(text, text, text) to anon, authenticated;
grant execute on function public.push_unsubscribe(text) to anon, authenticated;
grant execute on function public.push_targets() to authenticated;
grant execute on function public.push_forget(text[]) to authenticated;

-- 5) (Opcional) Temps real: perquè els visitants rebin els canvis sense recarregar
-- alter publication supabase_realtime add table public.league_state;
