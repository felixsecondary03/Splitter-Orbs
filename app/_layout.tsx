import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { supabase } from "@/utils/supabase";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme, Alert } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/i18n/LanguageContext";

// Only wrap with ErrorBoundary in dev — production apps should not include it
const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  // Auto-login with admin account in dev mode
  useEffect(() => {
    if (!__DEV__) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        console.log('[Dev] Auto-signing in with admin account');
        supabase.auth.signInWithPassword({
          email: 'admin@splitterorbs.com',
          password: 'SplitterOrbs2025!',
        }).then(({ error }) => {
          if (error) {
            console.warn('[Dev] Auto-login failed:', error.message);
          } else {
            console.log('[Dev] Auto-login successful');
          }
        });
      }
    });
  }, []);

  const GameDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: '#4F8EF7',
      background: '#0A0E1A',
      card: '#111827',
      text: '#F1F5F9',
      border: 'rgba(255, 255, 255, 0.06)',
      notification: '#EF4444',
    },
  };

  return (
    <LanguageProvider>
    <DevErrorBoundary>
      <StatusBar style="light" animated />
      <ThemeProvider value={GameDarkTheme}>
        <SafeAreaProvider>
          <AuthProvider>
            <ProfileProvider>
              <WidgetProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="game" options={{ headerShown: false, animation: 'fade' }} />
                    <Stack.Screen name="setup" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="auth/welcome" options={{ headerShown: false }} />
                    <Stack.Screen name="auth/login" options={{ title: 'Sign In', presentation: 'modal' }} />
                    <Stack.Screen name="auth/register" options={{ title: 'Create Account', presentation: 'modal' }} />
                    <Stack.Screen name="auth/forgot-password" options={{ title: 'Reset Password', presentation: 'modal' }} />
                    <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
                    <Stack.Screen name="match-result" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="admin" options={{ headerShown: false, presentation: 'modal' }} />
                    <Stack.Screen name="privacy" options={{ headerShown: false }} />
                    <Stack.Screen name="eula-screen" options={{ headerShown: false }} />
                    <Stack.Screen name="impressum" options={{ headerShown: false }} />
                  </Stack>
                  <SystemBars style="light" />
                </GestureHandlerRootView>
              </WidgetProvider>
            </ProfileProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
    </LanguageProvider>
  );
}
