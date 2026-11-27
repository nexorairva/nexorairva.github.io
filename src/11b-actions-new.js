/* ===== acciones nuevas ===== */
Object.assign(A,{
 bgreset:()=>{['bgL','bgD','bgImg','bgVeil'].forEach(k=>delete S.brand[k]);aud('Restauró el fondo de la web','');done(t('Fondo restaurado','Background restored'),1)},
 bgimgdel:()=>{delete S.brand.bgImg;delete S.brand.bgVeil;aud('Quitó la imagen de fondo','');done(t('Imagen quitada','Image removed'),1)},
 brreset:k=>{delete S.brand[k];aud('Restauró imagen de marca',k);done(t('Restaurado','Restored'),1)},
 rledit:id=>{const r=S.roles.find(x=>x.id===id);ui.rl=r?{id:r.id,n:r.n,perms:[...r.perms]}:null;render()},
 rlcancel:()=>{ui.rl=null;render()},
 rldel:id=>{const r=S.roles.find(x=>x.id===id);if(!r)return;if(S.pilots.some(p=>p.rol===id))return toast(t('Hay miembros con este nivel. Cámbiales el nivel antes de eliminarlo.','Members still have this level. Change theirs first.'));S.roles=S.roles.filter(x=>x.id!==id);aud('Eliminó el nivel',r.n);done(t('Nivel eliminado','Level deleted'),1)},
 stfquit:id=>{const p=P_(id);if(!p)return;if(isAdmin(p)&&S.pilots.filter(isAdmin).length<2)return toast(t('Debe quedar al menos un administrador.','At least one administrator must remain.'));p.rol=null;notify(p.id,t('Tu acceso de staff ha sido retirado.','Your staff access was removed.'));aud('Quitó acceso de staff',p.id);save();if(S.session&&S.session.id===id){go('portal')}else done(t('Acceso retirado','Access removed'),1)},
 soedit:id=>{const x=S.social.find(s=>s.id===id);ui.so=x?Object.assign({},x):null;render()},
 socancel:()=>{ui.so=null;render()},
 sodel:id=>{S.social=S.social.filter(s=>s.id!==id);aud('Quitó una red social',id);done(t('Red eliminada','Network removed'),1)},
 srel:id=>{const r=R_(id);if(!r)return;cancelRes(r,t('Liberada por el staff','Released by staff'));notify(r.pilot,t('Tu reserva ','Your booking ')+r.from+'-'+r.to+t(' ha sido liberada por el staff.',' was released by staff.'));aud('Liberó una reserva',r.from+'-'+r.to);done(t('Reserva liberada','Booking released'),1)}
});
Object.assign(F,{
 role:(d)=>{const n=(d.get('n')||'').trim(),perms=d.getAll('perm'),id=d.get('id');if(!n)return err('role-err',t('Pon un nombre.','Enter a name.'));if(!perms.length)return err('role-err',t('Elige al menos un permiso.','Choose at least one permission.'));
   if(S.roles.some(r=>r.n.toLowerCase()===n.toLowerCase()&&r.id!==id))return err('role-err',t('Ya existe un nivel con ese nombre.','A level with that name already exists.'));
   if(id){const r=S.roles.find(x=>x.id===id);if(r){r.n=n;r.perms=perms}}else S.roles.push({id:uid('r'),n,perms});ui.rl=null;aud('Guardó el nivel',n);done(t('Nivel guardado','Level saved'),1)},
 asg:(d)=>{const p=P_(d.get('pid')),rol=d.get('rol');if(!p)return;if(isAdmin(p)&&rol!=='admin'&&S.pilots.filter(isAdmin).length<2)return err('asg-err',t('Debe quedar al menos un administrador.','At least one administrator must remain.'));
   p.rol=rol;notify(p.id,t('Se te ha asignado el nivel de staff: ','You were given the staff level: ')+(rol==='admin'?'Admin':(roleOf(p)||{n:'?'}).n));aud('Asignó nivel de staff',p.id+' → '+rol);done(t('Nivel asignado','Level assigned'),1)},
 soc:(d)=>{const url=(d.get('url')||'').trim(),id=d.get('id');if(!/^https?:\/\/[^\s]+\.[^\s]+/i.test(url))return err('soc-err',t('El enlace debe empezar por https://','The link must start with https://'));
   const o={id:id||uid('so'),k:d.get('k'),n:d.get('n').trim(),url,d:(d.get('d')||'').trim()};const i=S.social.findIndex(x=>x.id===o.id);if(i>=0)S.social[i]=o;else S.social.push(o);ui.so=null;aud('Guardó una red social',o.n);done(t('Red guardada','Network saved'),1)}
});
document.addEventListener('change',async e=>{const x=e.target;if(x.id&&x.id.startsWith('br-')&&x.files&&x.files[0]){const k=x.id.slice(3),d=await readPng(x.files[0],(k==='logo'||k==='logoDark')?1200:512);x.value='';
  if(!d){toast(t('Solo se admiten archivos PNG válidos.','Only valid PNG files are accepted.'));return}S.brand[k]=d;aud('Cambió imagen de marca',k);save();render();toast(t('Imagen actualizada','Image updated'))}});

