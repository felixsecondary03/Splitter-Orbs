import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { TowerIcon } from '@/components/TowerIcon';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/utils/supabase';
import {
  TOWER_TYPES,
  ORB_TYPES,
  ABILITIES,
  COPY_SHARD_COST_BY_RARITY,
  CARD_COPIES_NEEDED,
  HAND_UPGRADE_COSTS,
  SIDE_TOWER_UPGRADE_COSTS,
} from '@/game/constants';
import type { TowerType, OrbType, AbilityType } from '@/game/constants';

type LabTab = 'towers' | 'orbs' | 'abilities' | 'upgrades';

const LAB_TABS: { key: LabTab; label: string }[] = [
  { key: 'towers', label: 'Towers' },
  { key: 'orbs', label: 'Orbs' },
  { key: 'abilities', label: 'Abilities' },
  { key: 'upgrades', label: 'Upgrades' },
];

const RARITY_COLORS: Record<string, { bg: string; text: string }> = {
  common:    { bg: '#f1f5f9', text: '#64748b' },
  rare:      { bg: '#eff6ff', text: '#1d4ed8' },
  epic:      { bg: '#faf5ff', text: '#7c3aed' },
  legendary: { bg: '#fffbeb', text: '#b45309' },
  mythical:  { bg: '#fff1f2', text: '#be123c' },
};

const ABILITY_EMOJIS: Record<AbilityType, string> = {
  zap: '⚡', portal: '🌀', repair: '🔧', freeze: '❄️', rage: '🔥',
  shield: '🛡️', burner: '🔥', meteor: '☄️', glue: '🟢', overclock: '⚙️',
  speed_zone: '💨', damage_zone: '💥', frost_zone: '🧊', deep_freeze: '🌨️',
};

