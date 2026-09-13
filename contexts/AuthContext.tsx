import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert, View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/utils/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useTranslation } from '@/i18n/LanguageContext';

WebBrowser.maybeCompleteAuthSession();

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
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    // Register listener FIRST so it catches events from getSession/auto-login
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setUser(mapSupabaseUser(sess.user));
        // Unblock loading immediately — edge function calls must not gate it
        setIsLoading(false);
        if (event === 'SIGNED_IN') {
          try {
            const { data, error } = await supabase.functions.invoke('post-auth-init', {});
            if (error) {
              console.warn('[Auth] post-auth-init error', error.message);
            } else {
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
            const { data: versionData, error: versionError } = await supabase.functions.invoke('get-version-info', {});
            if (versionError) {
              console.warn('[Auth] get-version-info error', versionError.message);
            } else if (versionData) {
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
        setIsLoading(false);
      }
    });

    // Call getSession AFTER listener is registered to avoid race with auto-login
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        setUser(mapSupabaseUser(data.session.user));
      }
      setIsLoading(false);
    });

    // Handle OAuth deep link callback
    const handleUrl = async (event: { url: string }) => {
      if (event.url.includes('access_token') || event.url.includes('code=')) {
        const hash = event.url.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        const at = params.get('access_token');
        const rt = params.get('refresh_token');
        if (at) {
          await supabase.auth.setSession({ access_token: at, refresh_token: rt ?? '' });
        }
      }
    };
    const linkingSub = Linking.addEventListener('url', handleUrl);

    return () => {
      listener.subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsBanned(false);
    setBanInfo(null);
    setNeedsUpdate(false);
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'splitterorbs', path: 'auth/callback' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        if (accessToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' });
        } else {
          // Try fragment params
          const hash = result.url.split('#')[1] ?? '';
          const params = new URLSearchParams(hash);
          const at = params.get('access_token');
          const rt = params.get('refresh_token');
          if (at) {
            await supabase.auth.setSession({ access_token: at, refresh_token: rt ?? '' });
          }
        }
      }
    } catch (e) {
      console.warn('[Auth] signInWithGoogle error', e);
      throw e;
    }
  };

  const signInWithApple = async () => {
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'splitterorbs', path: 'auth/callback' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        if (accessToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' });
        } else {
          const hash = result.url.split('#')[1] ?? '';
          const params = new URLSearchParams(hash);
          const at = params.get('access_token');
          const rt = params.get('refresh_token');
          if (at) {
            await supabase.auth.setSession({ access_token: at, refresh_token: rt ?? '' });
          }
        }
      }
    } catch (e) {
      console.warn('[Auth] signInWithApple error', e);
      throw e;
    }
  };

  // Ban screen overlay
  if (isBanned && banInfo) {
    const banUntilDisplay = new Date(banInfo.until).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const bannedTitle = t('auth.bannedTitle');
    const bannedReason = t('auth.bannedReason', { reason: banInfo.reason });
    const bannedUntil = t('auth.bannedUntil', { date: banUntilDisplay });
    const bannedSub = t('auth.bannedSub');
    return (
      <View style={banStyles.container}>
        <Text style={banStyles.emoji}>🚫</Text>
        <Text style={banStyles.title}>{bannedTitle}</Text>
        <Text style={banStyles.reason}>{bannedReason}</Text>
        <Text style={banStyles.until}>{bannedUntil}</Text>
        <Text style={banStyles.sub}>{bannedSub}</Text>
      </View>
    );
  }

  // Update required screen overlay
  if (needsUpdate) {
    const updateTitle = t('auth.updateTitle');
    const updateBody = t('auth.updateBody');
    const updateSub = t('auth.updateSub');
    const updateBtn = t('auth.updateBtn');
    return (
      <View style={banStyles.container}>
        <Text style={banStyles.emoji}>⬆️</Text>
        <Text style={banStyles.title}>{updateTitle}</Text>
        <Text style={banStyles.reason}>{updateBody}</Text>
        <Text style={banStyles.sub}>{updateSub}</Text>
        <Pressable style={banStyles.signOutBtn} onPress={signOut}>
          <Text style={banStyles.signOutText}>{updateBtn}</Text>
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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
