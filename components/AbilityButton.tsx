import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { AbilityType } from '@/game/constants';
import { COLORS } from '@/constants/Colors';
import {
  Flame, Snowflake, Zap, Shield, Cpu, Droplets, Circle, Swords,
} from 'lucide-react-native';

interface AbilityButtonProps {
  abilityType: AbilityType;
  cooldown: number;
  maxCooldown: number;
  onPress: () => void;
  size?: number;
}

const ABILITY_ICONS: Record<AbilityType, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  meteor: Flame,
  freeze: Snowflake,
  rage: Swords,
  shield: Shield,
  overclock: Cpu,
  glue: Droplets,
  zone: Circle,
  portal: Zap,
  burner: Flame,
} as const;

const ABILITY_COLORS: Record<AbilityType, string> = {
  meteor: '#F97316',
  freeze: '#BAE6FD',
  rage: '#EF4444',
  shield: '#60A5FA',
  overclock: '#FCD34D',
  glue: '#78716C',
  zone: '#A855F7',
  portal: '#34D399',
  burner: '#F59E0B',
};

export function AbilityButton({ abilityType, cooldown, maxCooldown, onPress, size = 52 }: AbilityButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isReady = cooldown <= 0;
  const pct = maxCooldown > 0 ? Math.max(0, Math.min(1, cooldown / maxCooldown)) : 0;
  const color = ABILITY_COLORS[abilityType] ?? COLORS.primary;
  const IconComponent = ABILITY_ICONS[abilityType] ?? Zap;
  const iconSize = Math.round(size * 0.38);
  const cdSeconds = Math.ceil(cooldown / 1000);

  const handlePress = () => {
    console.log(`[AbilityButton] Pressed ability=${abilityType} cooldown=${cooldown}`);
    if (!isReady) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={{ alignItems: 'center', gap: 3 }}>
      <Animated.View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: isReady ? color : 'rgba(255,255,255,0.1)',
            backgroundColor: isReady ? `${color}18` : 'rgba(255,255,255,0.04)',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <IconComponent size={iconSize} color={isReady ? color : COLORS.textTertiary} strokeWidth={2} />
        {!isReady && (
          <View
            style={[
              styles.cooldownOverlay,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: pct * 0.65,
              },
            ]}
          />
        )}
        {isReady && (
          <View style={[styles.readyGlow, { width: size, height: size, borderRadius: size / 2, borderColor: color }]} />
        )}
      </Animated.View>
      {!isReady && (
        <Text style={styles.cdText}>{cdSeconds}s</Text>
      )}
      {isReady && (
        <Text style={[styles.cdText, { color }]}>READY</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cooldownOverlay: {
    position: 'absolute',
    backgroundColor: '#000000',
  },
  readyGlow: {
    position: 'absolute',
    borderWidth: 1,
    opacity: 0.4,
  },
  cdText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textTertiary,
    fontFamily: 'SpaceMono',
    letterSpacing: 0.3,
  },
});
