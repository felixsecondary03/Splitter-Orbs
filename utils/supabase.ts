import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { storage } from './storage';

const SUPABASE_URL = 'https://jplyuxdzcylkojonpdru.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwbHl1eGR6Y3lsa29qb25wZHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTcyODksImV4cCI6MjEwNDQzMzI4OX0.3yxAi8ts8ouczyTjVsc85s-az_VajFNboQLe1-2Q6iE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
