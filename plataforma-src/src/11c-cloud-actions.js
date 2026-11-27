/* ===== acciones de cuenta en modo nube (Supabase Auth) ===== */
function cloudHook(){if(!CL.on)return;
  const afterAuth=async()=>{const u=(await CL.sb.auth.getUser()).data.user;CL.uid=u?u.id:null;CL.email=u?u.email:'';await cloudPull()};
  const old={logout:A.logout,del:F.del};
  F.login=async d=>{const r=await CL.sb.auth.signInWithPassword({email:d.get('user').trim().toLowerCase(),password:d.get('pass')});
    if(r.error)return err('login-err',t('Correo o contraseña incorrectos.','Wrong email or password.'));
    await afterAuth();const p=me();if(!p)return err('login-err',t('Tu perfil aún no existe. Inténtalo de nuevo.','Your profile does not exist yet. Try again.'));go(isStaff(p)?'s-dash':'portal')};
  F.reg=async d=>{const pl=d.get('platform'),id=pl==='VATSIM'?d.get('vatsim'):d.get('ivao');if(!id)return err('reg-err',t('Indica tu ID de ','Enter your ')+pl+t('.',' ID.'));
    if((d.get('pass')||'').length<8)return err('reg-err',t('La contraseña debe tener al menos 8 caracteres.','Password must be at least 8 characters.'));
    const r=await CL.sb.auth.signUp({email:d.get('email').trim().toLowerCase(),password:d.get('pass'),options:{data:{name:d.get('name').trim(),country:(d.get('country')||'').toUpperCase(),user:d.get('user').trim(),platform:pl,vatsim:d.get('vatsim')||'',ivao:d.get('ivao')||'',simbrief:d.get('simbrief')||''}}});
    if(r.error)return err('reg-err',r.error.message);
    if(r.data.session){await afterAuth();go(isStaff(me())?'s-dash':'portal');toast(t('Cuenta creada. El staff revisará tu plataforma.','Account created. Staff will review your platform.'))}
    else{go('login');toast(t('Revisa tu correo para confirmar la cuenta.','Check your email to confirm the account.'))}};
  A.logout=async()=>{await CL.sb.auth.signOut();CL.uid=null;CL.email='';await cloudPull();go('inicio')};
  F.pw=async d=>{const r=await CL.sb.auth.updateUser({password:d.get('new')});if(r.error)return err('pw-err',r.error.message);await CL.sb.auth.signOut();CL.uid=null;await cloudPull();go('login');toast(t('Contraseña cambiada. Vuelve a entrar.','Password changed. Log in again.'))};
  F.del=async d=>{const r=await CL.sb.auth.signInWithPassword({email:CL.email,password:d.get('pass')});if(r.error)return err('del-err',t('Contraseña incorrecta.','Wrong password.'));return old.del(d)};
  A.demo=()=>toast(t('Las cuentas de demostración no existen en modo nube.','Demo accounts do not exist in cloud mode.'))}
