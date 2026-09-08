import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  FlatList,
  Modal,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layers, Shield, Zap, Star, X, TrendingUp, Package } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CardThumbnail } from '@/components/CardThumbnail';
import { useProfile } from '@/contexts/ProfileContext';
import { TOWER_TYPES, ORB_TYPES, ABILITY_TYPES, MAX_CARD_LEVEL, CARD_COPIES_NEEDED } from '@/game/constants';
import { canLevelUp, getShardCost } from '@/game/progression';

type CollectionTab = 'towers' | 'orbs' | 'abilities';

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 35, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 35, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

const TAB_CONFIG: { key: CollectionTab; label: string }[] = [
  { key: 'towers', label: 'Towers' },
  { key: 'orbs', label: 'Orbs' },
  { key: 'abilities', label: 'Abilities' },
];

const CATEGORY_COLORS: Record<CollectionTab, string> = {
  towers: COLORS.primary,
  orbs: COLORS.accent,
  abilities: COLORS.gold,
};

const CARD_DESCRIPTIONS: Record<string, string> = {
  blaster: 'Fires rapid energy bolts at nearby orbs. Reliable all-rounder.',
  vulcan: 'High fire-rate minigun. Shreds fast orbs with sustained damage.',
  lancer: 'Charges up and fires a powerful piercing lance.',
  piercer: 'Shots pierce through multiple orbs in a line.',
  boomerang: 'Throws a boomerang that hits orbs on the way out and back.',
  mortar: 'Lobs explosive shells that deal area damage on impact.',
  bouncer: 'Fires bouncing projectiles that ricochet off walls.',
  glacier: 'Slows orbs with icy blasts, making them easier to destroy.',
  arc: 'Chains lightning between nearby orbs for multi-target damage.',
  pyre: 'Burns orbs over time with persistent fire damage.',
  normal: 'Standard orb with balanced stats. The backbone of any loadout.',
  fast: 'Moves at high speed. Hard to hit but fragile.',
  bomb: 'Explodes on death, dealing splash damage to nearby towers.',
  splitter: 'Splits into smaller orbs when destroyed.',
  tank: 'Heavily armored orb with massive HP. Slow but durable.',
  meteor: 'Calls down a meteor strike dealing massive area damage.',
  freeze: 'Freezes all enemy orbs in place for a few seconds.',
  rage: 'Doubles your coin income for a short duration.',
  shield: 'Grants your station a temporary damage shield.',
  overclock: 'Doubles all tower fire rates for a short burst.',
};

interface CardDetailModalProps {
  cardId: string | null;
  category: CollectionTab;
  onClose: () => void;
}

