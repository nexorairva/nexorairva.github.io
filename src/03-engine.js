
/* ===== engine ===== */
const ACTIVE=['reserved','checkedin','flying','review'];
const myRes=pid=>S.res.filter(r=>r.pilot===pid&&ACTIVE.includes(r.status)).sort((a,b)=>a.depTs-b.depTs);
function accepted(p){return['norm','terms','priv'].every(d=>S.accept.some(a=>a.pid===p.id&&a.doc===d&&a.v===S.docs[d].v))}
function tick(){const now=Date.now();
  S.pilots.forEach(p=>{if(p.status==='Suspended'&&p.susp&&!p.susp.ended&&p.susp.until<now)p.susp.ended=true;
    if(p.status==='Active'){const l=S.log.filter(e=>e.pilot===p.id).map(e=>e.depTs);const last=Math.max(p.joined,...l);if(now-last>90*DAY){p.status='Inactive';notify(p.id,t('Tu cuenta está marcada como inactiva. Completa un vuelo para reactivarla.','Your account is marked inactive. Complete a flight to reactivate it.'))}}});
  S.inc.forEach(i=>{if(i.responded||!['Abierta','Reabierta'].includes(i.st))return;const rem=i.deadline-now;
    if(rem<=24*H&&!i.r24){i.r24=1;notify(i.pilot,t('Recordatorio: te quedan menos de 24 h para responder al incidente ','Reminder: under 24 h left to answer incident ')+i.id)}
    if(rem<=0){i.st='Sin respuesta';notify(i.pilot,t('Plazo agotado en el incidente ','Deadline reached on incident ')+i.id)}});
  S.tickets.forEach(k=>{if(k.st!=='Closed'&&now-k.last>7*DAY){k.st='Closed';k.msgs=[]}});
  S.res.forEach(r=>{if(r.status==='reserved'||r.status==='checkedin'){if(r.expires?now>r.expires:now>r.depTs+4*H)r.status='expired'}});
  S.audit=S.audit.filter(a=>a.ts>now-365*DAY);save()}
function whyNot(p,i,ts){if(S.maint)return t('La plataforma está en mantenimiento.','Platform under maintenance.');
  if(p.status!=='Active'&&p.status!=='Inactive')return t('Tu cuenta no puede reservar ahora.','Your account cannot book right now.');
  if(!accepted(p))return t('Debes aceptar la normativa vigente.','You must accept the current rules.');return null}
function openReserve(id){const p=me();if(!p){go('login');return}const i=instances().find(x=>x.id===id);if(!i||i.free<=0||i.blocked){toast(t('Este vuelo ya no está disponible.','This flight is no longer available.'));render();return}
  const e=whyNot(p);if(e){toast(e);return}if(S.res.some(r=>r.instId===id&&r.pilot===p.id&&r.status!=='cancelled')){toast(t('Ya tienes este vuelo reservado.','You already booked this flight.'));return}
  const imm=i.ts-Date.now()<30*MIN;
  modal(t('Reservar ','Book ')+i.no,`<form data-f="rsv" data-id="${id}" class="form pad"><div class="full">${rt(i.from,i.to)}<p class="muted">${t('Código de vuelo asignado: ','Assigned flight code: ')}<b class="mono">${me().id}</b></p><p class="muted">${fdt(i.ts)} · ${nf(i.nm)} nm · ${fh(i.mins)} · ${TYPES[i.type].mf} ${TYPES[i.type].n}</p></div>
   ${sel('rsv','platform',t('Plataforma','Platform'),['VATSIM','IVAO'],p.platform)}
   ${imm?`<label class="full" style="flex-direction:row;align-items:center;gap:8px;color:var(--warn)"><input id="rsv-imm" type="checkbox" name="imm"> ${t('Salida inminente: confirmo que despego en menos de 30 minutos.','Imminent departure: I confirm I depart in under 30 minutes.')}</label>`:''}
   <div class="full"><button class="btn pri" type="submit">${t('Confirmar reserva','Confirm booking')}</button></div></form>`)}
