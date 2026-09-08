import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, TrendingUp, Info } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { TowerIcon } from '@/components/TowerIcon';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/utils/supabase';
import {
  TOWER_TYPES, ORB_TYPES, ABILITY_TYPES,
  MAX_CARD_LEVEL, CARD_COPIES_NEEDED,
} from '@/game/constants';
import type { TowerType } from '@/game/constants';
import { canLevelUp, getShardCost } from '@/game/progression';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LabTab = 'towers' | 'orbs' | 'abilities' | 'skins' | 'upgrades';

const LAB_TABS: { key: LabTab; label: string }[] = [
  { key: 'towers', label: 'Türme' },
  { key: 'orbs', label: 'Orbs' },
  { key: 'abilities', label: 'Kräfte' },
  { key: 'skins', label: 'Skins' },
  { key: 'upgrades', label: 'Upgrades' },
];

// ─── Starter cards ────────────────────────────────────────────────────────────
const STARTER_TOWER_IDS = ['blaster', 'vulcan', 'piercer', 'mortar', 'bouncer', 'glacier', 'pyre', 'venom'];
const STARTER_ORB_IDS = ['normal', 'fast', 'bomb', 'splitter', 'tank'];
const STARTER_ABILITY_IDS = ['meteor', 'freeze', 'rage', 'shield', 'overclock'];

const TROPHY_TOWER_IDS = TOWER_TYPES.filter((t) => !STARTER_TOWER_IDS.includes(t));
const TROPHY_ORB_IDS = ORB_TYPES.filter((o) => !STARTER_ORB_IDS.includes(o));
const TROPHY_ABILITY_IDS = ABILITY_TYPES.filter((a) => !STARTER_ABILITY_IDS.includes(a));

// ─── Display names ────────────────────────────────────────────────────────────
const TOWER_NAMES: Record<string, string> = {
  blaster: 'Blaster', vulcan: 'Vulcan', lancer: 'Lancer', piercer: 'Piercer',
  boomerang: 'Bouncer', mortar: 'Mortar', bouncer: 'Bouncer', glacier: 'Glacier',
  arc: 'Arc', pyre: 'Pyre', venom: 'Venom', siege: 'Siege',
  orb_mortar: 'Orb Mortar', lava_mortar: 'Lava Mortar', repulsor: 'Repulsor',
  cryo: 'Kryo-Kanone', seeker: 'Seeker', prism_lance: 'Prism Lance',
  flak: 'Flak', harpoon: 'Harpoon', twin: 'Twin', tesla: 'Tesla',
  detonator: 'Detonator', magnet: 'Magnet',
};

const ORB_NAMES: Record<string, string> = {
  normal: 'Normal', fast: 'Fast', bomb: 'Bomb', splitter: 'Splitter', tank: 'Tank',
  carrier: 'Carrier', sprint: 'Sprint', swarmer: 'Swarmer', shielder: 'Shielder',
  healer: 'Healer', radioactive: 'Radioactive', shadow: 'Shadow', ice: 'Ice',
  fog: 'Fog', zap: 'Zap', armored: 'Armored', growth: 'Growth',
  shield_bubble: 'Shield', berserker: 'Berserker', phantom: 'Phantom',
  leech: 'Leech', summoner: 'Summoner', mine: 'Mine',
};

