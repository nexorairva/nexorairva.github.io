-- Retira de la base los tours, eventos, retos y entradas de calendario de ejemplo.
-- Ejecutar UNA vez en Supabase → SQL Editor (después de volver a ejecutar schema.sql).
delete from public.nx_docs where coll in ('tours','events','cal','chall');
delete from public.nx_docs where coll = 'enroll';                       -- inscripciones a tours de ejemplo
delete from public.nx_docs where coll = 'news' and id in ('n1','n2','n3');   -- noticias de ejemplo
