/* ===== acciones: ficha de piloto, cambio de ID, búsqueda ===== */
Object.assign(A,{
 pfile:id=>{if(!can('pilotos'))return;const f=pilotFile(id);if(f)modal(f[0],f[1],1)},
 psclr:()=>{ui.ps='';render()}
});
Object.assign(F,{
 psq:d=>{ui.ps=(d.get('q')||'').trim();render()},
 pid:async(d,f)=>{if(!can('pilotos'))return;const old=f.dataset.id,p=P_(old),c=pidCheck(d.get('nid'),old);if(!p)return;if(c.err)return err('pid-err',c.err);if(c.id===old){modal();return}
   if(CL.on){const r=await CL.sb.from('profiles').update({code:c.id}).eq('id',p.uid);
     if(r.error)return err('pid-err',/duplicate|unique/i.test(r.error.message)?t('Ese ID ya lo usa otro piloto.','That ID is already used by another pilot.'):r.error.message);
     CL.psnap[c.id]=CL.psnap[old];delete CL.psnap[old]}
   renamePid(old,c.id);notify(c.id,t('Tu ID de piloto es ahora ','Your pilot ID is now ')+c.id);aud('Cambió el ID de piloto',old+' → '+c.id);
   save();render();toast(t('ID actualizado: ','ID updated: ')+c.id);A.pfile(c.id)},
 phrs:(d,f)=>{if(!isAdmin(me()))return;const id=f.dataset.id,p=P_(id);if(!p)return;
   const tot=parseFloat(String(d.get('h')).replace(',','.')),why=(d.get('why')||'').trim();
   if(!isFinite(tot)||tot<0||tot>99999)return err('phrs-err',t('Indica unas horas entre 0 y 99999.','Enter hours between 0 and 99999.'));
   if(!why)return err('phrs-err',t('Indica el motivo del ajuste.','Enter the reason for the adjustment.'));
   const s0=stats(id),r0=rankOf(s0.h);p.hAdj=Math.round((tot-s0.hl)*100)/100;if(!p.hAdj)delete p.hAdj;const s1=stats(id);
   if(Math.abs(s1.h-s0.h)<0.005){modal();return}
   notify(id,t('El staff ha ajustado tus horas de vuelo: ','Staff adjusted your flight hours: ')+nd(s0.h)+' → '+nd(s1.h)+' h.');const r1=rankOf(s1.h);if(r1.i>r0.i)notify(id,t('¡Ascenso a ','Promoted to ')+r1.n+'!');
   aud('Ajustó las horas de vuelo',id+': '+nd(s0.h)+' → '+nd(s1.h)+' h · '+why);save();render();toast(t('Horas actualizadas','Hours updated'));A.pfile(id)},
 pdata:(d,f)=>{if(!isAdmin(me()))return;const id=f.dataset.id,p=P_(id);if(!p)return;const g=k=>(d.get(k)||'').trim();
   const v={name:g('name'),country:g('country').toUpperCase(),user:g('user'),platform:g('platform')==='IVAO'?'IVAO':'VATSIM',vatsim:g('vatsim'),ivao:g('ivao'),simbrief:g('simbrief'),hub:g('hub')||p.hub,netOk:d.get('netOk')==='1'};
   if(!v.name)return err('pdata-err',t('Indica el nombre.','Enter the name.'));
   if(!/^[A-Z]{2}$/.test(v.country))return err('pdata-err',t('El país son 2 letras (ES, MX…).','Country is 2 letters (ES, MX…).'));
   if(!/^[A-Za-z0-9_]{3,40}$/.test(v.user))return err('pdata-err',t('Usuario: 3 a 40 letras, números o _.','Username: 3 to 40 letters, digits or _.'));
   if(!CL.on&&S.pilots.some(x=>x.id!==id&&(x.user||'').toLowerCase()===v.user.toLowerCase()))return err('pdata-err',t('Ese usuario ya existe.','That username already exists.'));
   for(const k of ['vatsim','ivao','simbrief'])if(v[k]&&!/^\d{5,8}$/.test(v[k]))return err('pdata-err',t('Los ID de red y de SimBrief son de 5 a 8 cifras.','Network and SimBrief IDs are 5 to 8 digits.'));
   if(!v[v.platform==='VATSIM'?'vatsim':'ivao'])return err('pdata-err',t('Indica el ID de la plataforma preferida.','Enter the ID of the preferred platform.'));
   if(!CL.on){const em=g('email');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return err('pdata-err',t('Correo no válido.','Invalid email.'));v.email=em}
   if(d.has('status'))v.status=g('status');
   const rol=d.has('rol')?(g('rol')||null):p.rol;
   if(isAdmin(p)&&rol!=='admin'&&S.pilots.filter(isAdmin).length<2)return err('pdata-err',t('Debe quedar al menos un administrador.','At least one administrator must remain.'));
   const ch=[];Object.keys(v).forEach(k=>{if(v[k]!==p[k]&&!(v[k]===''&&p[k]===undefined)){ch.push(k);p[k]=v[k]}});
   if(rol!==(p.rol||null)){ch.push('rol');p.rol=rol;notify(p.id,rol?t('Se te ha asignado el nivel de staff: ','You were given the staff level: ')+(rol==='admin'?'Admin':(roleOf(p)||{n:'?'}).n):t('Tu acceso de staff ha sido retirado.','Your staff access was removed.'))}
   if(!ch.length){modal();return}
   if(S.session&&S.session.id===id)S.session.staff=isStaff(p);
   aud('Editó los datos del piloto',id+' ('+ch.join(', ')+')');save();render();toast(t('Datos guardados','Data saved'));A.pfile(id)}
});
