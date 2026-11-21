import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://lfbrjqnmtzloougvavyy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hK1MZHL11jkMDWjSWtHxLw_Mza3_puq';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);