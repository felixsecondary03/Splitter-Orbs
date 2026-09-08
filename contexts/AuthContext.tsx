import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBanned: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapSupabaseUser(u: SupabaseUser): User {
  return {
    id: u.id,
    email: u.email ?? '',
    full_name: u.user_metadata?.full_name,
    role: (u.user_metadata?.role as 'admin' | 'user') ?? 'user',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    console.log('[Auth] Initializing auth state listener');
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        setUser(mapSupabaseUser(data.session.user));
      }
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, sess) => {
      console.log('[Auth] Auth state changed', { event, userId: sess?.user?.id });
      setSession(sess);
      if (sess?.user) {
        setUser(mapSupabaseUser(sess.user));
        if (event === 'SIGNED_IN') {
          console.log('[Auth] SIGNED_IN — calling postAuthInit');
          try {
            await supabase.functions.invoke('postAuthInit', {});
          } catch (e) {
            console.warn('[Auth] postAuthInit failed', e);
          }
          // Check ban status
          try {
            const { data: profile } = await supabase
              .from('player_profiles')
              .select('ban_until')
              .eq('id', sess.user.id)
              .single();
            if (profile?.ban_until && new Date(profile.ban_until) > new Date()) {
              console.warn('[Auth] User is banned until', profile.ban_until);
              setIsBanned(true);
            } else {
              setIsBanned(false);
            }
          } catch (e) {
            console.warn('[Auth] Could not check ban status', e);
          }
        }
      } else {
        setUser(null);
        setIsBanned(false);
      }
      setIsLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[Auth] signIn called', { email });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] signIn error', error.message);
      throw error;
    }
    console.log('[Auth] signIn success');
  };

  const signUp = async (email: string, password: string) => {
    console.log('[Auth] signUp called', { email });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('[Auth] signUp error', error.message);
      throw error;
    }
    console.log('[Auth] signUp success');
  };

  const signOut = async () => {
    console.log('[Auth] signOut called');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    console.log('[Auth] signOut complete');
  };

  const signInWithGoogle = async () => {
    console.log('[Auth] signInWithGoogle called');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      console.error('[Auth] signInWithGoogle error', error.message);
      throw error;
    }
  };

  const signInWithApple = async () => {
    console.log('[Auth] signInWithApple called');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
    if (error) {
      console.error('[Auth] signInWithApple error', error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        isBanned,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        signInWithApple,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
