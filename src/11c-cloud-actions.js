/* ===== acciones de cuenta en modo nube (Supabase Auth) ===== */
function cloudHook(){if(!CL.on)return;
  const afterAuth=async()=>{const u=(await CL.sb.auth.getUser()).data.user;CL.uid=u?u.id:null;CL.email=u?u.email:'';await cloudPull()};
  const old={logout:A.logout,del:F.del};
  F.login=async d=>{remSet(!!d.get('rem'),d.get('user').trim().toLowerCase());const r=await CL.sb.auth.signInWithPassword({email:d.get('user').trim().toLowerCase(),password:d.get('pass')});
    if(!r.error&&d.get('rem')){try{if(window.PasswordCredential&&navigator.credentials)await navigator.credentials.store(new PasswordCredential({id:d.get('user').trim().toLowerCase(),password:d.get('pass'),name:d.get('user').trim().toLowerCase()}))}catch(e){}}   /* la contraseña la guarda el gestor del navegador, nunca la web */
    if(r.error)return err('login-err',t('Correo o contraseña incorrectos. Si tu solicitud fue rechazada, vuelve a registrarte.','Wrong email or password. If your request was rejected, sign up again.'));
    await afterAuth();const p=me();if(!p)return err('login-err',t('Tu perfil aún no existe. Inténtalo de nuevo.','Your profile does not exist yet. Try again.'));go(isStaff(p)?'s-dash':'portal')};
  F.reg=async d=>{const pl=d.get('platform'),id=pl==='VATSIM'?d.get('vatsim'):d.get('ivao');if(!id)return err('reg-err',t('Indica tu ID de ','Enter your ')+pl+t('.',' ID.'));
    if((d.get('pass')||'').length<8)return err('reg-err',t('La contraseña debe tener al menos 8 caracteres.','Password must be at least 8 characters.'));
    if(!(await codeFree(d.get('code'))))return err('reg-err',t('Ese ID de piloto ya está en uso. Elige otro.','That pilot ID is already taken. Choose another one.'));
    const r=await CL.sb.auth.signUp({email:d.get('email').trim().toLowerCase(),password:d.get('pass'),options:{data:{code:'NXR'+d.get('code').trim(),name:d.get('name').trim(),country:(d.get('country')||'').toUpperCase(),user:d.get('user').trim(),platform:pl,vatsim:d.get('vatsim')||'',ivao:d.get('ivao')||'',simbrief:d.get('simbrief')||''}}});
    if(r.error){if(!(await codeFree(d.get('code'))))return err('reg-err',t('Ese ID de piloto ya está en uso. Elige otro.','That pilot ID is already taken. Choose another one.'));return err('reg-err',r.error.message)}
    if(r.data.session){await afterAuth();go(isStaff(me())?'s-dash':'portal');toast(t('Cuenta creada. El staff revisará tu plataforma.','Account created. Staff will review your platform.'))}
    else{go('login');toast(t('Revisa tu correo para confirmar la cuenta.','Check your email to confirm the account.'))}};
  A.logout=async()=>{await CL.sb.auth.signOut();CL.uid=null;CL.email='';await cloudPull();go('inicio')};
  F.pw=async d=>{const r=await CL.sb.auth.updateUser({password:d.get('new')});if(r.error)return err('pw-err',r.error.message);await CL.sb.auth.signOut();CL.uid=null;await cloudPull();go('login');toast(t('Contraseña cambiada. Vuelve a entrar.','Password changed. Log in again.'))};
  F.del=async d=>{const r=await CL.sb.auth.signInWithPassword({email:CL.email,password:d.get('pass')});if(r.error)return err('del-err',t('Contraseña incorrecta.','Wrong password.'));return old.del(d)};
  /* rechazar una alta o eliminar una cuenta: se borra de verdad en Supabase (perfil, datos y usuario de acceso) */
  const rm=async(id,msg,audTxt)=>{const p=P_(id);if(!p||!p.uid)return;const r=await CL.sb.rpc('remove_pilot',{p_uid:p.uid});
    if(r.error){toast(t('No se pudo eliminar: ','Could not remove: ')+r.error.message);return}
    await cloudPull();aud(audTxt,id);save();modal();render();toast(msg)};
  F.drj=(d,f)=>rm(f.dataset.id,t('Solicitud rechazada. Tendrá que volver a registrarse.','Request rejected. They will have to sign up again.'),'Rechazó solicitud');
  A.deluser=id=>rm(id,t('Cuenta eliminada','Account deleted'),'Eliminó la cuenta');
  A.demo=()=>{}}
