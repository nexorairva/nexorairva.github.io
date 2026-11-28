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
    when c in ('fleet','tours','events','cal','chall','flights','news','social','partners','dl','brand','docs','ap','apo','routeCodes','remarks','site') then 'public'
    when c in ('roles','res','log','tx') then 'shared'
    when c in ('notes','tickets','inc','enroll','accept','delReq','revReq') then 'own'
    else 'secure'
  end
$$;
create or replace function public.coll_perm(c text) returns text language sql immutable as $$
  select case
    when c in ('fleet','ap','apo') then 'flota'
    when c in ('tours','events','cal','chall','flights','routeCodes','remarks','dl') then 'operaciones'
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

-- Descargas (libreas, documentos, logos): archivos adjuntos en Storage.
-- Bucket público de lectura; solo quien tiene el permiso 'operaciones' sube, cambia o borra.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit)
      values ('downloads', 'downloads', true, 52428800)
      on conflict (id) do update set public = true, file_size_limit = 52428800;
    drop policy if exists "downloads_insert" on storage.objects;
    create policy "downloads_insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'downloads' and public.has_perm('operaciones'));
    drop policy if exists "downloads_update" on storage.objects;
    create policy "downloads_update" on storage.objects for update to authenticated
      using (bucket_id = 'downloads' and public.has_perm('operaciones'));
    drop policy if exists "downloads_delete" on storage.objects;
    create policy "downloads_delete" on storage.objects for delete to authenticated
      using (bucket_id = 'downloads' and public.has_perm('operaciones'));
  end if;
end $$;

-- =====================================================================
-- Seguimiento de vuelos en VATSIM / IVAO desde el servidor (sin depender de ninguna web abierta)
-- Cada minuto, pg_cron pide el listado público de la red con pg_net y esta lógica:
--   1. reconoce los pilotos conectados con indicativo NXR… (NEXO es solo el indicativo de radio) cuyo ID de VATSIM/IVAO pertenece a un piloto activo,
--   2. los sigue (despegue, millas, última posición) y los enlaza con su reserva activa de esa misma red (misma ruta; si no, la más reciente → revisión), pasándola a «en vuelo»,
--   3. al desconectarse, escribe el vuelo en el Logbook (nx_docs coll='log') y cierra la reserva. Si algo no cuadra, va a revisión.
-- Los puntos del vuelo los genera la web al cargar (log con src='net').
-- =====================================================================
create table if not exists public.net_cfg (
  plat text primary key, url text not null, headers jsonb not null default '{}'::jsonb, enabled boolean not null default true
);
insert into public.net_cfg(plat,url) values
  ('VATSIM','https://data.vatsim.net/v3/vatsim-data.json'),
  ('IVAO','https://api.ivao.aero/v2/tracker/whazzup')
on conflict (plat) do nothing;
create table if not exists public.net_reqs (
  id bigint primary key, plat text not null, ts timestamptz not null default now(), done boolean not null default false
);
create table if not exists public.net_sessions (
  id text primary key, plat text not null, cid text not null, pilot text not null,
  cs text, dep text, arr text, ac text, logon timestamptz,
  first_seen timestamptz not null default now(), last_seen timestamptz not null default now(), dep_ts timestamptz,
  lat double precision, lon double precision, alt int, gs int, max_gs int not null default 0, nm numeric not null default 0,
  miss int not null default 0, state text not null default 'live',      -- live | done | skipped
  res_id text, log_id text
);
create table if not exists public.net_diag (
  plat text primary key, ts timestamptz not null default now(), src text, url text, http int, bytes int,
  pilots int, nxr int, matched int, unmatched text, err text
);
alter table public.net_diag enable row level security;
drop policy if exists net_diag_staff on public.net_diag;
create policy net_diag_staff on public.net_diag for select using (public.is_staff());
alter table public.net_cfg enable row level security;
alter table public.net_reqs enable row level security;
alter table public.net_sessions enable row level security;
drop policy if exists net_sessions_staff on public.net_sessions;
create policy net_sessions_staff on public.net_sessions for select using (public.is_staff());

create or replace function public.nx_nm(a1 double precision, o1 double precision, a2 double precision, o2 double precision)
returns double precision language sql immutable as $$
  select 2*3440.065*asin(least(1, sqrt(power(sin(radians(a2-a1)/2),2) + cos(radians(a1))*cos(radians(a2))*power(sin(radians(o2-o1)/2),2))))
$$;
create or replace function public.nx_ms(t timestamptz) returns bigint language sql immutable as $$ select (extract(epoch from t)*1000)::bigint $$;

