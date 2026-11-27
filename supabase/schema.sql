-- =====================================================================
-- NEXORA AIR VA · esquema de Supabase (PostgreSQL + Auth + Storage)
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- Es idempotente: se puede volver a ejecutar sin perder datos.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- perfiles de piloto ----------
-- 'public' guarda lo que ve cualquiera; 'private' solo el propio piloto y el staff de pilotos.
create sequence if not exists public.pilot_seq start 101;
-- Si la secuencia venía de una versión anterior (empezaba en 1), el siguiente ID será el 101.
do $$ begin
  if (select last_value from public.pilot_seq) < 100 then perform setval('public.pilot_seq', 100, true); end if;
end $$;

create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  code      text unique not null,                 -- ID de piloto: NXR101, NXR102…
  status    text not null default 'Pending',      -- Pending | Active | Inactive | Suspended
  rol       text,                                 -- null | 'admin' | id de un nivel de nx_docs(coll='roles')
  net_ok    boolean not null default false,       -- plataforma VATSIM/IVAO verificada por el staff
  h_adj     numeric not null default 0,           -- ajuste de horas de vuelo (+/-); solo lo cambia un administrador
  joined    timestamptz not null default now(),
  data      jsonb not null default '{}'::jsonb    -- nombre, país, plataforma, hub, favoritos, logros…
);
-- El ID de piloto es NXR + 3 o 4 cifras. 'not valid': no revisa los perfiles antiguos (NX0001…);
-- se migran con supabase/migrations/001_ids_nxr.sql.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_code_fmt') then
    alter table public.profiles add constraint profiles_code_fmt check (code ~ '^NXR[0-9]{3,4}$') not valid;
  end if;
end $$;
alter table public.profiles add column if not exists h_adj numeric not null default 0;   -- bases ya creadas
create table if not exists public.profile_private (
  id   uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb         -- IDs de VATSIM/IVAO y de SimBrief
);

-- ---------- almacén de documentos del VA ----------
-- Una fila por elemento: flota, tours, reservas, logbook, noticias, redes, marca…
create table if not exists public.nx_docs (
  coll       text not null,
  id         text not null,
  owner      uuid references auth.users(id) on delete set null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);
create index if not exists nx_docs_owner_idx on public.nx_docs(owner);

-- ---------- permisos ----------
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when pr.rol = 'admin' then true
      when pr.rol is null   then false
      when p = 'admin'      then false
      else exists (select 1 from public.nx_docs d
                   where d.coll = 'roles' and d.id = pr.rol and d.data->'perms' ? p)
    end
    from public.profiles pr where pr.id = auth.uid()), false)
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select pr.rol is not null from public.profiles pr where pr.id = auth.uid()), false)
$$;

-- Tipo y permiso de cada colección
--  public : lectura para todo el mundo     shared  : lectura para cualquier piloto con sesión
--  own    : cada piloto escribe lo suyo    secure  : solo staff
create or replace function public.coll_kind(c text) returns text language sql immutable as $$
  select case
    when c in ('fleet','tours','events','cal','flights','news','social','brand','docs','ap','routeCodes','remarks','site') then 'public'
    when c in ('roles','res','log','tx') then 'shared'
    when c in ('notes','tickets','inc','enroll','accept','delReq','revReq') then 'own'
    else 'secure'
  end
$$;
create or replace function public.coll_perm(c text) returns text language sql immutable as $$
  select case
    when c in ('fleet','ap') then 'flota'
    when c in ('tours','events','cal','flights','routeCodes','remarks') then 'operaciones'
    when c in ('news','docs') then 'noticias'
    when c = 'social' then 'redes'
    when c in ('brand','roles') then 'admin'
    when c in ('res','log','tx','tickets','inc','notes') then 'revision'
    when c in ('accept','enroll','delReq','revReq') then 'pilotos'
    else 'sistema'
  end
$$;

alter table public.profiles        enable row level security;
alter table public.profile_private enable row level security;
alter table public.nx_docs         enable row level security;

-- profiles: los activos son visibles (ranking, web pública); el resto, el propio piloto y el staff
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (status = 'Active' or id = auth.uid() or public.has_perm('pilotos'));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.has_perm('pilotos'))
  with check (id = auth.uid() or public.has_perm('pilotos'));
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete using (public.has_perm('pilotos'));

