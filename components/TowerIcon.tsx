import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TowerType } from '@/game/constants';
import { getTowerColor } from '@/game/engine-helpers';

interface TowerIconProps {
  type: TowerType;
  size?: number;
  selected?: boolean;
}

export function TowerIcon({ type, size = 32, selected = false }: TowerIconProps) {
  const color = getTowerColor(type);
  const shape = getTowerShape(type, color, size);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: 6,
          backgroundColor: selected ? `${color}22` : 'rgba(255,255,255,0.04)',
          borderColor: selected ? color : 'rgba(255,255,255,0.1)',
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
    >
      {shape}
    </View>
  );
}

function getTowerShape(type: TowerType, color: string, size: number) {
  const s = size * 0.55;
  const half = s / 2;

  switch (type) {
    case 'blaster':
      return (
        <View style={[styles.circle, { width: s, height: s, borderRadius: s / 2, borderColor: color, borderWidth: 2 }]}>
          <View style={[styles.crossH, { backgroundColor: color, width: s * 0.6, height: 2 }]} />
          <View style={[styles.crossV, { backgroundColor: color, width: 2, height: s * 0.6 }]} />
        </View>
      );
    case 'vulcan':
      return (
        <View style={{ gap: 2, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={{ width: s * 0.7, height: 3, backgroundColor: color, borderRadius: 1.5 }} />
          ))}
        </View>
      );
    case 'lancer':
    case 'piercer':
      return (
        <View style={{ width: 4, height: s, backgroundColor: color, borderRadius: 2 }} />
      );
    case 'mortar':
    case 'orb_mortar':
    case 'lava_mortar':
      return (
        <View style={[styles.dome, { width: s, height: half, borderTopLeftRadius: half, borderTopRightRadius: half, backgroundColor: color }]} />
      );
    case 'glacier':
    case 'cryo':
      return <SnowflakeShape color={color} size={s} />;
    case 'arc':
    case 'tesla':
      return <LightningShape color={color} size={s} />;
    case 'pyre':
    case 'detonator':
      return <TriangleShape color={color} size={s} />;
    case 'venom':
      return (
        <View style={[styles.teardrop, { width: s * 0.7, height: s, borderRadius: s * 0.35, borderTopLeftRadius: s * 0.35, borderTopRightRadius: s * 0.35, borderBottomLeftRadius: s * 0.5, borderBottomRightRadius: s * 0.5, backgroundColor: color }]} />
      );
    case 'siege':
      return (
        <View style={{ width: s, height: s, backgroundColor: color, borderRadius: 3, opacity: 0.9 }}>
          <View style={{ position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
        </View>
      );
    case 'boomerang':
      return (
        <View style={{ width: s, height: s * 0.5, borderTopLeftRadius: s * 0.5, borderTopRightRadius: s * 0.5, borderWidth: 2.5, borderColor: color, borderBottomWidth: 0 }} />
      );
    case 'bouncer':
      return (
        <View style={[styles.circle, { width: s, height: s, borderRadius: s / 2, backgroundColor: color, opacity: 0.85 }]} />
      );
    case 'repulsor':
    case 'magnet':
      return (
        <View style={{ alignItems: 'center', gap: 3 }}>
          <View style={{ width: s * 0.8, height: 3, backgroundColor: color, borderRadius: 1.5 }} />
          <View style={{ width: s * 0.5, height: 3, backgroundColor: color, borderRadius: 1.5, opacity: 0.6 }} />
          <View style={{ width: s * 0.3, height: 3, backgroundColor: color, borderRadius: 1.5, opacity: 0.3 }} />
        </View>
      );
    case 'seeker':
      return (
        <View style={{ width: s * 0.5, height: s, backgroundColor: color, borderRadius: s * 0.25, borderTopLeftRadius: s * 0.5, borderTopRightRadius: s * 0.5 }} />
      );
    case 'prism_lance':
      return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <View style={{ width: 3, height: s, backgroundColor: color, borderRadius: 1.5 }} />
          <View style={{ width: 3, height: s * 0.7, backgroundColor: color, borderRadius: 1.5, marginTop: s * 0.15, opacity: 0.6 }} />
        </View>
      );
    case 'flak':
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: s, gap: 2 }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{ width: s * 0.4, height: s * 0.4, borderRadius: s * 0.2, backgroundColor: color, opacity: 0.8 }} />
          ))}
        </View>
      );
    case 'harpoon':
      return (
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 3, height: s * 0.7, backgroundColor: color, borderRadius: 1.5 }} />
          <View style={{ width: s * 0.5, height: 3, backgroundColor: color, borderRadius: 1.5 }} />
        </View>
      );
    case 'twin':
      return (
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <View style={{ width: 4, height: s, backgroundColor: color, borderRadius: 2 }} />
          <View style={{ width: 4, height: s, backgroundColor: color, borderRadius: 2 }} />
        </View>
      );
    default:
      return (
        <View style={{ width: s * 0.8, height: s * 0.8, borderRadius: 4, backgroundColor: color, opacity: 0.8 }} />
      );
  }
}

function SnowflakeShape({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', width: 2, height: size, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', width: size * 0.7, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: size * 0.7, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}

function LightningShape({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size * 0.6, height: size, alignItems: 'center' }}>
      <View style={{ width: size * 0.5, height: size * 0.5, borderRightWidth: 3, borderBottomWidth: 3, borderColor: color, transform: [{ rotate: '30deg' }] }} />
      <View style={{ width: size * 0.5, height: size * 0.5, borderLeftWidth: 3, borderTopWidth: 3, borderColor: color, transform: [{ rotate: '30deg' }], marginTop: -size * 0.15 }} />
    </View>
  );
}

function TriangleShape({ color, size }: { color: string; size: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: size / 2,
        borderRightWidth: size / 2,
        borderBottomWidth: size,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossH: {
    position: 'absolute',
  },
  crossV: {
    position: 'absolute',
  },
  dome: {},
  teardrop: {},
});
