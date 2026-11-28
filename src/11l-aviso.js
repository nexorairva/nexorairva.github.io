/* ----- Aviso informativo de almacenamiento local (solo técnico; no es un muro de consentimiento) ----- */
const stoCard=()=>`<div class="card pad stack"><h2>${t('Cookies y almacenamiento local','Cookies and local storage')}</h2>
  <p>${t('NEXORA AIR no usa cookies propias ni de publicidad, ni herramientas de analítica o seguimiento. Para funcionar guarda en tu navegador unos pocos datos técnicos (almacenamiento local), que no se envían a ningún servidor en cada visita:','NEXORA AIR uses no first-party, advertising, analytics or tracking cookies. To work it keeps a few technical items in your browser (local storage), which are not sent to any server on each visit:')}</p>
  ${tbl([t('Dato','Item'),t('Para qué','Purpose'),t('Duración','Duration')],[
   [t('Sesión','Session'),t('Mantenerte conectado (permiso temporal del servicio de cuentas, nunca tu contraseña).','Keep you signed in (a temporary token from the account service, never your password).'),t('Hasta cerrar sesión; solo hasta cerrar el navegador si no marcas «Recordarme».','Until you sign out; only until the browser closes if «Remember me» is off.')],
   [t('Recordarme y correo','Remember me and email'),t('Recordar tu elección y rellenar tu correo al entrar.','Remember your choice and prefill your email.'),t('Hasta que lo borres o desmarques la casilla.','Until you clear it or untick the box.')],
   [t('Tema e idioma','Theme and language'),t('Mostrar la web como prefieres.','Show the site the way you prefer.'),t('Hasta que lo borres.','Until you clear it.')],
   [t('Aviso e intro','Notice and intro'),t('No repetir este aviso ni la animación de entrada.','Do not repeat this notice or the intro animation.'),t('Aviso: hasta que lo borres. Intro: mientras la pestaña esté abierta.','Notice: until you clear it. Intro: while the tab is open.')]])}
  <p class="muted">${t('Al cargar la web se contactan servicios externos necesarios para su funcionamiento (alojamiento y cuentas, mapas, tipografías y, si se configura, Discord), que reciben tu dirección IP como en cualquier visita web. Puedes borrar estos datos en cualquier momento desde los ajustes de tu navegador.','Loading the site contacts external services needed for it to work (hosting and accounts, maps, fonts and, if configured, Discord), which receive your IP address as in any web visit. You can delete this data at any time from your browser settings.')}</p></div>`;
function stoBar(){try{if(localStorage.getItem('nx-info')==='1')return}catch(e){}
  const b=document.createElement('div');b.className='sto-bar';b.setAttribute('role','region');b.setAttribute('aria-label',t('Aviso de almacenamiento','Storage notice'));
  b.innerHTML=`<span>${t('Esta web solo usa almacenamiento técnico necesario (sesión, tema, idioma). ','This site only uses necessary technical storage (session, theme, language). ')}<a href="#normativa">${t('Más información','More information')}</a></span><button class="btn pri sm" type="button">${t('Entendido','Got it')}</button>`;
  b.querySelector('button').onclick=()=>{try{localStorage.setItem('nx-info','1')}catch(e){}b.remove()};
  document.body.appendChild(b)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stoBar);else stoBar();

/* ----- Alta: el piloto elige su ID (NXR + 3 o 4 cifras); no puede enviar la solicitud hasta que sea válido y esté libre ----- */
async function codeFree(num){num=String(num||'').trim();if(!/^[0-9]{3,4}$/.test(num))return false;const c='NXR'+num;
  if(CL.on){try{const r=await CL.sb.rpc('nx_code_free',{p_code:c});if(r.error)throw r.error;return r.data===true}catch(e){return null}}
  return !S.pilots.some(p=>p.id===c)}
let regCodeT=0,regCodeN=0;
document.addEventListener('input',e=>{const x=e.target;if(!x||x.id!=='reg-code')return;x.value=x.value.replace(/\D/g,'').slice(0,4);
  const go=document.getElementById('reg-go'),msg=document.getElementById('reg-code-msg'),n=++regCodeN;if(go)go.disabled=true;clearTimeout(regCodeT);
  const say=(txt,cls)=>{if(msg){msg.textContent=txt;msg.className=cls}};
  if(x.value.length<3){say(t('3 o 4 cifras. Comprobaremos que esté libre.','3 or 4 digits. We will check it is free.'),'muted');return}
  say(t('Comprobando…','Checking…'),'muted');
  regCodeT=setTimeout(async()=>{const ok=await codeFree(x.value);if(n!==regCodeN)return;
    if(ok===null){say(t('No se pudo comprobar ahora. Inténtalo de nuevo.','Could not check right now. Try again.'),'err')}
    else if(ok){say('✔ NXR'+x.value+' '+t('está libre.','is available.'),'ok');if(go)go.disabled=false}
    else say('✘ NXR'+x.value+' '+t('ya está en uso. Elige otro.','is already taken. Choose another one.'),'err')},350)});
