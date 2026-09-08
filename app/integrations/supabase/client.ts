// Re-export the single shared Supabase client — do NOT create a new client here.
// Having two GoTrueClient instances causes auth token races.
export { supabase } from '@/utils/supabase';

// Expo Router requires a default export for files inside app/.
export default function Page() { return null; }
