-- Las integraciones ahora las da de alta el administrador a mano: borra las de ejemplo (SimBrief, VATSIM, IVAO, correo…).
delete from public.nx_docs where coll = 'intg' and not (data ? 'id');
