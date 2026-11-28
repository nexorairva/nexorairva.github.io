/* ===== util ===== */
const DAY=864e5,H=36e5,MIN=6e4,KEY='nexora-va-v3';
let S={};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const dUTC=ts=>{const d=new Date(ts);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())};
const iso=ts=>new Date(ts).toISOString().slice(0,10);
const fz=ts=>{const d=new Date(ts);return pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+'z'};
const fd=ts=>{const d=new Date(ts);return pad(d.getUTCDate())+'/'+pad(d.getUTCMonth()+1)+'/'+d.getUTCFullYear()};
const fdt=ts=>fd(ts)+' '+fz(ts);
const fh=m=>Math.floor(m/60)+'h '+pad(Math.round(m%60))+'m';
const loc=()=>S.lang==='en'?'en-US':'es-ES';
const nf=n=>Math.round(n).toLocaleString(loc());
const nd=n=>(Math.round(n*10)/10).toLocaleString(loc());
const t=(es,en)=>S.lang==='en'?en:es;
const hs=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let x=Math.imul(a^a>>>15,1|a);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296};
const uid=p=>p+(++S.seq);

/* ===== static data ===== */
const TYPES={A20N:{mf:'Airbus',n:'A320neo',r:3300,v:440,seats:180},A21N:{mf:'Airbus',n:'A321neo',r:3800,v:440,seats:220},B738:{mf:'Boeing',n:'737-800',r:2900,v:435,seats:189},B789:{mf:'Boeing',n:'787-9',r:7000,v:490,seats:296},E195:{mf:'Embraer',n:'E195',r:2300,v:420,seats:124}};
const RANKS=[['Cadete','Cadet',0],['Primer Oficial','First Officer',25],['Capitán','Captain',75],['Capitán Sénior','Senior Captain',150],['Comandante','Commander',300]];
const AP0={LEMD:['MAD','Madrid','ES',40.4936,-3.5668,'Europe/Madrid','primary','Adolfo Suárez Madrid-Barajas'],LEBL:['BCN','Barcelona','ES',41.2971,2.0785,'Europe/Madrid','secondary','Josep Tarradellas Barcelona-El Prat'],
LEPA:['PMI','Palma de Mallorca','ES',39.5517,2.7388,'Europe/Madrid','','Palma de Mallorca'],LEMG:['AGP','Málaga','ES',36.6749,-4.4991,'Europe/Madrid','','Málaga-Costa del Sol'],LEVC:['VLC','Valencia','ES',39.4893,-.4816,'Europe/Madrid','','Valencia'],
LEZL:['SVQ','Sevilla','ES',37.418,-5.8931,'Europe/Madrid','','Sevilla'],GCLP:['LPA','Gran Canaria','ES',27.9319,-15.3866,'Atlantic/Canary','','Gran Canaria'],GCTS:['TFS','Tenerife Sur','ES',28.0445,-16.5725,'Atlantic/Canary','','Tenerife Sur'],
LPPT:['LIS','Lisboa','PT',38.7813,-9.1359,'Europe/Lisbon','','Humberto Delgado'],LFPG:['CDG','París','FR',49.0097,2.5479,'Europe/Paris','','Charles de Gaulle'],EGLL:['LHR','Londres','GB',51.47,-.4543,'Europe/London','','Heathrow'],
EDDF:['FRA','Fráncfort','DE',50.0379,8.5622,'Europe/Berlin','','Frankfurt Main'],EHAM:['AMS','Ámsterdam','NL',52.3086,4.7639,'Europe/Amsterdam','','Schiphol'],LIRF:['FCO','Roma','IT',41.8003,12.2389,'Europe/Rome','','Fiumicino'],
KJFK:['JFK','Nueva York','US',40.6413,-73.7781,'America/New_York','','John F. Kennedy'],KMIA:['MIA','Miami','US',25.7959,-80.287,'America/New_York','','Miami'],SBGR:['GRU','São Paulo','BR',-23.4356,-46.4731,'America/Sao_Paulo','','Guarulhos']};
const FL0=[['101','LEMD','LEBL','06:30','A20N',8],['102','LEBL','LEMD','08:10','A20N',8],['103','LEMD','LEBL','11:45','B738',10],['104','LEBL','LEMD','14:20','B738',6],['105','LEMD','LEBL','18:05','A21N',8],['106','LEBL','LEMD','20:40','A21N',6],
['111','LEMD','LEPA','07:15','A20N',6],['112','LEPA','LEMD','09:30','A20N',6],['113','LEBL','LEPA','12:00','E195',4],['121','LEMD','LEMG','09:00','A21N',8],['122','LEMG','LEMD','11:20','A21N',8],['131','LEMD','LEVC','13:10','E195',5],['132','LEVC','LEMD','15:00','E195',5],
['141','LEMD','LEZL','16:30','E195',5],['142','LEZL','LEMD','18:20','E195',5],['201','LEMD','LPPT','10:10','A20N',6],['202','LPPT','LEMD','12:35','A20N',6],['301','LEMD','GCLP','08:50','A21N',8],['302','GCLP','LEMD','13:40','A21N',8],
['311','LEMD','GCTS','14:55','B738',8],['312','GCTS','LEMD','19:20','B738',8],['401','LEMD','LFPG','07:40','A20N',6],['402','LFPG','LEMD','10:30','A20N',6],['411','LEMD','EGLL','12:15','A21N',8],['412','EGLL','LEMD','15:25','A21N',8],
['421','LEMD','EDDF','09:45','B738',6],['422','EDDF','LEMD','13:05','B738',6],['431','LEMD','LIRF','17:10','A20N',6],['441','LEMD','EHAM','19:00','A21N',6],['442','EHAM','LEMD','21:45','A21N',6],
['801','LEMD','KJFK','10:00','B789',6],['802','KJFK','LEMD','20:30','B789',6],['811','LEMD','KMIA','11:30','B789',6],['812','KMIA','LEMD','17:00','B789',6],['821','LEMD','SBGR','22:00','B789',6],['822','SBGR','LEMD','09:20','B789',6]];
const TOURS0=[];   // sin tours de ejemplo: los crea el staff
let TOURS=TOURS0;
let CHALL=[],MISS=[];   // retos creados por el staff (S.chall): desafíos (k:'ch') y misiones (k:'ms')
function syncCh(){S.chall=S.chall||[];CHALL=S.chall.filter(c=>c.k!=='ms');MISS=S.chall.filter(c=>c.k==='ms')}
const BADGES=[{id:'b1',n:'Primer vuelo',d:'Completa tu primer vuelo.',f:(L)=>L.length>=1},{id:'b2',n:'Diez vuelos',d:'Completa 10 vuelos.',f:L=>L.length>=10},{id:'b3',n:'50 horas',d:'Acumula 50 horas.',f:L=>metric(L,'hours')>=50},
 {id:'b4',n:'Cinco aeropuertos',d:'Visita 5 aeropuertos.',f:L=>metric(L,'airports')>=5},{id:'b5',n:'Tres modelos',d:'Vuela 3 modelos distintos.',f:L=>new Set(L.map(e=>e.type)).size>=3},
 {id:'h1',n:'Noctámbulo',d:'Despega entre 00:00z y 05:00z.',hid:1,f:L=>L.some(e=>new Date(e.depTs).getUTCHours()<5)},{id:'h2',n:'Doblete',d:'Dos vuelos el mismo día.',hid:1,f:L=>new Set(L.map(e=>iso(e.depTs))).size<L.length},
 {id:'h3',n:'Cruce oceánico',d:'Un vuelo de más de 3.000 nm.',hid:1,f:L=>L.some(e=>e.nm>3000)}];
