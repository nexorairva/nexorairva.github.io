-- Seguimiento: enlace con la reserva de la MISMA red (varias reservas: gana la de misma ruta; ruta distinta → revisión),
-- enlace reintentado en cada pasada y cierre del vuelo en cuanto desaparece del listado de la red.
-- Ejecuta este archivo en el SQL Editor de Supabase (o vuelve a ejecutar schema.sql completo).

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
  -- sesiones de esta red que ya no aparecen en el listado = el vuelo se ha cerrado en la red: se cierra aquí en la misma pasada
  update public.net_sessions set miss = miss + 1 where state = 'live' and plat = p_plat and last_seen < v_now;
  for s in select id from public.net_sessions where state = 'live' and plat = p_plat and miss >= 1 loop
    perform public.nx_net_finish(s.id);
  end loop;
  return n;
end $$;


revoke all on function public.nx_find_res(text,text,text,text), public.nx_net_finish(text), public.nx_net_ingest(text,jsonb) from public, anon, authenticated;
