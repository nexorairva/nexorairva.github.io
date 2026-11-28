
/* ===== actions ===== */
const R_=id=>S.res.find(r=>r.id===id),P_=id=>S.pilots.find(p=>p.id===id);
const done=(m,keep)=>{save();if(!keep)modal();render();if(m)toast(m)};
async function hp(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('nexora:'+s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return'x:'+s.length}}
const A={
 xm:(id,el,ev)=>{if(ev.target.closest('.modal')&&!ev.target.closest('button[data-a="xm"]'))return;modal()},
 theme:()=>{const n=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('nexora-theme',n)}catch(e){}render()},
 findfl:()=>{ui.opsSearch=true;ui.fl.off=0;go('p-vuelos')},
 more5:()=>{const n=instances().filter(i=>!i.blocked&&i.free>0).length;ui.fl.off=((ui.fl.off|0)+5)%Math.max(5,n);render()},
 lang:()=>{S.lang=S.lang==='es'?'en':'es';done()},
 logout:()=>{S.session=null;save();go('inicio')},
 demo:id=>{const st=isStaff(pilot(id));S.session={id,staff:st};save();go(st?'s-dash':'portal')},
 reset:()=>{const l=S.lang;try{localStorage.removeItem(KEY)}catch(e){}seed();S.lang=l;done(t('Datos restablecidos','Data reset'))},
 rsv:id=>openReserve(id),
 favr:id=>{const p=me();p.fav=p.fav.includes(id)?p.fav.filter(x=>x!==id):[...p.fav,id];done()},
 case:id=>{ui.case=id;go('p-caso')},
 checkin:id=>{const r=R_(id);r.status='checkedin';r.checkin=Date.now();rlog(r,t('Check-in completado','Check-in completed'));done()},
 plat:id=>{const r=R_(id);r.platform=r.platform==='VATSIM'?'IVAO':'VATSIM';rlog(r,t('Plataforma cambiada a ','Platform changed to ')+r.platform);done()},
 cancel:id=>{cancelRes(R_(id));ui.case=null;save();go('p-ops');toast(t('Reserva cancelada','Booking cancelled'))},
 copy:id=>{const f=()=>toast(t('Copia manualmente: ','Copy manually: ')+id);try{navigator.clipboard.writeText(id).then(()=>toast(t('Remark copiado','Remark copied')),f)}catch(e){f()}},
 edit:()=>{ui.edit=!ui.edit;render()},
 wid:(id,el)=>{const pr=S.prefs[S.session.id]=S.prefs[S.session.id]||{hid:[]};pr.hid=el.checked?pr.hid.filter(x=>x!==id):[...pr.hid,id];save();render()},
 rk:id=>{ui.rk=id;render()},ctab:id=>{ui.ctab=id;render()},tk:id=>{ui.tk=id;render()},
 cert:id=>{const x=TOURS.find(q=>q.id===id),p=me(),g=tourProg(x,p.id),d=g.st[g.st.length-1].depTs;modal(t('Certificado','Certificate'),`<div class="cert"><span class="mono muted">NEXORA AIR VA · NXR</span><h2>${t('Certificado de Tour','Tour Certificate')}</h2><p>${t('Se certifica que','This certifies that')}</p><h1>${esc(p.name)}</h1><p>${p.id} · ${t('ha completado el tour','has completed the tour')}</p><h2 style="color:var(--brand)">${esc(x.n)}</h2><p class="muted">${fd(d)} · ID CERT-${(hs(p.id+x.id)%1e8).toString(36).toUpperCase()}</p><p class="muted" style="font-size:.75rem">${LEGAL()}</p></div>`)},
 enrol:id=>{const p=me();(S.enroll[p.id]=S.enroll[p.id]||{})[id]=Date.now();done(t('Inscrito en el tour','Enrolled in the tour'))},
 chdel:id=>{const c=S.chall.find(x=>x.id===id);if(!c)return;S.chall=S.chall.filter(x=>x.id!==id);syncCh();aud('Eliminó reto',c.n);done(t('Reto eliminado','Challenge deleted'))},
 evdel:id=>{const e=S.events.find(x=>x.id===id);if(!e)return;S.events=S.events.filter(x=>x.id!==id);aud('Eliminó evento',e.n);done(t('Evento eliminado','Event deleted'))},
 evjoin:id=>{S.events.find(e=>e.id===id).part[S.session.id]=[];done(t('Inscrito en el evento','Joined the event'))},
 evlink:id=>{const[e,l]=id.split(':');S.events.find(x=>x.id===e).part[S.session.id].push(l);settle();done(t('Vuelo vinculado','Flight linked'))},
 acc:id=>{S.accept.push({pid:S.session.id,doc:id,v:S.docs[id].v,ts:Date.now()});done(t('Aceptación registrada','Acceptance recorded'))},
 revreq:()=>{S.revReq.push(S.session.id);done(t('Revisión solicitada','Review requested'))},
 bgo:h=>{modal();go(h)},
 bell:()=>{const p=me(),l=S.notes.filter(n=>n.to===p.id).slice().reverse().slice(0,20);l.forEach(n=>n.read=true);save();modal(t('Notificaciones','Notifications'),`<div class="list">${l.map(n=>`<div><span>${esc(S.lang==='en'&&n.en?n.en:n.text)}</span><span class="muted">${n.go&&can(SPERM[n.go])?btn(t('Revisar','Review'),'bgo',n.go,'sm')+' ':''}${fd(n.ts)}</span></div>`).join('')||`<div class="empty">—</div>`}</div><p class="muted pad">${t('Cada notificación también se envía al email verificado.','Each notification is also emailed to the verified address.')}</p>`);render()},
 pdf:()=>{const p=me(),s=stats(p.id),L=S.log.filter(e=>e.pilot===p.id&&e.status==='Completado').sort((a,b)=>a.depTs-b.depTs);modal(t('Historial global (vista previa del PDF)','Global history (PDF preview)'),`<div class="pad stack"><p class="mono">NEXORA AIR VA · ID DOC NXR-H-${(hs(p.id+L.length)%1e8).toString(36).toUpperCase()} · ${fdt(Date.now())}</p><p><b>${esc(p.name)}</b> · ${p.id} · ${s.rank.n}</p>${tbl([t('Fecha','Date'),t('Vuelo','Flight'),t('Ruta','Route'),t('Red','Net')],L.slice(-12).map(e=>[fd(e.depTs),e.no,e.from+'→'+e.to,e.platform]))}<p><b>${t('Totales','Totals')}:</b> ${s.fl} ${t('vuelos','flights')} · ${nd(s.h)} h · ${nf(s.nm)} nm</p><p class="muted">${t('La exportación real a PDF llegará con el backend.','Real PDF export arrives with the backend.')}</p></div>`)},
 ap:id=>{const p=P_(id);p.status=p.status==='Pending'?'Active':p.status;p.netOk=true;notify(id,t('Tu cuenta y plataforma han sido aprobadas.','Your account and platform were approved.'));aud('Aprobó alta/plataforma',id);done()},
 rj:id=>{const p=P_(id);if(!p)return;modal(t('Rechazar solicitud','Reject request'),`<form data-f="drj" data-id="${esc(id)}" class="form pad"><p class="full">${t('Se eliminará la solicitud de','The request from')} <b>${esc(p.name)}</b> (${esc(p.id)}) ${t('y tendrá que volver a darse de alta si quiere entrar.','will be deleted and they will have to sign up again to join.')}</p><div class="full"><button class="btn bad" type="submit">${t('Rechazar y eliminar','Reject and delete')}</button> ${btn(t('Cancelar','Cancel'),'xm','','')}</div></form>`)},
 react:id=>{const p=P_(id);p.status='Active';delete p.susp;S.revReq=S.revReq.filter(x=>x!==id);notify(id,t('Tu suspensión ha finalizado y tu cuenta está reactivada.','Your suspension ended and your account is reactivated.'));aud('Reactivó cuenta',id);done()},
 susp:id=>modal(t('Suspender','Suspend'),`<form data-f="dsusp" data-id="${id}" class="form pad">${ta('dsusp','r',t('Motivo (obligatorio, visible para el piloto)','Reason (required, visible to pilot)'),'','required maxlength="200"')}${fld('dsusp','u',t('Fin de la suspensión','Suspension end'),'date','required')}<div class="full"><button class="btn bad" type="submit">${t('Suspender','Suspend')}</button></div></form>`),
 ptsm:id=>modal(t('Ajustar puntos','Adjust points'),`<form data-f="dpts" data-id="${id}" class="form pad">${fld('dpts','n',t('Puntos (negativo para retirar)','Points (negative to withdraw)'),'number','required min="-5000" max="5000"')}${fld('dpts','r',t('Motivo','Reason'),'text','required maxlength="100"')}<div class="full"><button class="btn pri" type="submit">${t('Aplicar','Apply')}</button></div></form>`),
 bdg:id=>modal(t('Conceder logro','Award badge'),`<form data-f="dbdg" data-id="${id}" class="form pad">${sel('dbdg','b',t('Logro','Badge'),STAFFB)}<div class="full"><button class="btn pri" type="submit">${t('Conceder','Award')}</button></div></form>`),
 deluser:id=>{purgePilot(id);aud('Eliminó la cuenta',id);done(t('Cuenta eliminada','Account deleted'))},
 blk:id=>{const f=S.flights.find(x=>x.no===id);f.blocked=!f.blocked;if(f.blocked)f.delay=false;aud(f.blocked?'Canceló vuelo':'Reactivó vuelo','NXR'+id);done()},
 dly:id=>{const f=S.flights.find(x=>x.no===id);f.delay=!f.delay;aud(f.delay?'Marcó retraso':'Quitó retraso','NXR'+id);done()},
 vap:id=>{const e=S.log.find(x=>x.id===id),b=rankOf(stats(e.pilot).h).i;validated(S.res.find(r=>r.entryId===id),e,b);aud('Aprobó vuelo en revisión',e.no+' '+e.pilot);done(t('Vuelo validado','Flight validated'))},
 vrj:id=>{const e=S.log.find(x=>x.id===id);aud('Rechazó vuelo en revisión',e.no+' '+e.pilot);rejectEntry(e);done(t('Vuelo rechazado y efectos revertidos','Flight rejected, effects reverted'))},
 ireo:id=>{const i=S.inc.find(x=>x.id===id);i.st='Reabierta';i.deadline=Date.now()+48*H;i.responded=false;i.r24=0;notify(i.pilot,t('Incidente reabierto: tienes 48 h para responder.','Incident reopened: you have 48 h to respond.'));aud('Reabrió incidente',id);done()},
 ires:id=>{const i=S.inc.find(x=>x.id===id);S.inc=S.inc.filter(x=>x.id!==id);notify(i.pilot,t('Incidente resuelto y eliminado.','Incident resolved and removed.'));aud('Resolvió incidente',id);done(t('Incidente resuelto','Incident resolved'))},
 tkc:id=>{const k=S.tickets.find(x=>x.id===id);k.st='Closed';k.msgs=[];notify(k.pilot,t('Ticket cerrado: ','Ticket closed: ')+id);done()},
 rcode:id=>modal(t('Código de ruta','Route code'),`<form data-f="dcode" data-id="${id}" class="form pad">${fld('dcode','c',t('Código','Code'),'text','required maxlength="14"',rcode(id.slice(0,4),id.slice(4)))}<div class="full"><button class="btn pri" type="submit">${t('Guardar','Save')}</button></div></form>`),
 maint:()=>{S.maint=!S.maint;aud(S.maint?'Activó mantenimiento':'Desactivó mantenimiento');done()}};
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a;if(!A[a])return;if(el.tagName==='A'&&a!=='xm')return;A[a](el.dataset.id,el,e)});