-- Un piloto no puede cambiar su estado, rol ni verificación; solo el staff de pilotos
-- (y solo un admin puede tocar el campo rol).
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;                 -- consola SQL / service role
  if new.joined is distinct from old.joined then
    raise exception 'campo protegido';
  end if;
  -- el ID de piloto solo lo cambia el staff de pilotos, con formato NXR + 3 o 4 cifras (único por la restricción UNIQUE)
  if new.code is distinct from old.code then
    if not public.has_perm('pilotos') then raise exception 'solo el staff de pilotos puede cambiar el ID'; end if;
    if new.code !~ '^NXR[0-9]{3,4}$' then raise exception 'ID no válido: usa NXR y 3 o 4 cifras'; end if;
  end if;
  if (new.status is distinct from old.status or new.net_ok is distinct from old.net_ok)
     and not public.has_perm('pilotos') then
    raise exception 'sin permiso para cambiar estado o verificación';
  end if;
  if new.h_adj is distinct from old.h_adj and not public.has_perm('admin') then
    raise exception 'solo un administrador puede ajustar las horas de vuelo';
  end if;
  if new.rol is distinct from old.rol and not public.has_perm('admin') then
    raise exception 'solo un administrador puede cambiar roles';
  end if;
  if old.rol = 'admin' and new.rol is distinct from 'admin'
     and (select count(*) from public.profiles where rol = 'admin') < 2 then
    raise exception 'debe quedar al menos un administrador';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

drop policy if exists pp_read on public.profile_private;
create policy pp_read on public.profile_private for select
  using (id = auth.uid() or public.has_perm('pilotos'));
drop policy if exists pp_write on public.profile_private;
create policy pp_write on public.profile_private for all
  using (id = auth.uid() or public.has_perm('pilotos'))
  with check (id = auth.uid() or public.has_perm('pilotos'));