/* ----- textos legales: mostrar texto/archivo adjunto ----- */
const _pdfU={};
function docBody(d){const url=d.file&&d.file.data?(_pdfU[d.ts]=_pdfU[d.ts]||(()=>{try{const b=atob(d.file.data.split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return URL.createObjectURL(new Blob([u],{type:'application/pdf'}))}catch(e){return''}})()):'';
  return (d.text?`<div class="doctext">${esc(d.text)}</div>`:'')+(url?`<object data="${url}" type="application/pdf" class="docpdf"><p>${t('Tu navegador no puede mostrar el PDF aquí.','Your browser cannot show the PDF here.')}</p></object><a class="btn sm" href="${url}" download="${esc(d.file.name||'documento.pdf')}" style="align-self:flex-start">${t('Descargar PDF','Download PDF')}</a>`:'')}
async function docxText(buf){const dv=new DataView(buf),u8=new Uint8Array(buf);let e=u8.length-22;while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;if(e<0)return null;
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);
  for(let i=0;i<n&&dv.getUint32(p,true)===0x02014b50;i++){const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true),name=new TextDecoder().decode(u8.subarray(p+46,p+46+nl));
    if(name==='word/document.xml'){const st=off+30+dv.getUint16(off+26,true)+dv.getUint16(off+28,true),raw=u8.subarray(st,st+csz);
      const xml=meth===0?new TextDecoder().decode(raw):await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      const doc=new DOMParser().parseFromString(xml,'application/xml'),out=[];
      Array.from(doc.getElementsByTagNameNS('*','p')).forEach(par=>{let l='';const w=n=>{if(n.nodeType!==1)return;const ln=n.localName;if(ln==='t')l+=n.textContent;else if(ln==='tab')l+='\t';else if(ln==='br'||ln==='cr')l+='\n';else Array.from(n.childNodes).forEach(w)};w(par);out.push(l)});
      return out.join('\n').replace(/\n{3,}/g,'\n\n').trim()}
    p+=46+nl+xl+cl}
  return null}
document.addEventListener('change',async e=>{const x=e.target;if(x.id!=='ndoc-file'||!x.files||!x.files[0])return;const f=x.files[0],nm=f.name.toLowerCase(),info=document.getElementById('ndoc-info'),box=document.getElementById('ndoc-x'),say=m=>{if(info)info.textContent=m};
  try{
    if(nm.endsWith('.pdf')){if(f.size>2*1024*1024){say(t('El PDF supera los 2 MB.','The PDF exceeds 2 MB.'));x.value='';return}
      const data=await new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=ko;r.readAsDataURL(f)});ui.docPdf={name:f.name,data};say(f.name+' · '+t('PDF listo para publicar','PDF ready to publish'));return}
    let text;
    if(nm.endsWith('.docx')){text=await docxText(await f.arrayBuffer());if(text===null)throw 0}
    else{text=await f.text();if(/\.html?$/.test(nm))text=(new DOMParser().parseFromString(text,'text/html').body.innerText||'').trim()}
    if(text.length>60000)text=text.slice(0,60000);
    ui.docPdf=null;if(box)box.value=text;say(f.name+' · '+text.length+' '+t('caracteres cargados en el cuadro de texto; revísalo y publica.','characters loaded into the text box; review and publish.'))
  }catch(er){say(t('No se pudo leer ese archivo.','Could not read that file.'))}
  x.value=''});
document.addEventListener('change',e=>{const x=e.target;if(x.id==='ndoc-d'){ui.docK=x.value;const b=document.getElementById('ndoc-x');if(b&&S.docs[x.value])b.value=S.docs[x.value].text||''}});

F.bgs=(d)=>{const ok=c=>/^#[0-9a-f]{6}$/i.test(c||''),l=d.get('l'),dk=d.get('d');
  if(ok(l)&&l.toLowerCase()!=='#f4f6f8')S.brand.bgL=l;else delete S.brand.bgL;
  if(ok(dk)&&dk.toLowerCase()!=='#08110d')S.brand.bgD=dk;else delete S.brand.bgD;
  S.brand.bgVeil=Math.max(0,Math.min(90,+d.get('v')||0));aud('Cambió el fondo de la web','');done(t('Fondo guardado','Background saved'),1)};
function readBg(file){return new Promise(res=>{if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type))return res(null);const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,1920/im.width),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.78))};im.onerror=()=>res(null);im.src=fr.result};fr.onerror=()=>res(null);fr.readAsDataURL(file)})}
document.addEventListener('change',async e=>{const x=e.target;if(x.id!=='bgimg'||!x.files||!x.files[0])return;const d=await readBg(x.files[0]);x.value='';
  if(!d){toast(t('Solo se admiten imágenes JPG, PNG o WebP.','Only JPG, PNG or WebP images are accepted.'));return}
  if(d.length>1500000){toast(t('La imagen es demasiado pesada; usa una más pequeña.','The image is too large; use a smaller one.'));return}
  S.brand.bgImg=d;if(S.brand.bgVeil===undefined)S.brand.bgVeil=35;aud('Cambió la imagen de fondo','');save();render();toast(t('Imagen de fondo actualizada','Background image updated'))});
