import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

const TABS: TabBarItem[] = [
  { name: '(home)', route: '/(tabs)/(home)', icon: 'home', label: 'Start' },
  { name: 'shop', route: '/(tabs)/shop', icon: 'inventory-2', label: 'Laden' },
  { name: 'play', route: '/setup', icon: 'sports-esports', label: 'Spielen', isCenter: true },
  { name: 'collection', route: '/(tabs)/collection', icon: 'layers', label: 'Lab' },
  { name: 'social', route: '/(tabs)/social', icon: 'emoji-events', label: 'Ränge' },
];

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

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
        <Tabs.Screen name="(home)" options={{ title: 'Start' }} />
        <Tabs.Screen name="shop" options={{ title: 'Laden' }} />
        <Tabs.Screen name="play" options={{ title: 'Spielen' }} />
        <Tabs.Screen name="collection" options={{ title: 'Lab' }} />
        <Tabs.Screen name="social" options={{ title: 'Ränge' }} />
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
