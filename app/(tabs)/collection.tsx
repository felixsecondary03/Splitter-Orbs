import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Dimensions, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  TOWER_TYPES, ORB_TYPES, ABILITIES, SENDABLE_ORBS,
  CARD_COPIES_NEEDED, MAX_CARD_LEVEL, COPY_SHARD_COST_BY_RARITY,
  HAND_UPGRADE_COSTS, SIDE_TOWER_UPGRADE_COSTS, SIDE_TOWER_META_STATS,
  ORB_TROPHY_UNLOCKS, TOWER_TROPHY_UNLOCKS, ABILITY_TROPHY_UNLOCKS,
  getOrbStats,
} from '@/game/constants';
import type { OrbType, TowerType } from '@/game/constants';
import { STARTER_TOWERS, STARTER_ORBS, STARTER_ABILITIES } from '@/game/progression';
import { TowerIcon } from '@/components/TowerIcon';
import {
  ORB_PATTERNS, STATION_SKINS, TOWER_SKINS, EMBLEMS,
  EMBLEM_SLOTS, TOWER_SKIN_SLOTS, RARITIES, isSkinOwned,
} from '@/game/skins';

type LabTab = 'towers' | 'orbs' | 'powers' | 'skins' | 'upgrades';

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
const SKIN_CARD_WIDTH = (SCREEN_WIDTH - 52) / 3;

// ─── Card info helper ─────────────────────────────────────────────────────────
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

// ─── Bucketing ────────────────────────────────────────────────────────────────
function bucketCards(kind: 'tower' | 'orb' | 'ability', defs: any[], profile: any) {
  const starterIds = kind === 'tower' ? STARTER_TOWERS : kind === 'orb' ? STARTER_ORBS : STARTER_ABILITIES;
  const starter: any[] = [];
  const trophy: any[] = [];
  const crate: any[] = [];
  const locked: any[] = [];

  for (const def of defs) {
    const info = getCardInfo(profile, kind, def.id);
    if (info.locked) {
      locked.push(def);
    } else if (starterIds.includes(def.id)) {
      starter.push(def);
    } else {
      const trophyReq = kind === 'tower' ? (TOWER_TROPHY_UNLOCKS as any)[def.id] :
                        kind === 'orb' ? (ORB_TROPHY_UNLOCKS as any)[def.id] :
                        (ABILITY_TROPHY_UNLOCKS as any)[def.id];
      if (trophyReq) {
        trophy.push(def);
      } else {
        crate.push(def);
      }
    }
  }
  return { starter, trophy, crate, locked };
}

// ─── Skin sort helper ─────────────────────────────────────────────────────────
function sortedSkins(catalog: Record<string, any>) {
  return Object.values(catalog).sort((a, b) => {
    const aIsChest = a.source === 'chest' ? 1 : 0;
    const bIsChest = b.source === 'chest' ? 1 : 0;
    if (aIsChest !== bIsChest) return aIsChest - bIsChest;
    const aOrder = RARITIES[a.rarity]?.order ?? 0;
    const bOrder = RARITIES[b.rarity]?.order ?? 0;
    return aOrder - bOrder;
  });
}

