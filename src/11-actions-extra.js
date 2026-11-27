
/* ===== routes, charter, fleet and tour builder actions ===== */
Object.assign(A,{
 rtreset:async()=>{try{localStorage.removeItem('nexora-va-rt')}catch(e){}await loadData();toast(t('Catálogo del sitio restaurado','Site catalogue restored'))},
 rte:id=>{const[a,b,m]=id.split('|');openRoute(a,b,+m)},
 rpg:id=>{ui.rt.pg=Math.max(0,ui.rt.pg+(+id));render();window.scrollTo(0,0)},
 gal:id=>{const a=S.fleet.find(x=>x.reg===id);modal(a.reg+' · '+a.name,`<div class="gal">${a.img.map(s=>`<img src="${esc(s)}" alt="">`).join('')}</div>`)},
 fnew:()=>{ui.fd={isNew:true,reg:'',type:'A20N',name:'',desc:'',img:[]};modal(t('Añadir aeronave','Add aircraft'),fdForm())},
 fedit:id=>{const a=S.fleet.find(x=>x.reg===id);ui.fd={isNew:false,reg:a.reg,type:a.type,name:a.name,desc:a.desc||'',img:(a.img||[]).slice()};modal(t('Editar ','Edit ')+a.reg,fdForm())},
 fdel:id=>{if(S.res.some(r=>r.reg===id&&ACTIVE.includes(r.status))){toast(t('Tiene reservas activas.','It has active bookings.'));return}S.fleet=S.fleet.filter(x=>x.reg!==id);aud('Eliminó aeronave',id);done(t('Aeronave eliminada','Aircraft removed'))},
 fdrm:id=>{ui.fd.img.splice(+id,1);$('#fd-gal').innerHTML=fdGal()},
 tbnew:()=>{ui.tb=tbNew();render()},
 tbedit:id=>{ui.tb=JSON.parse(JSON.stringify(S.tours.find(x=>x.id===id)));render();window.scrollTo(0,document.body.scrollHeight)},
 tbdel:id=>{S.tours=S.tours.filter(x=>x.id!==id);TOURS=S.tours;if(ui.tb&&ui.tb.id===id)ui.tb=null;settle();aud('Eliminó tour',id);done(t('Tour eliminado','Tour deleted'))},
 tbst:()=>{ui.tb.stages.push([]);render()},
 tbrev:()=>{const l=ui.tb.stages[ui.tb.stages.length-1]||[];ui.tb.stages.push(l.map(r=>[r[1],r[0]]));render()},
 tbsr:id=>{ui.tb.stages.splice(+id,1);render()},
 tbrm:id=>{const[i,j]=id.split(':');ui.tb.stages[+i].splice(+j,1);render()},
 tbrt:id=>{const a=norm($('#tbf-'+id).value),b=norm($('#tbt-'+id).value);
  if(!/^[A-Z]{3,4}$/.test(a)||!/^[A-Z]{3,4}$/.test(b)||a===b){toast(t('Indica dos aeropuertos distintos (código IATA u OACI).','Enter two different airports (IATA or ICAO code).'));return}
  if(!apKnown(a)||!apKnown(b))toast(t('Aviso: sin coordenadas para ','Note: no coordinates for ')+(!apKnown(a)?a:b)+t('. La ruta se guarda igualmente.','. The route is saved anyway.'));
  ui.tb.stages[+id].push([a,b]);render()}});