function CardDetailModal({ cardId, category, onClose }: CardDetailModalProps) {
  const { profile, updateProfile } = useProfile();
  if (!cardId) return null;

  const cardMap =
    category === 'towers'
      ? profile.tower_cards
      : category === 'orbs'
      ? profile.orb_cards
      : profile.ability_cards;

  const cardState = cardMap[cardId] ?? { level: 0, copies: 0, boughtCopies: 0 };
  const isMax = cardState.level >= MAX_CARD_LEVEL;
  const copiesNeeded = CARD_COPIES_NEEDED[cardState.level] ?? 999;
  const shardCost = getShardCost(cardState.level);
  const canLevel = canLevelUp(cardState);
  const canBuy = profile.shards >= shardCost && !isMax;
  const displayName = cardId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const description = CARD_DESCRIPTIONS[cardId] ?? 'A powerful card for your loadout.';
  const accentColor = CATEGORY_COLORS[category];

  const handleLevelUp = () => {
    console.log(`[Collection] Level up card cardId=${cardId} category=${category}`);
    const newState = {
      ...cardState,
      level: cardState.level + 1,
      copies: cardState.copies - copiesNeeded,
    };
    const key = category === 'towers' ? 'tower_cards' : category === 'orbs' ? 'orb_cards' : 'ability_cards';
    updateProfile({ [key]: { ...cardMap, [cardId]: newState } });
  };

  const handleBuyWithShards = () => {
    console.log(`[Collection] Buy copy with shards cardId=${cardId} cost=${shardCost}`);
    const newState = { ...cardState, copies: cardState.copies + 1, boughtCopies: cardState.boughtCopies + 1 };
    const key = category === 'towers' ? 'tower_cards' : category === 'orbs' ? 'orb_cards' : 'ability_cards';
    updateProfile({
      shards: profile.shards - shardCost,
      [key]: { ...cardMap, [cardId]: newState },
    });
  };

  const levelStars = Array.from({ length: MAX_CARD_LEVEL }, (_, i) => i < cardState.level);

  return (
    <Modal visible={!!cardId} transparent animationType="slide">
      <View style={detailStyles.overlay}>
        <View style={detailStyles.sheet}>
          <View style={detailStyles.handle} />

          <View style={detailStyles.header}>
            <View style={[detailStyles.iconWrap, { backgroundColor: `${accentColor}18` }]}>
              <Text style={detailStyles.iconEmoji}>
                {category === 'towers' ? '🏰' : category === 'orbs' ? '⚡' : '✨'}
              </Text>
            </View>
            <View style={detailStyles.headerInfo}>
              <Text style={detailStyles.cardName}>{displayName}</Text>
              <View style={detailStyles.starsRow}>
                {levelStars.map((filled, i) => (
                  <Star
                    key={i}
                    size={14}
                    color={filled ? COLORS.gold : COLORS.textTertiary}
                    fill={filled ? COLORS.gold : 'transparent'}
                    strokeWidth={2}
                  />
                ))}
              </View>
            </View>
            <AnimatedPressable style={detailStyles.closeBtn} onPress={onClose}>
              <X size={20} color={COLORS.textSecondary} strokeWidth={2} />
            </AnimatedPressable>
          </View>

          <Text style={detailStyles.description}>{description}</Text>

          <View style={detailStyles.statsRow}>
            <View style={detailStyles.statBox}>
              <Text style={[detailStyles.statVal, { color: accentColor }]}>
                {isMax ? 'MAX' : `L${cardState.level}`}
              </Text>
              <Text style={detailStyles.statLbl}>Level</Text>
            </View>
            <View style={detailStyles.statBox}>
              <Text style={detailStyles.statVal}>{cardState.copies}</Text>
              <Text style={detailStyles.statLbl}>Copies</Text>
            </View>
            <View style={detailStyles.statBox}>
              <Text style={detailStyles.statVal}>{isMax ? '—' : String(copiesNeeded)}</Text>
              <Text style={detailStyles.statLbl}>Needed</Text>
            </View>
          </View>

          {!isMax && (
            <View style={detailStyles.progressSection}>
              <View style={detailStyles.progressLabelRow}>
                <Text style={detailStyles.progressLabel}>
                  {cardState.copies}/{copiesNeeded} copies to level up
                </Text>
              </View>
              <View style={detailStyles.progressTrack}>
                <View
                  style={[
                    detailStyles.progressFill,
                    {
                      width: `${Math.min(100, Math.round((cardState.copies / copiesNeeded) * 100))}%`,
                      backgroundColor: accentColor,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          <View style={detailStyles.actions}>
            <AnimatedPressable
              style={[detailStyles.actionBtn, !canLevel && detailStyles.actionBtnDisabled]}
              onPress={handleLevelUp}
              disabled={!canLevel}
            >
              <TrendingUp size={18} color={canLevel ? '#0A0E1A' : COLORS.textTertiary} strokeWidth={2} />
              <Text style={[detailStyles.actionBtnText, !canLevel && { color: COLORS.textTertiary }]}>
                Level Up
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[detailStyles.shardBtn, !canBuy && detailStyles.actionBtnDisabled]}
              onPress={handleBuyWithShards}
              disabled={!canBuy}
            >
              <Text style={detailStyles.shardEmoji}>💜</Text>
              <Text style={[detailStyles.shardBtnText, !canBuy && { color: COLORS.textTertiary }]}>
                {shardCost} shards
              </Text>
            </AnimatedPressable>
          </View>

          <View style={detailStyles.shardsRow}>
            <Text style={detailStyles.shardsLabel}>Your shards:</Text>
            <Text style={detailStyles.shardsValue}>{profile.shards.toLocaleString()} 💜</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textTertiary,
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 26,
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  cardName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontWeight: '400',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'SpaceMono',
  },
  statLbl: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  progressSection: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionBtnDisabled: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accentMuted,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: `${COLORS.accent}33`,
  },
  shardEmoji: {
    fontSize: 16,
  },
  shardBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent,
  },
  shardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shardsLabel: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  shardsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.shard,
  },
});

