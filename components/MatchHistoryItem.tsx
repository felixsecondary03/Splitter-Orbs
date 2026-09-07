import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy, Clock, Swords } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';

interface MatchHistoryItemProps {
  opponentName: string;
  result: 'win' | 'loss' | 'draw';
  trophyChange: number;
  coinsEarned: number;
  timeAgo: string;
  mode: string;
}

export function MatchHistoryItem({
  opponentName,
  result,
  trophyChange,
  coinsEarned,
  timeAgo,
  mode,
}: MatchHistoryItemProps) {
  const isWin = result === 'win';
  const isDraw = result === 'draw';
  const resultColor = isWin ? COLORS.success : isDraw ? COLORS.warning : COLORS.danger;
  const resultBg = isWin
    ? 'rgba(34,197,94,0.12)'
    : isDraw
    ? 'rgba(245,158,11,0.12)'
    : 'rgba(239,68,68,0.12)';
  const resultLabel = isWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS';
  const trophySign = trophyChange > 0 ? '+' : '';
  const trophyLabel = `${trophySign}${trophyChange}`;
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

  return (
    <View style={styles.row}>
      <View style={[styles.resultBadge, { backgroundColor: resultBg }]}>
        <Text style={[styles.resultText, { color: resultColor }]}>{resultLabel}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Swords size={12} color={COLORS.textTertiary} strokeWidth={2} />
          <Text style={styles.opponent} numberOfLines={1}>
            {opponentName}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={11} color={COLORS.textTertiary} strokeWidth={2} />
          <Text style={styles.meta}>{timeAgo}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{modeLabel}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.trophyRow}>
          <Trophy size={12} color={COLORS.gold} strokeWidth={2} />
          <Text style={[styles.trophyChange, { color: resultColor }]}>{trophyLabel}</Text>
        </View>
        <Text style={styles.coins}>+{coinsEarned} 🪙</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 52,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  opponent: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  trophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trophyChange: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
    fontVariant: ['tabular-nums'],
  },
  coins: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