/* ===== forms ===== */
const err=(id,m)=>{const e=$('#'+id);if(e){e.textContent=m;e.hidden=false}return m};
const DANG=['exe','bat','cmd','com','scr','js','vbs','msi','ps1','jar','sh','dll'];
const F={
 hero:d=>{ui.fl.from=d.get('from');ui.fl.to=d.get('to');go(S.session?'p-vuelos':'operaciones')},
 flt:d=>{ui.fl.off=0;['from','to','type','hub','band','dur','tour','seats','state','sort'].forEach(k=>ui.fl[k]=d.get(k)||'');render()},
 reg:async d=>{const u=d.get('user').trim(),pl=d.get('platform'),id=pl==='VATSIM'?d.get('vatsim'):d.get('ivao');
  if(S.pilots.some(p=>p.user.toLowerCase()===u.toLowerCase()))return err('reg-err',t('Ese usuario ya existe.','That username already exists.'));
  if(!id)return err('reg-err',t('Indica tu ID de ','Enter your ')+pl+t('.',' ID.'));
  const p={id:nextPid(),name:d.get('name').trim(),country:d.get('country').toUpperCase(),user:u,email:d.get('email'),pass:await hp(d.get('pass')),platform:pl,vatsim:d.get('vatsim')||'',ivao:d.get('ivao')||'',simbrief:d.get('simbrief'),netOk:false,hub:'LEMD',status:'Pending',joined:Date.now(),fav:[],favT:[],badges:[]};
  S.pilots.push(p);aud('Nueva solicitud de alta',p.id);notifyStaff('pilotos','Nueva alta pendiente de revisión: '+p.name+' ('+p.id+')','New sign-up pending review: '+p.name+' ('+p.id+')','s-pilotos');save();go('login');toast(t('Solicitud enviada. SimBrief verificado; el staff revisará tu plataforma.','Request sent. SimBrief verified; staff will review your platform.'))},
 login:async d=>{const u=d.get('user').trim().toLowerCase(),k=S.att[u]||{n:0,until:0};
  if(k.until>Date.now())return err('login-err',t('Acceso bloqueado temporalmente. Inténtalo más tarde.','Access temporarily locked. Try again later.'));
  const p=S.pilots.find(x=>x.user.toLowerCase()===u),h=await hp(d.get('pass'));
  if(!p||!p.pass||p.pass!==h){k.n++;if(k.n>=5){k.until=Date.now()+10*MIN;k.n=0;S.sec.push({ts:Date.now(),txt:t('Bloqueo temporal por intentos fallidos: ','Temporary lock after failed attempts: ')+u,sev:'alta'})}S.att[u]=k;save();return err('login-err',t('Usuario o contraseña incorrectos. Las cuentas de ejemplo entran con los botones de demo.','Wrong username or password. Sample accounts log in with the demo buttons.'))}
  S.att[u]={n:0,until:0};S.session={id:p.id,staff:isStaff(p)};save();go(isStaff(p)?'s-dash':'portal')},
 rsv:(d,f)=>{const m=doReserve(f.dataset.id,d.get('platform'),!!d.get('imm'));if(typeof m==='string'){toast(m);return}modal();save();go('p-caso');setTimeout(()=>radioNotice(R_(ui.case)),60);toast(t('Reserva confirmada. Caso operacional abierto.','Booking confirmed. Operational case opened.'))},
 just:(d,f)=>{S.log.find(e=>e.id===f.dataset.id).just=d.get('t');done(t('Justificación enviada al staff','Explanation sent to staff'))},
 free:d=>{const a=d.get('from'),b=d.get('to'),ty=d.get('type');if(a===b)return err('free-err',t('Origen y destino deben ser distintos.','Origin and destination must differ.'));const nm=dist(a,b);
  if(nm>TYPES[ty].r*.9)return err('free-err',t('Esa aeronave no alcanza esa distancia (','That aircraft cannot fly ')+nf(nm)+' nm).');
  const p=me(),r={id:uid('R'),pilot:p.id,kind:'free',no:p.id,instId:null,from:a,to:b,type:ty,depTs:Date.now(),mins:cmins(nm,ty),nm,platform:d.get('plat'),status:'reserved',created:Date.now(),simbrief:null,checkin:null,session:'S-'+(hs(a+b+Date.now())%1e6).toString(36).toUpperCase(),log:[{ts:Date.now(),text:t('Free Flight creado','Free Flight created')}]};
  S.res.push(r);ui.case=r.id;save();go('p-caso')},
 prof:d=>{const p=me();p.name=d.get('name');p.email=d.get('email');p.platform=d.get('platform');p.hub=d.get('hub');p.favT=d.getAll('ft');done(t('Perfil guardado','Profile saved'))},
 pw:async d=>{const p=me(),h=await hp(d.get('new'));if(p.pass===h)return err('pw-err',t('No puedes reutilizar la contraseña actual.','You cannot reuse the current password.'));p.pass=h;S.session=null;save();go('login');toast(t('Contraseña cambiada; se cerraron todas las sesiones.','Password changed; all sessions were closed.'))},
 del:async d=>{const p=me();if(p.pass&&p.pass!==await hp(d.get('pass')))return err('del-err',t('Contraseña incorrecta.','Wrong password.'));S.delReq.push(p.id);done(t('Solicitud enviada al administrador','Request sent to the administrator'))},
 tkn:(d,f)=>{const fs=[...f.querySelector('input[type=file]').files];if(fs.length>3)return err('tkn-err',t('Máximo 3 archivos por ticket.','Max 3 files per ticket.'));
  for(const x of fs){if(x.size>25*1048576)return err('tkn-err',x.name+t(': supera 25 MB.',': exceeds 25 MB.'));if(DANG.includes(x.name.split('.').pop().toLowerCase()))return err('tkn-err',x.name+t(': archivo bloqueado por seguridad. Quítalo e inténtalo de nuevo.',': blocked for security. Remove it and try again.'))}
  const n=Math.max(0,...S.tickets.map(k=>+k.id.slice(2)))+1;S.tickets.push({id:'T-'+String(n).padStart(4,'0'),pilot:S.session.id,subject:d.get('s'),st:'Open',last:Date.now(),msgs:[{from:'pilot',text:d.get('t'),ts:Date.now(),files:fs.map(x=>x.name)}]});ui.tk='T-'+String(n).padStart(4,'0');done(t('Ticket creado','Ticket created'))},
 tkr:(d,f)=>{const k=S.tickets.find(x=>x.id===f.dataset.id);k.msgs.push({from:'pilot',text:d.get('t'),ts:Date.now(),files:[]});k.last=Date.now();done(t('Respuesta enviada','Reply sent'))},
 tks:(d,f)=>{const k=S.tickets.find(x=>x.id===f.dataset.id);k.msgs.push({from:'staff',text:d.get('t'),ts:Date.now(),files:[]});k.last=Date.now();k.st='In process';notify(k.pilot,t('Respuesta del staff en el ticket ','Staff reply on ticket ')+k.id);done(t('Respuesta enviada','Reply sent'))},
 inc:(d,f)=>{const i=S.inc.find(x=>x.id===f.dataset.id);i.msgs.push({from:me().name,text:d.get('t')});i.responded=true;i.st='En revisión';done(t('Respuesta enviada','Response sent'))},
 ninc:d=>{const pid=d.get('pid');if(S.inc.some(i=>i.pilot===pid))return err('ninc-err',t('Ese piloto ya tiene un incidente abierto.','That pilot already has an open incident.'));const Y=new Date().getUTCFullYear(),n=(S.incSeq[Y]||0)+1;S.incSeq[Y]=n;
  const id='NXR-INC-'+Y+'-'+String(n).padStart(n>999999?7:6,'0');S.inc.push({id,pilot:pid,subject:d.get('s'),detail:d.get('d'),st:'Abierta',created:Date.now(),deadline:Date.now()+48*H,responded:false,msgs:[]});notify(pid,t('Nuevo incidente ','New incident ')+id+t(': tienes 48 h para responder.',': you have 48 h to respond.'));aud('Abrió incidente',id);done(t('Incidente abierto','Incident opened'))},
 nfl:d=>{const a=d.get('from'),b=d.get('to'),ty=d.get('type');if(a===b)return err('nfl-err',t('Origen y destino deben ser distintos.','Origin and destination must differ.'));if(dist(a,b)>TYPES[ty].r*.9)return err('nfl-err',t('La aeronave no alcanza esa distancia.','The aircraft cannot fly that distance.'));
  const no=String(Math.max(...S.flights.map(f=>+f.no))+1);S.flights.push({no,from:a,to:b,m:d.get('m'),type:ty,blocked:false});aud('Creó vuelo','NXR'+no);done(t('Vuelo NXR','Flight NXR')+no+t(' creado',' created'))},
 nac:d=>{const reg=d.get('reg').toUpperCase();if(S.fleet.some(a=>a.reg===reg))return err('nac-err',t('Esa matrícula ya existe.','That registration already exists.'));S.fleet.push({reg,type:d.get('type'),name:d.get('name')});aud('Añadió aeronave',reg);done(reg+t(' añadida',' added'))},
 nap:d=>{const k=d.get('icao').toUpperCase();if(S.ap[k])return err('nap-err',t('Ese ICAO ya existe.','That ICAO already exists.'));S.ap[k]=[d.get('iata').toUpperCase(),d.get('city'),d.get('k').toUpperCase(),+d.get('lat'),+d.get('lon'),d.get('tz'),'',d.get('city')];rebuildIx();aud('Añadió aeropuerto',k);done(k+t(' añadido',' added'))},
 nev:d=>{const s=Date.parse(d.get('s'));S.events.push({id:uid('ev'),n:d.get('n'),d:d.get('d'),s,e:s+4*H,x:+d.get('x'),badge:'',remark:(d.get('remark')||'').trim()||undefined,part:{}});aud('Creó evento',d.get('n'));done(t('Evento creado','Event created'))},
 nch:d=>{const k=d.get('k')==='ms'?'ms':'ch',n=(d.get('n')||'').trim(),g=+d.get('g'),pts=+d.get('pts'),xp=+d.get('xp'),m=d.get('m'),per=d.get('per');
  if(!n||!(g>0)||!['flights','hours','miles','airports','long'].includes(m)||!['day','week','month','season','special'].includes(per)||!(pts>=0)||!(xp>=0))return;
  S.chall.push({id:uid(k),k,n,m,g,per,pts,xp});syncCh();aud('Creó reto',n);done(t('Reto creado','Challenge created'))},
 ncal:d=>{S.cal.push({id:uid('c'),type:d.get('k'),n:d.get('n'),ts:Date.parse(d.get('s'))});aud('Añadió al calendario',d.get('n'));done(t('Añadido','Added'))},
 rem:d=>{Object.keys(S.remarks).forEach(k=>S.remarks[k]=d.get(k));aud('Actualizó remarks');done(t('Remarks guardados','Remarks saved'))},
 nnw:d=>{const id=d.get('id'),o={n:(d.get('n')||'').trim(),b:(d.get('b')||'').trim(),aud:d.get('aud'),rel:d.get('rel')?1:0};if(!o.n||!o.b)return;
  if(id){const n=S.news.find(x=>x.id===id);if(!n)return;Object.assign(n,o,{edited:Date.now()});ui.nw=null;aud('Editó noticia',o.n);done(t('Noticia actualizada','News updated'))}
  else{S.news.push(Object.assign({id:uid('n'),ts:Date.now()},o));aud('Publicó noticia',o.n);done(t('Publicado','Published'))}},
 ndel:d=>{const id=d.get('id'),n=S.news.find(x=>x.id===id);if(!n)return;S.news=S.news.filter(x=>x.id!==id);if(ui.nw&&ui.nw.id===id)ui.nw=null;aud('Eliminó noticia',n.n);done(t('Noticia eliminada','News deleted'))},
 ngr:d=>{S.groups.push({n:d.get('n'),m:d.getAll('m')});aud('Creó grupo',d.get('n'));done(t('Grupo creado','Group created'))},
 ndoc:d=>{const k=d.get('d'),v=(parseFloat(S.docs[k].v)+.1).toFixed(1),x=(d.get('x')||'').trim(),pdf=ui.docPdf;if(!x&&!pdf){toast(t('Escribe el texto o adjunta un archivo.','Write the text or attach a file.'));return}
  S.docs[k]=Object.assign({v,ts:Date.now(),text:x},pdf?{file:{name:pdf.name,data:pdf.data}}:{});ui.docPdf=null;ui.docK=null;S.pilots.filter(p=>p.status!=='Pending').forEach(p=>notify(p.id,t('Nueva versión publicada: ','New version published: ')+t(...DOCN[k])+' v'+v));aud('Publicó '+DOCN[k][0],'v'+v);done(t('Versión publicada: los pilotos deben aceptarla','Version published: pilots must accept it'))},
 dsusp:(d,f)=>{const p=P_(f.dataset.id);p.status='Suspended';p.susp={reason:d.get('r'),until:Date.parse(d.get('u')),ended:false};S.res.filter(r=>r.pilot===p.id&&ACTIVE.includes(r.status)).forEach(r=>cancelRes(r,t('Cancelada por suspensión','Cancelled by suspension')));notify(p.id,t('Cuenta suspendida: ','Account suspended: ')+d.get('r'));aud('Suspendió piloto',p.id);done()},
 dpts:(d,f)=>{const p=P_(f.dataset.id);S.tx.push({id:uid('X'),pilot:p.id,pts:+d.get('n'),xp:0,why:t('Ajuste manual: ','Manual adjustment: ')+d.get('r'),ref:'manual',ts:Date.now()});notify(p.id,t('Ajuste de puntos: ','Points adjustment: ')+d.get('n'));aud('Ajustó puntos',p.id+' '+d.get('n'));done()},
 dbdg:(d,f)=>{const p=P_(f.dataset.id);if(!p.badges.includes(d.get('b')))p.badges.push(d.get('b'));notify(p.id,t('Logro concedido: ','Badge awarded: ')+d.get('b'));aud('Concedió logro',p.id);done()},
 dcode:(d,f)=>{S.routeCodes[f.dataset.id]=d.get('c');aud('Cambió código de ruta',f.dataset.id);done()}};
F.drj=(d,f)=>{const id=f.dataset.id;purgePilot(id);aud('Rechazó solicitud',id);done(t('Solicitud rechazada. Tendrá que volver a registrarse.','Request rejected. They will have to sign up again.'))};
document.addEventListener('submit',e=>{const f=e.target.closest('form[data-f]');if(!f)return;e.preventDefault();const h=F[f.dataset.f];if(h)h(new FormData(f),f)});
document.addEventListener('change',e=>{const f=e.target.closest('form[data-f="flt"]');if(f)F.flt(new FormData(f),f)});

