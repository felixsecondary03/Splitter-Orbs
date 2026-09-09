import React, { useEffect } from 'react';
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
  }, [user, isLoading]);

  if (isLoading) return null;
  if (!user) return null;

  return (
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
  );
}
