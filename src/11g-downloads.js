/* ----- Descargas (libreas, documentos, logos) y certificados ----- */
const DLCAT={liv:['Libreas','Liveries'],doc:['Documentos','Documents'],logo:['Logos','Logos']},DLMAX=50*1048576,DLMAXLOCAL=1.5*1048576;
const fsz=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
const dlGet=id=>S.dl.find(x=>x.id===id);
function dlHref(x){return x.kind==='link'?x.url:''}
/* ---- pilotos ---- */
function vPDl(cat){const L=S.dl.filter(x=>x.cat===cat).sort((a,b)=>b.ts-a.ts),T=DLCAT[cat],hint={liv:t('Libreas para tu simulador. Descomprime y copia la carpeta a la de libreas de tu avión.','Liveries for your simulator. Unzip and copy the folder into your aircraft liveries folder.'),doc:t('Manuales, guías y documentación de la aerolínea.','Manuals, guides and airline documentation.'),logo:t('Logos y recursos de marca de NEXORA AIR para tus capturas, streams y vídeos.','NEXORA AIR logos and brand assets for your screenshots, streams and videos.')}[cat];
  return head(t(...T),hint)+(L.length?`<div class="grid">${L.map(x=>`<div class="card pad stack"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h3>${esc(x.n)}</h3>${x.ac?pill(x.ac):''}</div>${x.d?`<p class="muted">${esc(x.d)}</p>`:''}<p class="muted mono">${x.fname?esc(x.fname)+' · ':''}${x.size?fsz(x.size)+' · ':''}${fd(x.ts)}</p>${dlBtn(x)}</div>`).join('')}</div>`:card('',`<p class="muted pad">${t('Todavía no hay archivos en esta sección. El staff los irá publicando.','There are no files in this section yet. Staff will publish them.')}</p>`))}
function dlBtn(x){return x.kind==='link'?`<a class="btn pri sm" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" download>${t('Descargar','Download')} ↓</a>`:btn(t('Descargar','Download')+' ↓','dlget',x.id,'pri sm')}
/* ---- certificados ---- */
function certList(pid){return S.tx.filter(x=>x.pilot===pid&&/^(tour|ev|ch):/.test(x.ref)).sort((a,b)=>b.ts-a.ts)}
const certKind=r=>r.startsWith('tour:')?['Tour','Tour']:r.startsWith('ev:')?['Evento','Event']:['Desafío','Challenge'];
const certName=x=>(x.why||'').replace(/^[^:]*:\s*/,'');
const certId=(pid,ref)=>{let h=0;const s=pid+'|'+ref;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return 'NXR-C-'+pid.replace(/\D/g,'')+'-'+h.toString(36).toUpperCase().padStart(6,'0').slice(0,6)};
function vPCert(){const p=me(),L=certList(p.id);
  return head(t('Certificados','Certificates'),t('Se generan solos cuando completas un tour, un evento o un desafío. Descárgalos en PNG o PDF.','They are generated automatically when you complete a tour, event or challenge. Download them as PNG or PDF.'))+
  (L.length?`<div class="grid">${L.map(x=>{const k=certKind(x.ref);return`<div class="card pad stack"><div style="display:flex;justify-content:space-between;gap:8px"><h3>${esc(certName(x))}</h3>${pill(t(...k),'acc')}</div><p class="muted">${t('Conseguido el ','Earned on ')}${fd(x.ts)} · +${x.pts} ${t('puntos','points')}</p><p class="muted mono">${certId(p.id,x.ref)}</p><div style="display:flex;gap:8px;flex-wrap:wrap">${btn('PNG ↓','certpng',x.ref,'pri sm')}${btn('PDF ↓','certpdf',x.ref,'sm')}</div></div>`}).join('')}</div>`:card('',`<p class="muted pad">${t('Aún no tienes certificados. Completa un tour, un evento o un desafío y aparecerá aquí con la felicitación de NEXORA AIR.','You have no certificates yet. Complete a tour, event or challenge and it will appear here with a message of congratulations from NEXORA AIR.')}</p>`))}
