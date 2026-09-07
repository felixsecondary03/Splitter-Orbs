import React from 'react';
import { Tabs } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { COLORS } from '@/constants/Colors';

const TABS: TabBarItem[] = [
  { name: '(home)', route: '/(tabs)/(home)', icon: 'home', label: 'Home' },
  { name: 'play', route: '/(tabs)/play', icon: 'sports-esports', label: 'Play' },
  { name: 'collection', route: '/(tabs)/collection', icon: 'layers', label: 'Collection' },
  { name: 'social', route: '/(tabs)/social', icon: 'people', label: 'Social' },
  { name: 'settings', route: '/(tabs)/settings', icon: 'settings', label: 'Settings' },
];

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <FloatingTabBar tabs={TABS} containerWidth={360} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
      <Tabs.Screen name="play" options={{ title: 'Play' }} />
      <Tabs.Screen name="collection" options={{ title: 'Collection' }} />
      <Tabs.Screen name="social" options={{ title: 'Social' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