const GALL=['img/livery.jpg','img/front.jpg','img/rear.jpg','img/winglet.jpg','img/engine.jpg','img/top.jpg'];
const DESC={A20N:'Avión de pasillo único de nueva generación, base de la red de corto y medio radio de NEXORA AIR.',A21N:'Versión alargada del A320neo con más capacidad para rutas de alta demanda.',B738:'Reactor de pasillo único, fiable y versátil, para rutas europeas e islas.',B789:'Bimotor de fuselaje ancho para los vuelos de largo radio y transoceánicos.',E195:'Jet regional para rutas cortas y aeropuertos de menor tamaño.'};
const STAFFB=['Fundador','Embajador','Instructor'];
const DOCN={norm:['Normativa','Rules'],terms:['Términos de uso','Terms of Use'],priv:['Política de privacidad','Privacy Policy']};

/* ===== geo / calc ===== */
let APX={},ICX={};
function applyApo(){try{Object.keys(S.apo||{}).forEach(k=>{APX[k]=S.apo[k]})}catch(e){}}   /* ediciones del staff sobre el catálogo de aeropuertos */
const rebuildIx=()=>{ICX={};Object.keys(S.ap).forEach(k=>ICX[S.ap[k][0]]=k)};
const norm=c=>{c=String(c||'').trim().toUpperCase();return c.length===3&&ICX[c]?ICX[c]:c};
const geo=c=>{c=norm(c);if(S.ap[c])return[S.ap[c][3],S.ap[c][4]];const a=APX[c];return a?[a[0],a[1]]:null};
const apName=c=>{c=norm(c);return S.ap[c]?S.ap[c][1]:APX[c]?APX[c][2]:c};
const apKnown=c=>!!geo(c);
const dist=(a,b)=>{const A=geo(a),B=geo(b);if(!A||!B)return null;const r=x=>x*Math.PI/180,dp=r(B[0]-A[0]),dl=r(B[1]-A[1]);
  const h=Math.sin(dp/2)**2+Math.cos(r(A[0]))*Math.cos(r(B[0]))*Math.sin(dl/2)**2;return Math.round(2*3440.065*Math.asin(Math.sqrt(h)))};