interface LoadoutSlotProps {
  cardId: string;
  category: CollectionTab;
  level: number;
  onPress: () => void;
}

function LoadoutSlot({ cardId, category, level, onPress }: LoadoutSlotProps) {
  const accentColor = CATEGORY_COLORS[category];
  const displayName = cardId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <AnimatedPressable style={[loadoutStyles.slot, { borderColor: `${accentColor}44` }]} onPress={onPress}>
      <View style={[loadoutStyles.slotIcon, { backgroundColor: `${accentColor}18` }]}>
        <Text style={loadoutStyles.slotEmoji}>
          {category === 'towers' ? '🏰' : category === 'orbs' ? '⚡' : '✨'}
        </Text>
      </View>
      <Text style={loadoutStyles.slotName} numberOfLines={1}>{displayName}</Text>
      <View style={[loadoutStyles.levelBadge, { backgroundColor: `${accentColor}22` }]}>
        <Text style={[loadoutStyles.levelText, { color: accentColor }]}>L{level}</Text>
      </View>
    </AnimatedPressable>
  );
}

const loadoutStyles = StyleSheet.create({
  slot: {
    width: 72,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
  },
  slotIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmoji: {
    fontSize: 18,
  },
  slotName: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '700',
  },
});

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<CollectionTab>('towers');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const handleTabChange = useCallback((tab: CollectionTab) => {
    console.log('[Collection] Tab changed', { tab });
    setActiveTab(tab);
  }, []);

  const handleCardPress = useCallback((cardId: string, category: CollectionTab) => {
    console.log('[Collection] Card pressed', { cardId, category });
    setSelectedCard(cardId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    console.log('[Collection] Card detail closed');
    setSelectedCard(null);
  }, []);

  const items = activeTab === 'towers'
    ? (TOWER_TYPES as readonly string[])
    : activeTab === 'orbs'
    ? (ORB_TYPES as readonly string[])
    : (ABILITY_TYPES as readonly string[]);

  const selectedItems = activeTab === 'towers'
    ? profile.selected_towers
    : activeTab === 'orbs'
    ? profile.selected_orbs
    : profile.selected_abilities;

  const unlockedItems = activeTab === 'towers'
    ? profile.unlocked_towers
    : activeTab === 'orbs'
    ? (ORB_TYPES.slice(0, 5) as readonly string[])
    : profile.unlocked_abilities;

  const cardMap = activeTab === 'towers'
    ? profile.tower_cards
    : activeTab === 'orbs'
    ? profile.orb_cards
    : profile.ability_cards;

  const accentColor = CATEGORY_COLORS[activeTab];

  const shardsDisplay = profile.shards.toLocaleString();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Layers size={22} color={COLORS.primary} strokeWidth={2} />
          <Text style={styles.screenTitle}>Collection</Text>
        </View>
        <View style={styles.shardsChip}>
          <Text style={styles.shardsEmoji}>💜</Text>
          <Text style={styles.shardsValue}>{shardsDisplay}</Text>
        </View>
      </View>

      {/* Loadout section */}
      <View style={styles.loadoutSection}>
        <Text style={styles.loadoutSectionTitle}>YOUR LOADOUT</Text>
        <View style={styles.loadoutRows}>
          {/* Towers row */}
          <View style={styles.loadoutRow}>
            <View style={styles.loadoutRowLabel}>
              <Shield size={13} color={COLORS.primary} strokeWidth={2} />
              <Text style={[styles.loadoutRowLabelText, { color: COLORS.primary }]}>Towers</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.loadoutScroll}>
              {profile.selected_towers.map((id) => (
                <LoadoutSlot
                  key={id}
                  cardId={id}
                  category="towers"
                  level={profile.tower_cards[id]?.level ?? 1}
                  onPress={() => { setActiveTab('towers'); handleCardPress(id, 'towers'); }}
                />
              ))}
            </ScrollView>
          </View>
          {/* Orbs row */}
          <View style={styles.loadoutRow}>
            <View style={styles.loadoutRowLabel}>
              <Zap size={13} color={COLORS.accent} strokeWidth={2} />
              <Text style={[styles.loadoutRowLabelText, { color: COLORS.accent }]}>Orbs</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.loadoutScroll}>
              {profile.selected_orbs.map((id) => (
                <LoadoutSlot
                  key={id}
                  cardId={id}
                  category="orbs"
                  level={profile.orb_cards[id]?.level ?? 1}
                  onPress={() => { setActiveTab('orbs'); handleCardPress(id, 'orbs'); }}
                />
              ))}
            </ScrollView>
          </View>
          {/* Abilities row */}
          <View style={styles.loadoutRow}>
            <View style={styles.loadoutRowLabel}>
              <Star size={13} color={COLORS.gold} strokeWidth={2} />
              <Text style={[styles.loadoutRowLabelText, { color: COLORS.gold }]}>Abilities</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.loadoutScroll}>
              {profile.selected_abilities.map((id) => (
                <LoadoutSlot
                  key={id}
                  cardId={id}
                  category="abilities"
                  level={profile.ability_cards[id]?.level ?? 1}
                  onPress={() => { setActiveTab('abilities'); handleCardPress(id, 'abilities'); }}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTab === tab.key;
          const tabColor = CATEGORY_COLORS[tab.key];
          return (
            <AnimatedPressable
              key={tab.key}
              style={[styles.tabBtn, isActive && { backgroundColor: `${tabColor}18`, borderColor: `${tabColor}33` }]}
              onPress={() => handleTabChange(tab.key)}
            >
              <Text style={[styles.tabLabel, isActive && { color: tabColor }]}>{tab.label}</Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {/* Card count */}
      <View style={styles.cardCountRow}>
        <Package size={14} color={COLORS.textTertiary} strokeWidth={2} />
        <Text style={styles.cardCountText}>
          {items.length} cards · {unlockedItems.length} unlocked
        </Text>
      </View>

      {/* Card grid */}
      <FlatList
        key={activeTab}
        data={items}
        keyExtractor={(item) => item}
        numColumns={3}
        contentContainerStyle={[styles.grid, { paddingBottom: 120 }]}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item, index }) => {
          const cardState = cardMap[item] ?? { level: 0, copies: 0, boughtCopies: 0 };
          const isUnlocked = unlockedItems.includes(item);
          const isSelected = selectedItems.includes(item);
          const copiesNeeded = CARD_COPIES_NEEDED[cardState.level] ?? 999;
          return (
            <AnimatedListItem index={index}>
              <CardThumbnail
                cardId={item}
                category={activeTab}
                level={isUnlocked ? Math.max(1, cardState.level) : 0}
                copies={cardState.copies}
                copiesNeeded={copiesNeeded}
                selected={isSelected}
                locked={!isUnlocked}
                onPress={() => handleCardPress(item, activeTab)}
              />
            </AnimatedListItem>
          );
        }}
      />

      <CardDetailModal
        cardId={selectedCard}
        category={activeTab}
        onClose={handleCloseDetail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  shardsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.shard}33`,
  },
  shardsEmoji: {
    fontSize: 14,
  },
  shardsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.shard,
    fontVariant: ['tabular-nums'],
  },
  loadoutSection: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 4,
  },
  loadoutSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1.2,
  },
  loadoutRows: {
    gap: 8,
  },
  loadoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadoutRowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 64,
    flexShrink: 0,
  },
  loadoutRowLabelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadoutScroll: {
    gap: 8,
    paddingRight: 4,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  cardCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  cardCountText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  grid: {
    paddingHorizontal: 16,
    gap: 10,
  },
  gridRow: {
    gap: 10,
    marginBottom: 10,
  },
});