-- Añade una línea al registro de la reserva y cambia campos de su documento.
create or replace function public.nx_res_touch(p_id text, p_patch jsonb, p_text text) returns void
language sql security definer set search_path = public as $$
  update public.nx_docs set updated_at = now(),
    data = (data || p_patch) || jsonb_build_object('log', coalesce(data->'log','[]'::jsonb) || jsonb_build_array(jsonb_build_object('ts', public.nx_ms(now()), 'text', p_text)))
  where coll = 'res' and id = p_id
$$;
create or replace function public.nx_note(p_code text, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_id text := 'N' || substr(md5(random()::text || p_code), 1, 10);
begin
  select id into v_uid from public.profiles where code = p_code;
  insert into public.nx_docs(coll,id,owner,data) values ('notes', v_id, v_uid,
    jsonb_build_object('id', v_id, 'to', p_code, 'text', p_text, 'ts', public.nx_ms(now()), 'read', false))
  on conflict do nothing;
end $$;

-- Reserva activa del piloto EN LA MISMA RED en la que vuela. Si hay varias, gana la que coincide con la salida y la llegada
-- del plan de vuelo; si ninguna coincide, la más reciente (el cierre la pasará a revisión por ruta distinta).
drop function if exists public.nx_find_res(text,text,text);
create or replace function public.nx_find_res(p_pilot text, p_dep text, p_arr text, p_plat text) returns text
language sql stable security definer set search_path = public as $$
  select id from public.nx_docs
  where coll = 'res' and data->>'pilot' = p_pilot and data->>'status' in ('reserved','checkedin','flying')
    and upper(coalesce(data->>'platform','')) = upper(coalesce(p_plat,''))
  order by (upper(data->>'from') = upper(coalesce(p_dep,'')) and upper(data->>'to') = upper(coalesce(p_arr,''))) desc,
           coalesce((data->>'created')::bigint, 0) desc limit 1
$$;

create or replace function public.nx_net_finish(p_sid text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.net_sessions; res jsonb; v_uid uuid; mins int; an text[] := '{}'; v_type text; v_lid text;
        v_status text; e jsonb; types text[];
begin
  select * into s from public.net_sessions where id = p_sid and state = 'live';
  if not found then return; end if;
  if s.max_gs < 100 then   -- se conectó pero nunca llegó a volar
    update public.net_sessions set state = 'skipped' where id = p_sid; return;
  end if;
  mins := greatest(1, round(extract(epoch from (s.last_seen - coalesce(s.dep_ts, s.first_seen))) / 60));
  select id into v_uid from public.profiles where code = s.pilot;
  if s.res_id is null then s.res_id := public.nx_find_res(s.pilot, s.dep, s.arr, s.plat); end if;
  if s.res_id is not null then select data into res from public.nx_docs where coll = 'res' and id = s.res_id; end if;
  select array_agg(distinct data->>'type') into types from public.nx_docs where coll = 'fleet';
  if res is not null then v_type := res->>'type';
  elsif s.ac is not null and s.ac = any(coalesce(types,'{}')) then v_type := s.ac;
  else v_type := coalesce(types[1], 'A20N'); an := array_append(an, 'Aeronave fuera de la flota: ' || coalesce(nullif(s.ac,''),'sin dato'));
  end if;
  if coalesce(s.gs,0) >= 80 then an := array_append(an, 'Desconexión en vuelo: no se detectó el aterrizaje'::text); end if;
  if coalesce(s.arr,'') = '' then an := array_append(an, 'Sin plan de vuelo con aeropuerto de llegada'::text); end if;
  if res is not null and upper(res->>'from') <> upper(coalesce(s.dep,'')) then an := array_append(an, 'Aeropuerto de salida distinto al reservado'::text); end if;
  if res is not null and upper(res->>'to') <> upper(coalesce(s.arr,'')) then an := array_append(an, 'Aeropuerto de llegada distinto al reservado'::text); end if;
  if mins < 10 or (res is not null and mins < greatest(5, 0.4 * coalesce((res->>'mins')::numeric, 0))) then an := array_append(an, 'Duración anormalmente corta'::text); end if;
  v_status := case when cardinality(an) = 0 then 'Completado' else 'En revisión' end;
  v_lid := 'L' || substr(md5(p_sid), 1, 10);
  e := jsonb_build_object('id', v_lid, 'pilot', s.pilot, 'no', s.pilot, 'kind', coalesce(res->>'kind', 'official'),
        'from', upper(coalesce(nullif(s.dep,''), res->>'from', '----')), 'to', upper(coalesce(nullif(s.arr,''), res->>'to', '----')),
        'type', v_type, 'platform', s.plat, 'depTs', public.nx_ms(coalesce(s.dep_ts, s.first_seen)), 'arrTs', public.nx_ms(s.last_seen),
        'mins', mins, 'nm', case when res is not null then coalesce((res->>'nm')::numeric, round(s.nm)) else round(s.nm) end,
        'status', v_status, 'session', 'S-' || upper(substr(md5(p_sid), 1, 6)),
        'sb', case when res is not null and (res->>'sbGen') is not null then 'ok' else 'none' end,
        'an', to_jsonb(an), 'pn', '', 'src', 'net', 'cs', s.cs);
  insert into public.nx_docs(coll,id,owner,data) values ('log', v_lid, v_uid, e) on conflict do nothing;
  if res is not null then
    perform public.nx_res_touch(s.res_id, jsonb_build_object('status', case when v_status = 'Completado' then 'closed' else 'review' end, 'entryId', v_lid),
      case when v_status = 'Completado' then 'Vuelo detectado en la red, finalizado y validado automáticamente' else 'Vuelo finalizado en la red; en revisión: ' || array_to_string(an, ', ') end);
  end if;
  perform public.nx_note(s.pilot, case when v_status = 'Completado'
    then 'Tu vuelo ' || s.cs || ' ' || (e->>'from') || '→' || (e->>'to') || ' se ha detectado en ' || s.plat || ' y está validado. ¡Añadido a tu Logbook!'
    else 'Tu vuelo ' || s.cs || ' ' || (e->>'from') || '→' || (e->>'to') || ' está en revisión: ' || array_to_string(an, ', ') end);
  update public.net_sessions set state = 'done', log_id = v_lid, res_id = s.res_id where id = p_sid;
end $$;

-- Procesa un listado completo de la red (jsonb tal como lo devuelve VATSIM o IVAO).
create or replace function public.nx_net_ingest(p_plat text, p_feed jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare pl jsonb; r record; v_now timestamptz := now(); v_sid text; v_ins boolean; n int := 0; v_code text; v_rid text; s record;
        v_tot int := 0; v_nxr int := 0; v_ok int := 0; v_un text := '';
begin
  pl := case when p_plat = 'VATSIM' then p_feed->'pilots' else coalesce(p_feed->'clients'->'pilots', p_feed->'pilots') end;
  if pl is null or jsonb_typeof(pl) <> 'array' or jsonb_array_length(pl) = 0 then
    insert into public.net_diag(plat,ts,pilots,nxr,matched,unmatched,err) values (p_plat,now(),0,0,0,'','El listado no trae la lista de pilotos (formato inesperado)')
      on conflict (plat) do update set ts=now(), pilots=0, nxr=0, matched=0, unmatched='', err=excluded.err;
    return 0;   -- listado vacío o con error: no tocar nada
  end if;
  v_tot := jsonb_array_length(pl);
  for r in
    select case when p_plat = 'VATSIM' then e->>'cid' else coalesce(e->>'userId', e->>'vid', e->>'id') end as cid,
           e->>'callsign' as cs,
           (case when p_plat = 'VATSIM' then e->>'latitude' else e#>>'{lastTrack,latitude}' end)::double precision as lat,
           (case when p_plat = 'VATSIM' then e->>'longitude' else e#>>'{lastTrack,longitude}' end)::double precision as lon,
           (case when p_plat = 'VATSIM' then e->>'altitude' else e#>>'{lastTrack,altitude}' end)::numeric::int as alt,
           (case when p_plat = 'VATSIM' then e->>'groundspeed' else e#>>'{lastTrack,groundSpeed}' end)::numeric::int as gs,
           upper(case when p_plat = 'VATSIM' then e#>>'{flight_plan,departure}' else e#>>'{flightPlan,departureId}' end) as dep,
           upper(case when p_plat = 'VATSIM' then e#>>'{flight_plan,arrival}' else e#>>'{flightPlan,arrivalId}' end) as arr,
           upper(case when p_plat = 'VATSIM' then e#>>'{flight_plan,aircraft_short}' else e#>>'{flightPlan,aircraftId}' end) as ac,
           (case when p_plat = 'VATSIM' then e->>'logon_time' else e->>'createdAt' end)::timestamptz as logon
    from jsonb_array_elements(pl) e
    where (e->>'callsign') ~* '^NXR'
  loop
    v_nxr := v_nxr + 1; v_code := null;
    select p.code into v_code from public.profiles p join public.profile_private q on q.id = p.id
     where p.status in ('Active','Inactive')
       and nullif(regexp_replace(case when p_plat = 'VATSIM' then q.data->>'vatsim' else q.data->>'ivao' end, '\D', '', 'g'), '')
           = nullif(regexp_replace(coalesce(r.cid,''), '\D', '', 'g'), '') limit 1;
    if v_code is null then               -- indicativo de la aerolínea, pero el ID no es de ningún piloto activo
      if length(v_un) < 300 then v_un := v_un || case when v_un = '' then '' else ', ' end || coalesce(r.cs,'?') || ' (ID ' || coalesce(r.cid,'?') || ')'; end if;
      continue;
    end if;
    v_ok := v_ok + 1;
    v_sid := p_plat || ':' || r.cid || ':' || coalesce(extract(epoch from r.logon)::bigint::text, 'x');
    insert into public.net_sessions as ns(id,plat,cid,pilot,cs,dep,arr,ac,logon,first_seen,last_seen,dep_ts,lat,lon,alt,gs,max_gs)
      values (v_sid,p_plat,r.cid,v_code,r.cs,r.dep,r.arr,r.ac,r.logon,v_now,v_now, case when coalesce(r.gs,0) >= 40 then v_now end, r.lat,r.lon,r.alt,r.gs,coalesce(r.gs,0))
    on conflict (id) do update set
      cs = excluded.cs, dep = coalesce(nullif(excluded.dep,''), ns.dep), arr = coalesce(nullif(excluded.arr,''), ns.arr), ac = coalesce(nullif(excluded.ac,''), ns.ac),
      nm = ns.nm + case when ns.lat is not null and excluded.lat is not null and coalesce(excluded.gs,0) >= 40 then public.nx_nm(ns.lat, ns.lon, excluded.lat, excluded.lon) else 0 end,
      dep_ts = coalesce(ns.dep_ts, case when coalesce(excluded.gs,0) >= 40 then v_now end),
      lat = excluded.lat, lon = excluded.lon, alt = excluded.alt, gs = excluded.gs, max_gs = greatest(ns.max_gs, coalesce(excluded.gs,0)),
      last_seen = v_now, miss = 0
      where ns.state = 'live'
    returning (xmax = 0) into v_ins;
    if v_ins then
      n := n + 1;
      perform public.nx_note(v_code, 'Vuelo ' || r.cs || ' detectado en ' || p_plat || '.');
    end if;
    -- enlace con la reserva: se reintenta en cada pasada hasta que el piloto presenta su plan de vuelo
    select res_id into v_rid from public.net_sessions where id = v_sid and state = 'live';
    if v_rid is null and coalesce(r.dep,'') <> '' and coalesce(r.arr,'') <> '' then
      v_rid := public.nx_find_res(v_code, r.dep, r.arr, p_plat);
      if v_rid is not null then
        update public.net_sessions set res_id = v_rid where id = v_sid;
        perform public.nx_res_touch(v_rid, jsonb_build_object('status', 'flying', 'flyTs', public.nx_ms(v_now), 'checkin', public.nx_ms(v_now), 'platform', p_plat),
          'Conexión detectada en ' || p_plat || ' (' || r.cs || '): auto check-in y seguimiento iniciado'
          || case when exists (select 1 from public.nx_docs where coll = 'res' and id = v_rid
                                 and upper(data->>'from') = r.dep and upper(data->>'to') = r.arr) then ''
                  else '. Ruta distinta de la reservada (' || r.dep || ' → ' || r.arr || '): pasará a revisión al cerrar' end);
      end if;
    end if;
    -- posición real para el mapa de vuelos en directo (se guarda en la reserva mientras vuela)
    update public.nx_docs set updated_at = now(),
      data = data || jsonb_build_object('trk', jsonb_build_object('lat', r.lat, 'lon', r.lon, 'alt', r.alt, 'gs', r.gs, 'cs', r.cs, 'ts', public.nx_ms(v_now)))
    where coll = 'res' and id = (select res_id from public.net_sessions where id = v_sid and state = 'live');
  end loop;
  insert into public.net_diag(plat,ts,pilots,nxr,matched,unmatched,err) values (p_plat,now(),v_tot,v_nxr,v_ok,v_un,null)
    on conflict (plat) do update set ts=now(), pilots=excluded.pilots, nxr=excluded.nxr, matched=excluded.matched, unmatched=excluded.unmatched, err=null;
  -- sesiones de esta red que ya no aparecen en el listado = el vuelo se ha cerrado en la red; margen de 3 pasadas (~3 min) por si se cae la conexión y vuelve
  update public.net_sessions set miss = miss + 1 where state = 'live' and plat = p_plat and last_seen < v_now;
  for s in select id from public.net_sessions where state = 'live' and plat = p_plat and miss >= 3 loop
    perform public.nx_net_finish(s.id);
  end loop;
  return n;
end $$;

-- Pide el listado de cada red y procesa las respuestas pendientes (la llama pg_cron cada minuto).
create or replace function public.nx_net_poll() returns void
language plpgsql security definer set search_path = public as $$
declare c record; q record; v_status int; v_body text; v_rid bigint; v_url text; v_hd jsonb; v_src text; i jsonb;
begin
  for c in select * from public.net_cfg where enabled loop
    for q in select * from public.net_reqs where plat = c.plat and not done order by id loop
      select status_code, content into v_status, v_body from net._http_response where id = q.id;
      if found then
        update public.net_reqs set done = true where id = q.id;
        insert into public.net_diag(plat,ts,http,bytes,err) values (c.plat, now(), v_status, length(coalesce(v_body,'')), case when v_status = 200 then null else 'La red respondió HTTP ' || coalesce(v_status::text,'?') end)
          on conflict (plat) do update set ts = now(), http = excluded.http, bytes = excluded.bytes, err = excluded.err;
        if v_status = 200 then
          begin perform public.nx_net_ingest(c.plat, v_body::jsonb);
          exception when others then
            raise warning 'nx_net_ingest %: %', c.plat, sqlerrm;
            update public.net_diag set err = 'Error al procesar el listado: ' || sqlerrm where plat = c.plat;
          end;
        end if;
      end if;
    end loop;
    -- IVAO solo admite una descarga del listado cada 15 s (si no, bloquea la IP): nunca pedimos una red más de una vez cada 20 s
    continue when exists (select 1 from public.net_reqs where plat = c.plat and ts > now() - interval '20 seconds');
    -- dirección y credencial: la integración que el staff dio de alta en Staff › Integraciones (si hay una de esta red); si no, net_cfg
    v_url := c.url; v_hd := c.headers; v_src := 'net_cfg';
    select d.data into i from public.nx_docs d
     where d.coll = 'intg' and coalesce(d.data->>'st','') <> 'Desactivada' and coalesce(d.data->>'url','') <> ''
       and (lower(d.data->>'url') like '%' || lower(c.plat) || '%' or lower(coalesce(d.data->>'n','')) like '%' || lower(c.plat) || '%')
     order by (lower(d.data->>'url') like '%whazzup%' or lower(d.data->>'url') like '%vatsim-data%') desc, d.updated_at desc limit 1;
    if i is not null then
      v_url := i->>'url'; v_src := 'integración «' || coalesce(i->>'n','') || '»';
      if coalesce(i->>'sec','') <> '' then v_hd := v_hd || jsonb_build_object(coalesce(nullif(i->>'hd',''), 'Authorization'), i->>'sec'); end if;
    end if;
    v_hd := jsonb_build_object('User-Agent', 'NexoraAirVA/1.0 (+https://nexorairva.github.io)', 'Accept', 'application/json') || coalesce(v_hd, '{}'::jsonb);
    select net.http_get(url := v_url, headers := v_hd, timeout_milliseconds := 25000) into v_rid;
    insert into public.net_reqs(id, plat) values (v_rid, c.plat) on conflict do nothing;
    insert into public.net_diag(plat,ts,src,url) values (c.plat, now(), v_src, v_url)
      on conflict (plat) do update set src = excluded.src, url = excluded.url;
  end loop;
  delete from public.net_reqs where ts < now() - interval '1 day';
end $$;
revoke all on function public.nx_net_poll(), public.nx_net_ingest(text,jsonb), public.nx_net_finish(text),
  public.nx_res_touch(text,jsonb,text), public.nx_note(text,text), public.nx_find_res(text,text,text,text) from public, anon, authenticated;

-- Activa las extensiones y la tarea de cada minuto (en Supabase: pg_cron y pg_net).
do $$
begin
  begin create extension if not exists pg_net; exception when others then raise notice 'pg_net: activa la extensión en Database → Extensions'; end;
  begin create extension if not exists pg_cron; exception when others then raise notice 'pg_cron: activa la extensión en Database → Extensions'; end;
  if to_regnamespace('cron') is not null and to_regnamespace('net') is not null then
    perform cron.schedule('nx-net-poll', '* * * * *', 'select public.nx_net_poll()');
  end if;
end $$;