const cmins=(nm,ty)=>Math.round(nm/TYPES[ty].v*60+25);
const win=(p,ts=Date.now())=>{const d=new Date(ts),Y=d.getUTCFullYear(),M=d.getUTCMonth();
  if(p==='day'){const a=dUTC(ts);return[a,a+DAY]}
  if(p==='week'){const a=dUTC(ts)-((d.getUTCDay()+6)%7)*DAY;return[a,a+7*DAY]}
  if(p==='month')return[Date.UTC(Y,M,1),Date.UTC(Y,M+1,1)];
  if(p==='year')return[ts-365*DAY,ts+1];
  if(p==='all')return[0,ts+DAY];
  return[Date.UTC(Y,0,1),Date.UTC(Y+1,0,1)]};
const metric=(L,m)=>m==='flights'?L.length:m==='hours'?L.reduce((a,e)=>a+e.mins,0)/60:m==='miles'?L.reduce((a,e)=>a+e.nm,0):m==='airports'?new Set(L.flatMap(e=>[e.from,e.to])).size:m==='long'?L.filter(e=>e.nm>=3000).length:0;
const inW=(L,w)=>L.filter(e=>e.depTs>=w[0]&&e.depTs<w[1]);
const pilot=id=>S.pilots.find(p=>p.id===id)||{id,name:id,status:'?'};
const me=()=>S.session&&pilot(S.session.id);
const lE=(pid)=>S.log.filter(e=>e.pilot===pid&&e.status==='Completado');
function rankOf(h){let i=0;RANKS.forEach((r,k)=>{if(h>=r[2])i=k});const nx=RANKS[i+1];return{i,n:t(RANKS[i][0],RANKS[i][1]),next:nx?{n:t(nx[0],nx[1]),min:nx[2]}:null,min:RANKS[i][2]}}
function stats(pid){const L=lE(pid),hl=metric(L,'hours'),ad=+((S.pilots.find(p=>p.id===pid)||{}).hAdj)||0,h=Math.max(0,hl+ad);const tx=S.tx.filter(x=>x.pilot===pid);const xp=tx.reduce((a,x)=>a+x.xp,0);
  return{L,h,hl,ad,fl:L.length,nm:metric(L,'miles'),pts:tx.reduce((a,x)=>a+x.pts,0),xp,lvl:Math.floor(Math.sqrt(xp/50))+1,rank:rankOf(h)}}
function tourProg(tr,pid){const en=(S.enroll[pid]||{})[tr.id];if(!en)return{en:0,done:false,st:[]};
  const L=lE(pid).filter(e=>e.kind!=='free').sort((a,b)=>a.depTs-b.depTs);let after=en;const st=[];
  for(const s of tr.stages){const e=L.find(x=>x.depTs>after&&s.some(r=>r[0]===x.from&&r[1]===x.to)&&(!tr.ac||x.type===tr.ac));if(!e)break;st.push(e);after=e.depTs}
  return{en,st,done:st.length===tr.stages.length}}