-- Rechazar una alta o eliminar una cuenta: borra el perfil, sus datos y el usuario de acceso, para que
-- tenga que volver a registrarse (con el mismo correo si quiere). Solo staff con permiso "pilotos";
-- no permite borrar cuentas de staff ni la propia.
create or replace function public.remove_pilot(p_uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_code text; v_rol text;
begin
  if auth.uid() is not null and not public.has_perm('pilotos') then raise exception 'sin permiso'; end if;
  select code, rol into v_code, v_rol from public.profiles where id = p_uid;
  if not found then return; end if;
  if v_rol is not null then raise exception 'es una cuenta de staff: quítale antes el nivel'; end if;
  if p_uid = auth.uid() then raise exception 'no puedes eliminar tu propia cuenta desde aquí'; end if;
  delete from public.nx_docs where owner = p_uid;
  delete from public.nx_docs where (coll in ('enroll','delReq','revReq') and id = v_code)
                                or (coll = 'accept' and id like v_code || '-%')
                                or (coll = 'notes' and data->>'go' = 's-pilotos' and data->>'text' like '%(' || v_code || ')%');
  delete from auth.users where id = p_uid;                 -- borra profiles y profile_private en cascada
end $$;
revoke all on function public.remove_pilot(uuid) from public, anon;
grant execute on function public.remove_pilot(uuid) to authenticated;

-- Siguiente ID libre: NXR101, NXR102… cuenta siempre hacia arriba y salta los que ya estén en uso.
create or replace function public.next_pilot_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  loop
    c := 'NXR' || lpad(nextval('public.pilot_seq')::text, 3, '0');
    exit when not exists (select 1 from public.profiles where code = c);
  end loop;
  return c;
end $$;

-- Alta automática del perfil al registrarse. El PRIMER usuario es admin (propietario del VA).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_user boolean; md jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
        v_code text; v_name text;
begin
  select not exists (select 1 from public.profiles) into first_user;
  v_code := public.next_pilot_code();
  v_name := left(coalesce(md->>'name', split_part(new.email,'@',1)), 80);
  insert into public.profiles(id, code, status, rol, net_ok, data)
  values (new.id, v_code,
          case when first_user then 'Active' else 'Pending' end,
          case when first_user then 'admin' end, first_user,
          jsonb_build_object('name', v_name,
                             'country', left(coalesce(md->>'country',''), 2),
                             'user', left(coalesce(md->>'user', split_part(new.email,'@',1)), 40),
                             'platform', case when md->>'platform' = 'IVAO' then 'IVAO' else 'VATSIM' end,
                             'hub', 'LEMD', 'fav', '[]'::jsonb, 'favT', '[]'::jsonb, 'badges', '[]'::jsonb));
  insert into public.profile_private(id, data)
  values (new.id, jsonb_build_object('vatsim', left(coalesce(md->>'vatsim',''), 20),
                                     'ivao', left(coalesce(md->>'ivao',''), 20),
                                     'simbrief', left(coalesce(md->>'simbrief',''), 40)));
  -- Aviso al staff: una notificación (campana) para cada admin y cada nivel con permiso "pilotos".
  if not first_user then
    insert into public.nx_docs(coll, id, owner, data)
    select 'notes', x.nid, x.uid,
           jsonb_build_object('id', x.nid, 'to', x.code,
             'text', 'Nueva alta pendiente de revisión: ' || v_name || ' (' || v_code || ')',
             'en',   'New sign-up pending review: '       || v_name || ' (' || v_code || ')',
             'ts', (extract(epoch from now()) * 1000)::bigint, 'read', false, 'go', 's-pilotos')
    from (select pr.id as uid, pr.code, 'N-' || replace(gen_random_uuid()::text, '-', '') as nid
            from public.profiles pr
           where pr.id <> new.id
             and (pr.rol = 'admin'
                  or exists (select 1 from public.nx_docs d
                              where d.coll = 'roles' and d.id = pr.rol and d.data->'perms' ? 'pilotos'))) x;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- nx_docs: lectura
drop policy if exists docs_read on public.nx_docs;
create policy docs_read on public.nx_docs for select using (
  case public.coll_kind(coll)
    when 'public' then (coll <> 'news' or data->>'aud' = 'public' or auth.uid() is not null)
    when 'shared' then auth.uid() is not null
    when 'own'    then owner = auth.uid() or public.has_perm(public.coll_perm(coll))
    else public.has_perm(public.coll_perm(coll))
  end);

-- nx_docs: escritura
drop policy if exists docs_ins on public.nx_docs;
create policy docs_ins on public.nx_docs for insert with check (
  case public.coll_kind(coll)
    when 'public' then public.has_perm(public.coll_perm(coll))
    when 'shared' then (owner = auth.uid() and coll in ('res','log','tx')) or public.has_perm(public.coll_perm(coll))
    when 'own'    then owner = auth.uid() or public.has_perm(public.coll_perm(coll))
    else public.has_perm(public.coll_perm(coll)) or (coll = 'audit' and public.is_staff())
  end);
drop policy if exists docs_upd on public.nx_docs;
create policy docs_upd on public.nx_docs for update
  using (
    case public.coll_kind(coll)
      when 'public' then public.has_perm(public.coll_perm(coll))
      when 'shared' then (owner = auth.uid() and coll = 'res') or public.has_perm(public.coll_perm(coll))  -- logbook y puntos: el piloto no los edita
      when 'own'    then owner = auth.uid() or public.has_perm(public.coll_perm(coll))
      else public.has_perm(public.coll_perm(coll))
    end)
  with check (
    case public.coll_kind(coll)
      when 'public' then public.has_perm(public.coll_perm(coll))
      when 'shared' then (owner = auth.uid() and coll = 'res') or public.has_perm(public.coll_perm(coll))
      when 'own'    then owner = auth.uid() or public.has_perm(public.coll_perm(coll))
      else public.has_perm(public.coll_perm(coll))
    end);
drop policy if exists docs_del on public.nx_docs;
create policy docs_del on public.nx_docs for delete using (
  case public.coll_kind(coll)
    when 'shared' then (owner = auth.uid() and coll = 'res') or public.has_perm(public.coll_perm(coll))
    when 'own'    then owner = auth.uid() or public.has_perm(public.coll_perm(coll))
    else public.has_perm(public.coll_perm(coll))
  end);

create or replace function public.docs_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists docs_touch on public.nx_docs;
create trigger docs_touch before update on public.nx_docs for each row execute function public.docs_touch();