function certCanvas(pid,ref){const x=certList(pid).find(r=>r.ref===ref),p=P_(pid);if(!x||!p)return null;
  const W=1754,H=1240,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),k=certKind(ref),kind=S.lang==='en'?k[1]:k[0];
  const grd=g.createLinearGradient(0,0,W,H);grd.addColorStop(0,'#03100A');grd.addColorStop(.55,'#07210f');grd.addColorStop(1,'#0c3a16');g.fillStyle=grd;g.fillRect(0,0,W,H);
  g.globalAlpha=.16;const rg=g.createRadialGradient(W*.82,H*.2,10,W*.82,H*.2,W*.6);rg.addColorStop(0,'#7ED321');rg.addColorStop(1,'transparent');g.fillStyle=rg;g.fillRect(0,0,W,H);g.globalAlpha=1;
  g.strokeStyle='#7ED321';g.lineWidth=6;g.strokeRect(46,46,W-92,H-92);g.lineWidth=1.5;g.strokeStyle='rgba(126,211,33,.5)';g.strokeRect(68,68,W-136,H-136);
  const tx=(s,x0,y0,font,col,al='center')=>{g.font=font;g.fillStyle=col;g.textAlign=al;g.fillText(s,x0,y0)};
  const FF='Inter, Segoe UI, Arial, sans-serif',cx=W/2;
  tx('NEXORA AIR',cx,230,'800 74px '+FF,'#ffffff');tx(S.lang==='en'?'CONNECT · FLY · EXCEL':'CONECTA · VUELA · SUPERA',cx,276,'500 22px '+FF,'#9fc3ad');
  tx(S.lang==='en'?'CERTIFICATE OF ACHIEVEMENT':'CERTIFICADO DE LOGRO',cx,420,'700 56px '+FF,'#7ED321');
  tx(S.lang==='en'?'NEXORA AIR is proud to certify that':'NEXORA AIR se enorgullece de certificar que',cx,500,'400 30px '+FF,'#cfe3d6');
  let fs=96;g.font='800 '+fs+'px '+FF;while(g.measureText(p.name).width>W-300&&fs>40){fs-=4;g.font='800 '+fs+'px '+FF}
  tx(p.name,cx,620,'800 '+fs+'px '+FF,'#ffffff');tx(p.id,cx,670,'600 28px ui-monospace, Menlo, monospace','#9EEB3C');
  tx(S.lang==='en'?'has successfully completed the '+kind.toLowerCase()+':':'ha completado con éxito el '+kind.toLowerCase()+':',cx,750,'400 30px '+FF,'#cfe3d6');
  let nm=certName(x);fs=64;g.font='700 '+fs+'px '+FF;while(g.measureText(nm).width>W-280&&fs>30){fs-=3;g.font='700 '+fs+'px '+FF}
  tx(nm,cx,840,'700 '+fs+'px '+FF,'#7ED321');
  const msg=S.lang==='en'?['Congratulations from everyone at NEXORA AIR.','Thank you for your effort and dedication: the pilot flies, NEXORA AIR does the rest.']:['Enhorabuena de parte de toda la aerolínea NEXORA AIR.','Gracias por tu esfuerzo y dedicación: el piloto vuela, NEXORA AIR hace el resto.'];
  tx(msg[0],cx,940,'500 30px '+FF,'#ffffff');tx(msg[1],cx,984,'400 26px '+FF,'#cfe3d6');
  g.strokeStyle='rgba(126,211,33,.6)';g.lineWidth=2;g.beginPath();g.moveTo(240,1100);g.lineTo(640,1100);g.moveTo(W-640,1100);g.lineTo(W-240,1100);g.stroke();
  tx(S.lang==='en'?'Airline Management':'Dirección de NEXORA AIR',440,1128,'500 22px '+FF,'#9fc3ad');tx(fd(x.ts),W-440,1128,'500 22px '+FF,'#9fc3ad');
  tx(certId(pid,ref)+' · '+(S.lang==='en'?'Flight simulation only':'Solo simulación'),cx,1150,'400 18px ui-monospace, Menlo, monospace','#6f9a80');return c}