/* ===== state ===== */
function load(){try{const r=localStorage.getItem(KEY);if(r){const s=JSON.parse(r);if(s&&s.v===3)return s}}catch(e){}return null}
function save(){if(CL.on){cloudSaveSoon();return}try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){if(!save.w){save.w=1;setTimeout(()=>toast('No hay espacio en el navegador: las imágenes grandes no se guardarán.'),0)}}}
function notify(pid,text){S.notes.push({id:uid('N'),to:pid,text,ts:Date.now(),read:false})}
/* avisa a todo el staff que tenga el permiso indicado; en=texto en inglés, go=sección a la que lleva el botón Revisar */
function notifyStaff(perm,text,en,go){S.pilots.forEach(p=>{if(isStaff(p)&&can(perm,p))S.notes.push({id:uid('N'),to:p.id,text,en:en||text,ts:Date.now(),read:false,go:go||''})})}
function aud(a,tg){S.audit.push({ts:Date.now(),who:me()?me().name:'sistema',a,tg:tg||''})}
function flightTx(e){const b=80+e.nm/8,f=e.kind==='free';S.tx.push({id:uid('X'),pilot:e.pilot,pts:Math.round(f?b*.3:b),xp:Math.round((e.mins*.5+15)*(f?.5:1)),why:(f?'Charter ':'Vuelo ')+e.no+' '+e.from+'-'+e.to,ref:'fl:'+e.id,ts:e.depTs})}
function addEntry(R,pid,f,depTs,plat,o){const nm=dist(f.from,f.to),mins=cmins(nm,f.type)+Math.round((R()-.4)*6);
  const e=Object.assign({id:uid('L'),pilot:pid,no:pid,kind:'official',from:f.from,to:f.to,type:f.type,platform:plat,depTs,arrTs:depTs+mins*MIN,mins,nm,status:'Completado',session:'S-'+(hs(pid+depTs)%1e6).toString(36).toUpperCase(),sb:'ok',an:[]},o||{});
  S.log.push(e);if(e.status==='Completado')flightTx(e);return e}
const findF=(a,b)=>S.flights.find(f=>f.from===a&&f.to===b);
const fm=f=>{const[h,m]=f.m.split(':');return(+h)*60+(+m)};
function instances(){const out=[],now=Date.now(),d0=dUTC(now);
  for(let k=0;k<=2;k++)for(const f of S.flights){const ts=d0+k*DAY+fm(f)*MIN;if(ts<now+15*MIN)continue;const id='NXR'+f.no+'-'+iso(ts);
    const nm=dist(f.from,f.to),used=S.res.filter(r=>r.instId===id&&r.status!=='cancelled').length;const sl=TYPES[f.type].seats,booked=used;
    out.push({id,f,no:'NXR'+f.no,ts,from:f.from,to:f.to,type:f.type,nm,mins:cmins(nm,f.type),slots:sl,free:sl-booked,blocked:!!f.blocked})}
  return out}
