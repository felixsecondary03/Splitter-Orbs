import React from 'react';
import { NativeTabs, Label, Icon } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Icon sf="house.fill" />
        <Label>Start</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shop">
        <Icon sf="shippingbox.fill" />
        <Label>Laden</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="play">
        <Icon sf="gamecontroller.fill" />
        <Label>Spielen</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="collection">
        <Icon sf="square.stack.3d.up.fill" />
        <Label>Lab</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="social">
        <Icon sf="trophy.fill" />
        <Label>Ränge</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
