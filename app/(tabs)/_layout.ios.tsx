import React from 'react';
import { NativeTabs, Label, Icon } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <NativeTabs.Trigger name="(home)">
        <Icon sf="house.fill" />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="collection">
        <Icon sf="square.stack.3d.up.fill" />
        <Label>Lab</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="play">
        <Icon sf="gamecontroller.fill" />
        <Label>Play</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="social">
        <Icon sf="trophy.fill" />
        <Label>Ranks</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf="gearshape.fill" />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
