/* ----- Conectados en Discord: widget público del servidor (Ajustes del servidor → Widget). Solo se muestran los ID NXR; el portal añade nombre y estado ----- */
const DC={t:0,list:null,total:0,err:'',busy:false};
const dcGid=()=>{const s=(S.social||[]).find(x=>x.k==='discord'&&/^\d{15,22}$/.test(x.gid||''));return s?s.gid:''};
async function dcLoad(){const g=dcGid();if(!g||DC.busy)return;DC.busy=true;DC.t=Date.now();
  try{const r=await fetch('https://discord.com/api/guilds/'+g+'/widget.json',{cache:'no-store'});
    if(!r.ok){DC.err=r.status===403?'off':'http';DC.list=null}
    else{const j=await r.json(),out=[];DC.total=+j.presence_count||(j.members||[]).length;DC.err='';
      (j.members||[]).forEach(m=>{const mm=/NXR\s?-?(\d{2,6})/i.exec((m.nick||'')+' '+(m.username||''));if(!mm)return;const code='NXR'+mm[1],p=S.pilots.find(x=>x.id===code&&x.status!=='Pending');if(p&&!out.some(o=>o.code===code))out.push({code,st:m.status||'online'})});
      DC.list=out}}
  catch(e){DC.err='net';DC.list=null}
  DC.busy=false;dcPaint()}
const dcSt=s=>s==='idle'?t('ausente','away'):s==='dnd'?t('ocupado','busy'):t('en línea','online');
function dcHtml(priv){if(!dcGid())return `<div class="muted">${t('Aún no se ha configurado el servidor de Discord.','The Discord server has not been set up yet.')}</div>`;
  if(DC.err==='off')return `<div class="muted">${t('El widget del servidor de Discord está desactivado.','The Discord server widget is turned off.')}</div>`;
  if(DC.err)return `<div class="muted">${t('No se pudo consultar Discord ahora mismo.','Discord could not be reached right now.')}</div>`;
  if(!DC.list)return `<div class="muted">${t('Cargando…','Loading…')}</div>`;
  const rest=Math.max(0,DC.total-DC.list.length);
  if(!DC.list.length)return `<div class="muted">${t('Ningún piloto identificado conectado ahora.','No identified pilots connected right now.')}${rest?` ${rest} ${t('en el servidor sin ID.','on the server without an ID.')}`:''}</div>`;
  return `<div class="dc-l">${DC.list.map(o=>{const p=S.pilots.find(x=>x.id===o.code);return `<span class="dc-c ${o.st}" title="${esc(dcSt(o.st))}"><i></i><b class="mono">${o.code}</b>${priv&&p?`<em>${esc(p.name)} · ${dcSt(o.st)}</em>`:''}</span>`}).join('')}</div>${rest?`<div class="muted" style="margin-top:8px">+${rest} ${t('sin ID NXR en su apodo','without an NXR ID in their nickname')}</div>`:''}`}
const dcCard=priv=>card(t('Conectados en Discord','Online on Discord'),`<div class="pad dc" data-priv="${priv?1:0}">${dcHtml(priv)}</div>`,dcLink());
const dcLink=()=>{const s=(S.social||[]).find(x=>x.k==='discord');return s&&/^https?:/.test(s.url)?`<a class="btn sm" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${t('Abrir Discord','Open Discord')}</a>`:''};
function dcPaint(){document.querySelectorAll('.dc').forEach(e=>{const h=dcHtml(e.dataset.priv==='1');if(e.innerHTML!==h)e.innerHTML=h})}
setInterval(()=>{if(document.hidden||!document.querySelector('.dc'))return;if(Date.now()-DC.t>60000)dcLoad();else dcPaint()},3000);