Object.assign(F,{
 rtf:d=>{['a','b','type','hub','max','sort'].forEach(k=>ui.rt[k]=d.get(k)||'');ui.rt.ok=d.get('ok')?'1':'';ui.rt.pg=0;render()},
 rte:(d,f)=>{const[a,b]=f.dataset.id.split('|'),p=me();if(holds(p.id).length>=3)return toast(t('Máximo 3 rutas reservadas a la vez.','Maximum 3 held routes at a time.'));
  mkRes(p,'route',a,b,d.get('reg'),d.get('platform'),24);save();modal();go('p-caso');toast(t('Ruta reservada durante 24 horas.','Route booked for 24 hours.'))},
 cht:d=>{const a=norm(d.get('from')),b=norm(d.get('to')),ac=S.fleet.find(x=>x.reg===d.get('reg'));
  if(!apKnown(a)||!apKnown(b))return err('cht-err',t('No conozco las coordenadas de ','I do not know the coordinates of ')+(!apKnown(a)?a:b)+t('. Un administrador puede importar airports.dat.','. An admin can import airports.dat.'));
  if(a===b)return err('cht-err',t('Salida y destino deben ser distintos.','Departure and destination must differ.'));const nm=dist(a,b);
  if(nm>TYPES[ac.type].r*.9)return err('cht-err',t('Ese avión no alcanza ','That aircraft cannot fly ')+nf(nm)+' nm.');
  mkRes(me(),'free',a,b,ac.reg,d.get('plat'),0);save();go('p-caso');toast(t('Charter creado. Genera ahora el briefing en SimBrief.','Charter created. Generate the briefing in SimBrief now.'))},
 dfleet:d=>{const D=ui.fd,name=d.get('name').trim(),desc=d.get('desc').trim();
  if(D.isNew){const reg=d.get('reg').toUpperCase();if(S.fleet.some(x=>x.reg===reg))return err('dfleet-err',t('Esa matrícula ya existe.','That registration already exists.'));S.fleet.push({reg,type:d.get('type'),name,desc,img:D.img.slice()});aud('Añadió aeronave',reg)}
  else{const a=S.fleet.find(x=>x.reg===D.reg);a.name=name;a.desc=desc;a.img=D.img.slice();aud('Actualizó aeronave',D.reg)}
  ui.fd=null;done(t('Flota actualizada','Fleet updated'))},
 tb:(d)=>{const D=ui.tb;if(!D.n.trim())return err('tb-err',t('Pon un nombre al tour.','Give the tour a name.'));if(!D.stages.length||D.stages.some(s=>!s.length))return err('tb-err',t('Cada etapa necesita al menos una ruta.','Each stage needs at least one route.'));
  const o={id:D.id||uid('t'),n:D.n.trim(),type:D.type,ac:D.ac||undefined,pts:+D.pts||0,xp:+D.xp||0,badge:(D.badge||'').trim()||D.n.trim(),remark:(D.remark||'').trim()||undefined,stages:D.stages};
  const i=S.tours.findIndex(x=>x.id===o.id);if(i>=0)S.tours[i]=o;else S.tours.push(o);TOURS=S.tours;ui.tb=null;settle();aud('Guardó tour',o.n);done(t('Tour guardado','Tour saved'))}});
document.addEventListener('input',e=>{const f=e.target.closest('form[data-f="tb"]');if(f&&e.target.name&&ui.tb){const k=e.target.name;ui.tb[k]=(k==='pts'||k==='xp')?+e.target.value:e.target.value}});
document.addEventListener('change',async e=>{const x=e.target;
  const f=x.closest('form[data-f="rtf"]');if(f)F.rtf(new FormData(f),f);
  if(x.id==='fd-files'&&ui.fd){for(const file of [...x.files]){if(ui.fd.img.length>=6)break;const s=await readImg(file);if(s)ui.fd.img.push(s)}x.value='';$('#fd-gal').innerHTML=fdGal()}
  if(x.id==='rtimp'&&x.files[0]){const n=importRoutes(await x.files[0].text());if(n>0){toast(nf(n)+t(' rutas importadas',' routes imported'));await loadData()}else toast(n<0?t('Catálogo demasiado grande para este navegador.','Catalogue too large for this browser.'):t('No se reconoció el formato.','Format not recognised.'))}
  if(x.id==='apimp'&&x.files[0]){const n=importAirports(await x.files[0].text());toast(n?nf(n)+t(' aeropuertos importados',' airports imported'):t('No se reconoció el formato.','Format not recognised.'));render()}});
