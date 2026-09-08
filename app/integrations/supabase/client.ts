import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://jplyuxdzcylkojonpdru.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwbHl1eGR6Y3lsa29qb25wZHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTcyODksImV4cCI6MjEwNDQzMzI4OX0.3yxAi8ts8ouczyTjVsc85s-az_VajFNboQLe1-2Q6iE";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
