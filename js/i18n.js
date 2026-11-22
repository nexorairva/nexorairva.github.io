export const translations = {
  es: {
    tab_login: 'Iniciar sesión',
    tab_register: 'Alta piloto',
    label_email: 'Correo electrónico',
    label_password: 'Contraseña',
    btn_login: 'Entrar a cabina',
    btn_forgot: '¿Has olvidado tu contraseña?',
    label_fullname: 'Nombre completo *',
    ph_fullname: 'Carlos Mendoza',
    label_callsign: 'Callsign',
    label_email_req: 'Correo electrónico *',
    label_password_req: 'Contraseña *',
    ph_password_min: 'Mínimo 6 caracteres',
    label_simbrief: 'SimBrief ID (opcional)',
    label_vatsim: 'VATSIM ID',
    label_ivao: 'IVAO ID',
    btn_register: 'Solicitar alta',
    stat_hours: 'Horas',
    stat_flights: 'Vuelos',
    nav_dashboard: 'Panel principal',
    nav_fleet: 'Flota',
    nav_routes: 'Rutas',
    nav_pirep: 'Enviar PIREP',
    nav_profile: 'Mi perfil',
    nav_admin: 'Administración',
    btn_logout: 'Cerrar sesión',
    welcome_title: 'Bienvenido a Nexorair',
    welcome_desc: 'Área principal pendiente de definir. Prueba primero el menú de usuario de la izquierda.',
    msg_login_err: 'No se ha podido iniciar sesión.',
    msg_reg_ok_session: '¡Cuenta creada y sesión iniciada!',
    msg_reg_ok_email: 'Revisa tu correo electrónico para confirmar la cuenta.',
    msg_reg_err: 'Error al crear la cuenta.',
    msg_forgot_empty: 'Escribe primero tu correo en el campo de arriba y vuelve a pulsar.',
    msg_forgot_ok: 'Te hemos enviado un correo para restablecer la contraseña.',
    msg_forgot_err: 'No se ha podido enviar el correo de recuperación.',
    label_remember_email: 'Recordar correo',
    profile_title: 'Mi perfil de piloto',
    profile_subtitle: 'Actualiza tus identificadores de red y aeropuerto base para MSFS 2024.',
    profile_label_callsign: 'Callsign asignado',
    profile_label_rank: 'Rango actual',
    profile_label_fullname: 'Nombre completo *',
    profile_label_hub: 'Hub base (ICAO)',
    profile_label_simbrief: 'SimBrief ID',
    profile_label_vatsim: 'VATSIM ID',
    profile_label_ivao: 'IVAO ID',
    profile_btn_save: 'Guardar cambios',
    profile_msg_saving: 'Guardando perfil...',
    profile_msg_saved: 'Perfil actualizado correctamente.',
    profile_msg_err: 'No se han podido guardar los cambios.',
    coming_soon_title: 'Sección en preparación',
    coming_soon_desc: 'Estamos construyendo este módulo para Nexorair MSFS 2024.',
  },
  en: {
    tab_login: 'Sign in',
    tab_register: 'Join us',
    label_email: 'Email address',
    label_password: 'Password',
    btn_login: 'Enter flight deck',
    btn_forgot: 'Forgot your password?',
    label_fullname: 'Full name *',
    ph_fullname: 'Alex Mercer',
    label_callsign: 'Callsign',
    label_email_req: 'Email address *',
    label_password_req: 'Password *',
    ph_password_min: 'Minimum 6 characters',
    label_simbrief: 'SimBrief ID (optional)',
    label_vatsim: 'VATSIM ID',
    label_ivao: 'IVAO ID',
    btn_register: 'Submit application',
    stat_hours: 'Hours',
    stat_flights: 'Flights',
    nav_dashboard: 'Dashboard',
    nav_fleet: 'Fleet',
    nav_routes: 'Routes',
    nav_pirep: 'File PIREP',
    nav_profile: 'My profile',
    nav_admin: 'Administration',
    btn_logout: 'Sign out',
    welcome_title: 'Welcome to Nexorair',
    welcome_desc: 'Main area yet to be defined. Test the user menu on the left first.',
    msg_login_err: 'Could not sign in.',
    msg_reg_ok_session: 'Account created and signed in!',
    msg_reg_ok_email: 'Check your email inbox to confirm your account.',
    msg_reg_err: 'Error creating account.',
    msg_forgot_empty: 'Enter your email in the field above first and click again.',
    msg_forgot_ok: 'We have sent you an email to reset your password.',
    msg_forgot_err: 'Could not send the recovery email.',
    label_remember_email: 'Remember email',
    profile_title: 'Pilot profile',
    profile_subtitle: 'Update your network IDs and home hub for MSFS 2024.',
    profile_label_callsign: 'Assigned callsign',
    profile_label_rank: 'Current rank',
    profile_label_fullname: 'Full name *',
    profile_label_hub: 'Home hub (ICAO)',
    profile_label_simbrief: 'SimBrief ID',
    profile_label_vatsim: 'VATSIM ID',
    profile_label_ivao: 'IVAO ID',
    profile_btn_save: 'Save changes',
    profile_msg_saving: 'Saving profile...',
    profile_msg_saved: 'Profile updated successfully.',
    profile_msg_err: 'Could not save changes.',
    coming_soon_title: 'Section under construction',
    coming_soon_desc: 'We are building this module for Nexorair MSFS 2024.',
  },
};

let currentLang = localStorage.getItem('nexorair_lang') || 'es';

export function getLang() {
  return currentLang;
}

export function t(key) {
  return translations[currentLang]?.[key] || translations.es[key] || key;
}

export function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('nexorair_lang', lang);
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}