function doReserve(id,plat,imm){const p=me(),i=instances().find(x=>x.id===id);if(!i||i.free<=0)return t('Vuelo no disponible.','Flight unavailable.');
  if(i.ts-Date.now()<30*MIN&&!imm)return t('Confirma la salida inminente.','Confirm the imminent departure.');
  const r={id:uid('R'),pilot:p.id,kind:'official',no:p.id,sched:i.no,instId:id,from:i.from,to:i.to,type:i.type,depTs:i.ts,mins:i.mins,nm:i.nm,platform:plat,status:'reserved',created:Date.now(),simbrief:null,checkin:null,session:'S-'+(hs(id+p.id)%1e6).toString(36).toUpperCase(),log:[{ts:Date.now(),text:t('Reserva creada; caso operacional abierto','Booking created; operational case opened')}]};
  S.res.push(r);ui.case=r.id;save();return r}
function rlog(r,tx){r.log.push({ts:Date.now(),text:tx})}
function finalize(r,plat,out,real){const p=pilot(r.pilot);let mins=real?Math.max(1,real.mins):Math.max(10,r.mins+Math.round((Math.random()-.5)*8));const an=[];
  if(out==='short'){if(!real)mins=6;an.push(t('Duración anormalmente corta','Abnormally short duration'))}
  if(out==='route')an.push(t('Aeropuerto de llegada distinto al reservado','Arrival airport differs from booking'));
  const now=Date.now(),before=rankOf(stats(p.id).h).i;
  const e={id:uid('L'),pilot:p.id,no:r.no,kind:r.kind,from:r.from,to:r.to,type:r.type,platform:plat,depTs:now-mins*MIN,arrTs:now,mins,nm:r.nm,status:an.length?'En revisión':'Completado',session:r.session,sb:r.sbGen?'ok':'none',an,pn:plat!==r.platform?t('Plataforma distinta a la reservada','Platform differs from booking'):''};
  S.log.push(e);r.entryId=e.id;rlog(r,t('Vuelo finalizado; datos recopilados','Flight ended; data collected'));
  if(an.length){r.status='review';rlog(r,t('En revisión: ','Under review: ')+an.join(', '));notify(p.id,t('Tu vuelo ','Your flight ')+e.no+t(' está en revisión.',' is under review.'))}
  else validated(r,e,before);save();return e}
function validated(r,e,before){const p=pilot(e.pilot);if(r)r.status='closed';rlog&&r&&rlog(r,t('Validado automáticamente','Automatically validated'));
  e.status='Completado';flightTx(e);if(p.status==='Inactive'){p.status='Active';notify(p.id,t('Cuenta reactivada.','Account reactivated.'))}
  settle();const a=rankOf(stats(p.id).h);if(a.i>before)notify(p.id,t('¡Ascenso a ','Promoted to ')+a.n+'!');
  notify(p.id,t('Vuelo ','Flight ')+e.no+' '+e.from+'-'+e.to+t(' validado y añadido a tu Logbook.',' validated and added to your Logbook.'))}
function cancelRes(r,why){r.status='cancelled';rlog(r,why||t('Cancelada por el piloto','Cancelled by pilot'))}
function rejectEntry(e){S.log=S.log.filter(x=>x.id!==e.id);S.tx=S.tx.filter(x=>x.ref!=='fl:'+e.id);const r=S.res.find(x=>x.entryId===e.id);if(r){r.status='rejected';r.hidden=1}settle();notify(e.pilot,t('Vuelo ','Flight ')+e.no+t(' rechazado: se han revertido horas, millas y puntos.',' rejected: hours, miles and points were reverted.'))}
function score(i,p){let s=0;const L=lE(p.id),rk=rankOf(stats(p.id).h).i;
  if(p.hub&&i.from===p.hub)s+=30;if(p.fav.includes(i.no))s+=25;if(p.favT.includes(i.type))s-=8;
  if(TOURS.some(tr=>(S.enroll[p.id]||{})[tr.id]&&tr.stages.some(st=>st.some(r=>r[0]===i.from&&r[1]===i.to))))s+=15;
  if(!L.some(e=>e.to===i.to||e.from===i.to))s+=10;if(i.nm>2500&&rk<2)s-=20;if(i.nm<500&&rk>=3)s-=8;
  if(i.ts-Date.now()<3*H)s+=20;return s+i.free/i.slots*10}

