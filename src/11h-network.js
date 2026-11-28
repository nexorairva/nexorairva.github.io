/* ----- Seguimiento en redes reales (VATSIM / IVAO) -----
   Se consulta el feed público de la red mientras el piloto tiene NEXORA AIR abierta.
   Detecta su conexión (por su ID de red), inicia el vuelo y, al desconectarse, lo finaliza con los datos reales. */
const NETF={VATSIM:()=>(window.NX_CFG&&NX_CFG.vatsimFeed)||'https://data.vatsim.net/v3/vatsim-data.json',IVAO:()=>(window.NX_CFG&&NX_CFG.ivaoFeed)||'https://api.ivao.aero/v2/tracker/whazzup'},NETC={};
const kmNm=(a,b,c,d)=>{const R=3440.065,r=x=>x*Math.PI/180,h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
function netNorm(plat,j){if(plat==='VATSIM')return(j.pilots||[]).map(x=>({id:String(x.cid),cs:x.callsign||'',lat:x.latitude,lon:x.longitude,alt:x.altitude,gs:x.groundspeed,dep:(x.flight_plan||{}).departure||'',arr:(x.flight_plan||{}).arrival||'',logon:Date.parse(x.logon_time)||0}));
  const L=(j.clients&&j.clients.pilots)||j.pilots||[];return L.map(x=>{const k=x.lastTrack||{},f=x.flightPlan||{};return{id:String(x.userId),cs:x.callsign||'',lat:k.latitude,lon:k.longitude,alt:k.altitude,gs:k.groundSpeed,dep:f.departureId||'',arr:f.arrivalId||'',logon:Date.parse(x.createdAt)||0}})}
async function netFeed(plat,force){const c=NETC[plat];if(c&&!force&&Date.now()-c.ts<12000)return c.data;const r=await fetch(NETF[plat](),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const d=netNorm(plat,await r.json());NETC[plat]={ts:Date.now(),data:d};return d}
const netId=(p,plat)=>plat==='VATSIM'?p.vatsim:p.ivao;
async function netCheck(r,force){const p=pilot(r.pilot),id=netId(p,r.platform);r.net=r.net||{};
  if(!id){r.net={state:'noid',ts:Date.now()};return}
  let L;try{L=await netFeed(r.platform,force)}catch(e){r.net={state:'error',ts:Date.now(),msg:String(e.message||e)};return}
  const x=L.find(q=>q.id===String(id)&&(/^NXR/i.test(q.cs)||q.dep===r.from));r.net.ts=Date.now();
  if(x){r.miss=0;
    if(r.status!=='flying'){if(x.dep&&x.dep!==r.from){r.net={state:'other',ts:Date.now(),cs:x.cs,dep:x.dep,arr:x.arr};return}
      r.status='flying';r.flyTs=x.logon||Date.now();r.checkin=r.checkin||Date.now();rlog(r,t('Conexión detectada en '+r.platform+' ('+x.cs+'): auto check-in y seguimiento iniciado','Connection detected on '+r.platform+' ('+x.cs+'): auto check-in and tracking started'));notify(r.pilot,t('Vuelo '+r.no+' detectado en '+r.platform+'.','Flight '+r.no+' detected on '+r.platform+'.'))}
    r.trk={ts:Date.now(),lat:x.lat,lon:x.lon,alt:x.alt,gs:x.gs,cs:x.cs,arr:x.arr};r.net={state:'live',ts:Date.now(),cs:x.cs,alt:x.alt,gs:x.gs};save();return}
  if(r.status==='flying'){r.miss=(r.miss|0)+1;r.net={state:'lost',ts:Date.now()};
    if(r.miss>=3||force&&r.miss>=1)netEnd(r);else save();return}
  r.net={state:'wait',ts:Date.now()}}
function netEnd(r){const k=r.trk||{},d=geo(r.to),mins=Math.max(1,Math.round(((k.ts||Date.now())-(r.flyTs||Date.now()))/MIN));
  const near=d&&k.lat!=null&&kmNm(k.lat,k.lon,d[0],d[1])<=30&&(k.alt==null||k.alt<10000),wrongPlan=k.arr&&k.arr!==r.to;
  const out=!near||wrongPlan?'route':mins<Math.max(5,r.mins*.4)?'short':'ok',e=finalize(r,r.platform,out,{mins});r.miss=0;
  toast(e.status==='Completado'?t('Vuelo finalizado y validado. ¡Añadido a tu Logbook!','Flight ended and validated. Added to your Logbook!'):t('Vuelo finalizado: en revisión del staff.','Flight ended: under staff review.'));render()}
let netBusy=false;
async function netTick(force){if(CL.on)return;if(netBusy||!S.session||document.hidden&&!force)return;const p=me();if(!p||p.staff)return;
  const L=myRes(p.id).filter(r=>['reserved','checkedin','flying'].includes(r.status));if(!L.length)return;netBusy=true;
  try{for(const r of L)await netCheck(r,force)}finally{netBusy=false}
  if(/^#?(p-caso|p-ops|portal)/.test(location.hash||''))render()}
setInterval(()=>netTick(false),20000);setTimeout(()=>netTick(false),4000);   /* con Supabase lo hace el servidor (supabase/schema.sql) */
function netCard(r){const p=pilot(r.pilot),id=netId(p,r.platform),n=r.net||{},cs='NXR'+String(r.no).replace(/\D/g,'').slice(0,4);
  if(CL.on){const sv=r.status==='flying'?t('En vuelo: NEXORA AIR te sigue en '+r.platform+' desde el servidor.','Flying: NEXORA AIR is tracking you on '+r.platform+' from the server.'):t('Conéctate en '+r.platform+' con indicativo '+cs+' y plan de vuelo '+r.from+' → '+r.to+'. NEXORA AIR detecta tu conexión automáticamente, aunque no tengas esta web abierta, y cierra el vuelo cuando te desconectes.','Log on to '+r.platform+' with callsign '+cs+' (or NXR…) and flight plan '+r.from+' → '+r.to+'. NEXORA AIR detects your connection automatically, even with this site closed, and closes the flight when you disconnect.');
    return card(t('Seguimiento en '+r.platform,'Tracking on '+r.platform),`<div class="pad stack"><p><b>${r.platform}</b> · ID ${id?esc(String(id)):'—'}</p><p>${id?sv:t('Añade tu ID de '+r.platform+' en Mi perfil para que podamos seguir tu vuelo.','Add your '+r.platform+' ID in My profile so we can track your flight.')}</p></div>`)}
  const msg={noid:t('Añade tu ID de '+r.platform+' en Mi perfil para que podamos seguir tu vuelo.','Add your '+r.platform+' ID in My profile so we can track your flight.'),
   wait:t('Esperando tu conexión en '+r.platform+'. Conéctate con indicativo '+cs+' y plan de vuelo '+r.from+' → '+r.to+'.','Waiting for you to connect on '+r.platform+'. Log on with callsign '+cs+' (or NXR…) and flight plan '+r.from+' → '+r.to+'.'),
   live:t('En vuelo · ','Flying · ')+esc(n.cs||'')+' · '+nf(n.alt||0)+' ft · '+nf(n.gs||0)+' kt',
   lost:t('Sin señal en la red. Si te has desconectado, el vuelo se cerrará en unos instantes.','No signal on the network. If you disconnected, the flight will close shortly.'),
   other:t('Estás conectado con otra salida (','You are connected with a different departure (')+esc(n.dep||'?')+' → '+esc(n.arr||'?')+t('). Ajusta tu plan a ','). Adjust your plan to ')+r.from+' → '+r.to+'.',
   error:t('No se pudo consultar la red ahora mismo. Se reintentará solo.','The network could not be queried right now. It will retry automatically.')}[n.state]||t('Pendiente de la primera comprobación…','Waiting for the first check…');
  return card(t('Seguimiento en '+r.platform,'Tracking on '+r.platform),`<div class="pad stack"><p><b>${r.platform}</b> · ID ${id?esc(String(id)):'—'}</p><p class="${n.state==='live'?'':'muted'}">${msg}</p><p class="muted">${t('NEXORA AIR sigue tu vuelo automáticamente en la red real mientras tienes esta web abierta: detecta tu conexión, hace el check-in y cierra el vuelo cuando te desconectas.','NEXORA AIR tracks your flight on the real network automatically while this site is open: it detects your connection, checks you in and closes the flight when you disconnect.')}</p><div>${btn(t('Comprobar ahora','Check now'),'netchk',r.id,'sm')}</div></div>`)}
Object.assign(A,{netchk:async id=>{const r=R_(id);toast(t('Consultando la red…','Querying the network…'));await netCheck(r,true);render()},
 sbgen:id=>{const r=S.res.find(x=>x.id===id&&S.session&&x.pilot===S.session.id);if(!r){toast(t('No se encontró tu reserva. Vuelve a abrirla desde Mis reservas.','Your booking was not found. Reopen it from My bookings.'));return}r.sbGen=r.sbGen||Date.now();rlog(r,t('Briefing generado con SimBrief','Briefing generated with SimBrief'));save();window.open(sbLink(r),'_blank','noopener');render()}});