function RarityBadge({ rarity }: { rarity: string }) {
  const colors = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
  const label = rarity.charAt(0).toUpperCase() + rarity.slice(1);
  return (
    <View style={[styles.rarityBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.rarityBadgeText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function LevelDots({ level, max = 5 }: { level: number; max?: number }) {
  return (
    <View style={styles.levelDots}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={[styles.levelDot, i < level ? styles.levelDotFilled : styles.levelDotEmpty]}
        />
      ))}
    </View>
  );
}

interface CardData {
  id: string;
  name: string;
  rarity: string;
  level: number;
  copies: number;
  boughtCopies: number;
  copiesNeeded: number;
  shardCost: number;
  kind: 'tower' | 'orb' | 'ability';
}

export default function LabScreen() {
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<LabTab>('towers');
  const [loadingCard, setLoadingCard] = useState<string | null>(null);
  const [loadingUpgrade, setLoadingUpgrade] = useState<string | null>(null);

  const shardsDisplay = (profile.shards ?? 0).toLocaleString();

  const getCardData = useCallback((kind: 'tower' | 'orb' | 'ability'): CardData[] => {
    if (kind === 'tower') {
      return (Object.keys(TOWER_TYPES) as TowerType[]).map((id) => {
        const def = TOWER_TYPES[id];
        const cardInfo = profile.tower_cards?.[id] ?? { level: 0, copies: 0, boughtCopies: 0 };
        const level = cardInfo.level ?? 0;
        const copies = cardInfo.copies ?? 0;
        const boughtCopies = cardInfo.boughtCopies ?? 0;
        const copiesNeeded = CARD_COPIES_NEEDED[level] ?? 999;
        const shardCost = COPY_SHARD_COST_BY_RARITY[def.rarity] ?? 4;
        return { id, name: def.name, rarity: def.rarity, level, copies, boughtCopies, copiesNeeded, shardCost, kind };
      });
    }
    if (kind === 'orb') {
      return (Object.keys(ORB_TYPES) as OrbType[]).map((id) => {
        const def = ORB_TYPES[id];
        const cardInfo = profile.orb_cards?.[id] ?? { level: 0, copies: 0, boughtCopies: 0 };
        const level = cardInfo.level ?? 0;
        const copies = cardInfo.copies ?? 0;
        const boughtCopies = cardInfo.boughtCopies ?? 0;
        const copiesNeeded = CARD_COPIES_NEEDED[level] ?? 999;
        const shardCost = COPY_SHARD_COST_BY_RARITY[def.rarity] ?? 4;
        return { id, name: def.name, rarity: def.rarity, level, copies, boughtCopies, copiesNeeded, shardCost, kind };
      });
    }
    // ability
    return (Object.keys(ABILITIES) as AbilityType[]).map((id) => {
      const def = ABILITIES[id];
      const cardInfo = profile.ability_cards?.[id] ?? { level: 0, copies: 0, boughtCopies: 0 };
      const level = cardInfo.level ?? 0;
      const copies = cardInfo.copies ?? 0;
      const boughtCopies = cardInfo.boughtCopies ?? 0;
      const copiesNeeded = CARD_COPIES_NEEDED[level] ?? 999;
      const shardCost = COPY_SHARD_COST_BY_RARITY[def.rarity] ?? 4;
      return { id, name: def.name, rarity: def.rarity, level, copies, boughtCopies, copiesNeeded, shardCost, kind };
    });
  }, [profile]);

  const handleLevelUp = useCallback(async (card: CardData) => {
    if (loadingCard) return;
    console.log(`[Lab] Level Up pressed: ${card.kind}/${card.id} (level ${card.level})`);
    setLoadingCard(card.id);
    try {
      const { data, error } = await supabase.functions.invoke('level-up-card', {
        body: { kind: card.kind, cardId: card.id },
      });
      if (error || data?.error) {
        console.warn('[Lab] level-up-card error', error?.message ?? data?.error);
        Alert.alert('Error', data?.error ?? error?.message ?? 'Something went wrong');
        return;
      }
      console.log('[Lab] level-up-card success', data);
      await refreshProfile();
    } catch (e) {
      console.warn('[Lab] level-up-card exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoadingCard(null);
    }
  }, [loadingCard, refreshProfile]);

  const handleBuyCopy = useCallback(async (card: CardData) => {
    if (loadingCard) return;
    console.log(`[Lab] Buy Copy pressed: ${card.kind}/${card.id} (cost ${card.shardCost}🔷)`);
    if ((profile.shards ?? 0) < card.shardCost) {
      Alert.alert('Not enough shards', `You need ${card.shardCost} shards.`);
      return;
    }
    setLoadingCard(card.id);
    try {
      const { data, error } = await supabase.functions.invoke('buy-card-copy', {
        body: { kind: card.kind, cardId: card.id },
      });
      if (error || data?.error) {
        console.warn('[Lab] buy-card-copy error', error?.message ?? data?.error);
        Alert.alert('Error', data?.error ?? error?.message ?? 'Something went wrong');
        return;
      }
      console.log('[Lab] buy-card-copy success', data);
      await refreshProfile();
    } catch (e) {
      console.warn('[Lab] buy-card-copy exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoadingCard(null);
    }
  }, [loadingCard, profile.shards, refreshProfile]);

  const handleUpgradeHand = useCallback(async () => {
    if (loadingUpgrade) return;
    const level = profile.hand_level ?? 0;
    const cost = HAND_UPGRADE_COSTS[level];
    console.log(`[Lab] Upgrade Hand pressed (level ${level}, cost ${cost}🔷)`);
    if (cost === undefined) {
      Alert.alert('Max level', 'Hand is already at max level.');
      return;
    }
    if ((profile.shards ?? 0) < cost) {
      Alert.alert('Not enough shards', `You need ${cost} shards.`);
      return;
    }
    setLoadingUpgrade('hand');
    try {
      const { data, error } = await supabase.functions.invoke('upgrade-hand', {});
      if (error || data?.error) {
        console.warn('[Lab] upgrade-hand error', error?.message ?? data?.error);
        Alert.alert('Error', data?.error ?? error?.message ?? 'Something went wrong');
        return;
      }
      console.log('[Lab] upgrade-hand success', data);
      await refreshProfile();
    } catch (e) {
      console.warn('[Lab] upgrade-hand exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoadingUpgrade(null);
    }
  }, [loadingUpgrade, profile.hand_level, profile.shards, refreshProfile]);

  const handleUpgradeSideTower = useCallback(async () => {
    if (loadingUpgrade) return;
    const level = profile.side_tower_level ?? 0;
    const cost = SIDE_TOWER_UPGRADE_COSTS[level];
    console.log(`[Lab] Upgrade Side Tower pressed (level ${level}, cost ${cost}🔷)`);
    if (cost === undefined) {
      Alert.alert('Max level', 'Side Towers are already at max level.');
      return;
    }
    if ((profile.shards ?? 0) < cost) {
      Alert.alert('Not enough shards', `You need ${cost} shards.`);
      return;
    }
    setLoadingUpgrade('side_tower');
    try {
      const { data, error } = await supabase.functions.invoke('upgrade-side-tower', {});
      if (error || data?.error) {
        console.warn('[Lab] upgrade-side-tower error', error?.message ?? data?.error);
        Alert.alert('Error', data?.error ?? error?.message ?? 'Something went wrong');
        return;
      }
      console.log('[Lab] upgrade-side-tower success', data);
      await refreshProfile();
    } catch (e) {
      console.warn('[Lab] upgrade-side-tower exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoadingUpgrade(null);
    }
  }, [loadingUpgrade, profile.side_tower_level, profile.shards, refreshProfile]);

  const renderCardGrid = useCallback((kind: 'tower' | 'orb' | 'ability') => {
    const cards = getCardData(kind);
    const starterCards = cards.filter((c) => c.level > 0 || c.copies > 0);
    const allCards = cards;

    return (
      <View style={styles.cardSection}>
        <Text style={styles.sectionLabel}>STARTER CARDS</Text>
        <View style={styles.cardGrid}>
          {allCards.map((card) => {
            const isMax = card.level >= 5;
            const canLevelUp = !isMax && card.copies >= card.copiesNeeded;
            const isLoading = loadingCard === card.id;

            return (
              <View key={card.id} style={styles.cardItem}>
                {/* Icon */}
                <View style={styles.cardIconArea}>
                  {kind === 'tower' ? (
                    <TowerIcon type={card.id as TowerType} size={36} level={card.level} />
                  ) : kind === 'orb' ? (
                    <View style={[styles.orbCircle, { backgroundColor: ORB_TYPES[card.id as OrbType]?.color ?? '#60a5fa' }]}>
                      <Text style={styles.orbHpText}>{ORB_TYPES[card.id as OrbType]?.hp ?? '?'}</Text>
                    </View>
                  ) : (
                    <Text style={styles.abilityEmoji}>{ABILITY_EMOJIS[card.id as AbilityType] ?? '✨'}</Text>
                  )}
                </View>

                {/* Info button */}
                <Pressable
                  style={styles.infoBtn}
                  onPress={() => console.log(`[Lab] Info pressed: ${card.kind}/${card.id}`)}
                >
                  <Text style={styles.infoBtnText}>i</Text>
                </Pressable>

                {/* Name + rarity */}
                <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
                <RarityBadge rarity={card.rarity} />

                {/* Level dots */}
                <LevelDots level={card.level} />

                {/* Copies progress */}
                {!isMax && (
                  <View style={styles.copiesSection}>
                    <View style={styles.copiesBarTrack}>
                      <View
                        style={[
                          styles.copiesBarFill,
                          { width: `${Math.min(100, (card.copies / card.copiesNeeded) * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.copiesLabel}>
                      Copies {card.copies}/{card.copiesNeeded}
                    </Text>
                    <Text style={styles.boughtLabel}>
                      Bought {card.boughtCopies}/3
                    </Text>
                  </View>
                )}

                {/* Action button */}
                {isMax ? (
                  <View style={styles.maxBadge}>
                    <Text style={styles.maxBadgeText}>MAX</Text>
                  </View>
                ) : canLevelUp ? (
                  <AnimatedPressable
                    style={[styles.actionBtn, styles.levelUpBtn]}
                    onPress={() => handleLevelUp(card)}
                    disabled={isLoading || loadingCard !== null}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionBtnText}>Level Up ✓</Text>
                    )}
                  </AnimatedPressable>
                ) : (
                  <AnimatedPressable
                    style={[
                      styles.actionBtn,
                      styles.buyBtn,
                      (profile.shards ?? 0) < card.shardCost && styles.actionBtnDisabled,
                    ]}
                    onPress={() => handleBuyCopy(card)}
                    disabled={isLoading || loadingCard !== null || card.boughtCopies >= 3}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionBtnText}>Buy 🔷{card.shardCost}</Text>
                    )}
                  </AnimatedPressable>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }, [getCardData, loadingCard, profile.shards, handleLevelUp, handleBuyCopy]);

  const handLevel = profile.hand_level ?? 0;
  const sideTowerLevel = profile.side_tower_level ?? 0;
  const handCost = HAND_UPGRADE_COSTS[handLevel];
  const sideTowerCost = SIDE_TOWER_UPGRADE_COSTS[sideTowerLevel];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Lab</Text>
          <View style={styles.shardPill}>
            <Text style={styles.shardPillText}>🔷 {shardsDisplay}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Upgrade your cards to unlock their full potential</Text>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          {LAB_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tabPill, activeTab === tab.key && styles.tabPillActive]}
              onPress={() => {
                console.log(`[Lab] Tab selected: ${tab.key}`);
                setActiveTab(tab.key);
              }}
            >
              <Text style={[styles.tabPillText, activeTab === tab.key && styles.tabPillTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'towers' && renderCardGrid('tower')}
        {activeTab === 'orbs' && renderCardGrid('orb')}
        {activeTab === 'abilities' && renderCardGrid('ability')}

        {activeTab === 'upgrades' && (
          <View style={styles.upgradesSection}>
            {/* Hand upgrade */}
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeIconArea}>
                <Text style={styles.upgradeIcon}>👆</Text>
              </View>
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeName}>Click Stamina</Text>
                <Text style={styles.upgradeLevel}>Level {handLevel}/5</Text>
                <LevelDots level={handLevel} />
              </View>
              {handLevel >= 5 ? (
                <View style={styles.maxBadge}>
                  <Text style={styles.maxBadgeText}>MAX</Text>
                </View>
              ) : (
                <AnimatedPressable
                  style={[
                    styles.upgradeBtn,
                    (profile.shards ?? 0) < (handCost ?? 0) && styles.actionBtnDisabled,
                  ]}
                  onPress={handleUpgradeHand}
                  disabled={loadingUpgrade !== null || (profile.shards ?? 0) < (handCost ?? 0)}
                >
                  {loadingUpgrade === 'hand' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.upgradeBtnText}>🔷{handCost}</Text>
                  )}
                </AnimatedPressable>
              )}
            </View>

            {/* Side tower upgrade */}
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeIconArea}>
                <Text style={styles.upgradeIcon}>🏰</Text>
              </View>
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeName}>Side Towers</Text>
                <Text style={styles.upgradeLevel}>Level {sideTowerLevel}/5</Text>
                <LevelDots level={sideTowerLevel} />
              </View>
              {sideTowerLevel >= 5 ? (
                <View style={styles.maxBadge}>
                  <Text style={styles.maxBadgeText}>MAX</Text>
                </View>
              ) : (
                <AnimatedPressable
                  style={[
                    styles.upgradeBtn,
                    (profile.shards ?? 0) < (sideTowerCost ?? 0) && styles.actionBtnDisabled,
                  ]}
                  onPress={handleUpgradeSideTower}
                  disabled={loadingUpgrade !== null || (profile.shards ?? 0) < (sideTowerCost ?? 0)}
                >
                  {loadingUpgrade === 'side_tower' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.upgradeBtnText}>🔷{sideTowerCost}</Text>
                  )}
                </AnimatedPressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  shardPill: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  shardPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5b21b6',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginTop: -4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
    gap: 2,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: '#1e293b',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  cardSection: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  cardItem: {
    width: '50%',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  cardIconArea: {
    alignItems: 'center',
    marginBottom: 4,
  },
  infoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  orbCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbHpText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  abilityEmoji: {
    fontSize: 32,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  levelDots: {
    flexDirection: 'row',
    gap: 4,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelDotFilled: {
    backgroundColor: '#f59e0b',
  },
  levelDotEmpty: {
    backgroundColor: '#e2e8f0',
  },
  copiesSection: {
    width: '100%',
    gap: 3,
    alignItems: 'center',
  },
  copiesBarTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  copiesBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  copiesLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  boughtLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
  },
  actionBtn: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  levelUpBtn: {
    backgroundColor: '#22c55e',
  },
  buyBtn: {
    backgroundColor: '#22c55e',
  },
  actionBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  maxBadge: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  maxBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  upgradesSection: {
    gap: 12,
  },
  upgradeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  upgradeIconArea: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  upgradeIcon: {
    fontSize: 24,
  },
  upgradeInfo: {
    flex: 1,
    gap: 4,
  },
  upgradeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  upgradeLevel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  upgradeBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    minHeight: 40,
  },
  upgradeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
