-- Desconexión sin despegar: la reserva vuelve a «check-in hecho» y se avisa al piloto (también está en schema.sql)
create or replace function public.nx_net_finish(p_sid text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.net_sessions; res jsonb; v_uid uuid; mins int; an text[] := '{}'; v_type text; v_lid text;
        v_status text; e jsonb; types text[];
begin
  select * into s from public.net_sessions where id = p_sid and state = 'live';
  if not found then return; end if;
  if s.max_gs < 100 then   -- se conectó pero nunca llegó a volar
    -- se desconectó sin llegar a volar: la reserva vuelve a «check-in hecho» para que pueda reconectar, y se avisa al piloto
    if s.res_id is null then s.res_id := public.nx_find_res(s.pilot, s.dep, s.arr, s.plat); end if;
    if s.res_id is not null then
      select data into res from public.nx_docs where coll = 'res' and id = s.res_id;
      if res->>'status' = 'flying' then
        perform public.nx_res_touch(s.res_id, jsonb_build_object('status', 'checkedin'),
          'Desconexión de ' || s.plat || ' sin haber despegado: la reserva sigue activa, puedes volver a conectarte');
        perform public.nx_note(s.pilot, 'Te desconectaste de ' || s.plat || ' sin despegar. Tu reserva ' || coalesce(s.cs,'') || ' sigue activa: puedes volver a conectarte y volar.');
      end if;
    end if;
    update public.net_sessions set state = 'skipped', res_id = s.res_id where id = p_sid; return;
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
