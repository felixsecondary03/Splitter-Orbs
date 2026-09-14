import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme, Alert } from "react-native";
import { useNetworkState } from "expo-network";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { AppThemeProvider } from "@/contexts/ThemeContext";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider, useTranslation } from "@/i18n/LanguageContext";

// Only wrap with ErrorBoundary in dev — production apps should not include it
const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

/** Handles the offline alert — must live inside LanguageProvider to use t(). */
function OfflineAlert() {
  const { t } = useTranslation();
  const networkState = useNetworkState();

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        t('common.offlineTitle'),
        t('common.offlineMessage'),
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable, t]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#0F172A').catch(() => {});
  }, []);

  return (
    <LanguageProvider>
    <DevErrorBoundary>
      <StatusBar style="light" animated />
      <AppThemeProvider>
        <SafeAreaProvider>
          <OfflineAlert />
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
                </GestureHandlerRootView>
              </WidgetProvider>
            </ProfileProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </AppThemeProvider>
    </DevErrorBoundary>
    </LanguageProvider>
  );
}