function seed(){
  const now=Date.now(),Y=new Date(now).getUTCFullYear(),R=mul(2026),D=n=>now-n*DAY;
  S={v:3,lang:'es',session:null,seq:100,pidSeq:113,ap:JSON.parse(JSON.stringify(AP0)),flights:FL0.map(x=>({no:x[0],from:x[1],to:x[2],m:x[3],type:x[4],slots:x[5],blocked:x[0]==='431'})),
   fleet:[['EC-NXA','A20N','Alhambra'],['EC-NXB','A20N','Giralda'],['EC-NXC','A20N','Montjuïc'],['EC-NXD','A21N','Teide'],['EC-NXE','A21N','Sierra Nevada'],['EC-NXF','B738','Cibeles'],['EC-NXG','B738','Retiro'],['EC-NXJ','B789','Quijote'],['EC-NXK','B789','Atlántico'],['EC-NXL','E195','Duero']].map(x=>({reg:x[0],type:x[1],name:x[2],desc:DESC[x[1]],img:x[1]==='A20N'?GALL.slice():[]})),tours:JSON.parse(JSON.stringify(TOURS0)),
   pilots:[],log:[],tx:[],res:[],enroll:{},prefs:{},accept:[],notes:[],audit:[],tickets:[],inc:[],incSeq:{},news:[],groups:[],events:[],cal:[],sec:[],maint:false,ignored:37,delReq:[],revReq:[],att:{},routeCodes:{},
   intg:[['SimBrief','Operativa'],['VATSIM','Operativa'],['IVAO','Degradada'],['Correo electrónico','Operativa'],['Almacenamiento de archivos','Operativa'],['Generación de PDF','Operativa']].map(x=>({n:x[0],st:x[1],ts:now-5*MIN})),
   remarks:{ff:'NEXORA AIR VA | FREE FLIGHT | NXR',flight:'NEXORA AIR VA | NXR | VUELO OFICIAL',tour:'NEXORA AIR VA | NXR | TOUR',event:'NEXORA AIR VA | NXR | EVENTO',special:'NEXORA AIR VA | NXR | ESPECIAL'},
   docs:{norm:{v:'1.0',ts:D(300),text:'Los pilotos vuelan con respeto a la red, a los controladores y a la comunidad. Una cuenta por persona. Los vuelos se reservan antes de realizarse y se completan con la plataforma elegida.'},
    terms:{v:'1.0',ts:D(300),text:'NEXORA AIR VA es un servicio de simulación sin ánimo de lucro. El uso de la plataforma implica aceptar estas condiciones y la normativa vigente.'},
    priv:{v:'1.0',ts:D(300),text:'Tratamos los datos necesarios para operar tu cuenta: identificación, plataformas de vuelo, actividad y comunicaciones. Puedes solicitar la eliminación de tu cuenta desde tu perfil.'}}};
  TOURS=S.tours;syncCh();rebuildIx();
  const mk=(id,name,k,user,plat,hub,status,ago,x)=>S.pilots.push(Object.assign({id,name,country:k,user,email:user+'@example.com',pass:null,platform:plat,vatsim:plat==='VATSIM'?String(1300000+hs(id)%90000):'',ivao:plat==='IVAO'?String(600000+hs(id)%90000):'',simbrief:String(100000+hs(id)%800000),netOk:true,hub,status,joined:D(ago),fav:[],favT:[],badges:[]},x||{}));
  mk('NXR101','Admin NEXORA','ES','admin','VATSIM','LEMD','Active',400,{sys:true});mk('NXR102','Alex Demo','ES','piloto','VATSIM','LEMD','Active',150);mk('NXR103','Ana Ruiz','ES','ana','VATSIM','LEMD','Active',320);
  mk('NXR104','Jorge Salas','MX','jorge','IVAO','LEBL','Active',280);mk('NXR105','Marta Ibáñez','ES','marta','IVAO','LEMD','Active',200);mk('NXR106','Luca Ferri','IT','luca','VATSIM','LEMD','Active',360);
  mk('NXR107','Pablo Nieto','ES','pablo','VATSIM','LEBL','Active',40);mk('NXR108','Sofía Marín','AR','sofia','IVAO','LEMD','Active',260);mk('NXR109','Iván Costa','PT','ivan','VATSIM','LEMD','Active',120);
  mk('NXR110','Nerea Gil','ES','nerea','IVAO','LEBL','Inactive',300);mk('NXR111','Hugo Lasa','ES','hugo','VATSIM','LEMD','Pending',2,{netOk:false});
  mk('NXR112','Clara Méndez','ES','clara','IVAO','LEMD','Suspended',90,{susp:{reason:'Conducta inadecuada en frecuencia',until:now+10*DAY,ended:false}});mk('NXR113','Tomás Ortega','CL','tomas','VATSIM','LEBL','Active',60);
  const N={NXR103:70,NXR104:34,NXR105:20,NXR106:90,NXR107:8,NXR108:50,NXR109:24,NXR110:5,NXR112:12,NXR113:16,NXR102:12};
  Object.keys(N).forEach(pid=>{const p=pilot(pid),span=pid==='NXR110'?[150,290]:[2,Math.min(280,Math.round((now-p.joined)/DAY)-1)];
    for(let i=0;i<N[pid];i++){const f=S.flights[Math.floor(R()*S.flights.length)];let k=span[0]+Math.floor(R()*(span[1]-span[0]));let ts=dUTC(now)-k*DAY+fm(f)*MIN;if(ts>now-H)ts-=DAY;
      addEntry(R,pid,f,ts,R()<.85?p.platform:(p.platform==='VATSIM'?'IVAO':'VATSIM'))}});
  {const f=findF('LEMD','LEBL');addEntry(R,'NXR103',f,D(1),'VATSIM',{mins:7,arrTs:D(1)+7*MIN,status:'En revisión',an:['Duración anormalmente corta'],session:'S-R3V1EW'})}
  S.docs&&['norm','terms','priv'].forEach(d=>S.pilots.filter(p=>p.status!=='Pending').forEach(p=>S.accept.push({pid:p.id,doc:d,v:'1.0',ts:p.joined+H})));
  const nx=instances().find(i=>i.ts>now+3*H&&i.ts<now+30*H&&i.free>0&&i.type!=='B789');
  if(nx)S.res.push({id:uid('R'),pilot:'NXR102',kind:'official',no:'NXR102',sched:nx.no,instId:nx.id,from:nx.from,to:nx.to,type:nx.type,depTs:nx.ts,mins:nx.mins,nm:nx.nm,platform:'VATSIM',status:'reserved',created:now-H,simbrief:null,checkin:null,session:'S-DEMO01',log:[{ts:now-H,text:'Reserva creada; caso operacional abierto'}]});
  S.events=[];S.cal=[];S.chall=[];S.partners=[];S.apo={};S.dl=[];syncCh();
  S.news=[];
  S.tickets=[{id:'T-0001',pilot:'NXR103',subject:'No se importa mi OFP de SimBrief',st:'Open',last:D(2),msgs:[{from:'pilot',text:'Mi OFP no aparece en el caso operacional.',ts:D(2),files:[]}]}];
  S.inc=[{id:'NXR-INC-'+Y+'-000001',pilot:'NXR106',subject:'Desconexión en ruta NXR801',detail:'Se detectó una desconexión de 12 minutos sobre el Atlántico. Indica qué ocurrió.',st:'Abierta',created:now-2*H,deadline:now+46*H,responded:false,msgs:[]}];S.incSeq[Y]=1;
  S.sec=[{ts:D(1),txt:'3 intentos fallidos de acceso para el usuario "marta"',sev:'media'}];
  S.audit=[{ts:D(4),who:'Admin NEXORA',a:'Publicó la normativa v1.0',tg:''},{ts:D(2),who:'Admin NEXORA',a:'Aprobó la plataforma IVAO',tg:'NXR108'}];
  settle(true);save()}
