import React, { createContext, useState, useEffect } from 'react';
import { Alert, View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/utils/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

const APP_VERSION = '1.0.0';

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
}

interface BanInfo {
  reason: string;
  until: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBanned: boolean;
  banInfo: BanInfo | null;
  needsUpdate: boolean;
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

function handleEdgeFunctionError(data: Record<string, unknown> | null, context: string) {
  if (!data) return;
  const errCode = data?.error as string | undefined;
  if (errCode === 'eula_required') {
    console.warn(`[Auth] ${context}: eula_required — navigating to onboarding`);
    router.replace('/onboarding');
    return;
  }
  if (errCode === 'rate_limit_exceeded') {
    Alert.alert('Too many requests', 'Too many requests, please wait.');
    return;
  }
  if (errCode) {
    Alert.alert('Error', errCode || 'Something went wrong');
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);

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
          console.log('[Auth] SIGNED_IN — calling post-auth-init');
          try {
            const { data, error } = await supabase.functions.invoke('post-auth-init', {});
            if (error) {
              console.warn('[Auth] post-auth-init error', error.message);
            } else {
              console.log('[Auth] post-auth-init response', data);
              handleEdgeFunctionError(data as Record<string, unknown>, 'post-auth-init');

              const profile = data?.profile as Record<string, unknown> | undefined;
              if (profile) {
                // Check ban status
                if (profile.banned) {
                  const banUntil = profile.ban_until as string | null;
                  if (banUntil && new Date(banUntil) > new Date()) {
                    console.warn('[Auth] User is banned until', banUntil);
                    setIsBanned(true);
                    setBanInfo({
                      reason: (profile.ban_reason as string) ?? 'Violation of terms of service',
                      until: banUntil,
                    });
                    // Sign out after showing ban screen
                    setTimeout(async () => {
                      await supabase.auth.signOut();
                    }, 5000);
                  } else {
                    setIsBanned(false);
                    setBanInfo(null);
                  }
                } else {
                  setIsBanned(false);
                  setBanInfo(null);
                }
              }
            }
          } catch (e) {
            console.warn('[Auth] post-auth-init exception', e);
          }

          // Check version info
          try {
            console.log('[Auth] Calling get-version-info');
            const { data: versionData, error: versionError } = await supabase.functions.invoke('get-version-info', {});
            if (versionError) {
              console.warn('[Auth] get-version-info error', versionError.message);
            } else if (versionData) {
              console.log('[Auth] get-version-info response', versionData);
              const minRequired = versionData.minRequiredVersion as string | undefined;
              if (minRequired && compareVersions(minRequired, APP_VERSION) > 0) {
                console.warn('[Auth] App update required. minRequired:', minRequired, 'current:', APP_VERSION);
                setNeedsUpdate(true);
              }
            }
          } catch (e) {
            console.warn('[Auth] get-version-info exception', e);
          }
        }
      } else {
        setUser(null);
        setIsBanned(false);
        setBanInfo(null);
        setNeedsUpdate(false);
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
    setIsBanned(false);
    setBanInfo(null);
    setNeedsUpdate(false);
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

  // Ban screen overlay
  if (isBanned && banInfo) {
    const banUntilDisplay = new Date(banInfo.until).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    return (
      <View style={banStyles.container}>
        <Text style={banStyles.emoji}>🚫</Text>
        <Text style={banStyles.title}>Account Suspended</Text>
        <Text style={banStyles.reason}>{banInfo.reason}</Text>
        <Text style={banStyles.until}>Suspended until: {banUntilDisplay}</Text>
        <Text style={banStyles.sub}>You will be signed out automatically.</Text>
      </View>
    );
  }

  // Update required screen overlay
  if (needsUpdate) {
    return (
      <View style={banStyles.container}>
        <Text style={banStyles.emoji}>⬆️</Text>
        <Text style={banStyles.title}>Update Required</Text>
        <Text style={banStyles.reason}>A new version of the app is required to continue playing.</Text>
        <Text style={banStyles.sub}>Please update the app from the App Store.</Text>
        <Pressable style={banStyles.signOutBtn} onPress={signOut}>
          <Text style={banStyles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        isBanned,
        banInfo,
        needsUpdate,
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

const banStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emoji: { fontSize: 64 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  reason: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 24 },
  until: { fontSize: 14, color: '#EF4444', fontWeight: '600', textAlign: 'center' },
  sub: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  signOutBtn: {
    marginTop: 8,
    backgroundColor: '#1E293B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#94A3B8' },
});

export function useAuth() {
  const ctx = React.use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
