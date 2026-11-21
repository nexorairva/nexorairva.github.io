import { supabase } from './supabase.js';

export async function signInPilot(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpPilot({ email, password, fullName, callsign, simbriefId, vatsimId, ivaoId }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        callsign: callsign ? callsign.toUpperCase() : null,
        simbrief_id: simbriefId || null,
        vatsim_id: vatsimId || null,
        ivao_id: ivaoId || null,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function resetPilotPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function signOutPilot() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getPilotProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}