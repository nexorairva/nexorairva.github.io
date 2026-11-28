-- Borra las respuestas de pg_net al procesarlas (evita llenar la base de datos) (también está en schema.sql)
create or replace function public.nx_net_poll() returns void
language plpgsql security definer set search_path = public as $$
declare c record; q record; v_status int; v_body text; v_rid bigint; v_url text; v_hd jsonb; v_src text; i jsonb;
begin
  -- pg_net guarda cada respuesta (el listado de VATSIM/IVAO pesa varios MB): se borran en cuanto se procesan y las huérfanas a los 10 min
  begin delete from net._http_response where created < now() - interval '10 minutes'; exception when others then null; end;
  for c in select * from public.net_cfg where enabled loop
    for q in select * from public.net_reqs where plat = c.plat and not done order by id loop
      select status_code, content into v_status, v_body from net._http_response where id = q.id;
      if found then
        update public.net_reqs set done = true where id = q.id;
        begin delete from net._http_response where id = q.id; exception when others then null; end;
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
