/* ----- Seguimiento en VATSIM / IVAO -----
   Solo se reconocen los vuelos que el SERVIDOR (supabase/schema.sql) ve en el listado público de VATSIM o IVAO con
   indicativo NXR… y cuyo ID de red pertenece a un piloto de nuestra base de datos. La web no consulta ninguna red
   ni crea vuelos por su cuenta: un vuelo realizado fuera de esos listados no se reconoce. */
const kmNm=(a,b,c,d)=>{const R=3440.065,r=x=>x*Math.PI/180,h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
const netId=(p,plat)=>plat==='VATSIM'?p.vatsim:p.ivao;
function netCard(r){const p=pilot(r.pilot),id=netId(p,r.platform),cs='NXR'+String(r.no).replace(/\D/g,'').slice(0,4);
  const sv=!CL.on?t('El seguimiento de vuelos solo funciona con la base de datos conectada.','Flight tracking only works with the database connected.'):
    !id?t('Añade tu ID de '+r.platform+' en Mi perfil para que podamos seguir tu vuelo.','Add your '+r.platform+' ID in My profile so we can track your flight.'):
    r.status==='flying'?t('En vuelo: NEXORA AIR te sigue en '+r.platform+' desde el servidor.','Flying: NEXORA AIR is tracking you on '+r.platform+' from the server.'):
    t('Conéctate en '+r.platform+' con indicativo '+cs+' y plan de vuelo '+r.from+' → '+r.to+'. NEXORA AIR detecta tu conexión automáticamente, aunque no tengas esta web abierta, y cierra el vuelo cuando te desconectes. Solo se reconocen los vuelos vistos en '+r.platform+' con indicativo NXR.','Log on to '+r.platform+' with callsign '+cs+' and flight plan '+r.from+' → '+r.to+'. NEXORA AIR detects your connection automatically, even with this site closed, and closes the flight when you disconnect. Only flights seen on '+r.platform+' with an NXR callsign are recognised.');
  return card(t('Seguimiento en '+r.platform,'Tracking on '+r.platform),`<div class="pad stack"><p><b>${r.platform}</b> · ID ${id?esc(String(id)):'—'}</p><p>${sv}</p></div>`)}
Object.assign(A,{
 sbgen:id=>{const r=S.res.find(x=>x.id===id&&S.session&&x.pilot===S.session.id);if(!r){toast(t('No se encontró tu reserva. Vuelve a abrirla desde Mis reservas.','Your booking was not found. Reopen it from My bookings.'));return}r.sbGen=r.sbGen||Date.now();rlog(r,t('Briefing generado con SimBrief','Briefing generated with SimBrief'));save();window.open(sbLink(r),'_blank','noopener');render()}});
