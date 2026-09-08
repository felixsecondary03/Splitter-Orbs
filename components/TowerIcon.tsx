import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TowerType } from '@/game/constants';

// Tower gem colors per type (light theme)
const TOWER_GEM_COLORS: Partial<Record<TowerType, string>> = {
  blaster: '#3B82F6',      // blue
  vulcan: '#F59E0B',       // amber
  lancer: '#8B5CF6',       // purple
  piercer: '#10B981',      // emerald
  mortar: '#F43F5E',       // rose
  orb_mortar: '#F43F5E',
  lava_mortar: '#F97316',
  bouncer: '#06B6D4',      // cyan
  boomerang: '#06B6D4',
  glacier: '#0EA5E9',      // sky
  cryo: '#38BDF8',         // light blue
  pyre: '#F97316',         // orange
  detonator: '#F97316',
  venom: '#84CC16',        // lime
  siege: '#475569',        // slate
  arc: '#F59E0B',
  tesla: '#F59E0B',
  repulsor: '#8B5CF6',
  magnet: '#8B5CF6',
  seeker: '#10B981',
  prism_lance: '#8B5CF6',
  flak: '#94A3B8',
  harpoon: '#06B6D4',
  twin: '#3B82F6',
};

function getGemColor(type: TowerType): string {
  return TOWER_GEM_COLORS[type] ?? '#3B82F6';
}

interface TowerIconProps {
  type: TowerType;
  size?: number;
  selected?: boolean;
}

export function TowerIcon({ type, size = 48, selected = false }: TowerIconProps) {
  const gemColor = getGemColor(type);
  const baseWidth = size * 0.65;
  const baseHeight = size * 0.45;
  const gemSize = size * 0.22;
  const topWidth = size * 0.38;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: 8,
          backgroundColor: selected ? `${gemColor}18` : 'transparent',
          borderColor: selected ? gemColor : 'transparent',
          borderWidth: selected ? 1.5 : 0,
        },
      ]}
    >
      {/* Tower body — trapezoid using nested views */}
      <View style={styles.towerWrap}>
        {/* Top platform (narrower) */}
        <View
          style={[
            styles.towerTop,
            {
              width: topWidth,
              height: size * 0.12,
              backgroundColor: '#94A3B8',
              borderRadius: 2,
            },
          ]}
        />
        {/* Gem on top */}
        <View
          style={[
            styles.gem,
            {
              width: gemSize,
              height: gemSize,
              borderRadius: gemSize / 2,
              backgroundColor: gemColor,
              marginTop: -(gemSize * 0.5),
              shadowColor: gemColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 4,
            },
          ]}
        />
        {/* Main body */}
        <View
          style={[
            styles.towerBody,
            {
              width: baseWidth,
              height: baseHeight,
              backgroundColor: '#CBD5E1',
              borderRadius: 3,
              borderTopWidth: 0,
            },
          ]}
        />
        {/* Base */}
        <View
          style={[
            styles.towerBase,
            {
              width: baseWidth * 1.1,
              height: size * 0.1,
              backgroundColor: '#94A3B8',
              borderRadius: 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  towerWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  towerTop: {},
  gem: {
    zIndex: 2,
  },
  towerBody: {},
  towerBase: {},
});
