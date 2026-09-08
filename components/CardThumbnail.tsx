import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Lock } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { TowerIcon } from '@/components/TowerIcon';
import { MAX_CARD_LEVEL, TOWER_COSTS } from '@/game/constants';
import type { TowerType } from '@/game/constants';

interface CardThumbnailProps {
  cardId: string;
  category: 'tower' | 'orb' | 'ability' | 'towers' | 'orbs' | 'abilities';
  level: number;
  copies?: number;
  copiesNeeded?: number;
  selected?: boolean;
  selectedIndex?: number;
  locked?: boolean;
  onPress?: () => void;
  onInfo?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  tower: COLORS.primary,
  towers: COLORS.primary,
  orb: COLORS.accent,
  orbs: COLORS.accent,
  ability: COLORS.gold,
  abilities: COLORS.gold,
};

function isTowerType(id: string): id is TowerType {
  return [
    'blaster','vulcan','lancer','piercer','mortar','bouncer','glacier','pyre',
    'venom','siege','cryo','arc','tesla','boomerang','repulsor','magnet',
    'seeker','prism_lance','flak','harpoon','twin','orb_mortar','lava_mortar','detonator','burner',
  ].includes(id);
}

const TOWER_COST_MAP: Partial<Record<string, number>> = TOWER_COSTS as Record<string, number>;

export function CardThumbnail({
  cardId,
  category,
  level,
  copies,
  copiesNeeded,
  selected,
  selectedIndex,
  locked,
  onPress,
  onInfo,
}: CardThumbnailProps) {
  const color = CATEGORY_COLORS[category] ?? COLORS.primary;
  const displayName = cardId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const isMax = level >= MAX_CARD_LEVEL;
  const isTower = category === 'tower' || category === 'towers';
  const cost = TOWER_COST_MAP[cardId];

  return (
    <Pressable
      style={[
        styles.card,
        selected && styles.cardSelected,
        locked && styles.locked,
      ]}
      onPress={() => {
        console.log(`[CardThumbnail] Card pressed cardId=${cardId} category=${category} selected=${selected}`);
        onPress?.();
      }}
    >
      {/* Selected index badge */}
      {selected && selectedIndex !== undefined && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>{selectedIndex}</Text>
        </View>
      )}

      {/* Info button */}
      <Pressable
        style={styles.infoBtn}
        onPress={(e) => {
          e.stopPropagation();
          console.log(`[CardThumbnail] Info pressed cardId=${cardId}`);
          onInfo?.();
        }}
      >
        <Text style={styles.infoBtnText}>i</Text>
      </Pressable>

      {/* Icon area */}
      <View style={styles.iconArea}>
        {locked ? (
          <Lock size={24} color={COLORS.textTertiary} strokeWidth={2} />
        ) : isTower && isTowerType(cardId) ? (
          <TowerIcon type={cardId} size={52} selected={false} />
        ) : (
          <Text style={styles.emoji}>
            {category === 'orb' || category === 'orbs' ? '⚡' : category === 'ability' || category === 'abilities' ? '✨' : '🏰'}
          </Text>
        )}
      </View>

      {/* Name */}
      <Text style={[styles.name, locked && { color: COLORS.textTertiary }]} numberOfLines={1}>
        {displayName}
      </Text>

      {/* Cost */}
      {cost !== undefined && !locked && (
        <View style={styles.costRow}>
          <Text style={styles.costEmoji}>🪙</Text>
          <Text style={styles.costText}>{cost}</Text>
        </View>
      )}

      {/* Level dots */}
      {!locked && (
        <View style={styles.dotsRow}>
          {Array.from({ length: MAX_CARD_LEVEL }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i < level ? COLORS.coin : '#E2E8F0' },
              ]}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    position: 'relative',
    minHeight: 120,
  },
  cardSelected: {
    borderColor: COLORS.selectedBorder,
    borderWidth: 3,
  },
  locked: {
    opacity: 0.5,
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  infoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    fontStyle: 'italic',
  },
  iconArea: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  costEmoji: {
    fontSize: 10,
  },
  costText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.coin,
    fontFamily: 'SpaceMono',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
