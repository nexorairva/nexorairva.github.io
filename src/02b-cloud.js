/* ===== modo nube: Supabase (PostgreSQL + Auth). Sin public/config.js la web funciona en modo demo local ===== */
const CL={on:false,sb:null,uid:null,snap:new Map(),psnap:{},busy:false,dirty:false,timer:null,cat:null,loaded:false,sig:''};
const CAR={flights:['no'],fleet:['reg'],tours:['id'],log:['id','pilot'],tx:['id','pilot'],res:['id','pilot'],accept:[a=>a.pid+'-'+a.doc,'pid'],notes:['id','to'],tickets:['id','pilot'],inc:['id','pilot'],news:['id'],events:['id'],cal:['id'],audit:[a=>a.ts+'-'+hs(a.a+a.who),null],sec:[a=>a.ts+'-'+hs(a.txt),null],intg:['n'],roles:['id'],social:['id']};
const COBJ=['brand','docs','remarks','ap','routeCodes'];
const CATS=['flights','fleet','tours','social','roles','intg','news','events','cal'];
const loadSB=()=>new Promise((ok,ko)=>{if(window.supabase)return ok();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';s.onload=ok;s.onerror=()=>ko(new Error('supabase-js'));document.head.appendChild(s)});
function cloudBlank(){seed();CL.cat={};CATS.forEach(k=>CL.cat[k]=JSON.parse(JSON.stringify(S[k]||[])));CL.cat.roles=clone(DEF_ROLES);CL.cat.social=clone(DEF_SOCIAL);
  ['pilots','log','tx','res','notes','audit','tickets','inc','sec','accept','live','delReq','revReq'].concat(CATS).forEach(k=>S[k]=[]);S.enroll={};S.brand={};S.session=null;S.maint=false}
const pidUid=code=>{const p=S.pilots.find(x=>x.id===code);return p&&p.uid||CL.uid};
function docsOf(){const m=new Map(),add=(coll,id,owner,data)=>m.set(coll+'|'+id,{coll,id:String(id),owner,data});
  Object.keys(CAR).forEach(c=>{const[kf,of]=CAR[c];(S[c]||[]).forEach(it=>add(c,typeof kf==='function'?kf(it):it[kf],of?pidUid(it[of]):CL.uid,it))});
  COBJ.forEach(k=>{if(S[k]&&Object.keys(S[k]).length)add(k,'main',CL.uid,S[k])});
  Object.keys(S.enroll||{}).forEach(c=>add('enroll',c,pidUid(c),S.enroll[c]));
  (S.delReq||[]).forEach(c=>add('delReq',c,pidUid(c),{v:c}));(S.revReq||[]).forEach(c=>add('revReq',c,CL.uid,{v:c}));
  add('site','main',CL.uid,{maint:!!S.maint,incSeq:S.incSeq||{}});return m}
const PSTRIP=['id','uid','pass','email','vatsim','ivao','simbrief','status','rol','netOk','joined','hAdj'];
function pilotRows(p){const data={};Object.keys(p).forEach(k=>{if(!PSTRIP.includes(k))data[k]=p[k]});return{cols:Object.assign({status:p.status,rol:p.rol||null,net_ok:!!p.netOk},isAdmin(me())&&CL.hcol?{h_adj:+p.hAdj||0}:{}),data,priv:{vatsim:p.vatsim||'',ivao:p.ivao||'',simbrief:p.simbrief||''}}}
const sortTs=a=>{if(a.length&&a.every(x=>typeof x.ts==='number'))a.sort((x,y)=>x.ts-y.ts);else if(a.length&&a.every(x=>typeof x.created==='number'))a.sort((x,y)=>x.created-y.created)};
async function fetchAll(q){const out=[];for(let f=0;;f+=1000){const r=await q().range(f,f+999);if(r.error)throw r.error;out.push(...r.data);if(r.data.length<1000)break}return out}
async function cloudPull(){const sb=CL.sb;
  const rows=await fetchAll(()=>sb.from('nx_docs').select('coll,id,owner,data').order('updated_at',{ascending:true}));
  const prof=await fetchAll(()=>sb.from('profiles').select('*')),priv=CL.uid?await fetchAll(()=>sb.from('profile_private').select('*')):[];
  const pm={};priv.forEach(r=>pm[r.id]=r.data||{});
  const sess=S.session;
  Object.keys(CAR).forEach(c=>{S[c]=[]});S.enroll={};S.delReq=[];S.revReq=[];
  rows.forEach(r=>{const c=r.coll;if(CAR[c])S[c].push(r.data);else if(COBJ.includes(c))S[c]=r.data;else if(c==='enroll')S.enroll[r.id]=r.data;else if(c==='delReq')S.delReq.push(r.id);else if(c==='revReq')S.revReq.push(r.id);else if(c==='site'){S.maint=!!r.data.maint;S.incSeq=r.data.incSeq||{}}});
  Object.keys(CAR).forEach(c=>sortTs(S[c]));
  CL.hcol=!prof.length||('h_adj' in prof[0]);   // false si la base aún no tiene la columna (falta ejecutar schema.sql)
  S.pilots=prof.map(r=>Object.assign({},r.data,pm[r.id]||{},{id:r.code,uid:r.id,status:r.status,rol:r.rol||null,netOk:!!r.net_ok,hAdj:+r.h_adj||0,joined:Date.parse(r.joined)||0}));
  const mine=prof.find(r=>r.id===CL.uid);
  if(CL.uid&&mine){const meP=S.pilots.find(p=>p.uid===CL.uid);meP.email=CL.email||'';S.session={id:mine.code,uid:CL.uid,staff:isStaff(meP)}}else S.session=null;
  if(!rows.length&&mine&&mine.rol==='admin'&&CL.cat){CATS.forEach(k=>S[k]=JSON.parse(JSON.stringify(CL.cat[k])));ensure();CL.dirty=true}   /* primer arranque: catálogo inicial */
  TOURS=S.tours;rebuildIx();
  CL.snap=new Map();docsOf().forEach((d,k)=>{if(!(CL.dirty&&!rows.length))CL.snap.set(k,JSON.stringify(d.data))});
  CL.psnap={};S.pilots.forEach(p=>CL.psnap[p.id]=JSON.stringify(pilotRows(p)));
  const sig=JSON.stringify([rows.length,rows.map(r=>r.id).join().length,S.pilots.length,rows.reduce((a,r)=>a+JSON.stringify(r.data).length,0)]);const ch=sig!==CL.sig;CL.sig=sig;CL.loaded=true;return ch}
async function cloudPush(){if(!CL.on||!CL.uid||!CL.loaded)return;if(CL.busy){CL.dirty=true;return}CL.busy=true;CL.dirty=false;const sb=CL.sb;
  try{const cur=docsOf(),up=[],del={};
    cur.forEach((d,k)=>{const js=JSON.stringify(d.data);if(CL.snap.get(k)!==js)up.push({coll:d.coll,id:d.id,owner:d.owner,data:d.data})});
    CL.snap.forEach((_,k)=>{if(!cur.has(k)){const i=k.indexOf('|');(del[k.slice(0,i)]=del[k.slice(0,i)]||[]).push(k.slice(i+1))}});
    for(let i=0;i<up.length;i+=200){const r=await sb.from('nx_docs').upsert(up.slice(i,i+200),{onConflict:'coll,id'});if(r.error)throw r.error}
    for(const c of Object.keys(del)){const r=await sb.from('nx_docs').delete().eq('coll',c).in('id',del[c]);if(r.error)throw r.error}
    for(const p of S.pilots){const row=pilotRows(p),js=JSON.stringify(row);if(CL.psnap[p.id]===js)continue;
      const a=await sb.from('profiles').update(Object.assign({data:row.data},row.cols)).eq('id',p.uid);if(a.error)throw a.error;
      const b=await sb.from('profile_private').upsert({id:p.uid,data:row.priv});if(b.error)throw b.error}
    cur.forEach((d,k)=>CL.snap.set(k,JSON.stringify(d.data)));CL.snap.forEach((_,k)=>{if(!cur.has(k))CL.snap.delete(k)});S.pilots.forEach(p=>CL.psnap[p.id]=JSON.stringify(pilotRows(p)));
  }catch(e){const m=(e&&e.message)||String(e);toast(t('No se pudo guardar en la base de datos: ','Could not save to the database: ')+m);try{await cloudPull();render()}catch(x){}}
  finally{CL.busy=false;if(CL.dirty)cloudSaveSoon()}}
function cloudSaveSoon(){clearTimeout(CL.timer);CL.timer=setTimeout(cloudPush,500)}
async function cloudStart(){const c=window.NX_CFG||{};if(!(c.supabaseUrl&&c.anonKey))return false;
  try{await loadSB();CL.sb=window.supabase.createClient(c.supabaseUrl,c.anonKey,{auth:{persistSession:true,autoRefreshToken:true}});CL.on=true;
    const r=await CL.sb.auth.getSession();const u=r.data&&r.data.session&&r.data.session.user;CL.uid=u?u.id:null;CL.email=u?u.email:'';
    cloudBlank();await cloudPull();
    setInterval(async()=>{if(CL.busy||CL.dirty||document.hidden)return;const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;try{if(await cloudPull())render()}catch(e){}},45000);
    return true}catch(e){console.error(e);CL.on=false;return false}}
