import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { getLeague } from '@/game/constants';

const LEAGUE_COLORS: Record<string, string> = {
  Beginner: COLORS.leagueBeginner,
  Rookie: COLORS.leagueRookie,
  Cadet: COLORS.leagueCadet,
  Veteran: COLORS.leagueVeteran,
  Champion: COLORS.leagueChampion,
  Master: COLORS.leagueMaster,
  Legend: COLORS.leagueLegend,
};

interface LeagueBadgeProps {
  trophies: number;
  size?: 'sm' | 'md' | 'lg';
}

export function LeagueBadge({ trophies, size = 'md' }: LeagueBadgeProps) {
  const league = getLeague(trophies);
  const color = LEAGUE_COLORS[league.name] ?? COLORS.primary;

  const sizeStyles = {
    sm: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, fontSize: 10 },
    md: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontSize: 11 },
    lg: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, fontSize: 13 },
  }[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}22`,
          borderColor: `${color}44`,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          borderRadius: sizeStyles.borderRadius,
        },
      ]}
    >
      <Text style={[styles.text, { color, fontSize: sizeStyles.fontSize }]}>
        {league.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