function certJpegBytes(c){const b=atob(c.toDataURL('image/jpeg',.93).split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function pdfFromJpeg(jpg,w,h){const enc=s=>new TextEncoder().encode(s),parts=[],offs=[];let len=0;const push=u=>{parts.push(u);len+=u.length};
  const obj=(n,body)=>{offs[n]=len;push(enc(n+' 0 obj\n'));(Array.isArray(body)?body:[body]).forEach(b=>push(typeof b==='string'?enc(b):b));push(enc('\nendobj\n'))};
  push(enc('%PDF-1.4\n'));const pw=842,ph=Math.round(842*h/w),cont='q '+pw+' 0 0 '+ph+' 0 0 cm /Im0 Do Q';
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pw+' '+ph+'] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  obj(4,['<< /Type /XObject /Subtype /Image /Width '+w+' /Height '+h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n',jpg,'\nendstream']);
  obj(5,'<< /Length '+cont.length+' >>\nstream\n'+cont+'\nendstream');
  const xr=len;let x='xref\n0 6\n0000000000 65535 f \n';for(let i=1;i<=5;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';x+='trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF';push(enc(x));
  const out=new Uint8Array(len);let o=0;parts.forEach(p=>{out.set(p,o);o+=p.length});return new Blob([out],{type:'application/pdf'})}
function saveBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
const certFile=(pid,ref,ext)=>'Certificado-NEXORA-AIR-'+certName(certList(pid).find(r=>r.ref===ref)||{why:''}).replace(/[^\w\-]+/g,'_').slice(0,40)+'.'+ext;
/* ---- staff ---- */
function vSDescargas(){const e=ui.dl||null,cats=Object.keys(DLCAT),ico=(a,id,tt,ch,c='')=>`<button class="btn sm ${c}" data-a="${a}" data-id="${esc(id)}" title="${tt}" aria-label="${tt}">${ch}</button>`;
  return head(t('Descargas','Downloads'),t('Publica libreas, documentos y logos para los pilotos. Adjunta el archivo (se guarda en la plataforma) o pega un enlace externo para archivos muy pesados.','Publish liveries, documents and logos for pilots. Attach the file (stored on the platform) or paste an external link for very large files.'))+
  card(S.dl.length+'',tbl([t('Sección','Section'),t('Nombre','Name'),t('Archivo','File'),t('Fecha','Date'),''],S.dl.slice().sort((a,b)=>b.ts-a.ts).map(x=>[t(...DLCAT[x.cat]),esc(x.n),x.kind==='link'&&!x.fname?esc((x.url||'').slice(0,40)):esc(x.fname||'')+(x.size?' · '+fsz(x.size):''),fd(x.ts),`<span class="nw">${ico('dledit',x.id,t('Editar','Edit'),'✎')} ${ico('dldel',x.id,t('Eliminar','Delete'),'🗑','bad')}</span>`]),t('Aún no hay descargas publicadas.','No downloads published yet.')))+
  `<form data-f="ndl" class="card form pad"><h2 class="full">${e?t('Editar descarga','Edit download'):t('Añadir descarga','Add download')}</h2>${e?`<input type="hidden" name="id" value="${esc(e.id)}">`:''}${sel('ndl','cat',t('Sección','Section'),cats.map(k=>[k,t(...DLCAT[k])]),e?e.cat:'liv')}${fld('ndl','n',t('Nombre','Name'),'text','required maxlength="80"',e?e.n:'')}${fld('ndl','ac',t('Aeronave / simulador (opcional)','Aircraft / simulator (optional)'),'text','maxlength="40"',e?e.ac||'':'')}${ta('ndl','d',t('Descripción (opcional)','Description (optional)'),e?e.d||'':'','rows="3" maxlength="400"')}
  <label class="full">${t('Adjuntar archivo','Attach file')} (${t('máx. ','max ')}${CL.on?'50 MB':'1,5 MB'}${e&&e.fname?' · '+t('déjalo vacío para conservar «','leave empty to keep “')+esc(e.fname)+'»':''})<input id="dlfile" type="file"></label>
  <p class="muted full" id="ndl-info">${ui.dlFile?esc(ui.dlFile.name)+' · '+fsz(ui.dlFile.size):t('…o pega un enlace externo (Drive, MEGA, Dropbox…) aquí abajo.','…or paste an external link (Drive, MEGA, Dropbox…) below.')}</p>
  ${fld('ndl','url',t('Enlace externo (opcional)','External link (optional)'),'text','maxlength="400" placeholder="https://"',e&&e.kind==='link'&&!e.fname?e.url:'')}
  <div class="full err" id="ndl-err" hidden></div><div class="full" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" type="submit">${e?t('Guardar cambios','Save changes'):t('Publicar descarga','Publish download')}</button>${e?btn(t('Cancelar','Cancel'),'dlcancel','','sm'):''}</div></form>`}
const dlRead=f=>new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=ko;r.readAsDataURL(f)});
Object.assign(A,{
 dlget:id=>{const x=dlGet(id);if(!x||!x.data)return;try{const b=atob(x.data.split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);saveBlob(new Blob([u],{type:x.mime||'application/octet-stream'}),x.fname||x.n)}catch(e){toast(t('No se pudo descargar el archivo.','Could not download the file.'))}},
 certpng:ref=>{const p=me(),c=certCanvas(p.id,ref);if(!c)return;c.toBlob(b=>saveBlob(b,certFile(p.id,ref,'png')),'image/png')},
 certpdf:ref=>{const p=me(),c=certCanvas(p.id,ref);if(!c)return;saveBlob(pdfFromJpeg(certJpegBytes(c),c.width,c.height),certFile(p.id,ref,'pdf'))},
 dledit:id=>{const x=dlGet(id);if(!x)return;ui.dl=Object.assign({},x);ui.dlFile=null;render();window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})},
 dlcancel:()=>{ui.dl=null;ui.dlFile=null;render()},
 dldel:id=>{const x=dlGet(id);if(!x)return;modal(t('Eliminar descarga','Delete download'),`<form data-f="dldel" class="form pad"><input type="hidden" name="id" value="${esc(id)}"><p class="full">${t('Se eliminará «','«')}${esc(x.n)}${t('» para todos los pilotos.','» for all pilots.')}</p><div class="full" style="display:flex;gap:8px"><button class="btn bad" type="submit">${t('Eliminar','Delete')}</button>${btn(t('Cancelar','Cancel'),'xm','','')}</div></form>`)}
});
Object.assign(F,{
 dldel:async d=>{const x=dlGet(d.get('id'));if(!x)return;if(CL.on&&x.path){try{await CL.sb.storage.from('downloads').remove([x.path])}catch(e){}}S.dl=S.dl.filter(y=>y.id!==x.id);if(ui.dl&&ui.dl.id===x.id)ui.dl=null;aud('Eliminó una descarga',x.n);done(t('Descarga eliminada','Download deleted'))},
 ndl:async d=>{const id=d.get('id'),old=id?dlGet(id):null,n=(d.get('n')||'').trim();let url=(d.get('url')||'').trim();if(!n)return;
  const o={cat:DLCAT[d.get('cat')]?d.get('cat'):'liv',n,ac:(d.get('ac')||'').trim(),d:(d.get('d')||'').trim()},f=ui.dlFile&&ui.dlFile.file;
  if(url){if(!/^https?:\/\//i.test(url))url='https://'+url;if(!/^https?:\/\/[^\s"'<>]+$/i.test(url))return err('ndl-err',t('El enlace no es válido.','The link is not valid.'))}
  if(!f&&!url&&!old)return err('ndl-err',t('Adjunta un archivo o pega un enlace.','Attach a file or paste a link.'));
  const btnEl=document.querySelector('form[data-f=ndl] button[type=submit]');if(btnEl)btnEl.disabled=true;
  try{let rec={};
    if(f){if(f.size>(CL.on?DLMAX:DLMAXLOCAL))throw new Error(t('El archivo es demasiado grande para guardarlo aquí; usa un enlace externo.','The file is too large to store here; use an external link.'));
      if(CL.on){const path=Date.now()+'-'+f.name.replace(/[^\w.\-]+/g,'_'),r=await CL.sb.storage.from('downloads').upload(path,f,{upsert:false,contentType:f.type||'application/octet-stream'});if(r.error)throw new Error(t('No se pudo subir el archivo (¿has ejecutado schema.sql?). Usa un enlace externo o reinténtalo.','The file could not be uploaded (did you run schema.sql?). Use an external link or retry.'));
        rec={kind:'link',url:CL.sb.storage.from('downloads').getPublicUrl(path).data.publicUrl,path,fname:f.name,size:f.size,data:undefined,mime:undefined}}
      else rec={kind:'file',data:await dlRead(f),mime:f.type,fname:f.name,size:f.size,url:undefined,path:undefined}}
    else if(url)rec={kind:'link',url,fname:'',size:0,data:undefined,mime:undefined,path:undefined};
    if(old&&(f||url)&&CL.on&&old.path){try{await CL.sb.storage.from('downloads').remove([old.path])}catch(e){}}
    if(old){Object.assign(old,o,rec);old.ts=Date.now();aud('Editó una descarga',n);ui.dl=null}else{S.dl.push(Object.assign({id:uid('dl'),ts:Date.now()},o,rec));aud('Publicó una descarga',n);S.pilots.filter(p=>p.status!=='Pending'&&!p.sys).forEach(p=>notify(p.id,t('Nueva descarga: ','New download: ')+n))}
    ui.dlFile=null;done(t('Descarga publicada','Download published'))}
  catch(e){if(btnEl)btnEl.disabled=false;err('ndl-err',e.message||String(e))}}
});
document.addEventListener('change',e=>{const x=e.target;if(x.id!=='dlfile')return;const f=x.files&&x.files[0],i=document.getElementById('ndl-info');if(!f){ui.dlFile=null;return}
  if(f.size>(CL.on?DLMAX:DLMAXLOCAL)){ui.dlFile=null;x.value='';if(i)i.textContent=t('Ese archivo supera el máximo permitido; usa un enlace externo.','That file exceeds the maximum; use an external link.');return}
  ui.dlFile={name:f.name,size:f.size,file:f};if(i)i.textContent=f.name+' · '+fsz(f.size)});
