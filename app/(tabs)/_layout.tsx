import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/LanguageContext';

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const TABS: TabBarItem[] = [
    { name: '(home)', route: '/(tabs)/(home)', icon: 'home', label: t('tabs.home') },
    { name: 'shop', route: '/(tabs)/shop', icon: 'inventory-2', label: t('tabs.shop') },
    { name: 'play', route: '/setup', icon: 'sports-esports', label: t('tabs.play'), isCenter: true },
    { name: 'collection', route: '/(tabs)/collection', icon: 'layers', label: t('tabs.lab') },
    { name: 'social', route: '/(tabs)/social', icon: 'emoji-events', label: t('tabs.social') },
  ];

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('[TabLayout] No authenticated user, redirecting to auth/welcome');
      router.replace('/auth/welcome');
    }
  }, [user, isLoading, router]);

  return (
    <>
      <Tabs
        tabBar={() => <FloatingTabBar tabs={TABS} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: COLORS.tabBar },
        }}
      >
        <Tabs.Screen name="(home)" options={{ title: t('tabs.home') }} />
        <Tabs.Screen name="shop" options={{ title: t('tabs.shop') }} />
        <Tabs.Screen name="play" options={{ title: t('tabs.play') }} />
        <Tabs.Screen name="collection" options={{ title: t('tabs.lab') }} />
        <Tabs.Screen name="social" options={{ title: t('tabs.social') }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>
      {isLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.background, zIndex: 999, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </>
  );
}
