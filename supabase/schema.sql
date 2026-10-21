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

-- 5) (Opcional) Temps real: perquè els visitants rebin els canvis sense recarregar
-- alter publication supabase_realtime add table public.league_state;
