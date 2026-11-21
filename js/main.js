import { supabase } from './supabase.js';
import {
  signInPilot,
  signUpPilot,
  resetPilotPassword,
  signOutPilot,
  getPilotProfile,
} from './auth.js';

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

// Canvi entre pestanyes Login / Alta
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
    showMessage(err.message || 'No s’ha pogut iniciar sessió.');
  }
});

// Enviar Registre
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
      showMessage('Compte creat i sessió iniciada!', 'success');
    } else {
      showMessage('Revisa el teu correu electrònic per confirmar el compte.', 'success');
    }
    registerForm.reset();
  } catch (err) {
    showMessage(err.message || 'Error en crear el compte.');
  }
});

// Oblidar contrasenya
document.getElementById('forgot-password-btn').addEventListener('click', async () => {
  clearMessage();
  const email = document.getElementById('login-email').value.trim();
  if (!email) {
    showMessage('Escriu primer el teu correu al camp de dalt i torna a prémer.');
    return;
  }
  try {
    await resetPilotPassword(email);
    showMessage('T’hem enviat un correu per restablir la contrasenya.', 'success');
  } catch (err) {
    showMessage(err.message || 'No s’ha pogut enviar el correu de recuperació.');
  }
});

// Tancar sessió
document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOutPilot();
});

// Pintar el menú segons estat de sessió
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
    console.error('Error carregant el perfil:', err);
  }
}

// Escoltar canvis de sessió en temps real
supabase.auth.onAuthStateChange((_event, session) => {
  renderSidebar(session);
});

// Estat inicial en obrir la pàgina
const { data: { session } } = await supabase.auth.getSession();
renderSidebar(session);