/* ----- pantalla de presentación (antes del inicio) ----- */
function introSeen(){try{return sessionStorage.getItem('nx-intro')==='1'}catch(e){return false}}
function showIntro(){
  const h=location.hash;if(introSeen()||(h&&h!=='#'&&h!=='#inicio'))return;
  const el=document.createElement('div');el.id='intro';el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',t('Entrar a NEXORA AIR','Enter NEXORA AIR'));
  el.innerHTML=`<div class="in-box"><img class="in-logo" src="${brandLogo(true)}" alt="NEXORA AIR"><h1>${t('Vuela. ','Fly. ')}<em>${t('Conecta. ','Connect. ')}</em>${t('Supera.','Excel.')}</h1>
  <p class="in-sub">${t('Aerolínea virtual para pilotos de simulación en VATSIM e IVAO. Sin ánimo de lucro, con vuelos, tours, retos y comunidad.','Virtual airline for flight simulation pilots on VATSIM and IVAO. Non-profit, with flights, tours, challenges and community.')}</p>
  <div class="in-facts"><span>ICAO <b>NXR</b></span><span>${t('Indicativo','Callsign')} <b>NEXO</b></span><span>VATSIM · IVAO · SimBrief</span></div>
  <div class="in-cta"><span class="in-dot"></span>${t('Pulsa en cualquier parte para entrar','Tap anywhere to enter')}</div>
  <p class="in-legal">${t('Solo simulación. NEXORA AIR no está afiliada a ninguna aerolínea real.','Simulation only. NEXORA AIR is not affiliated with any real airline.')}</p></div>`;
  const go=()=>{try{sessionStorage.setItem('nx-intro','1')}catch(e){}document.removeEventListener('keydown',key);el.classList.add('out');setTimeout(()=>el.remove(),450);if(location.hash!=='#inicio')location.hash='#inicio';else render()},
    key=e=>{if(['Enter',' ','Escape','ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();go()}};
  el.addEventListener('click',go);el.addEventListener('touchend',e=>{e.preventDefault();go()},{passive:false});document.addEventListener('keydown',key);
  document.body.appendChild(el);try{el.focus()}catch(e){}}
