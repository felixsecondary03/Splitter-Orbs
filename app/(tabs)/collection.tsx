import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  TOWER_TYPES, ORB_TYPES, ABILITIES, SENDABLE_ORBS,
  CARD_COPIES_NEEDED, MAX_CARD_LEVEL, COPY_SHARD_COST_BY_RARITY,
  HAND_UPGRADE_COSTS, SIDE_TOWER_UPGRADE_COSTS, SIDE_TOWER_META_STATS,
  ORB_TROPHY_UNLOCKS, TOWER_TROPHY_UNLOCKS, ABILITY_TROPHY_UNLOCKS,
} from '@/game/constants';
import type { OrbType, TowerType } from '@/game/constants';

type LabTab = 'towers' | 'orbs' | 'powers' | 'upgrades';

const ABILITY_ICONS: Record<string, string> = {
  zap: '⚡', portal: '🌀', repair: '➕', freeze: '❄️', rage: '🔥',
  shield: '🛡️', burner: '🌋', meteor: '☄️', glue: '🟢', overclock: '⚙️',
  speed_zone: '💨', damage_zone: '💢', frost_zone: '🌨️', deep_freeze: '🧊',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b', mythical: '#ec4899',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

function getCardInfo(profile: any, kind: 'tower' | 'orb' | 'ability', id: string) {
  const cards = kind === 'tower' ? profile?.tower_cards : kind === 'ability' ? profile?.ability_cards : profile?.orb_cards;
  const card = (cards as Record<string, { level: number; copies: number; boughtCopies: number }>)?.[id] || { level: 0, copies: 0, boughtCopies: 0 };
  const level = card.level || 0;
  const copies = card.copies || 0;
  const boughtCopies = card.boughtCopies || 0;
  const needed = level < MAX_CARD_LEVEL ? (CARD_COPIES_NEEDED[level] ?? 0) : 0;
  const def = kind === 'tower' ? TOWER_TYPES[id as TowerType] : kind === 'ability' ? ABILITIES[id as any] : ORB_TYPES[id as OrbType];
  const rarity = (def as any)?.rarity || 'common';
  const copyShardCost = COPY_SHARD_COST_BY_RARITY[rarity] || 4;
  const buyable = level >= 1 && level < MAX_CARD_LEVEL ? Math.min(3, needed) : 0;
  const shards = profile?.shards || 0;
  const maxed = level >= MAX_CARD_LEVEL;
  const locked = level === 0;
  const canBuyCopy = !maxed && !locked && boughtCopies < buyable && shards >= copyShardCost;
  const canLevel = !maxed && !locked && copies >= needed;
  return { level, copies, needed, buyableCopies: buyable, boughtCopies, copyShardCost, rarity, canBuyCopy, canLevel, maxed, locked, shards };
}

function bucketCards(kind: 'tower' | 'orb' | 'ability', defs: any[], profile: any) {
  const starter: any[] = [];
  const trophy: any[] = [];
  const crate: any[] = [];
  const trophies = profile?.trophies || 0;

  for (const def of defs) {
    const info = getCardInfo(profile, kind, def.id);
    if (info.locked) {
      const trophyReq = kind === 'tower' ? (TOWER_TROPHY_UNLOCKS as any)[def.id] :
                        kind === 'orb' ? (ORB_TROPHY_UNLOCKS as any)[def.id] :
                        (ABILITY_TROPHY_UNLOCKS as any)[def.id];
      if (trophyReq && trophies < trophyReq) {
        trophy.push(def);
      } else {
        crate.push(def);
      }
    } else {
      starter.push(def);
    }
  }
  return { starter, trophy, crate };
}

export default function CollectionScreen() {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useProfile();
  const [tab, setTab] = useState<LabTab>('towers');
  const [busy, setBusy] = useState<string | null>(null);

  const shards = profile?.shards || 0;

  const handleLevelUp = async (category: string, id: string) => {
    console.log('[Lab] Level Up pressed:', category, id);
    if (!profile?.id) { Alert.alert('Sign in required'); return; }
    setBusy(id);
    try {
      console.log('[Lab] Invoking level-up-card', { category, cardId: id });
      const { error } = await supabase.functions.invoke('level-up-card', { body: { category, cardId: id } });
      if (error) throw error;
      console.log('[Lab] Level Up success:', id);
      await refreshProfile();
    } catch (e: unknown) {
      const msg = (e as Error)?.message;
      console.warn('[Lab] level-up-card error', msg);
      Alert.alert('Error', msg || 'Could not level up card');
    }
    setBusy(null);
  };

  const handleBuyCopy = async (category: string, id: string) => {
    console.log('[Lab] Buy Copy pressed:', category, id);
    if (!profile?.id) { Alert.alert('Sign in required'); return; }
    setBusy(id + '_buy');
    try {
      console.log('[Lab] Invoking buy-card-copy', { category, cardId: id });
      const { error } = await supabase.functions.invoke('buy-card-copy', { body: { category, cardId: id } });
      if (error) throw error;
      console.log('[Lab] Buy Copy success:', id);
      await refreshProfile();
    } catch (e: unknown) {
      const msg = (e as Error)?.message;
      console.warn('[Lab] buy-card-copy error', msg);
      Alert.alert('Error', msg || 'Could not buy copy');
    }
    setBusy(null);
  };

  const handleUpgradeMeta = async (type: 'hand' | 'side_tower') => {
    console.log('[Lab] Upgrade meta pressed:', type);
    if (!profile?.id) { Alert.alert('Sign in required'); return; }
    setBusy(type);
    try {
      const fn = type === 'hand' ? 'upgrade-hand' : 'upgrade-side-tower';
      console.log('[Lab] Invoking', fn);
      const { error } = await supabase.functions.invoke(fn, {});
      if (error) throw error;
      console.log('[Lab] Upgrade meta success:', type);
      await refreshProfile();
    } catch (e: unknown) {
      const msg = (e as Error)?.message;
      console.warn('[Lab] upgrade meta error', msg);
      Alert.alert('Error', msg || 'Could not upgrade');
    }
    setBusy(null);
  };

  const renderCard = (kind: 'tower' | 'orb' | 'ability', def: any) => {
    const info = getCardInfo(profile, kind, def.id);
    const { level, copies, needed, boughtCopies, buyableCopies, copyShardCost, rarity, canBuyCopy, canLevel, maxed, locked } = info;
    const rarityColor = RARITY_COLORS[rarity] || '#94a3b8';
    const isBusy = busy === def.id;
    const isBuyBusy = busy === def.id + '_buy';
    const category = kind === 'tower' ? 'tower_cards' : kind === 'ability' ? 'ability_cards' : 'orb_cards';

    let visual: React.ReactNode;
    if (kind === 'tower') {
      const towerLabel = def.name.slice(0, 2).toUpperCase();
      visual = (
        <View style={[styles.cardVisualBox, { backgroundColor: def.color + '33', borderColor: def.color }]}>
          <Text style={[styles.cardVisualText, { color: def.color }]}>{towerLabel}</Text>
        </View>
      );
    } else if (kind === 'orb') {
      visual = (
        <View style={[styles.orbCircle, { backgroundColor: def.color }]}>
          <Text style={styles.orbCircleText}>{def.hp}</Text>
        </View>
      );
    } else {
      const icon = ABILITY_ICONS[def.id] || '✨';
      visual = (
        <View style={[styles.abilityCircle, { backgroundColor: def.color + '33' }]}>
          <Text style={{ fontSize: 22 }}>{icon}</Text>
        </View>
      );
    }

    const progressPct = needed > 0 ? Math.min(1, copies / needed) : 1;
    const progressColor = progressPct >= 1 ? '#10b981' : '#94a3b8';
    const progressWidth = `${progressPct * 100}%` as any;

    const levelDotIndices = Array.from({ length: MAX_CARD_LEVEL }, (_, i) => i);

    return (
      <View key={def.id} style={[styles.card, locked && styles.cardLocked, maxed && styles.cardMaxed]}>
        <View style={styles.cardHeader}>
          {visual}
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{def.name}</Text>
            <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '22' }]}>
              <Text style={[styles.rarityText, { color: rarityColor }]}>{rarity}</Text>
            </View>
            <View style={styles.levelDots}>
              {levelDotIndices.map((i) => (
                <View key={i} style={[styles.levelDot, i < level ? styles.levelDotFilled : null]} />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          {locked ? (
            <Text style={styles.lockedText}>
              {kind === 'orb' && (ORB_TROPHY_UNLOCKS as any)[def.id]
                ? `🏆 ${(ORB_TROPHY_UNLOCKS as any)[def.id]} trophies`
                : kind === 'tower' && (TOWER_TROPHY_UNLOCKS as any)[def.id]
                ? `🏆 ${(TOWER_TROPHY_UNLOCKS as any)[def.id]} trophies`
                : kind === 'ability' && (ABILITY_TROPHY_UNLOCKS as any)[def.id]
                ? `🏆 ${(ABILITY_TROPHY_UNLOCKS as any)[def.id]} trophies`
                : '📦 Collect from crates'}
            </Text>
          ) : maxed ? (
            <View style={styles.maxBadge}>
              <Text style={styles.maxBadgeText}>⭐ MAX LEVEL</Text>
            </View>
          ) : (
            <>
              <View style={styles.copiesRow}>
                <Text style={styles.copiesLabel}>Copies</Text>
                <Text style={styles.copiesCount}>{copies}/{needed}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: progressWidth, backgroundColor: progressColor }]} />
              </View>
              {buyableCopies > 0 && (
                <Text style={styles.boughtText}>{boughtCopies}/{buyableCopies} bought</Text>
              )}
            </>
          )}
        </View>

        {!locked && (
          <View style={styles.cardAction}>
            {maxed ? null : canLevel ? (
              <TouchableOpacity
                style={styles.levelUpBtn}
                onPress={() => handleLevelUp(category, def.id)}
                disabled={!!isBusy}
              >
                {isBusy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.levelUpBtnText}>⭐ Level Up</Text>}
              </TouchableOpacity>
            ) : boughtCopies < buyableCopies ? (
              <TouchableOpacity
                style={[styles.buyBtn, !canBuyCopy && styles.buyBtnDisabled]}
                onPress={() => handleBuyCopy(category, def.id)}
                disabled={!!isBuyBusy || !canBuyCopy}
              >
                {isBuyBusy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[styles.buyBtnText, !canBuyCopy && styles.buyBtnTextDisabled]}>Buy Copy · 🔷 {copyShardCost}</Text>}
              </TouchableOpacity>
            ) : (
              <View style={styles.collectMoreBtn}>
                <Text style={styles.collectMoreText}>📦 Collect More</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderSection = (kind: 'tower' | 'orb' | 'ability', defs: any[]) => {
    const buckets = bucketCards(kind, defs, profile);
    const sections = [
      { key: 'starter' as const, label: 'Unlocked' },
      { key: 'trophy' as const, label: 'Trophy Unlock' },
      { key: 'crate' as const, label: 'From Crates' },
    ];
    return sections.map(({ key, label }) => {
      const list = buckets[key];
      if (!list.length) return null;
      return (
        <View key={key} style={styles.section}>
          <Text style={styles.sectionLabel}>{label}</Text>
          <View style={styles.cardGrid}>
            {list.map((def) => renderCard(kind, def))}
          </View>
        </View>
      );
    });
  };

  const renderUpgrades = () => {
    if (!profile) return null;
    const handLevel = profile.hand_level || 0;
    const sideTowerLevel = profile.side_tower_level || 0;
    const handMaxed = handLevel >= HAND_UPGRADE_COSTS.length;
    const sideTowerMaxed = sideTowerLevel >= SIDE_TOWER_UPGRADE_COSTS.length;
    const handCost = HAND_UPGRADE_COSTS[handLevel] || 0;
    const sideCost = SIDE_TOWER_UPGRADE_COSTS[sideTowerLevel] || 0;
    const handAffordable = !handMaxed && shards >= handCost;
    const sideAffordable = !sideTowerMaxed && shards >= sideCost;

    const maxClicks = 20 + handLevel * 2;
    const rechargeRaw = Math.max(0.1, 0.5 - handLevel * 0.04);
    const recharge = rechargeRaw.toFixed(2);
    const nextMaxClicks = 20 + (handLevel + 1) * 2;
    const nextRechargeRaw = Math.max(0.1, 0.5 - (handLevel + 1) * 0.04);
    const nextRecharge = nextRechargeRaw.toFixed(2);

    const curSide = SIDE_TOWER_META_STATS[sideTowerLevel] || SIDE_TOWER_META_STATS[0];
    const nextSide = SIDE_TOWER_META_STATS[sideTowerLevel + 1] || curSide;
    const curFireRate = curSide.fireRate.toFixed(2);

    const handPipIndices = Array.from({ length: 5 }, (_, i) => i);
    const sidePipIndices = Array.from({ length: 5 }, (_, i) => i);

    const handStatsText = `${maxClicks} clicks · ${recharge}s recharge`;
    const handNextText = `→ ${nextMaxClicks} · ${nextRecharge}s`;
    const sideStatsText = `HP ${curSide.hp} · DMG ${curSide.damage} · ${curFireRate}s`;
    const sideNextText = `→ HP ${nextSide.hp} · DMG ${nextSide.damage}`;

    return (
      <View style={styles.upgradesContainer}>
        <View style={[styles.upgradeCard, { borderColor: '#c4b5fd' }]}>
          <View style={styles.upgradeCardHeader}>
            <View style={[styles.upgradeIcon, { backgroundColor: '#8b5cf6' }]}>
              <Text style={{ fontSize: 24 }}>✋</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>Hand Upgrade</Text>
              <Text style={styles.upgradeDesc}>More clicks & faster recharge</Text>
            </View>
          </View>
          <View style={styles.levelPips}>
            {handPipIndices.map((i) => (
              <View key={i} style={[styles.levelPip, i < handLevel ? { backgroundColor: '#8b5cf6' } : { backgroundColor: '#e2e8f0' }]} />
            ))}
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsCurrent}>{handStatsText}</Text>
            {!handMaxed && <Text style={styles.statsNext}>{handNextText}</Text>}
          </View>
          {handMaxed ? (
            <View style={[styles.maxedBtn, { backgroundColor: '#ede9fe' }]}>
              <Text style={[styles.maxedBtnText, { color: '#7c3aed' }]}>MAX</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: handAffordable ? '#8b5cf6' : '#e2e8f0' }]}
              onPress={() => handleUpgradeMeta('hand')}
              disabled={busy === 'hand' || !handAffordable}
            >
              {busy === 'hand'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.upgradeBtnText, !handAffordable && { color: '#94a3b8' }]}>Upgrade · 🔷 {handCost}</Text>}
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.upgradeCard, { borderColor: '#a5f3fc' }]}>
          <View style={styles.upgradeCardHeader}>
            <View style={[styles.upgradeIcon, { backgroundColor: '#06b6d4' }]}>
              <Text style={{ fontSize: 24 }}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>Side Tower</Text>
              <Text style={styles.upgradeDesc}>Stronger defensive towers</Text>
            </View>
          </View>
          <View style={styles.levelPips}>
            {sidePipIndices.map((i) => (
              <View key={i} style={[styles.levelPip, i < sideTowerLevel ? { backgroundColor: '#06b6d4' } : { backgroundColor: '#e2e8f0' }]} />
            ))}
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsCurrent}>{sideStatsText}</Text>
            {!sideTowerMaxed && <Text style={styles.statsNext}>{sideNextText}</Text>}
          </View>
          {sideTowerMaxed ? (
            <View style={[styles.maxedBtn, { backgroundColor: '#cffafe' }]}>
              <Text style={[styles.maxedBtnText, { color: '#0891b2' }]}>MAX</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: sideAffordable ? '#06b6d4' : '#e2e8f0' }]}
              onPress={() => handleUpgradeMeta('side_tower')}
              disabled={busy === 'side_tower' || !sideAffordable}
            >
              {busy === 'side_tower'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.upgradeBtnText, !sideAffordable && { color: '#94a3b8' }]}>Upgrade · 🔷 {sideCost}</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const TABS: { id: LabTab; label: string }[] = [
    { id: 'towers', label: t('collection.towers') },
    { id: 'orbs', label: t('collection.orbs') },
    { id: 'powers', label: t('collection.powers') },
    { id: 'upgrades', label: t('collection.upgrades') },
  ];

  const towerDefs = Object.values(TOWER_TYPES);
  const orbDefs = SENDABLE_ORBS.map((id) => ORB_TYPES[id as OrbType]).filter(Boolean);
  const abilityDefs = Object.values(ABILITIES);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('collection.title')}</Text>
          <View style={styles.shardBadge}>
            <Text style={styles.shardBadgeText}>🔷 {shards}</Text>
          </View>
        </View>
        <Text style={styles.headerHint}>{t('collection.hint')}</Text>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tb) => {
          const isActive = tab === tb.id;
          return (
            <TouchableOpacity
              key={tb.id}
              onPress={() => {
                console.log('[Lab] Tab selected:', tb.id);
                setTab(tb.id);
              }}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{tb.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tab === 'towers' && renderSection('tower', towerDefs)}
        {tab === 'orbs' && renderSection('orb', orbDefs)}
        {tab === 'powers' && renderSection('ability', abilityDefs)}
        {tab === 'upgrades' && renderUpgrades()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#f8fafc' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  headerHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  shardBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  shardBadgeText: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, padding: 4, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e2e8f0', gap: 2 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#0f172a' },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 12,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardLocked: { opacity: 0.6 },
  cardMaxed: { borderColor: '#fbbf24' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardVisualBox: { width: 38, height: 38, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cardVisualText: { fontSize: 12, fontWeight: '700' },
  orbCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  orbCircleText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  abilityCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardHeaderInfo: { flex: 1 },
  cardName: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  rarityBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginBottom: 4 },
  rarityText: { fontSize: 9, fontWeight: '700' },
  levelDots: { flexDirection: 'row', gap: 3 },
  levelDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  levelDotFilled: { backgroundColor: '#f59e0b' },
  cardBody: { flex: 1, justifyContent: 'center', marginVertical: 4 },
  lockedText: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
  maxBadge: { alignItems: 'center', paddingVertical: 4 },
  maxBadgeText: { fontSize: 11, fontWeight: '800', color: '#d97706' },
  copiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  copiesLabel: { fontSize: 10, color: '#94a3b8' },
  copiesCount: { fontSize: 10, color: '#475569', fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#f1f5f9', overflow: 'hidden', marginBottom: 2 },
  progressFill: { height: '100%', borderRadius: 3 },
  boughtText: { fontSize: 9, color: '#94a3b8', textAlign: 'right' },
  cardAction: { marginTop: 8 },
  levelUpBtn: { paddingVertical: 8, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center' },
  levelUpBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  buyBtn: { paddingVertical: 8, borderRadius: 10, backgroundColor: '#84cc16', alignItems: 'center' },
  buyBtnDisabled: { backgroundColor: '#f1f5f9' },
  buyBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  buyBtnTextDisabled: { color: '#94a3b8' },
  collectMoreBtn: { paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  collectMoreText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  upgradesContainer: { gap: 12 },
  upgradeCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, padding: 20 },
  upgradeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  upgradeIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  upgradeTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  upgradeDesc: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  levelPips: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  levelPip: { flex: 1, height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statsCurrent: { fontSize: 12, fontWeight: '600', color: '#475569' },
  statsNext: { fontSize: 11, fontWeight: '700', color: '#10b981' },
  upgradeBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  upgradeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  maxedBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  maxedBtnText: { fontSize: 14, fontWeight: '800' },
});
