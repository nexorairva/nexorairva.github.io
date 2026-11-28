-- Correo: acepta cualquier servicio con el mismo JSON (Resend o script del hosting) (también está en schema.sql)
create or replace function public.nx_mail(p_to text, p_subject text, p_html text) returns void
language plpgsql security definer set search_path = public as $$
declare i jsonb; v_key text; v_from text;
begin
  if coalesce(p_to,'') = '' then return; end if;
  select d.data into i from public.nx_docs d
   where d.coll = 'intg' and coalesce(d.data->>'st','') <> 'Desactivada' and coalesce(d.data->>'url','') <> '' and coalesce(d.data->>'from','') <> ''
   order by d.updated_at desc limit 1;
  if i is null then return; end if;
  v_key := coalesce(i->>'sec',''); v_from := coalesce(i->>'from','');
  if v_key = '' then return; end if;
  -- Resend (api.resend.com) o cualquier otra dirección que acepte el mismo JSON (script PHP del hosting, Apps Script…)
  perform net.http_post(url := i->>'url',
    headers := jsonb_build_object('Authorization', case when v_key ~* '^bearer ' then v_key else 'Bearer ' || v_key end, 'Content-Type', 'application/json', 'User-Agent', 'NexoraAirVA/1.0'),
    body := jsonb_build_object('from', v_from, 'to', jsonb_build_array(p_to), 'subject', p_subject, 'html', p_html),
    timeout_milliseconds := 15000);
exception when others then
  raise warning 'nx_mail: %', sqlerrm;
end $$;
