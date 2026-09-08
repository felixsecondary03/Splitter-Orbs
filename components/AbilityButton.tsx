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

// Background colors per ability type (light theme)
const ABILITY_BG_COLORS: Record<AbilityType, string> = {
  meteor: '#F97316',   // orange
  freeze: '#0EA5E9',   // sky
  rage: '#F43F5E',     // rose
  shield: '#3B82F6',   // blue
  overclock: '#F59E0B', // amber
  glue: '#94A3B8',     // slate
  zone: '#8B5CF6',     // purple
  portal: '#4F46E5',   // indigo
  burner: '#F59E0B',   // amber
};

const ABILITY_LABELS: Record<AbilityType, string> = {
  meteor: 'METEOR',
  freeze: 'FREEZE',
  rage: 'RAGE',
  shield: 'SHIELD',
  overclock: 'CLOCK',
  glue: 'GLUE',
  zone: 'ZONE',
  portal: 'PORTAL',
  burner: 'BURN',
};

export function AbilityButton({ abilityType, cooldown, maxCooldown, onPress, size = 64 }: AbilityButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const isReady = cooldown <= 0;
  const pct = maxCooldown > 0 ? Math.max(0, Math.min(1, cooldown / maxCooldown)) : 0;
  const bgColor = ABILITY_BG_COLORS[abilityType] ?? COLORS.primary;
  const IconComponent = ABILITY_ICONS[abilityType] ?? Zap;
  const iconSize = Math.round(size * 0.38);
  const cdSeconds = Math.ceil(cooldown / 1000);
  const label = ABILITY_LABELS[abilityType] ?? abilityType.toUpperCase();

  useEffect(() => {
    if (isReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const handlePress = () => {
    console.log(`[AbilityButton] Pressed ability=${abilityType} cooldown=${cooldown}`);
    if (!isReady) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

  return (
    <Pressable onPress={handlePress} style={styles.wrapper}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        {/* Ready glow ring */}
        {isReady && (
          <Animated.View
            style={[
              styles.glowRing,
              {
                width: size + 12,
                height: size + 12,
                borderRadius: (size + 12) / 2,
                borderColor: COLORS.success,
                opacity: glowOpacity,
              },
            ]}
          />
        )}
        <View
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isReady ? bgColor : `${bgColor}55`,
            },
          ]}
        >
          <IconComponent size={iconSize} color="#FFFFFF" strokeWidth={2.5} />
          {/* Cooldown overlay */}
          {!isReady && (
            <View
              style={[
                styles.cooldownOverlay,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  opacity: pct * 0.55,
                },
              ]}
            />
          )}
          {/* Countdown text */}
          {!isReady && (
            <View style={styles.cdOverlay}>
              <Text style={styles.cdNumber}>{cdSeconds}</Text>
            </View>
          )}
        </View>
      </Animated.View>
      <Text style={[styles.label, isReady && { color: COLORS.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 4,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  glowRing: {
    position: 'absolute',
    top: -6,
    borderWidth: 2,
    zIndex: -1,
  },
  cooldownOverlay: {
    position: 'absolute',
    backgroundColor: '#000000',
  },
  cdOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cdNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
});
