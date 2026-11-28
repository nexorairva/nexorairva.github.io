-- Reservas «volando» sin sesión viva en la red vuelven a «check-in hecho» (también está en schema.sql)
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
  -- reservas que siguen «volando» sin ninguna sesión viva en esta red (desconexión antigua, sesión descartada…): vuelven a «check-in hecho»
  update public.nx_docs d set updated_at = now(),
    data = ((d.data - 'trk') || jsonb_build_object('status', 'checkedin'))
           || jsonb_build_object('log', coalesce(d.data->'log','[]'::jsonb) || jsonb_build_array(jsonb_build_object('ts', public.nx_ms(now()), 'text', 'Sin conexión en ' || p_plat || ': la reserva deja de figurar como en vuelo')))
   where d.coll = 'res' and d.data->>'status' = 'flying' and upper(coalesce(d.data->>'platform','')) = p_plat
     and not exists (select 1 from public.net_sessions x where x.res_id = d.id and x.state = 'live');
  return n;
end $$;
