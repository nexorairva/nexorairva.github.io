-- ID elegido en el alta y correos de solicitud/aprobación (también está en schema.sql)
-- ¿Está libre este ID de piloto? (la pantalla de alta lo consulta antes de enviar la solicitud)
create or replace function public.nx_code_free(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select upper(btrim(coalesce(p_code,''))) ~ '^NXR[0-9]{3,4}$'
     and not exists (select 1 from public.profiles where code = upper(btrim(p_code)))
$$;
grant execute on function public.nx_code_free(text) to anon, authenticated;

create or replace function public.nx_esc(p text) returns text language sql immutable as $$
  select replace(replace(replace(coalesce(p,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
$$;

-- Envío de correo por la API de Resend (pg_net). Se configura en Staff › Integraciones: una integración con
-- dirección https://api.resend.com/emails, la clave de API como credencial y el remitente en «Remitente».
-- Si no está configurada, no hace nada. Nunca falla (no puede impedir un alta).
create or replace function public.nx_mail(p_to text, p_subject text, p_html text) returns void
language plpgsql security definer set search_path = public as $$
declare i jsonb; v_key text; v_from text;
begin
  if coalesce(p_to,'') = '' then return; end if;
  select d.data into i from public.nx_docs d
   where d.coll = 'intg' and coalesce(d.data->>'st','') <> 'Desactivada' and lower(coalesce(d.data->>'url','')) like '%api.resend.com%'
   order by d.updated_at desc limit 1;
  if i is null then return; end if;
  v_key := coalesce(i->>'sec',''); v_from := coalesce(i->>'from','');
  if v_key = '' or v_from = '' then return; end if;
  perform net.http_post(url := i->>'url',
    headers := jsonb_build_object('Authorization', case when v_key ~* '^bearer ' then v_key else 'Bearer ' || v_key end, 'Content-Type', 'application/json', 'User-Agent', 'NexoraAirVA/1.0'),
    body := jsonb_build_object('from', v_from, 'to', jsonb_build_array(p_to), 'subject', p_subject, 'html', p_html),
    timeout_milliseconds := 15000);
exception when others then
  raise warning 'nx_mail: %', sqlerrm;
end $$;
revoke all on function public.nx_mail(text,text,text) from public, anon, authenticated;

-- Correo al aprobarse el alta (Pending → Active)
create or replace function public.nx_on_profile_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_mail text;
begin
  if old.status = 'Pending' and new.status = 'Active' then
    select email into v_mail from auth.users where id = new.id;
    perform public.nx_mail(v_mail, 'Tu alta en NEXORA AIR ha sido aprobada',
      '<p>Hola ' || public.nx_esc(new.data->>'name') || ',</p><p>¡Tu alta en NEXORA AIR ha sido <b>aprobada</b>! Ya puedes entrar con tu correo y tu contraseña. Tu ID de piloto es <b>' || new.code || '</b>.</p>'
      || '<p>Your NEXORA AIR sign-up has been <b>approved</b>. You can now log in. Your pilot ID is <b>' || new.code || '</b>.</p>');
  end if;
  return null;
end $$;
drop trigger if exists profiles_approved on public.profiles;
create trigger profiles_approved after update of status on public.profiles
  for each row execute function public.nx_on_profile_status();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_user boolean; md jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
        v_code text; v_name text;
begin
  select not exists (select 1 from public.profiles) into first_user;
  -- ID elegido por el piloto en el alta (NXR + 3 o 4 cifras); si no viene, el siguiente libre
  v_code := upper(nullif(btrim(coalesce(md->>'code','')), ''));
  if v_code is null then v_code := public.next_pilot_code();
  elsif v_code !~ '^NXR[0-9]{3,4}$' then raise exception 'ID_NO_VALIDO';
  elsif exists (select 1 from public.profiles where code = v_code) then raise exception 'ID_EN_USO';
  end if;
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
  if not first_user then
    perform public.nx_mail(new.email, 'Hemos recibido tu solicitud · NEXORA AIR',
      '<p>Hola ' || public.nx_esc(v_name) || ',</p><p>Hemos recibido tu solicitud de alta en NEXORA AIR con el ID <b>' || v_code || '</b>. Está <b>en revisión</b>: el staff la revisará y te avisaremos por correo cuando se apruebe.</p>'
      || '<p>We have received your NEXORA AIR sign-up request with ID <b>' || v_code || '</b>. It is <b>under review</b>; we will email you when it is approved.</p>');
  end if;
  return new;
end $$;
