-- =====================================================================
-- Migración 001 · IDs de piloto NX0001 → NXR101…
-- Ejecutar UNA VEZ en Supabase → SQL Editor, DESPUÉS de ejecutar el schema.sql actualizado.
-- Renombra los códigos antiguos (formato NX + 4 cifras) por orden de alta, empezando en NXR101,
-- y actualiza todos los documentos que los mencionan. Es idempotente: si no quedan códigos
-- antiguos, no hace nada.
-- Haz una copia de seguridad antes (Database → Backups) si ya tienes datos reales.
-- =====================================================================
do $$
declare r record; n int := 100; c text;
begin
  -- 1) mapa antiguo → nuevo, en orden de alta, saltando los NXR que ya existan
  create temp table _idmap(old text primary key, new text not null) on commit drop;
  for r in select code from public.profiles where code ~ '^NX[0-9]{4}$' order by joined, code loop
    loop
      n := n + 1; c := 'NXR' || lpad(n::text, 3, '0');
      exit when not exists (select 1 from public.profiles where code = c)
            and not exists (select 1 from _idmap where new = c);
    end loop;
    insert into _idmap values (r.code, c);
  end loop;
  if not exists (select 1 from _idmap) then return; end if;

  -- 2) documentos cuyo id ES el código del piloto, o empieza por él (enroll, delReq, revReq, accept)
  update public.nx_docs d set id = m.new
    from _idmap m where d.coll in ('enroll','delReq','revReq') and d.id = m.old;
  update public.nx_docs d set id = m.new || substr(d.id, length(m.old) + 1)
    from _idmap m where d.coll = 'accept' and d.id like m.old || '-%';

  -- 3) referencias dentro del JSON: cadenas y claves exactas "NX0001" → "NXR101"
  for r in select old, new from _idmap loop
    update public.nx_docs set data = replace(data::text, '"' || r.old || '"', '"' || r.new || '"')::jsonb
      where data::text like '%"' || r.old || '"%';
    update public.profiles set data = replace(data::text, '"' || r.old || '"', '"' || r.new || '"')::jsonb
      where data::text like '%"' || r.old || '"%';
  end loop;

  -- 4) los propios códigos
  update public.profiles p set code = m.new from _idmap m where p.code = m.old;

  -- 5) el contador sigue desde el mayor ID existente
  perform setval('public.pilot_seq',
    greatest(100, (select coalesce(max(substr(code, 4)::int), 100) from public.profiles where code ~ '^NXR[0-9]{3,4}$')), true);
end $$;
