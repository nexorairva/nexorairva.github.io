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

export async function getPilotProfile(userOrId) {
  const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
  if (!userId) {
    throw new Error('No s’ha pogut identificar l’usuari');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const meta = (typeof userOrId === 'object' && userOrId?.user_metadata) || {};
  const emailFallback = (typeof userOrId === 'object' && userOrId?.email) || 'pilot';

  const fallbackProfile = {
    id: userId,
    full_name: meta.full_name || emailFallback.split('@')[0],
    callsign: meta.callsign || 'NXR001',
    role: 'admin',
    rank: 'Commander',
    flight_hours: 0,
    total_flights: 0,
  };

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert(fallbackProfile)
    .select()
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function updatePilotProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}