// ─── Flip animation hook ──────────────────────────────────────────────────────
function useFlipAnim() {
  const animRef = useRef(new Animated.Value(0));
  const anim = animRef.current;
  const flipped = useRef(false);

  const flip = useCallback(() => {
    const toValue = flipped.current ? 0 : 1;
    flipped.current = !flipped.current;
    Animated.spring(anim, { toValue, useNativeDriver: true, friction: 8 }).start();
  }, [anim]);

  const frontOpacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
  const backOpacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return { flip, frontOpacity, backOpacity, frontRotate, backRotate };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CollectionScreen() {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useProfile();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<LabTab>('towers');
  const [busy, setBusy] = useState<string | null>(null);

  const seenCardsRef = useRef(new Set<string>());
  const [seenVersion, setSeenVersion] = useState(0);

  const shards = profile?.shards || 0;
  const gems = profile?.gems || 0;

  const markTabSeen = useCallback((newTab: LabTab) => {
    setTimeout(() => {
      const defs =
        newTab === 'towers' ? Object.values(TOWER_TYPES) :
        newTab === 'orbs' ? SENDABLE_ORBS.map((id) => ORB_TYPES[id as OrbType]).filter(Boolean) :
        newTab === 'powers' ? Object.values(ABILITIES) : [];
      let changed = false;
      for (const def of defs) {
        if (!seenCardsRef.current.has((def as any).id)) {
          seenCardsRef.current.add((def as any).id);
          changed = true;
        }
      }
      if (changed) setSeenVersion((v) => v + 1);
    }, 500);
  }, []);

  // ─── Edge function handlers ────────────────────────────────────────────────
  const handleLevelUp = async (category: string, id: string) => {
    console.log('[Lab] Level Up pressed:', category, id);
    if (!profile?.id) { Alert.alert('Sign in required'); return; }
    setBusy(id);
    const kind = category.replace('_cards', '') as 'tower' | 'orb' | 'ability';
    try {
      console.log('[Lab] Invoking level-up-card', { kind, id });
      const { error } = await supabase.functions.invoke('level-up-card', { body: { kind, id } });
      if (error) {
        console.warn('[Lab] level-up-card raw error', error?.context?.status, JSON.stringify(error?.context));
        throw error;
      }
      console.log('[Lab] Level Up success:', id);
      await refreshProfile();
    } catch (e: any) {
      const status = e?.context?.status ?? e?.status;
      const body = e?.context ? JSON.stringify(e.context) : e?.message;
      console.warn('[Lab] level-up-card error', status, body);
      Alert.alert('Error', e?.message || 'Could not level up card');
    }
    setBusy(null);
  };

  const handleBuyCopy = async (category: string, id: string) => {
    console.log('[Lab] Buy Copy pressed:', category, id);
    if (!profile?.id) { Alert.alert('Sign in required'); return; }
    setBusy(id + '_buy');
    const kind = category.replace('_cards', '') as 'tower' | 'orb' | 'ability';
    try {
      console.log('[Lab] Invoking buy-card-copy', { kind, id });
      const { error } = await supabase.functions.invoke('buy-card-copy', { body: { kind, id } });
      if (error) {
        console.warn('[Lab] buy-card-copy raw error', error?.context?.status, JSON.stringify(error?.context));
        throw error;
      }
      console.log('[Lab] Buy Copy success:', id);
      await refreshProfile();
    } catch (e: any) {
      const status = e?.context?.status ?? e?.status;
      const body = e?.context ? JSON.stringify(e.context) : e?.message;
      console.warn('[Lab] buy-card-copy error', status, body);
      Alert.alert('Error', e?.message || 'Could not buy copy');
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
      if (error) {
        console.warn('[Lab] upgrade meta raw error', error?.context?.status, JSON.stringify(error?.context));
        throw error;
      }
      console.log('[Lab] Upgrade meta success:', type);
      await refreshProfile();
    } catch (e: any) {
      const status = e?.context?.status ?? e?.status;
      const body = e?.context ? JSON.stringify(e.context) : e?.message;
      console.warn('[Lab] upgrade meta error', status, body);
      Alert.alert('Error', e?.message || 'Could not upgrade');
    }
    setBusy(null);
  };

  const handleEquipSkin = async (field: string, id: string) => {
    console.log('[Lab] Equip skin pressed:', field, id);
    setBusy(field + '_' + id);
    try {
      console.log('[Lab] Invoking equip-skin', { field, id });
      const { error } = await supabase.functions.invoke('equip-skin', { body: { field, id } });
      if (error) {
        console.warn('[Lab] equip-skin raw error', error?.context?.status, JSON.stringify(error?.context));
        throw error;
      }
      console.log('[Lab] Equip skin success:', field, id);
      await refreshProfile();
    } catch (e: any) {
      const status = e?.context?.status ?? e?.status;
      const body = e?.context ? JSON.stringify(e.context) : e?.message;
      console.warn('[Lab] equip-skin error', status, body);
      Alert.alert('Error', e?.message || 'Could not equip skin');
    }
    setBusy(null);
  };

  const handleBuySkin = async (skinId: string) => {
    console.log('[Lab] Buy skin pressed:', skinId);
    setBusy('buy_' + skinId);
    try {
      console.log('[Lab] Invoking buy-skin', { skinId });
      const { error } = await supabase.functions.invoke('buy-skin', { body: { skinId } });
      if (error) {
        console.warn('[Lab] buy-skin raw error', error?.context?.status, JSON.stringify(error?.context));
        throw error;
      }
      console.log('[Lab] Buy skin success:', skinId);
      await refreshProfile();
    } catch (e: any) {
      const status = e?.context?.status ?? e?.status;
      const body = e?.context ? JSON.stringify(e.context) : e?.message;
      console.warn('[Lab] buy-skin error', status, body);
      Alert.alert('Error', e?.message || 'Could not buy skin');
    }
    setBusy(null);
  };

  // ─── Card renderer ─────────────────────────────────────────────────────────
  const renderCard = (kind: 'tower' | 'orb' | 'ability', def: any) => {
    return <FlippableCard key={def.id} kind={kind} def={def} profile={profile} busy={busy} seenVersion={seenVersion} seenCardsRef={seenCardsRef} onLevelUp={handleLevelUp} onBuyCopy={handleBuyCopy} t={t} />;
  };

  const renderSection = (kind: 'tower' | 'orb' | 'ability', defs: any[]) => {
    const buckets = bucketCards(kind, defs, profile);
    const sections = [
      { key: 'starter' as const, label: t('collection.sectionStarter') },
      { key: 'trophy' as const, label: t('collection.sectionTrophy') },
      { key: 'crate' as const, label: t('collection.sectionCrate') },
      { key: 'locked' as const, label: t('collection.sectionLocked') },
    ];
    return sections.map(({ key, label }) => {
      const list = buckets[key];
      if (!list.length) return null;
      return (
        <View key={key} style={styles.section}>
          <Text style={styles.sectionLabel}>{label}</Text>
          <View style={styles.cardGrid}>
            {list.map((d: any) => renderCard(kind, d))}
          </View>
        </View>
      );
    });
  };

  // ─── Upgrades tab ──────────────────────────────────────────────────────────
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

    const handTitle = '👆 Hand Speed';
    const sideTowerTitle = '🏰 Side Towers';

    return (
      <View style={styles.upgradesContainer}>
        {/* Hand upgrade card */}
        <View style={styles.upgradeCard}>
          <View style={styles.upgradeCardHeader}>
            <Text style={styles.upgradeTitle}>{handTitle}</Text>
            <Text style={styles.upgradeLevel}>Level {handLevel}/5</Text>
          </View>
          <Text style={styles.upgradeDesc}>More clicks &amp; faster recharge</Text>
          <View style={styles.levelPips}>
            {handPipIndices.map((i) => (
              <View key={i} style={[styles.levelPip, i < handLevel ? styles.levelPipFilled : styles.levelPipEmpty]} />
            ))}
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsCurrent}>{handStatsText}</Text>
            {!handMaxed && <Text style={styles.statsNext}>{handNextText}</Text>}
          </View>
          {handMaxed ? (
            <View style={styles.maxedBtn}>
              <Text style={styles.maxedBtnText}>MAX</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeBtn, !handAffordable && styles.upgradeBtnDisabled]}
              onPress={() => handleUpgradeMeta('hand')}
              disabled={busy === 'hand' || !handAffordable}
            >
              {busy === 'hand'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.upgradeBtnText, !handAffordable && styles.upgradeBtnTextDisabled]}>Upgrade · 🔷 {handCost}</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Side tower upgrade card */}
        <View style={styles.upgradeCard}>
          <View style={styles.upgradeCardHeader}>
            <Text style={styles.upgradeTitle}>{sideTowerTitle}</Text>
            <Text style={styles.upgradeLevel}>Level {sideTowerLevel}/5</Text>
          </View>
          <Text style={styles.upgradeDesc}>Stronger defensive towers</Text>
          <View style={styles.levelPips}>
            {sidePipIndices.map((i) => (
              <View key={i} style={[styles.levelPip, i < sideTowerLevel ? styles.levelPipFilledCyan : styles.levelPipEmpty]} />
            ))}
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsCurrent}>{sideStatsText}</Text>
            {!sideTowerMaxed && <Text style={styles.statsNext}>{sideNextText}</Text>}
          </View>
          {sideTowerMaxed ? (
            <View style={[styles.maxedBtn, styles.maxedBtnCyan]}>
              <Text style={[styles.maxedBtnText, styles.maxedBtnTextCyan]}>MAX</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeBtn, styles.upgradeBtnCyan, !sideAffordable && styles.upgradeBtnDisabled]}
              onPress={() => handleUpgradeMeta('side_tower')}
              disabled={busy === 'side_tower' || !sideAffordable}
            >
              {busy === 'side_tower'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.upgradeBtnText, !sideAffordable && styles.upgradeBtnTextDisabled]}>Upgrade · 🔷 {sideCost}</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ─── Skins tab ─────────────────────────────────────────────────────────────
  const renderSkinCard = (skin: any, equippedField: string) => {
    const owned = isSkinOwned(profile, '', skin.id) || skin.source === 'default';
    const isEquipped = (profile as any)?.[equippedField] === skin.id;
    const rarityColor = RARITIES[skin.rarity]?.color || '#94a3b8';
    const accentColor = skin.accent || skin.trim || (skin.body && skin.body[0]) || '#94a3b8';
    const isBusyEquip = busy === equippedField + '_' + skin.id;
    const isBusyBuy = busy === 'buy_' + skin.id;

    return (
      <View key={skin.id} style={styles.skinCard}>
        <View style={styles.skinSwatchRow}>
          <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
          <View style={[styles.accentSwatch, { backgroundColor: accentColor }]} />
        </View>
        <Text style={styles.skinName} numberOfLines={1}>{skin.name}</Text>
        <Text style={[styles.skinRarityLabel, { color: rarityColor }]}>{skin.rarity}</Text>

        {owned ? (
          <TouchableOpacity
            style={[styles.skinEquipBtn, isEquipped && styles.skinEquipBtnActive]}
            onPress={() => {
              console.log('[Lab] Equip skin tapped:', equippedField, skin.id);
              handleEquipSkin(equippedField, skin.id);
            }}
            disabled={!!isBusyEquip || isEquipped}
          >
            {isBusyEquip
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={[styles.skinEquipBtnText, isEquipped && styles.skinEquipBtnTextActive]}>
                  {isEquipped ? '✓ On' : 'Equip'}
                </Text>}
          </TouchableOpacity>
        ) : skin.source === 'chest' ? (
          <View style={styles.skinChestLabel}>
            <Text style={styles.skinChestLabelText}>📦 Chest</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.skinBuyBtn}
            onPress={() => {
              console.log('[Lab] Buy skin tapped:', skin.id, 'price:', skin.price);
              handleBuySkin(skin.id);
            }}
            disabled={!!isBusyBuy}
          >
            {isBusyBuy
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.skinBuyBtnText}>
                  {skin.price === 0 ? 'Free' : `💎 ${skin.price}`}
                </Text>}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSkinsTab = () => {
    const sortedOrbs = sortedSkins(ORB_PATTERNS);
    const sortedStation = sortedSkins(STATION_SKINS);
    const sortedTower = sortedSkins(TOWER_SKINS);
    const sortedEmblems = sortedSkins(EMBLEMS);

    return (
      <View>
        <Text style={styles.sectionLabel}>Orb Patterns</Text>
        <View style={styles.skinGrid}>
          {sortedOrbs.map((skin) => renderSkinCard(skin, 'equipped_orb_pattern'))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Station Skins</Text>
        <View style={styles.skinGrid}>
          {sortedStation.map((skin) => renderSkinCard(skin, 'equipped_station_skin'))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Emblems</Text>
        {EMBLEM_SLOTS.map((slot) => (
          <View key={slot.id} style={styles.slotSection}>
            <Text style={styles.slotLabel}>{slot.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotScroll}>
              {sortedEmblems.map((skin) => renderSkinCard(skin, slot.field))}
            </ScrollView>
          </View>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Tower Skins</Text>
        {TOWER_SKIN_SLOTS.map((slot) => (
          <View key={slot.id} style={styles.slotSection}>
            <Text style={styles.slotLabel}>{slot.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotScroll}>
              {sortedTower.map((skin) => renderSkinCard(skin, slot.field))}
            </ScrollView>
          </View>
        ))}
      </View>
    );
  };

  // ─── Tab bar ───────────────────────────────────────────────────────────────
  const TABS: { id: LabTab; label: string }[] = [
    { id: 'towers', label: t('collection.towers') },
    { id: 'orbs', label: t('collection.orbs') },
    { id: 'powers', label: t('collection.powers') },
    { id: 'skins', label: 'Skins' },
    { id: 'upgrades', label: t('collection.upgrades') },
  ];

  const towerDefs = Object.values(TOWER_TYPES);
  const orbDefs = SENDABLE_ORBS.map((id) => ORB_TYPES[id as OrbType]).filter(Boolean);
  const abilityDefs = Object.values(ABILITIES);

  const paddingTop = insets.top + 40;

  return (
    <View style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('collection.title')}</Text>
          <View style={styles.shardBadge}>
            <CountUp from={0} to={shards} />
          </View>
        </View>
        <Text style={styles.headerHint}>{t('collection.hint')}</Text>

        {/* Tab bar */}
        <View style={[styles.tabBar, { top: insets.top + 8 }]}>
          {TABS.map((tb) => {
            const isActive = tab === tb.id;
            return (
              <TouchableOpacity
                key={tb.id}
                onPress={() => {
                  console.log('[Lab] Tab selected:', tb.id);
                  setTab(tb.id);
                  markTabSeen(tb.id);
                }}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              >
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{tb.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        <View style={styles.tabContent}>
          {tab === 'towers' && renderSection('tower', towerDefs)}
          {tab === 'orbs' && renderSection('orb', orbDefs)}
          {tab === 'powers' && renderSection('ability', abilityDefs)}
          {tab === 'skins' && renderSkinsTab()}
          {tab === 'upgrades' && renderUpgrades()}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Flippable card component ─────────────────────────────────────────────────
interface FlippableCardProps {
  kind: 'tower' | 'orb' | 'ability';
  def: any;
  profile: any;
  busy: string | null;
  seenVersion: number;
  seenCardsRef: React.MutableRefObject<Set<string>>;
  onLevelUp: (category: string, id: string) => void;
  onBuyCopy: (category: string, id: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

// ─── ConfettiBurst component ──────────────────────────────────────────────────
function ConfettiBurst({ trigger }: { trigger: number }) {
  const COLORS_CONF = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  const animsRef = useRef(COLORS_CONF.map(() => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(0),
  })));
  const anims = animsRef.current;

  useEffect(() => {
    if (trigger === 0) return;
    const animations = anims.map((a, i) => {
      const angle = (i / anims.length) * 2 * Math.PI;
      const dist = 40 + Math.random() * 20;
      a.x.setValue(0);
      a.y.setValue(0);
      a.opacity.setValue(1);
      return Animated.parallel([
        Animated.timing(a.x, { toValue: Math.cos(angle) * dist, duration: 600, useNativeDriver: true }),
        Animated.timing(a.y, { toValue: Math.sin(angle) * dist, duration: 600, useNativeDriver: true }),
        Animated.timing(a.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]);
    });
    Animated.parallel(animations).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (trigger === 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: COLORS_CONF[i],
            transform: [{ translateX: a.x }, { translateY: a.y }],
            opacity: a.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ─── CountUp component ────────────────────────────────────────────────────────
function CountUp({ from, to }: { from: number; to: number }) {
  const animRef = useRef(new Animated.Value(from));
  const anim = animRef.current;
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    anim.setValue(from);
    Animated.timing(anim, { toValue: to, duration: 600, useNativeDriver: false }).start();
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  return <Text style={styles.shardBadgeText}>🔷 {display}</Text>;
}

function FlippableCard({ kind, def, profile, busy, seenVersion, seenCardsRef, onLevelUp, onBuyCopy, t }: FlippableCardProps) {
  const { flip, frontOpacity, backOpacity, frontRotate, backRotate } = useFlipAnim();
  const info = getCardInfo(profile, kind, def.id);
  const { level, copies, needed, boughtCopies, buyableCopies, copyShardCost, rarity, canBuyCopy, canLevel, maxed, locked } = info;
  const rarityColor = RARITY_COLORS[rarity] || '#94a3b8';
  const isBusy = busy === def.id;
  const isBuyBusy = busy === def.id + '_buy';
  const category = kind === 'tower' ? 'tower_cards' : kind === 'ability' ? 'ability_cards' : 'orb_cards';
  const isNew = !seenCardsRef.current.has(def.id);

  // ── Animations ──
  const auraPulseRef = useRef(new Animated.Value(0.4));
  const shimmerXRef = useRef(new Animated.Value(-40));
  const levelBtnScaleRef = useRef(new Animated.Value(1));
  const newBadgeScaleRef = useRef(new Animated.Value(1));
  const shakeXRef = useRef(new Animated.Value(0));
  const auraPulse = auraPulseRef.current;
  const shimmerX = shimmerXRef.current;
  const levelBtnScale = levelBtnScaleRef.current;
  const newBadgeScale = newBadgeScaleRef.current;
  const shakeX = shakeXRef.current;
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  useEffect(() => {
    if (level >= 1) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(auraPulse, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
          Animated.timing(auraPulse, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerX, { toValue: CARD_WIDTH + 40, duration: 1800, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canLevel) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(levelBtnScale, { toValue: 1.04, duration: 600, useNativeDriver: true }),
          Animated.timing(levelBtnScale, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLevel]);

  useEffect(() => {
    if (isNew && !locked) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(newBadgeScale, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(newBadgeScale, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, locked]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const orbStats = kind === 'orb' && level >= 1 ? getOrbStats(def.id, level) : null;
  const orbStatsNext = kind === 'orb' && level >= 1 && level < MAX_CARD_LEVEL ? getOrbStats(def.id, level + 1) : null;

  const isTower = kind === 'tower';
  const isOrb = kind === 'orb';
  const canFlip = isTower || isOrb;

  let visual: React.ReactNode;
  if (kind === 'tower') {
    visual = <TowerIcon type={def.id as any} size={38} level={level} />;
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

  // Orb stats text
  const orbStatsText = orbStats ? `HP ${orbStats.hp} · SPD ${orbStats.speed} · DMG ${orbStats.damage}` : '';
  const orbStatsNextHp = orbStatsNext ? String(orbStatsNext.hp) : '';
  const orbStatsNextSpd = orbStatsNext ? String(orbStatsNext.speed) : '';
  const orbStatsNextDmg = orbStatsNext ? String(orbStatsNext.damage) : '';

  // Back face content
  const backContent = kind === 'orb' && orbStats ? (
    <View style={styles.backStats}>
      <Text style={styles.backStatsTitle}>Lv {level} Stats</Text>
      <View style={styles.backStatRow}>
        <Text style={styles.backStatLabel}>HP</Text>
        <Text style={styles.backStatValue}>{orbStats.hp}</Text>
        {orbStatsNext && <Text style={styles.backStatNext}>→{orbStatsNext.hp}</Text>}
      </View>
      <View style={styles.backStatRow}>
        <Text style={styles.backStatLabel}>SPD</Text>
        <Text style={styles.backStatValue}>{orbStats.speed}</Text>
        {orbStatsNext && <Text style={styles.backStatNext}>→{orbStatsNext.speed}</Text>}
      </View>
      <View style={styles.backStatRow}>
        <Text style={styles.backStatLabel}>DMG</Text>
        <Text style={styles.backStatValue}>{orbStats.damage}</Text>
        {orbStatsNext && <Text style={styles.backStatNext}>→{orbStatsNext.damage}</Text>}
      </View>
    </View>
  ) : kind === 'tower' ? (
    <View style={styles.backStats}>
      <Text style={styles.backStatsTitle}>Tower Info</Text>
      <View style={styles.backStatRow}>
        <Text style={styles.backStatLabel}>DMG</Text>
        <Text style={styles.backStatValue}>{def.damage}</Text>
      </View>
      <View style={styles.backStatRow}>
        <Text style={styles.backStatLabel}>RNG</Text>
        <Text style={styles.backStatValue}>{def.range}</Text>
      </View>
      <View style={styles.backStatRow}>
        <Text style={styles.backStatLabel}>Rate</Text>
        <Text style={styles.backStatValue}>{def.fireRate}s</Text>
      </View>
    </View>
  ) : (
    <View style={styles.backStats}>
      <Text style={styles.backStatsTitle}>Ability</Text>
      <View style={styles.backStatRow}>
        <Text style={styles.backStatLabel}>CD</Text>
        <Text style={styles.backStatValue}>{def.cooldown}s</Text>
      </View>
      <Text style={[styles.backStatLabel, { marginTop: 4 }]}>{def.rarity}</Text>
    </View>
  );

  const trophyReq = kind === 'tower' ? (TOWER_TROPHY_UNLOCKS as any)[def.id] :
                    kind === 'orb' ? (ORB_TROPHY_UNLOCKS as any)[def.id] :
                    (ABILITY_TROPHY_UNLOCKS as any)[def.id];
  const lockText = trophyReq
    ? t('collection.trophyLock', { n: trophyReq })
    : t('collection.crateLock');

  const copiesLabel = t('collection.copies') || 'Copies';
  const levelUpLabel = t('collection.levelUp') || 'Level Up';
  const buyCopyLabel = t('collection.buyCopy') || 'Buy Copy';
  const collectMoreLabel = t('collection.collectMore') || 'Collect More';
  const maxLevelLabel = t('collection.maxLevel') || 'MAX LEVEL';

  return (
    <Animated.View
      style={[
        styles.card,
        locked && styles.cardLocked,
        maxed && styles.cardMaxed,
        level >= 1 && { borderColor: rarityColor },
        { transform: [{ translateX: shakeX }] },
      ]}
    >
      {/* Rarity aura pulse border */}
      {level >= 1 && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 16,
              borderWidth: 2,
              borderColor: rarityColor,
              opacity: auraPulse,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Confetti burst */}
      <ConfettiBurst trigger={confettiTrigger} />

      {/* NEW badge */}
      {isNew && !locked && (
        <Animated.View style={[styles.newBadge, { transform: [{ scale: newBadgeScale }] }]}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </Animated.View>
      )}

      {/* Front face */}
      <Animated.View
        style={[
          styles.cardFace,
          { transform: [{ rotateY: frontRotate }], opacity: frontOpacity },
        ]}
      >
        {/* Shimmer sweep */}
        <Animated.View
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmerX }] },
          ]}
          pointerEvents="none"
        />
        {/* Info button (top-right, only for towers/orbs) */}
        {canFlip && !locked && (
          <TouchableOpacity
            onPress={() => { console.log('[Lab] Card flip tapped:', def.id); flip(); }}
            style={styles.infoBtn}
          >
            <Text style={styles.infoBtnText}>i</Text>
          </TouchableOpacity>
        )}

        {/* Header row */}
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

        {/* Bottom section */}
        <View style={styles.cardBottom}>
          {locked ? (
            <Text style={styles.lockedText}>{lockText}</Text>
          ) : maxed ? (
            <>
              {isOrb && orbStats && (
                <Text style={styles.orbStatsMaxed}>{orbStatsText}</Text>
              )}
              <View style={styles.maxBadge}>
                <Text style={styles.maxBadgeText}>⭐ {maxLevelLabel}</Text>
              </View>
            </>
          ) : (
            <>
              {isOrb && orbStats && (
                <View style={styles.orbStatsRow}>
                  <Text style={styles.orbStatsCurrent}>
                    {'HP '}
                  </Text>
                  <Text style={styles.orbStatsCurrent}>{orbStats.hp}</Text>
                  {orbStatsNext && <Text style={styles.orbStatsNextVal}>→{orbStatsNextHp}</Text>}
                  <Text style={styles.orbStatsCurrent}>{' · SPD '}</Text>
                  <Text style={styles.orbStatsCurrent}>{orbStats.speed}</Text>
                  {orbStatsNext && <Text style={styles.orbStatsNextVal}>→{orbStatsNextSpd}</Text>}
                  <Text style={styles.orbStatsCurrent}>{' · DMG '}</Text>
                  <Text style={styles.orbStatsCurrent}>{orbStats.damage}</Text>
                  {orbStatsNext && <Text style={styles.orbStatsNextVal}>→{orbStatsNextDmg}</Text>}
                </View>
              )}
              {/* Copies progress */}
              <View style={styles.copiesRow}>
                <Text style={styles.copiesLabel}>{copiesLabel}</Text>
                <Text style={styles.copiesCount}>{copies}/{needed}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: progressWidth, backgroundColor: progressColor }]} />
              </View>
              {buyableCopies > 0 && (
                <Text style={styles.boughtText}>{boughtCopies}/{buyableCopies} bought</Text>
              )}
              {/* Action button */}
              <View style={styles.cardAction}>
                {canLevel ? (
                  <Animated.View style={{ transform: [{ scale: levelBtnScale }] }}>
                    <TouchableOpacity
                      style={styles.levelUpBtn}
                      onPress={() => {
                        console.log('[Lab] Level Up tapped:', def.id);
                        onLevelUp(category, def.id);
                        setConfettiTrigger((v) => v + 1);
                      }}
                      disabled={!!isBusy}
                    >
                      {isBusy
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.levelUpBtnText}>⭐ {levelUpLabel}</Text>}
                    </TouchableOpacity>
                  </Animated.View>
                ) : boughtCopies < buyableCopies ? (
                  <TouchableOpacity
                    style={[styles.buyBtn, !canBuyCopy && styles.buyBtnDisabled]}
                    onPress={() => {
                      console.log('[Lab] Buy Copy tapped:', def.id);
                      if (!canBuyCopy) { triggerShake(); return; }
                      onBuyCopy(category, def.id);
                    }}
                    disabled={!!isBuyBusy}
                  >
                    {isBuyBusy
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={[styles.buyBtnText, !canBuyCopy && styles.buyBtnTextDisabled]}>🔷 {copyShardCost} {buyCopyLabel}</Text>}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.collectMoreBtn}>
                    <Text style={styles.collectMoreText}>📦 {collectMoreLabel}</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </Animated.View>

      {/* Back face */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.cardFaceBack,
          { transform: [{ rotateY: backRotate }], opacity: backOpacity },
        ]}
      >
        {backContent}
        <TouchableOpacity
          onPress={() => { console.log('[Lab] Card flip back tapped:', def.id); flip(); }}
          style={styles.infoBtnBack}
        >
          <Text style={styles.infoBtnText}>✕</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 30, fontWeight: '900', color: '#0f172a' },
  headerHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 16 },
  shardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f7fee7',
    borderWidth: 1,
    borderColor: '#bef264',
  },
  shardBadgeText: { fontSize: 13, fontWeight: '700', color: '#65a30d' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    gap: 2,
    zIndex: 10,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#0f172a' },
  tabBtnText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#fff' },

  tabContent: {},

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 200,
    overflow: 'hidden',
  },
  cardLocked: { opacity: 0.6 },
  cardMaxed: { borderColor: '#fbbf24' },
  cardFace: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    minHeight: 200,
  },
  cardFaceBack: {
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  orbCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  orbCircleText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  abilityCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardHeaderInfo: { flex: 1 },
  cardName: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  rarityBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginBottom: 4 },
  rarityText: { fontSize: 8, fontWeight: '700' },
  levelDots: { flexDirection: 'row', gap: 3 },
  levelDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  levelDotFilled: { backgroundColor: '#f59e0b' },

  // Shimmer
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ skewX: '-15deg' }],
    zIndex: 1,
  },

  // Info button
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
    zIndex: 5,
  },
  infoBtnBack: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: { fontSize: 11, fontWeight: '900', color: '#64748b' },

  // NEW badge
  newBadge: {
    position: 'absolute', top: 6, left: 6, zIndex: 10,
    backgroundColor: '#ef4444', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  newBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff' },

  // Bottom section
  cardBottom: { flex: 1, justifyContent: 'flex-end' },
  lockedText: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'center', paddingVertical: 12 },
  maxBadge: { alignItems: 'center', paddingVertical: 8 },
  maxBadgeText: { fontSize: 11, fontWeight: '800', color: '#f59e0b' },
  orbStatsMaxed: { fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 4 },
  orbStatsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 6 },
  orbStatsCurrent: { fontSize: 10, color: '#64748b' },
  orbStatsNextVal: { fontSize: 10, color: '#10b981', fontWeight: '700' },

  copiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  copiesLabel: { fontSize: 10, color: '#94a3b8' },
  copiesCount: { fontSize: 10, color: '#475569', fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#f1f5f9', overflow: 'hidden', marginBottom: 2 },
  progressFill: { height: '100%', borderRadius: 3 },
  boughtText: { fontSize: 9, color: '#94a3b8', textAlign: 'right', marginTop: 2 },
  cardAction: { marginTop: 8 },
  levelUpBtn: { paddingVertical: 8, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center' },
  levelUpBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  buyBtn: { paddingVertical: 8, borderRadius: 10, backgroundColor: '#84cc16', alignItems: 'center' },
  buyBtnDisabled: { backgroundColor: '#f1f5f9' },
  buyBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  buyBtnTextDisabled: { color: '#94a3b8' },
  collectMoreBtn: { paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  collectMoreText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },

  // Back face stats
  backStats: { alignItems: 'center', gap: 4 },
  backStatsTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' },
  backStatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backStatLabel: { fontSize: 10, color: '#64748b', width: 32, textAlign: 'right' },
  backStatValue: { fontSize: 13, fontWeight: '700', color: '#f1f5f9', width: 36 },
  backStatNext: { fontSize: 10, color: '#10b981', fontWeight: '600' },

  // Upgrades
  upgradesContainer: { gap: 12 },
  upgradeCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 20,
  },
  upgradeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  upgradeTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  upgradeLevel: { fontSize: 12, color: '#94a3b8' },
  upgradeDesc: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  levelPips: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  levelPip: { flex: 1, height: 8, borderRadius: 4 },
  levelPipFilled: { backgroundColor: '#10b981' },
  levelPipFilledCyan: { backgroundColor: '#06b6d4' },
  levelPipEmpty: { backgroundColor: '#e2e8f0' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statsCurrent: { fontSize: 12, fontWeight: '600', color: '#475569' },
  statsNext: { fontSize: 11, fontWeight: '700', color: '#10b981' },
  upgradeBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#10b981',
  },
  upgradeBtnCyan: { backgroundColor: '#06b6d4' },
  upgradeBtnDisabled: { backgroundColor: '#e2e8f0' },
  upgradeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  upgradeBtnTextDisabled: { color: '#94a3b8' },
  maxedBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  maxedBtnCyan: { backgroundColor: '#ecfeff' },
  maxedBtnText: { fontSize: 14, fontWeight: '800', color: '#10b981' },
  maxedBtnTextCyan: { color: '#0891b2' },

  // Skins
  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skinCard: {
    width: SKIN_CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 8,
    alignItems: 'center',
    gap: 4,
  },
  skinSwatchRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 2 },
  rarityDot: { width: 10, height: 10, borderRadius: 5 },
  accentSwatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#e2e8f0' },
  skinName: { fontSize: 10, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  skinRarityLabel: { fontSize: 8, fontWeight: '600', textTransform: 'uppercase' },
  skinEquipBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#e2e8f0', marginTop: 2 },
  skinEquipBtnActive: { backgroundColor: '#10b981' },
  skinEquipBtnText: { fontSize: 9, fontWeight: '700', color: '#475569' },
  skinEquipBtnTextActive: { color: '#fff' },
  skinChestLabel: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: '#f1f5f9', marginTop: 2 },
  skinChestLabelText: { fontSize: 9, color: '#94a3b8', fontWeight: '600' },
  skinBuyBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#3b82f6', marginTop: 2 },
  skinBuyBtnText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  slotSection: { marginBottom: 12 },
  slotLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6 },
  slotScroll: { gap: 8, paddingRight: 16 },
});
