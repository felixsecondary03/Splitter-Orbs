import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface HPBarProps {
  current: number;
  max: number;
  width: number;
  height?: number;
  showText?: boolean;
}

export function HPBar({ current, max, width, height = 6, showText = false }: HPBarProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(1, current / safeMax));
  const barColor = pct > 0.6 ? COLORS.hpGreen : pct > 0.3 ? COLORS.hpYellow : COLORS.hpRed;
  const fillWidth = Math.round(pct * (width - 2));
  const currentDisplay = Math.ceil(current);
  const maxDisplay = Math.ceil(max);

  return (
    <View style={{ width, gap: 2 }}>
      {showText && (
        <Text style={[styles.text, { color: barColor }]}>
          {currentDisplay}
          <Text style={styles.textSep}>/</Text>
          {maxDisplay}
        </Text>
      )}
      <View style={[styles.track, { width, height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              width: fillWidth,
              height: height - 2,
              borderRadius: (height - 2) / 2,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 1,
    overflow: 'hidden',
  },
  fill: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  textSep: {
    color: COLORS.textTertiary,
    fontWeight: '400',
  },
});
