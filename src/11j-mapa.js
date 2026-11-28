/* ----- Mapa de vuelos en directo: zoom, desplazamiento y ficha del avión ----- */
/* Zoom: botones +/−/⌂, Ctrl + rueda (o pellizco del trackpad), pellizco en pantalla táctil y doble toque/clic. Arrastrar mueve el mapa.
   Tocar un avión abre su ficha; tocar el fondo la cierra. Las filas de la tabla también seleccionan el avión. */
let lmD=null,lmHintT=0;
function lmApply(el){const V=lmv(el.dataset.o),s=el.querySelector('svg');if(!s)return;s.setAttribute('viewBox',V.x+' '+V.y+' '+V.w+' '+lmH(V.w));s.style.setProperty('--k',V.w/360);s.classList.toggle('zm',V.w<359)}
function lmZoom(el,f,cx,cy){const V=lmv(el.dataset.o),r=el.getBoundingClientRect(),fx=r.width?(cx-r.left)/r.width:.5,fy=r.height?(cy-r.top)/r.height:.5,u=V.x+fx*V.w,v=V.y+fy*lmH(V.w);V.w=Math.max(22,Math.min(360,V.w*f));V.x=u-fx*V.w;V.y=v-fy*lmH(V.w);lmClamp(V);lmApply(el)}
function lmDraw(el){try{el.innerHTML=mapInner(JSON.parse(el.dataset.o))}catch(e){}}
function lmSelect(el,id,center){const V=lmv(el.dataset.o);V.sel=id||null;if(id&&center){const f=liveFlights().find(x=>x.id===id);if(f&&f.pos){const p=px(f.pos[0],f.pos[1]);V.w=Math.min(V.w,90);V.x=p[0]-V.w/2;V.y=p[1]-lmH(V.w)/2;lmClamp(V)}}lmDraw(el)}
document.addEventListener('pointerdown',e=>{const el=e.target.closest&&e.target.closest('.lmap');if(!el||e.target.closest('.lm-leg,.lm-ctl,.lm-info'))return;
  if(!lmD||lmD.el!==el)lmD={el,pts:new Map(),moved:false,hit:null,sx:e.clientX,sy:e.clientY};
  if(lmD.pts.size===0){lmD.sx=e.clientX;lmD.sy=e.clientY;lmD.moved=false;const pl=e.target.closest('.pl');lmD.hit=pl?pl.dataset.id:null}else lmD.moved=true;
  lmD.pts.set(e.pointerId,{x:e.clientX,y:e.clientY})});
document.addEventListener('pointermove',e=>{if(!lmD||!lmD.pts.has(e.pointerId))return;const el=lmD.el,p=lmD.pts.get(e.pointerId),V=lmv(el.dataset.o),r=el.getBoundingClientRect();
  if(lmD.pts.size===1){if(!lmD.moved&&Math.hypot(e.clientX-lmD.sx,e.clientY-lmD.sy)<5)return;lmD.moved=true;
    V.x-=(e.clientX-p.x)*V.w/r.width;V.y-=(e.clientY-p.y)*lmH(V.w)/r.height;lmClamp(V);lmApply(el);el.classList.add('drag')}
  else if(lmD.pts.size===2){const o=[...lmD.pts.entries()].find(([k])=>k!==e.pointerId)[1],d0=Math.hypot(p.x-o.x,p.y-o.y),d1=Math.hypot(e.clientX-o.x,e.clientY-o.y);if(d0>0&&d1>0)lmZoom(el,d0/d1,(e.clientX+o.x)/2,(e.clientY+o.y)/2)}
  lmD.pts.set(e.pointerId,{x:e.clientX,y:e.clientY})});
const lmEnd=e=>{if(!lmD||!lmD.pts.has(e.pointerId))return;const el=lmD.el;lmD.pts.delete(e.pointerId);
  if(lmD.pts.size===0){const tap=e.type==='pointerup'&&!lmD.moved,hit=lmD.hit;el.classList.remove('drag');lmD=null;if(tap)lmSelect(el,hit)}};
