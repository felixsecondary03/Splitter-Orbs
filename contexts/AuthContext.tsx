import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('auth_user').then((stored) => {
      if (stored) setUser(JSON.parse(stored));
      setIsLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[Auth] signIn called', { email });
    // TODO: integrate with Base44 auth
    const mockUser: User = { id: '1', email, role: 'user' };
    setUser(mockUser);
    await AsyncStorage.setItem('auth_user', JSON.stringify(mockUser));
    console.log('[Auth] signIn success', { userId: mockUser.id });
  };

  const signOut = async () => {
    console.log('[Auth] signOut called');
    setUser(null);
    await AsyncStorage.removeItem('auth_user');
    console.log('[Auth] signOut complete');
  };

  const signInWithGoogle = async () => {
    console.log('[Auth] signInWithGoogle called');
    // TODO: expo-auth-session OAuth
  };

  const signInWithApple = async () => {
    console.log('[Auth] signInWithApple called');
    // TODO: expo-apple-authentication
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
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