/* ===== ui helpers ===== */
const ui={fl:{sort:'',from:'',to:'',type:'',hub:'',band:'',dur:'',tour:'',seats:'',state:''},rk:'gen',case:null,edit:false,stp:'',cal:'',ctab:'all',tk:null};
const $=s=>document.querySelector(s);
const pill=(x,c='')=>`<span class="pill ${c}">${esc(x)}</span>`;
const rt=(a,b)=>`<span class="route"><b>${a}</b><i>→</i><b>${b}</b></span>`;
const btn=(l,a,id='',c='')=>`<button class="btn ${c}" data-a="${a}" data-id="${esc(id)}">${l}</button>`;
const card=(h,b,act='')=>`<section class="card"><header><h2>${h}</h2>${act}</header>${b}</section>`;
const tbl=(hs_,rows,empty)=>{const nm=hs_.map(h=>String(h).startsWith('>'));return`<div class="scroll"><table><thead><tr>${hs_.map((h,i)=>`<th class="${nm[i]?'num':''}">${esc(String(h).replace(/^>/,''))}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr class="${r.cls||''}">${r.map((c,i)=>`<td class="${nm[i]?'num':''}">${typeof c==='string'&&c.startsWith('>')?c.slice(1):c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${hs_.length}" class="empty">${empty||t('Sin datos.','No data.')}</td></tr>`}</tbody></table></div>`};
const fld=(f,n,l,ty='text',at='',v='')=>`<label>${l}<input id="${f}-${n}" name="${n}" type="${ty}" value="${esc(v)}" ${at}></label>`;
const sel=(f,n,l,o,v='',at='')=>`<label>${l}<select id="${f}-${n}" name="${n}" ${at}>${o.map(x=>{const[a,b]=Array.isArray(x)?x:[x,x];return`<option value="${esc(a)}" ${String(a)===String(v)?'selected':''}>${esc(b)}</option>`}).join('')}</select></label>`;
const ta=(f,n,l,v='',at='')=>`<label class="full">${l}<textarea id="${f}-${n}" name="${n}" ${at}>${esc(v)}</textarea></label>`;
const head=(h,p,act='')=>`<div class="head"><div><h1>${h}</h1>${p?`<p>${p}</p>`:''}</div>${act}</div>`;
const stPill=s=>pill({Active:t('Activo','Active'),Inactive:t('Inactivo','Inactive'),Suspended:t('Suspendido','Suspended'),Pending:t('Pendiente','Pending')}[s]||s,{Active:'good',Inactive:'warn',Suspended:'bad',Pending:'warn'}[s]);
let tt;function toast(x){const e=$('#toast');e.textContent=x;e.hidden=false;clearTimeout(tt);tt=setTimeout(()=>e.hidden=true,3400)}
function modal(h,b,w){$('#modal').innerHTML=b===undefined?'':`<div class="bg" data-a="xm"><div class="modal${w?' wide':''}" role="dialog" aria-modal="true"><header><h2>${h}</h2><button class="btn sm" data-a="xm" type="button">${t('Cerrar','Close')}</button></header>${b}</div></div>`}
function go(n){if(location.hash.slice(1)===n)render();else location.hash=n}

/* ===== routes (CSV) and airports ===== */
let RT=[],RTOK=false;
const BITS=[['A20N',1],['A21N',2],['B738',4],['B789',8],['E195',16]];
async function loadData(){
  try{const a=await (await fetch('airports.csv')).text();a.split('\n').forEach(l=>{const c=l.split(',');if(c.length>=5&&!APX[c[0]])APX[c[0]]=[+c[1],+c[2],c[3],c[4],c[5]||'',c[6]||'',(c[7]||'').trim()]})}catch(e){}
  try{const x=JSON.parse(localStorage.getItem('nexora-va-apx')||'null');if(x)Object.assign(APX,x)}catch(e){}
  try{let r=null;try{r=localStorage.getItem('nexora-va-rt')}catch(e){}if(!r)r=await (await fetch('routes.csv')).text();RT=r.split('\n').filter(Boolean).map(l=>{const c=l.split(',');return[norm(c[0]),norm(c[1]),+c[2]]});RTOK=true}catch(e){}
  applyApo();render()}
function importAirports(txt){const o={};let n=0;txt.split(/\r?\n/).forEach(l=>{const m=l.match(/("([^"]*)"|[^,]*)(,|$)/g);if(!m)return;const c=m.map(x=>x.replace(/,$/,'').replace(/^"|"$/g,''));if(c.length<8)return;const iata=c[4];if(/^[A-Z]{3}$/.test(iata)&&!isNaN(+c[6])&&!isNaN(+c[7])){o[iata]=[+c[6],+c[7],c[2],c[3]];n++}});
  Object.assign(APX,o);try{localStorage.setItem('nexora-va-apx',JSON.stringify(o))}catch(e){}return n}
const EQM={};[['320 32N 32S 32A 319 31N 318 31B',1],['321 32B 32Q',2],['738 73H 73W 737 73G 73J 73C 739 73Y 7M8 7M9 733 734 735 736 73F 73R 73M 73X',4],['787 788 789 78X 332 333 330 359 351 358 763 764 767 772 773 77L 77W 777 744 748 388 343 346 345 342 340 310',8],['E90 E95 E70 E75 E7W E170 E190 E195 CR9 CRJ CR7 CR2 CR1 ERJ ER4 ER3 DH4',16]].forEach(([k,b])=>k.split(' ').forEach(x=>EQM[x]=b));
function importRoutes(txt){const L=txt.split(/\r?\n/).filter(Boolean),p=new Map();
  if(/Source Airport/i.test(L[0])){L.slice(1).forEach(l=>{const c=l.split(',');const a=c[2],b=c[4];if(/^[A-Z]{3}$/.test(a)&&/^[A-Z]{3}$/.test(b)&&a!==b){const k=a+','+b;let m=p.get(k)||0;(c[8]||'').split(' ').forEach(e=>m|=EQM[e]||0);p.set(k,m)}})}
  else L.forEach(l=>{const c=l.split(',');if(/^[A-Za-z]{3}$/.test(c[0])&&/^[A-Za-z]{3}$/.test(c[1]))p.set(c[0].toUpperCase()+','+c[1].toUpperCase(),+c[2]||0)});
  if(!p.size)return 0;const out=[...p].map(([k,m])=>k+','+m).join('\n');try{localStorage.setItem('nexora-va-rt',out)}catch(e){return -1}return p.size}
const holds=pid=>S.res.filter(r=>r.pilot===pid&&r.kind==='route'&&['reserved','checkedin','flying'].includes(r.status));
function compat(nm,mask){return Object.keys(TYPES).filter(k=>TYPES[k].r*.9>=nm).sort((a,b)=>((mask&BITS.find(x=>x[0]===b)[1])?1:0)-((mask&BITS.find(x=>x[0]===a)[1])?1:0))}
function openRoute(a,b,mask){const p=me();if(!p){go('login');return}const e=whyNot(p);if(e){toast(e);return}const nm=dist(a,b);
  if(!nm){toast(t('Faltan las coordenadas de un aeropuerto. Importa airports.dat desde Staff › Aeropuertos.','Airport coordinates are missing. Import airports.dat from Staff › Airports.'));return}
  if(holds(p.id).length>=3){toast(t('Máximo 3 rutas reservadas a la vez.','Maximum 3 held routes at a time.'));return}
  if(holds(p.id).some(r=>r.from===a&&r.to===b)){toast(t('Ya tienes esta ruta reservada.','You already hold this route.'));return}
  const ty=compat(nm,mask);if(!ty.length){toast(t('Ninguna aeronave de la flota alcanza esta distancia.','No fleet aircraft can fly this distance.'));return}
  const ac=S.fleet.filter(x=>ty.includes(x.type)).sort((x,y)=>ty.indexOf(x.type)-ty.indexOf(y.type));
  modal(t('Reservar ruta','Book route'),`<form data-f="rte" data-id="${a}|${b}" class="form pad"><div class="full">${rt(a,b)}<p class="muted">${t('Código de vuelo asignado: ','Assigned flight code: ')}<b class="mono">${me().id}</b></p><p class="muted">${esc(apName(a))} → ${esc(apName(b))} · ${nf(nm)} nm</p><p class="muted">${t('La reserva se mantiene 24 horas. Si no vuelas en ese plazo, caduca.','The booking is held for 24 hours. If you do not fly in that time it expires.')}</p></div>
   ${sel('rte','reg',t('Aeronave','Aircraft'),ac.map(x=>[x.reg,x.reg+' · '+TYPES[x.type].mf+' '+TYPES[x.type].n+' «'+x.name+'»']))}${sel('rte','platform',t('Plataforma','Platform'),['VATSIM','IVAO'],p.platform)}
   <div class="full"><button class="btn pri" type="submit">${t('Reservar 24 horas','Book for 24 hours')}</button></div></form>`)}
function mkRes(p,kind,a,b,reg,plat,hours){const ac=S.fleet.find(x=>x.reg===reg),nm=dist(a,b),now=Date.now();
  const r={id:uid('R'),pilot:p.id,kind,no:p.id,instId:null,from:a,to:b,type:ac.type,reg,depTs:now,mins:cmins(nm,ac.type),nm,platform:plat,status:'reserved',created:now,expires:hours?now+hours*H:0,simbrief:null,checkin:null,session:'S-'+(hs(a+b+now)%1e6).toString(36).toUpperCase(),log:[{ts:now,text:kind==='route'?t('Ruta reservada durante 24 h; caso operacional abierto','Route held for 24 h; operational case opened'):t('Vuelo charter creado','Charter flight created')}]};
  S.res.push(r);ui.case=r.id;return r}
const CALLSIGN='NEXO';
function remOf(r){if(r.kind==='free')return S.remarks.ff;const trr=TOURS.find(tr=>(S.enroll[r.pilot]||{})[tr.id]&&tr.stages.some(s=>s.some(q=>q[0]===r.from&&q[1]===r.to)));return trr?(trr.remark||S.remarks.tour):S.remarks.flight}
const radioCs=r=>CALLSIGN+String(r.no).replace(/\D/g,'').slice(0,4);
function radioNotice(r){modal(t('Antes de volar: indicativo y remarks','Before you fly: callsign and remarks'),`<div class="pad stack"><p>${t('El indicativo de NEXORA AIR por radio es','NEXORA AIR\'s radio callsign is')} <b class="mono" style="font-size:1.3rem">${CALLSIGN}</b> ${t('(por ejemplo, ','(for example, ')}<span class="mono">${radioCs(r)}</span>${t(').',').')}</p><p>${t('Asegúrate de incluir estos remarks en tu plan de vuelo:','Make sure you include these remarks in your flight plan:')}</p><p class="mono" style="padding:10px;border:1px solid var(--line,#2a3a30);border-radius:8px;word-break:break-word">${esc(remOf(r))}</p><p class="muted">${t('Al generar el briefing con el botón de SimBrief de tu caso operacional, el indicativo y los remarks ya van rellenos.','When you generate the briefing with the SimBrief button in your operational case, the callsign and remarks are already filled in.')}</p><div><button class="btn pri" data-a="xm">${t('Entendido','Got it')}</button></div></div>`)}
const sbLink=r=>{const o=S.ap[norm(r.from)]?norm(r.from):r.from,d=S.ap[norm(r.to)]?norm(r.to):r.to;return`https://www.simbrief.com/system/dispatch.php?orig=${o}&dest=${d}&type=${r.type}&airline=NXR&fltnum=${String(r.no).replace(/\D/g,'').slice(0,4)}${r.reg?'&reg='+r.reg.replace('-',''):''}&callsign=${radioCs(r)}&manualrmk=${encodeURIComponent(remOf(r))}`};
