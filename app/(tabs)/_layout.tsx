import React from 'react';
import { Tabs } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { COLORS } from '@/constants/Colors';

const TABS: TabBarItem[] = [
  { name: '(home)', route: '/(tabs)/(home)', icon: 'home', label: 'Home' },
  { name: 'collection', route: '/(tabs)/collection', icon: 'layers', label: 'Lab' },
  { name: 'play', route: '/(tabs)/play', icon: 'sports-esports', label: 'Play', isCenter: true },
  { name: 'social', route: '/(tabs)/social', icon: 'emoji-events', label: 'Ranks' },
  { name: 'settings', route: '/(tabs)/settings', icon: 'settings', label: 'More' },
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
      <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
      <Tabs.Screen name="collection" options={{ title: 'Lab' }} />
      <Tabs.Screen name="play" options={{ title: 'Play' }} />
      <Tabs.Screen name="social" options={{ title: 'Ranks' }} />
      <Tabs.Screen name="settings" options={{ title: 'More' }} />
    </Tabs>
  );
}