const ABILITY_NAMES: Record<string, string> = {
  meteor: 'Meteor', freeze: 'Freeze', rage: 'Rage', shield: 'Shield',
  overclock: 'Overclock', glue: 'Glue', zone: 'Zone', portal: 'Portal', burner: 'Burner',
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

const RARITY_LABELS: Record<number, string> = { 0: 'Common', 1: 'Common', 2: 'Rare', 3: 'Rare', 4: 'Epic', 5: 'Epic' };
const RARITY_COLORS: Record<string, string> = { Common: '#64748B', Rare: '#3B82F6', Epic: '#8B5CF6' };

// ─── Shard prices per copy ────────────────────────────────────────────────────
const COPY_SHARD_PRICE = 4;

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 40, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Card Detail Modal ────────────────────────────────────────────────────────
function CardDetailModal({
  cardId, category, onClose,
}: {
  cardId: string | null; category: LabTab; onClose: () => void;
}) {
  const { profile, refreshProfile } = useProfile();
  const [levelingUp, setLevelingUp] = useState(false);
  const [buyingCopy, setBuyingCopy] = useState(false);

  if (!cardId) return null;

  const cardMap =
    category === 'towers' ? profile.tower_cards
    : category === 'orbs' ? profile.orb_cards
    : profile.ability_cards;

  const cardState = cardMap[cardId] ?? { level: 0, copies: 0, boughtCopies: 0 };
  const isMax = cardState.level >= MAX_CARD_LEVEL;
  const copiesNeeded = CARD_COPIES_NEEDED[cardState.level] ?? 999;
  const shardCost = getShardCost(cardState.level);
  const canLevel = canLevelUp(cardState);
  const canBuy = profile.shards >= shardCost && !isMax;
  const displayName = cardId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const description = CARD_DESCRIPTIONS[cardId] ?? 'A powerful card for your loadout.';

  const handleLevelUp = async () => {
    console.log(`[Lab] Level up card pressed cardId=${cardId} category=${category}`);
    setLevelingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('level-up-card', {
        body: { kind: category, cardId },
      });
      if (error) {
        console.warn('[Lab] level-up-card error', error.message);
        Alert.alert('Error', (data as Record<string, unknown> | null)?.error as string || 'Something went wrong');
        return;
      }
      const errCode = (data as Record<string, unknown> | null)?.error as string | undefined;
      if (errCode) {
        Alert.alert('Error', errCode || 'Something went wrong');
        return;
      }
      if (data?.success) {
        console.log('[Lab] level-up-card success', data);
        await refreshProfile();
      }
    } catch (e) {
      console.warn('[Lab] level-up-card exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLevelingUp(false);
    }
  };

  const handleBuyWithShards = async () => {
    console.log(`[Lab] Buy copy with shards pressed cardId=${cardId} cost=${shardCost}`);
    setBuyingCopy(true);
    try {
      const { data, error } = await supabase.functions.invoke('buy-card-copy', {
        body: { kind: category, cardId },
      });
      if (error) {
        console.warn('[Lab] buy-card-copy error', error.message);
        Alert.alert('Error', (data as Record<string, unknown> | null)?.error as string || 'Something went wrong');
        return;
      }
      const errCode = (data as Record<string, unknown> | null)?.error as string | undefined;
      if (errCode) {
        Alert.alert('Error', errCode || 'Something went wrong');
        return;
      }
      if (data?.success) {
        console.log('[Lab] buy-card-copy success', data);
        await refreshProfile();
      }
    } catch (e) {
      console.warn('[Lab] buy-card-copy exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setBuyingCopy(false);
    }
  };

  return (
    <Modal visible={!!cardId} transparent animationType="slide">
      <View style={detailStyles.overlay}>
        <View style={detailStyles.sheet}>
          <View style={detailStyles.handle} />
          <View style={detailStyles.header}>
            <Text style={detailStyles.cardName}>{displayName}</Text>
            <AnimatedPressable style={detailStyles.closeBtn} onPress={onClose}>
              <X size={20} color={COLORS.textSecondary} strokeWidth={2} />
            </AnimatedPressable>
          </View>
          <Text style={detailStyles.description}>{description}</Text>
          <View style={detailStyles.actions}>
            <AnimatedPressable
              style={[detailStyles.actionBtn, (!canLevel || levelingUp) && detailStyles.actionBtnDisabled]}
              onPress={handleLevelUp}
              disabled={!canLevel || levelingUp}
            >
              {levelingUp ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <TrendingUp size={18} color={canLevel ? '#FFFFFF' : COLORS.textTertiary} strokeWidth={2} />
              )}
              <Text style={[detailStyles.actionBtnText, !canLevel && { color: COLORS.textTertiary }]}>
                Level Up
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={[detailStyles.shardBtn, (!canBuy || buyingCopy) && detailStyles.actionBtnDisabled]}
              onPress={handleBuyWithShards}
              disabled={!canBuy || buyingCopy}
            >
              {buyingCopy ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : (
                <Text style={detailStyles.shardEmoji}>🔷</Text>
              )}
              <Text style={[detailStyles.shardBtnText, !canBuy && { color: COLORS.textTertiary }]}>
                {shardCost} Splitter
              </Text>
            </AnimatedPressable>
          </View>
          <Text style={detailStyles.shardsInfo}>Your Splitter: {profile.shards.toLocaleString()} 🔷</Text>
        </View>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 0,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  description: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 14,
  },
  actionBtnDisabled: { backgroundColor: '#F1F5F9' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  shardBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#EDE9FE', borderRadius: 14, paddingVertical: 14,
  },
  shardEmoji: { fontSize: 16 },
  shardBtnText: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
  shardsInfo: { fontSize: 13, color: '#94A3B8', textAlign: 'center', fontWeight: '500' },
});

