import React from 'react';
import { Tabs } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { COLORS } from '@/constants/Colors';

const TABS: TabBarItem[] = [
  { name: '(home)', route: '/(tabs)/(home)', icon: 'home', label: 'Start' },
  { name: 'shop', route: '/(tabs)/shop', icon: 'inventory-2', label: 'Laden' },
  { name: 'play', route: '/setup', icon: 'sports-esports', label: 'Spielen', isCenter: true },
  { name: 'collection', route: '/(tabs)/collection', icon: 'layers', label: 'Lab' },
  { name: 'social', route: '/(tabs)/social', icon: 'emoji-events', label: 'Ränge' },
];

export default function TabLayout() {
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
