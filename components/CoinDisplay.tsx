import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface CoinDisplayProps {
  coins: number;
  size?: 'sm' | 'md' | 'lg';
}

export function CoinDisplay({ coins, size = 'md' }: CoinDisplayProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCoins = useRef(coins);

  useEffect(() => {
    if (coins !== prevCoins.current && coins > prevCoins.current) {
      console.log(`[CoinDisplay] Coins increased: ${prevCoins.current} → ${coins}`);
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
    prevCoins.current = coins;
  }, [coins, scaleAnim]);

  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  const dotSize = size === 'sm' ? 8 : size === 'lg' ? 12 : 10;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.coinDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]} />
      <Text style={[styles.text, { fontSize }]}>{coins}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinDot: {
    backgroundColor: COLORS.coin,
    shadowColor: COLORS.coin,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  text: {
    color: COLORS.coin,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
});
