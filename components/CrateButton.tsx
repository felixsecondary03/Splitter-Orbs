import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Gift, Clock } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface CrateButtonProps {
  type: 'free' | 'gem';
  lastClaimed: string | null;
  onClaim: () => void;
}

const COOLDOWNS: Record<string, number> = {
  free: 24 * 60 * 60 * 1000,
  gem: 8 * 60 * 60 * 1000,
};

function getTimeRemaining(lastClaimed: string | null, cooldownMs: number): number {
  if (!lastClaimed) return 0;
  const elapsed = Date.now() - new Date(lastClaimed).getTime();
  return Math.max(0, cooldownMs - elapsed);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'CLAIM!';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function CrateButton({ type, lastClaimed, onClaim }: CrateButtonProps) {
  const cooldown = COOLDOWNS[type];
  const [remaining, setRemaining] = useState(() => getTimeRemaining(lastClaimed, cooldown));
  const bounceAnimRef = useRef(new Animated.Value(1));
  const bounceAnim = bounceAnimRef.current;
  const isReady = remaining <= 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(lastClaimed, cooldown));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastClaimed, cooldown]);

  useEffect(() => {
    if (isReady) {
      const bounce = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      bounce.start();
      return () => { bounce.stop(); };
    }
    bounceAnim.setValue(1);
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const isFree = type === 'free';
  const accentColor = isFree ? COLORS.gold : COLORS.gem;
  const title = isFree ? 'Daily Crate' : 'Gem Crate';
  const subtitle = isFree ? '24h cooldown' : '8h cooldown';
  const countdownText = formatCountdown(remaining);

  const handlePress = () => {
    if (!isReady) return;
    console.log(`[CrateButton] ${type} crate claimed`);
    onClaim();
  };

  return (
    <AnimatedPressable
      style={[styles.card, { borderColor: isReady ? `${accentColor}44` : COLORS.border }]}
      onPress={handlePress}
      disabled={!isReady}
    >
      <Animated.View style={[styles.iconWrap, { backgroundColor: `${accentColor}18`, transform: [{ scale: bounceAnim }] }]}>
        <Gift size={22} color={accentColor} strokeWidth={2} />
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View
        style={[
          styles.claimBtn,
          { backgroundColor: isReady ? accentColor : COLORS.surfaceSecondary },
        ]}
      >
        {isReady ? (
          <Text style={[styles.claimText, { color: '#0A0E1A' }]}>{countdownText}</Text>
        ) : (
          <View style={styles.countdownRow}>
            <Clock size={12} color={COLORS.textSecondary} strokeWidth={2} />
            <Text style={[styles.claimText, { color: COLORS.textSecondary }]}>{countdownText}</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  claimBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  claimText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
