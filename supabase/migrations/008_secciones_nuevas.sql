-- NOTAM, recompensas, guía y calendario administrativo (también está en schema.sql)
create or replace function public.coll_kind(c text) returns text language sql immutable as $$
  select case
    when c in ('fleet','tours','events','cal','chall','flights','news','social','partners','dl','notam','rew','brand','docs','ap','apo','routeCodes','remarks','site') then 'public'
    when c in ('roles','res','log','tx') then 'shared'
    when c in ('notes','tickets','inc','enroll','accept','delReq','revReq','redeem') then 'own'
    else 'secure'
  end
$$;
create or replace function public.coll_perm(c text) returns text language sql immutable as $$
  select case
    when c in ('fleet','ap','apo') then 'flota'
    when c in ('tours','events','cal','chall','flights','routeCodes','remarks','dl','rew','redeem','acal') then 'operaciones'
    when c in ('news','docs','notam','guide') then 'noticias'
    when c = 'social' then 'redes'
    when c in ('brand','roles') then 'admin'
    when c in ('res','log','tx','tickets','inc','notes') then 'revision'
    when c in ('accept','enroll','delReq','revReq') then 'pilotos'
    else 'sistema'
  end
$$;
