import { supabase } from './supabase.js';
import {
  signInPilot,
  signUpPilot,
  resetPilotPassword,
  signOutPilot,
  getPilotProfile,
} from './auth.js';
import { setLanguage, getLang, t } from './i18n.js';

const guestPanel = document.getElementById('guest-panel');
const userPanel = document.getElementById('user-panel');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authMessage = document.getElementById('auth-message');

function showMessage(text, type = 'error') {
  authMessage.textContent = text;
  authMessage.className = `auth-message ${type}`;
}

function clearMessage() {
  authMessage.textContent = '';
  authMessage.className = 'auth-message';
}

// Inicializar idioma guardado y eventos de las banderas
setLanguage(getLang());

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setLanguage(btn.dataset.lang);
    clearMessage();
  });
});

// Cambio entre pestañas Login / Alta
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  clearMessage();
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  clearMessage();
});

// Enviar Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    await signInPilot(email, password);
  } catch (err) {
    showMessage(err.message || t('msg_login_err'));
  }
});

// Enviar Registro
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const payload = {
    fullName: document.getElementById('reg-fullname').value.trim(),
    callsign: document.getElementById('reg-callsign').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-password').value,
    simbriefId: document.getElementById('reg-simbrief').value.trim(),
    vatsimId: document.getElementById('reg-vatsim').value.trim(),
    ivaoId: document.getElementById('reg-ivao').value.trim(),
  };

  try {
    const data = await signUpPilot(payload);
    if (data.session) {
      showMessage(t('msg_reg_ok_session'), 'success');
    } else {
      showMessage(t('msg_reg_ok_email'), 'success');
    }
    registerForm.reset();
  } catch (err) {
    showMessage(err.message || t('msg_reg_err'));
  }
});

// Olvidar contraseña
document.getElementById('forgot-password-btn').addEventListener('click', async () => {
  clearMessage();
  const email = document.getElementById('login-email').value.trim();
  if (!email) {
    showMessage(t('msg_forgot_empty'));
    return;
  }
  try {
    await resetPilotPassword(email);
    showMessage(t('msg_forgot_ok'), 'success');
  } catch (err) {
    showMessage(err.message || t('msg_forgot_err'));
  }
});

// Cerrar sesión
document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOutPilot();
});

// Pintar el menú según estado de sesión
async function renderSidebar(session) {
  if (!session) {
    guestPanel.classList.remove('hidden');
    userPanel.classList.add('hidden');
    return;
  }

  guestPanel.classList.add('hidden');
  userPanel.classList.remove('hidden');

  try {
    const profile = await getPilotProfile(session.user.id);
    document.getElementById('pilot-callsign').textContent = profile.callsign;
    document.getElementById('pilot-role').textContent = profile.role;
    document.getElementById('pilot-name').textContent = profile.full_name;
    document.getElementById('pilot-rank').textContent = profile.rank;
    document.getElementById('pilot-hours').textContent = Number(profile.flight_hours).toFixed(2);
    document.getElementById('pilot-flights').textContent = profile.total_flights;

    const adminLink = document.getElementById('nav-admin');
    if (profile.role === 'admin' || profile.role === 'staff') {
      adminLink.classList.remove('hidden');
    } else {
      adminLink.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error cargando el perfil:', err);
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  renderSidebar(session);
});

const { data: { session } } = await supabase.auth.getSession();
renderSidebar(session);