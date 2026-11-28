/* ----- pantalla de presentación animada (antes del inicio) ----- */
function introSeen(){try{return sessionStorage.getItem('nx-intro')==='1'}catch(e){return false}}
function showIntro(){
  const h=location.hash;if(introSeen()||(h&&h!=='#'&&h!=='#inicio'))return;
  const still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el=document.createElement('div');el.id='intro';el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',t('Entrar a NEXORA AIR','Enter NEXORA AIR'));
  const words=[t('Conecta.','Connect.'),t('Vuela.','Fly.'),t('Supera.','Rise.')],
    tag=t('El piloto vuela, NEXORA AIR hace el resto.','The pilot flies, NEXORA AIR does the rest.'),
    tick=[t('Vuelos','Flights'),t('Tours','Tours'),t('Retos','Challenges'),t('Rankings','Rankings'),t('Comunidad','Community'),t('Redes de vuelo','Flight networks')];
  el.innerHTML=`<div class="in-bg"></div><canvas class="in-cv"></canvas><div class="in-glow"></div>
  <div class="in-box"><img class="in-logo" src="${brandLogo(true)}" alt="NEXORA AIR"><span class="in-chip">NEXO · NXR · ${t('REDES DE VUELO','FLIGHT NETWORKS')}</span>
  <h1>${words.map((w,i)=>`<span class="in-w w${i}" style="--d:${.35+i*.38}s">${w}</span>`).join(' ')}</h1>
  <p class="in-tag" aria-label="${esc(tag)}"><span class="in-ty"></span><i class="in-caret"></i></p>
  <div class="in-tick"><span>${t('Todo para tu aerolínea virtual:','Everything for your virtual airline:')}</span><b class="in-tk">${tick[0]}</b></div>
  <div class="in-cta"><span class="in-dot"></span>${t('Pulsa en cualquier parte para entrar','Tap anywhere to enter')}<span class="in-arr">→</span></div>
  <p class="in-legal">${t('Solo simulación. NEXORA AIR no está afiliada a ninguna aerolínea real.','Simulation only. NEXORA AIR is not affiliated with any real airline.')}</p></div>`;
  document.body.appendChild(el);
  const cv=el.querySelector('canvas'),cx=cv.getContext('2d'),tk=el.querySelector('.in-tk'),ty=el.querySelector('.in-ty'),box=el.querySelector('.in-box');
  let raf=0,W=0,H=0,dpr=1,mx=0,my=0,timers=[],alive=true;
  /* ciudades de la red (lat, lon) */
  const C=[[40.5,-3.6],[41.3,2.1],[38.8,-9.1],[49,2.5],[51.5,-.5],[50,8.6],[41.8,12.2],[40.6,-73.8],[25.8,-80.3],[-23.4,-46.5],[19.4,-99.1],[4.7,-74.1],[25.3,55.4],[35.5,139.8],[1.4,104],[-33.9,151.2],[-26.1,28.2],[33.9,-118.4],[43.7,-79.6],[-34.8,-58.5],[28.1,-15.4],[39.9,116.4],[19.1,72.9],[55.4,37.4]];
  const P=c=>{const x=(c[1]+180)/360*W*1.08-W*.04+mx*14,la=Math.max(-58,Math.min(76,c[0])),y=(76-la)/134*H*.84+H*.08+my*10;return[x,y]};
  const flights=[];
  const spawn=()=>{let a=Math.floor(Math.random()*C.length),b=Math.floor(Math.random()*C.length);if(a===b)b=(b+7)%C.length;flights.push({a,b,t:0,v:.0035+Math.random()*.004,life:1})};
  const arc=(A,B,u)=>{const mxp=(A[0]+B[0])/2,myp=(A[1]+B[1])/2,d=Math.hypot(B[0]-A[0],B[1]-A[1]),cxp=mxp,cyp=myp-d*.28,v=1-u;return[v*v*A[0]+2*v*u*cxp+u*u*B[0],v*v*A[1]+2*v*u*cyp+u*u*B[1],cxp,cyp]};
  const size=()=>{dpr=Math.min(2,window.devicePixelRatio||1);W=el.clientWidth;H=el.clientHeight;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';cx.setTransform(dpr,0,0,dpr,0,0)};
  const draw=()=>{if(!alive)return;cx.clearRect(0,0,W,H);const pts=C.map(P);
    /* rutas tenues de fondo */
    cx.lineWidth=1;pts.forEach((A,i)=>{const B=pts[(i*5+3)%pts.length];const m=arc(A,B,.5);cx.strokeStyle='rgba(126,211,33,.07)';cx.beginPath();cx.moveTo(A[0],A[1]);cx.quadraticCurveTo(m[2]*1,m[3]*1+0,B[0],B[1]);cx.stroke()});
    /* nodos */
    const now=performance.now()/1000;pts.forEach((p,i)=>{const r=2+Math.sin(now*2+i)*.8;cx.fillStyle='rgba(158,235,60,.85)';cx.beginPath();cx.arc(p[0],p[1],r,0,7);cx.fill();cx.strokeStyle='rgba(126,211,33,'+(.25+.2*Math.sin(now*2+i))+')';cx.beginPath();cx.arc(p[0],p[1],r+6+3*Math.sin(now*2+i),0,7);cx.stroke()});
    /* vuelos activos */
    for(let i=flights.length-1;i>=0;i--){const f=flights[i];f.t+=f.v;if(f.t>=1)f.life-=.02;if(f.life<=0){flights.splice(i,1);continue}
      const A=pts[f.a],B=pts[f.b],u=Math.min(1,f.t),m=arc(A,B,u),segs=28;
      for(let s=0;s<segs;s++){const u0=Math.max(0,u-.55)+(s/segs)*Math.min(.55,u),u1=Math.max(0,u-.55)+((s+1)/segs)*Math.min(.55,u),p0=arc(A,B,u0),p1=arc(A,B,u1);cx.strokeStyle='rgba(158,235,60,'+((s+1)/segs*.9*f.life)+')';cx.lineWidth=1+((s+1)/segs)*1.8;cx.beginPath();cx.moveTo(p0[0],p0[1]);cx.lineTo(p1[0],p1[1]);cx.stroke()}
      const pb=arc(A,B,Math.max(0,u-.01)),ang=Math.atan2(m[1]-pb[1],m[0]-pb[0]);
      cx.save();cx.translate(m[0],m[1]);cx.rotate(ang);cx.shadowColor='#9EEB3C';cx.shadowBlur=14;cx.fillStyle='rgba(255,255,255,'+f.life+')';cx.beginPath();cx.moveTo(7,0);cx.lineTo(-5,-4.5);cx.lineTo(-2.5,0);cx.lineTo(-5,4.5);cx.closePath();cx.fill();cx.restore()}
    if(flights.length<8&&Math.random()<.035)spawn();
    raf=requestAnimationFrame(draw)};
  size();window.addEventListener('resize',size);
  if(still){for(let i=0;i<5;i++){spawn();flights[i].t=.7}draw();cancelAnimationFrame(raf)}else{for(let i=0;i<4;i++){spawn();flights[i].t=Math.random()*.6}draw()}
  /* parallax con el puntero */
  const mv=e=>{const p=e.touches?e.touches[0]:e;mx=(p.clientX/W-.5)*2;my=(p.clientY/H-.5)*2;box.style.transform='translate('+(-mx*8)+'px,'+(-my*6)+'px)'};
  el.addEventListener('mousemove',mv);
  /* máquina de escribir + ticker */
  if(still){ty.textContent=tag;el.classList.add('typed')}else{let i=0;const type=()=>{if(!alive)return;ty.textContent=tag.slice(0,++i);if(i<tag.length)timers.push(setTimeout(type,36));else el.classList.add('typed')};timers.push(setTimeout(type,1500));
    let k=0;timers.push(setInterval(()=>{if(!alive)return;tk.classList.add('sw');timers.push(setTimeout(()=>{k=(k+1)%tick.length;tk.textContent=tick[k];tk.classList.remove('sw')},260))},1700))}
  const go=()=>{if(!alive)return;alive=false;cancelAnimationFrame(raf);timers.forEach(x=>{clearTimeout(x);clearInterval(x)});window.removeEventListener('resize',size);document.removeEventListener('keydown',key);
    try{sessionStorage.setItem('nx-intro','1')}catch(e){}el.classList.add('out');setTimeout(()=>el.remove(),600);if(location.hash!=='#inicio')location.hash='#inicio';else render()},
    key=e=>{if(['Enter',' ','Escape','ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();go()}};
  el.addEventListener('click',go);el.addEventListener('touchend',e=>{e.preventDefault();go()},{passive:false});document.addEventListener('keydown',key);
  try{el.focus()}catch(e){}}
