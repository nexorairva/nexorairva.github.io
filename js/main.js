import { supabase } from './supabase.js';
import {
  signInPilot,
  signUpPilot,
  resetPilotPassword,
  signOutPilot,
  getPilotProfile,
  updatePilotProfile,
} from './auth.js';
import { setLanguage, getLang, t } from './i18n.js';

const guestPanel = document.getElementById('guest-panel');
const userPanel = document.getElementById('user-panel');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authMessage = document.getElementById('auth-message');
const viewDashboard = document.getElementById('view-dashboard');
const viewProfile = document.getElementById('view-profile');
const viewComingSoon = document.getElementById('view-coming-soon');
const profileForm = document.getElementById('profile-form');
const profileMessage = document.getElementById('profile-message');
const navItems = document.querySelectorAll('.side-nav .nav-item');

let activeUser = null;
let activeProfile = null;

function setProfileMessage(text, type = 'error') {
  profileMessage.textContent = text;
  profileMessage.className = `auth-message ${type}`;
}

function fillProfileForm(profile) {
  activeProfile = profile;
  document.getElementById('profile-readonly-callsign').textContent = profile.callsign || 'NXR---';
  document.getElementById('profile-readonly-rank').textContent = profile.rank || 'Cadet';
  document.getElementById('prof-fullname').value = profile.full_name || '';
  document.getElementById('prof-hub').value = profile.home_hub_icao || '';
  document.getElementById('prof-simbrief').value = profile.simbrief_id || '';
  document.getElementById('prof-vatsim').value = profile.vatsim_id || '';
  document.getElementById('prof-ivao').value = profile.ivao_id || '';
}

function switchView(viewName, labelText = '') {
  viewDashboard.classList.add('hidden');
  viewProfile.classList.add('hidden');
  viewComingSoon.classList.add('hidden');
  profileMessage.textContent = '';

  if (viewName === 'dashboard') {
    viewDashboard.classList.remove('hidden');
  } else if (viewName === 'profile') {
    if (activeProfile) fillProfileForm(activeProfile);
    viewProfile.classList.remove('hidden');
  } else {
    if (labelText) {
      document.getElementById('coming-soon-heading').textContent = labelText;
    }
    viewComingSoon.classList.remove('hidden');
  }
}

navItems.forEach((link, idx) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navItems.forEach((item) => item.classList.remove('active'));
    link.classList.add('active');

    if (idx === 0) {
      switchView('dashboard');
    } else if (idx === 4) {
      switchView('profile');
    } else {
      switchView('coming-soon', link.textContent.trim());
    }
  });
});

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeUser) return;

  setProfileMessage(t('profile_msg_saving'), 'success');

  const updates = {
    full_name: document.getElementById('prof-fullname').value.trim(),
    home_hub_icao: document.getElementById('prof-hub').value.trim().toUpperCase() || null,
    simbrief_id: document.getElementById('prof-simbrief').value.trim() || null,
    vatsim_id: document.getElementById('prof-vatsim').value.trim() || null,
    ivao_id: document.getElementById('prof-ivao').value.trim() || null,
  };

  try {
    const updated = await updatePilotProfile(activeUser.id, updates);
    activeProfile = updated;
    document.getElementById('pilot-name').textContent = updated.full_name;
    setProfileMessage(t('profile_msg_saved'), 'success');
  } catch (err) {
    console.error('Error guardant perfil:', err);
    setProfileMessage(err.message || t('profile_msg_err'), 'error');
  }
});

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

const SAVED_EMAIL_KEY = 'nexorair_saved_email';
const loginEmailInput = document.getElementById('login-email');
const rememberEmailCheckbox = document.getElementById('remember-email');

// Carregar correu guardat si existeix
const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
if (savedEmail) {
  loginEmailInput.value = savedEmail;
  rememberEmailCheckbox.checked = true;
}

// Enviar Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  const email = loginEmailInput.value.trim();
  const password = document.getElementById('login-password').value;

  if (rememberEmailCheckbox.checked) {
    localStorage.setItem(SAVED_EMAIL_KEY, email);
  } else {
    localStorage.removeItem(SAVED_EMAIL_KEY);
  }

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
  loginForm.reset();
  const currentSaved = localStorage.getItem(SAVED_EMAIL_KEY);
  if (currentSaved) {
    loginEmailInput.value = currentSaved;
    rememberEmailCheckbox.checked = true;
  }
});

// Pintar el menú según estado de sesión
async function renderSidebar(session) {
  if (!session) {
    activeUser = null;
    activeProfile = null;
    switchView('dashboard');
    guestPanel.classList.remove('hidden');
    userPanel.classList.add('hidden');
    return;
  }

  activeUser = session.user;
  guestPanel.classList.add('hidden');
  userPanel.classList.remove('hidden');

  try {
    const profile = await getPilotProfile(session.user);
    activeProfile = profile;
    fillProfileForm(profile);

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