// ─── Lab Card (2-column) ──────────────────────────────────────────────────────
function LabCard({
  cardId, category, onPress, onInfo,
}: {
  cardId: string; category: LabTab; onPress: () => void; onInfo: () => void;
}) {
  const { profile, refreshProfile } = useProfile();
  const cardMap =
    category === 'towers' ? profile.tower_cards
    : category === 'orbs' ? profile.orb_cards
    : profile.ability_cards;

  const cardState = cardMap[cardId] ?? { level: 0, copies: 0, boughtCopies: 0 };
  const isMax = cardState.level >= MAX_CARD_LEVEL;
  const copiesNeeded = CARD_COPIES_NEEDED[cardState.level] ?? 999;
  const canLevel = canLevelUp(cardState);
  const canBuyCopy = profile.shards >= COPY_SHARD_PRICE && !isMax;

  const displayName =
    category === 'towers' ? (TOWER_NAMES[cardId] ?? cardId)
    : category === 'orbs' ? (ORB_NAMES[cardId] ?? cardId)
    : (ABILITY_NAMES[cardId] ?? cardId);

  const rarity = RARITY_LABELS[cardState.level] ?? 'Common';
  const rarityColor = RARITY_COLORS[rarity] ?? '#64748B';

  const progressPct = isMax ? 1 : Math.min(1, cardState.copies / copiesNeeded);
  const progressWidth = `${Math.round(progressPct * 100)}%` as `${number}%`;

  const levelDots = Array.from({ length: MAX_CARD_LEVEL }, (_, i) => i < cardState.level);

  const [buyingCopy, setBuyingCopy] = useState(false);

  const handleBuyCopy = async () => {
    console.log(`[Lab] Buy copy pressed cardId=${cardId} cost=${COPY_SHARD_PRICE}`);
    if (!canBuyCopy || buyingCopy) return;
    setBuyingCopy(true);
    try {
      const { data, error } = await supabase.functions.invoke('buy-card-copy', {
        body: { kind: category, cardId },
      });
      if (error) {
        console.warn('[Lab] buy-card-copy error', error.message);
        Alert.alert('Error', (data as Record<string, unknown> | null)?.error as string || 'Something went wrong');
        return;
      }
      const errCode = (data as Record<string, unknown> | null)?.error as string | undefined;
      if (errCode) {
        Alert.alert('Error', errCode || 'Something went wrong');
        return;
      }
      if (data?.success) {
        console.log('[Lab] buy-card-copy success', data);
        await refreshProfile();
      }
    } catch (e) {
      console.warn('[Lab] buy-card-copy exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setBuyingCopy(false);
    }
  };

  return (
    <TouchableOpacity style={labCardStyles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Info button */}
      <TouchableOpacity style={labCardStyles.infoBtn} onPress={onInfo} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Text style={labCardStyles.infoBtnText}>i</Text>
      </TouchableOpacity>

      <View style={labCardStyles.topRow}>
        {category === 'towers' ? (
          <TowerIcon type={cardId as TowerType} size={52} />
        ) : (
          <View style={labCardStyles.emojiIcon}>
            <Text style={labCardStyles.emojiText}>
              {category === 'orbs' ? '⚡' : '✨'}
            </Text>
          </View>
        )}
        <View style={labCardStyles.nameSection}>
          <Text style={labCardStyles.cardName}>{displayName}</Text>
          <View style={[labCardStyles.rarityBadge, { backgroundColor: `${rarityColor}18` }]}>
            <Text style={[labCardStyles.rarityText, { color: rarityColor }]}>{rarity}</Text>
          </View>
          <View style={labCardStyles.levelDots}>
            {levelDots.map((filled, i) => (
              <View
                key={i}
                style={[labCardStyles.dot, { backgroundColor: filled ? '#F59E0B' : '#E2E8F0' }]}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Progress */}
      <View style={labCardStyles.progressSection}>
        <View style={labCardStyles.progressLabelRow}>
          <Text style={labCardStyles.progressLabel}>Kopien</Text>
          <Text style={labCardStyles.progressValue}>
            {isMax ? 'MAX' : `${cardState.copies}/${copiesNeeded}`}
          </Text>
        </View>
        <View style={labCardStyles.progressTrack}>
          <View style={[labCardStyles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={labCardStyles.boughtText}>
          gekauft {cardState.boughtCopies}/{Math.max(cardState.boughtCopies, copiesNeeded)}
        </Text>
      </View>

      {/* Action button */}
      {canLevel ? (
        <TouchableOpacity
          style={labCardStyles.levelUpBtn}
          onPress={() => {
            console.log(`[Lab] Level up pressed cardId=${cardId}`);
            onPress();
          }}
          activeOpacity={0.8}
        >
          <TrendingUp size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={labCardStyles.levelUpBtnText}>Level Up</Text>
        </TouchableOpacity>
      ) : isMax ? (
        <TouchableOpacity style={labCardStyles.collectBtn} activeOpacity={0.8}>
          <Text style={labCardStyles.collectBtnText}>📦 Mehr sammeln</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[labCardStyles.buyBtn, (!canBuyCopy || buyingCopy) && labCardStyles.buyBtnDisabled]}
          onPress={handleBuyCopy}
          disabled={!canBuyCopy || buyingCopy}
          activeOpacity={0.8}
        >
          {buyingCopy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={labCardStyles.buyBtnText}>
              Kopie kaufen 🔷 {COPY_SHARD_PRICE}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const labCardStyles = StyleSheet.create({
  card: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  infoBtnText: { fontSize: 12, fontWeight: '700', color: '#94A3B8', fontStyle: 'italic' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  emojiText: { fontSize: 26 },
  nameSection: { flex: 1, gap: 5 },
  cardName: { fontSize: 16, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  rarityBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rarityText: { fontSize: 11, fontWeight: '700' },
  levelDots: { flexDirection: 'row', gap: 4, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  progressSection: { gap: 5 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  progressValue: { fontSize: 12, fontWeight: '700', color: '#475569' },
  progressTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
  boughtText: { fontSize: 11, color: '#94A3B8', fontWeight: '500', textAlign: 'right' },
  levelUpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 10,
  },
  levelUpBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  collectBtn: {
    backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  collectBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  buyBtn: {
    backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  buyBtnDisabled: { backgroundColor: '#F1F5F9' },
  buyBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});

// ─── Upgrades Tab ─────────────────────────────────────────────────────────────
function UpgradesTab() {
  const { profile, refreshProfile } = useProfile();
  const [upgradingHand, setUpgradingHand] = useState(false);
  const [upgradingSide, setUpgradingSide] = useState(false);

  const handleUpgradeHand = async () => {
    console.log('[Lab] Upgrade hand level pressed', { current: profile.hand_level });
    setUpgradingHand(true);
    try {
      const { data, error } = await supabase.functions.invoke('level-up-card', {
        body: { kind: 'hand', cardId: 'hand' },
      });
      if (error) {
        console.warn('[Lab] level-up-card hand error', error.message);
        Alert.alert('Error', (data as Record<string, unknown> | null)?.error as string || 'Something went wrong');
        return;
      }
      const errCode = (data as Record<string, unknown> | null)?.error as string | undefined;
      if (errCode) {
        Alert.alert('Error', errCode || 'Something went wrong');
        return;
      }
      if (data?.success) {
        console.log('[Lab] level-up-card hand success');
        await refreshProfile();
      }
    } catch (e) {
      console.warn('[Lab] level-up-card hand exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setUpgradingHand(false);
    }
  };

  const handleUpgradeSideTower = async () => {
    console.log('[Lab] Upgrade side tower pressed', { current: profile.side_tower_level });
    setUpgradingSide(true);
    try {
      const { data, error } = await supabase.functions.invoke('level-up-card', {
        body: { kind: 'side_tower', cardId: 'side_tower' },
      });
      if (error) {
        console.warn('[Lab] level-up-card side_tower error', error.message);
        Alert.alert('Error', (data as Record<string, unknown> | null)?.error as string || 'Something went wrong');
        return;
      }
      const errCode = (data as Record<string, unknown> | null)?.error as string | undefined;
      if (errCode) {
        Alert.alert('Error', errCode || 'Something went wrong');
        return;
      }
      if (data?.success) {
        console.log('[Lab] level-up-card side_tower success');
        await refreshProfile();
      }
    } catch (e) {
      console.warn('[Lab] level-up-card side_tower exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setUpgradingSide(false);
    }
  };

  return (
    <View style={upgradeStyles.container}>
      <Text style={upgradeStyles.desc}>
        Werte Karten mit Kopien aus Kisten auf oder nutze Splitter.{'\n'}
        Höhere Türme starten stärker im Match.
      </Text>

      <TouchableOpacity style={upgradeStyles.card} onPress={handleUpgradeHand} activeOpacity={0.85} disabled={upgradingHand}>
        <View style={upgradeStyles.cardLeft}>
          <Text style={upgradeStyles.cardEmoji}>👆</Text>
          <View>
            <Text style={upgradeStyles.cardTitle}>Hand Level</Text>
            <Text style={upgradeStyles.cardSub}>More clicks per round</Text>
          </View>
        </View>
        {upgradingHand ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <View style={upgradeStyles.levelBadge}>
            <Text style={upgradeStyles.levelText}>L{profile.hand_level + 1}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={upgradeStyles.card} onPress={handleUpgradeSideTower} activeOpacity={0.85} disabled={upgradingSide}>
        <View style={upgradeStyles.cardLeft}>
          <Text style={upgradeStyles.cardEmoji}>🏰</Text>
          <View>
            <Text style={upgradeStyles.cardTitle}>Side Tower</Text>
            <Text style={upgradeStyles.cardSub}>Stronger side defenses</Text>
          </View>
        </View>
        {upgradingSide ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <View style={upgradeStyles.levelBadge}>
            <Text style={upgradeStyles.levelText}>L{profile.side_tower_level + 1}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const upgradeStyles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  desc: { fontSize: 14, color: '#64748B', lineHeight: 20, fontWeight: '400' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardEmoji: { fontSize: 28 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  cardSub: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 },
  levelBadge: {
    backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  levelText: { fontSize: 14, fontWeight: '800', color: '#3B82F6' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<LabTab>('towers');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const handleTabChange = useCallback((tab: LabTab) => {
    console.log('[Lab] Tab changed', { tab });
    setActiveTab(tab);
  }, []);

  const handleCardPress = useCallback((cardId: string) => {
    console.log('[Lab] Card pressed', { cardId, tab: activeTab });
    setSelectedCard(cardId);
  }, [activeTab]);

  const handleCloseDetail = useCallback(() => {
    console.log('[Lab] Card detail closed');
    setSelectedCard(null);
  }, []);

  const shardsDisplay = profile.shards.toLocaleString();

  const starterIds =
    activeTab === 'towers' ? STARTER_TOWER_IDS
    : activeTab === 'orbs' ? STARTER_ORB_IDS
    : STARTER_ABILITY_IDS;

  const trophyIds =
    activeTab === 'towers' ? TROPHY_TOWER_IDS
    : activeTab === 'orbs' ? TROPHY_ORB_IDS
    : TROPHY_ABILITY_IDS;

  const cardCategory: 'towers' | 'orbs' | 'abilities' =
    activeTab === 'towers' ? 'towers'
    : activeTab === 'orbs' ? 'orbs'
    : 'abilities';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Lab</Text>
        <View style={styles.shardsChip}>
          <Text style={styles.shardsEmoji}>🔷</Text>
          <Text style={styles.shardsValue}>{shardsDisplay}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarScroll}
        contentContainerStyle={styles.tabBarContent}
      >
        {LAB_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeTab === 'upgrades' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <UpgradesTab />
        </ScrollView>
      ) : activeTab === 'skins' ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎨</Text>
          <Text style={styles.emptyTitle}>Skins coming soon</Text>
          <Text style={styles.emptySub}>Unlock cosmetic skins for your towers and orbs.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Description */}
          <Text style={styles.desc}>
            Werte Karten mit Kopien aus Kisten auf oder nutze Splitter.{'\n'}
            Höhere Türme starten stärker im Match.
          </Text>

          {/* Startkarten */}
          <Text style={styles.sectionTitle}>Startkarten</Text>
          <View style={styles.cardGrid}>
            {starterIds.map((id, i) => (
              <AnimatedListItem key={id} index={i}>
                <LabCard
                  cardId={id}
                  category={cardCategory}
                  onPress={() => handleCardPress(id)}
                  onInfo={() => {
                    console.log('[Lab] Info button pressed', { cardId: id });
                    handleCardPress(id);
                  }}
                />
              </AnimatedListItem>
            ))}
          </View>

          {/* Trophäen-Freischaltungen */}
          {trophyIds.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Trophäen-Freischaltungen</Text>
              <View style={styles.cardGrid}>
                {trophyIds.map((id, i) => (
                  <AnimatedListItem key={id} index={starterIds.length + i}>
                    <LabCard
                      cardId={id}
                      category={cardCategory}
                      onPress={() => handleCardPress(id)}
                      onInfo={() => {
                        console.log('[Lab] Info button pressed', { cardId: id });
                        handleCardPress(id);
                      }}
                    />
                  </AnimatedListItem>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      <CardDetailModal
        cardId={selectedCard}
        category={cardCategory}
        onClose={handleCloseDetail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  shardsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shardsEmoji: { fontSize: 14 },
  shardsValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7C3AED',
    fontFamily: 'SpaceMono',
  },
  tabBarScroll: {
    flexGrow: 0,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  tabBarContent: {
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  desc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    fontWeight: '400',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginTop: 4,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
});
