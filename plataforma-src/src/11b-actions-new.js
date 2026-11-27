/* ===== acciones nuevas ===== */
Object.assign(A,{
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