function settle(silent){S.pilots.forEach(p=>{const L=lE(p.id),want={};
  TOURS.forEach(tr=>{if(tourProg(tr,p.id).done)want['tour:'+tr.id]={pts:tr.pts,xp:tr.xp,why:'Tour: '+tr.n}});
  CHALL.forEach(c=>{const w=win(c.per);if(metric(inW(L,w),c.m)>=c.g)want['ch:'+c.id+':'+iso(w[0])]={pts:c.pts,xp:c.xp,why:'Desafío: '+c.n}});
  MISS.forEach(c=>{const w=win(c.per);if(metric(inW(L,w),c.m)>=c.g)want['ms:'+c.id+':'+iso(w[0])]={pts:c.pts,xp:c.xp,why:'Misión: '+c.n}});
  BADGES.forEach(b=>{if(b.f(L))want['bd:'+b.id]={pts:30,xp:20,why:'Logro: '+b.n}});
  S.events.forEach(ev=>{const l=(ev.part[p.id]||[]).filter(id=>S.log.some(e=>e.id===id&&e.status==='Completado'));if(l.length)want['ev:'+ev.id]={pts:ev.x,xp:60,why:'Evento: '+ev.n}});
  S.tx=S.tx.filter(x=>x.pilot!==p.id||!/^(tour|ch|ms|bd|ev):/.test(x.ref)||want[x.ref]);
  Object.keys(want).forEach(k=>{if(!S.tx.some(x=>x.pilot===p.id&&x.ref===k)){S.tx.push(Object.assign({id:uid('X'),pilot:p.id,ref:k,ts:Date.now()},want[k]));if(!silent)notify(p.id,t('Has obtenido: ','Earned: ')+want[k].why+' (+'+want[k].pts+' '+t('puntos','points')+')'+(/^(tour|ev|ch):/.test(k)?t(' · Certificado disponible en Descargas','  · Certificate available in Downloads'):''))}})})}