document.addEventListener('pointerup',lmEnd);document.addEventListener('pointercancel',lmEnd);
document.addEventListener('wheel',e=>{const el=e.target.closest&&e.target.closest('.lmap');if(!el)return;
  if(e.ctrlKey||e.metaKey){e.preventDefault();lmZoom(el,Math.exp(e.deltaY*.0025),e.clientX,e.clientY)}
  else if(Date.now()-lmHintT>6000){lmHintT=Date.now();toast(t('Usa Ctrl + rueda para hacer zoom en el mapa, o los botones + y −.','Use Ctrl + scroll to zoom the map, or the + and − buttons.'))}},{passive:false});
document.addEventListener('dblclick',e=>{const el=e.target.closest&&e.target.closest('.lmap');if(!el||e.target.closest('.lm-leg,.lm-ctl,.lm-info'))return;lmZoom(el,.5,e.clientX,e.clientY)});
document.addEventListener('keydown',e=>{const pl=e.target.closest&&e.target.closest('.lmap .pl');
  if(pl&&(e.key==='Enter'||e.key===' ')){e.preventDefault();lmSelect(pl.closest('.lmap'),pl.dataset.id,true)}
  else if(e.key==='Escape'){document.querySelectorAll('.lmap').forEach(el=>{if(lmv(el.dataset.o).sel)lmSelect(el,null)})}});
Object.assign(A,{
 lmz:(id,el)=>{const m=el.closest('.lmap');if(!m)return;const V=lmv(m.dataset.o);
   if(id==='reset'){V.x=0;V.y=6;V.w=360;lmClamp(V);lmApply(m)}else{const r=m.getBoundingClientRect();lmZoom(m,id==='in'?.5:2,r.left+r.width/2,r.top+r.height/2)}},
 lmclose:(id,el)=>{const m=el.closest('.lmap');if(m)lmSelect(m,null)},
 lmsel:(id,el)=>{const m=el.closest('.card')&&el.closest('.card').querySelector('.lmap');if(!m)return;lmSelect(m,id,true);m.scrollIntoView({block:'nearest',behavior:'smooth'})}
});
let lmRz=0;addEventListener('resize',()=>{clearTimeout(lmRz);lmRz=setTimeout(()=>document.querySelectorAll('.lmap').forEach(el=>{lmClamp(lmv(el.dataset.o));lmDraw(el)}),150)});

/* ----- Países: fronteras y costas (Natural Earth 110m, formato TopoJSON de «world-atlas») -----
   El archivo lo copia el despliegue a public/geo/countries-110m.json; si no está, se pide a jsDelivr. Mientras no llega (o si falla)
   el mapa usa los puntos de siempre. */
let GEO=null,GEO_P=null;
function geoBuild(T){
  const tr=T.transform,arcs=T.arcs.map(a=>{let x=0,y=0;return a.map(p=>{if(tr){x+=p[0];y+=p[1];return[x*tr.scale[0]+tr.translate[0],y*tr.scale[1]+tr.translate[1]]}return[p[0],p[1]]})});
  const seg=(i,out)=>{const a=i<0?arcs[~i].slice().reverse():arcs[i];a.forEach((p,k)=>{if(out.length&&!k)return;out.push(p)})};
  const pth=pts=>{let s='',pv=null;pts.forEach(p=>{const q=px(p[1],p[0]);s+=(pv===null||Math.abs(q[0]-pv)>180?'M':'L')+q[0]+' '+q[1];pv=q[0]});return s};
  const G=(T.objects.countries||T.objects[Object.keys(T.objects)[0]]).geometries,cnt=new Array(arcs.length).fill(0);let fill='';
  const polys=g=>g.type==='Polygon'?[g.arcs]:g.type==='MultiPolygon'?g.arcs:[];
  G.forEach(g=>polys(g).forEach(P=>P.forEach(R=>{const pts=[];R.forEach(i=>{cnt[i<0?~i:i]++;seg(i,pts)});if(pts.length>2)fill+=pth(pts)+'Z'})));
  let brd='',coast='';arcs.forEach((a,i)=>{if(a.length<2)return;if(cnt[i]>=2)brd+=pth(a);else if(cnt[i]===1)coast+=pth(a)});
  if(!fill)throw new Error('geo');return{fill,brd,coast}}
function geoLoad(){if(GEO_P)return;GEO_P=(async()=>{for(const u of ['geo/countries-110m.json','https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json']){
  try{const r=await fetch(u);if(!r.ok)continue;GEO=geoBuild(await r.json());document.querySelectorAll('.lmap').forEach(el=>{if(!lmD)lmDraw(el)});return}catch(e){}}})()}
