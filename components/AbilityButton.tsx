import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ABILITIES } from '@/game/constants';
import type { AbilityType } from '@/game/constants';
import { useTranslation } from '@/i18n/LanguageContext';

interface AbilityButtonProps {
  abilityType: AbilityType;
  cooldown: number;
  maxCooldown: number;
  onPress: () => void;
  size?: number;
}

const ABILITY_EMOJIS: Partial<Record<AbilityType, string>> = {
  zap: '⚡',
  portal: '🌀',
  repair: '➕',
  freeze: '❄️',
  rage: '🔥',
  shield: '🛡️',
  burner: '🌋',
  meteor: '☄️',
  glue: '🟢',
  overclock: '⚙️',
  speed_zone: '💨',
  damage_zone: '💢',
  frost_zone: '🌨️',
  deep_freeze: '🧊',
};

export function AbilityButton({ abilityType, cooldown, maxCooldown, onPress, size = 64 }: AbilityButtonProps) {
  const { t } = useTranslation();
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const def = ABILITIES[abilityType as keyof typeof ABILITIES];
  const defColor = (def as any)?.color ?? '#64748b';
  const isReady = cooldown <= 0;
  const effectiveCooldown = Math.max(0, cooldown);
  const effectiveMax = maxCooldown > 0 ? maxCooldown : ((def as any)?.cooldown ?? 1);
  const pct = isReady ? 0 : (effectiveCooldown / effectiveMax) * 100;

  const C = 2 * Math.PI * 26;
  const offset = C * (1 - pct / 100);

  const icon = ABILITY_EMOJIS[abilityType] ?? '✨';
  const cdDisplay = Math.ceil(effectiveCooldown);

  const abilityName = t(`abilities.${abilityType}.name`);

  useEffect(() => {
    if (isReady) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0.4);
      return undefined;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const handlePress = () => {
    console.log(`[AbilityButton] Pressed ability=${abilityType} cooldown=${cooldown} isReady=${isReady}`);
    if (!isReady) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const BUTTON_SIZE = size;
  const INNER_SIZE = BUTTON_SIZE - 8;

  return (
    <Pressable onPress={handlePress} style={styles.wrapper}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center', paddingBottom: 18 }}>
        {/* Outer container — 64×64 circle */}
        <View style={[styles.outerCircle, { width: BUTTON_SIZE, height: BUTTON_SIZE, borderRadius: BUTTON_SIZE / 2 }]}>
          {/* Glow aura when ready */}
          {isReady && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: BUTTON_SIZE / 2,
                  borderWidth: 2,
                  borderColor: defColor,
                  opacity: glowAnim,
                  shadowColor: defColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 8,
                },
              ]}
            />
          )}

          {/* Background disc */}
          <View
            style={[
              styles.innerDisc,
              {
                width: INNER_SIZE,
                height: INNER_SIZE,
                borderRadius: INNER_SIZE / 2,
                backgroundColor: isReady ? defColor + '33' : '#f1f5f9',
                borderWidth: 2,
                borderColor: isReady ? defColor : '#e2e8f0',
              },
            ]}
          >
            {/* Center content */}
            {isReady ? (
              <Text style={[styles.iconEmoji, { textShadowColor: defColor, textShadowRadius: 6 }]}>
                {icon}
              </Text>
            ) : (
              <Text style={styles.cdNumber}>{cdDisplay}</Text>
            )}
          </View>

          {/* SVG cooldown ring */}
          {!isReady && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { margin: 4, borderRadius: (INNER_SIZE) / 2 },
              ]}
              pointerEvents="none"
            >
              <Svg viewBox="0 0 64 64" width={INNER_SIZE} height={INNER_SIZE}>
                <Circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="4"
                />
                <Circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                  transform="rotate(-90 32 32)"
                />
              </Svg>
            </View>
          )}
        </View>

        {/* Label below */}
        <Text style={styles.label} numberOfLines={1}>
          {abilityName}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingBottom: 0,
  },
  outerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  innerDisc: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  cdNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#64748b',
  },
  label: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    maxWidth: 64,
    marginTop: 2,
  },
});
