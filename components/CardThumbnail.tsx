import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { MAX_CARD_LEVEL } from '@/game/constants';

interface CardThumbnailProps {
  cardId: string;
  category: 'tower' | 'orb' | 'ability' | 'towers' | 'orbs' | 'abilities';
  level: number;
  copies?: number;
  copiesNeeded?: number;
  selected?: boolean;
  locked?: boolean;
  onPress?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  tower: COLORS.primary,
  towers: COLORS.primary,
  orb: COLORS.accent,
  orbs: COLORS.accent,
  ability: COLORS.gold,
  abilities: COLORS.gold,
};

const CATEGORY_EMOJIS: Record<string, string> = {
  tower: '🏰',
  towers: '🏰',
  orb: '⚡',
  orbs: '⚡',
  ability: '✨',
  abilities: '✨',
};

export function CardThumbnail({
  cardId,
  category,
  level,
  copies,
  copiesNeeded,
  selected,
  locked,
  onPress,
}: CardThumbnailProps) {
  const color = CATEGORY_COLORS[category] ?? COLORS.primary;
  const emoji = CATEGORY_EMOJIS[category] ?? '⚡';
  const displayName = cardId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const isMax = level >= MAX_CARD_LEVEL;
  const levelLabel = isMax ? 'MAX' : `L${level}`;

  return (
    <AnimatedPressable
      style={[
        styles.card,
        selected && { borderColor: color, borderWidth: 2 },
        locked && styles.locked,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconArea,
          { backgroundColor: locked ? COLORS.surfaceSecondary : `${color}18` },
        ]}
      >
        {locked ? (
          <Lock size={20} color={COLORS.textTertiary} strokeWidth={2} />
        ) : (
          <Text style={styles.emoji}>{emoji}</Text>
        )}
      </View>
      <Text
        style={[styles.name, locked && { color: COLORS.textTertiary }]}
        numberOfLines={2}
      >
        {displayName}
      </Text>
      <View
        style={[
          styles.levelBadge,
          {
            backgroundColor: locked
              ? COLORS.surfaceSecondary
              : isMax
              ? `${COLORS.gold}22`
              : `${color}22`,
          },
        ]}
      >
        <Text
          style={[
            styles.levelText,
            {
              color: locked
                ? COLORS.textTertiary
                : isMax
                ? COLORS.gold
                : color,
            },
          ]}
        >
          {levelLabel}
        </Text>
      </View>
      {copies !== undefined && copiesNeeded !== undefined && !locked && (
        <Text style={styles.copies}>
          {copies}/{copiesNeeded}
        </Text>
      )}
      {selected && !locked && (
        <View style={[styles.selectedDot, { backgroundColor: color }]} />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  locked: {
    opacity: 0.45,
  },
  iconArea: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  name: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 13,
  },
  levelBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  copies: {
    fontSize: 9,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  selectedDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
