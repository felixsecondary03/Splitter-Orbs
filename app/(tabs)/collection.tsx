import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/utils/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  TOWER_TYPES, ORB_TYPES, ABILITIES, SENDABLE_ORBS,
  SHARD_CARD_PRICES, CARD_COPIES_NEEDED, MAX_CARD_LEVEL,
  HAND_UPGRADE_COSTS, SIDE_TOWER_UPGRADE_COSTS,
} from '@/game/constants';
import type { OrbType } from '@/game/constants';

type LabTab = 'towers' | 'orbs' | 'powers' | 'upgrades';

const ABILITY_ICONS: Record<string, string> = {
  zap: '⚡', portal: '🌀', repair: '➕', freeze: '❄️', rage: '🔥',
  shield: '🛡️', burner: '🌋', meteor: '☄️', glue: '🟢', overclock: '⚙️',
  speed_zone: '💨', damage_zone: '💢', frost_zone: '🌨️', deep_freeze: '🧊',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CollectionScreen() {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useProfile();
  const [tab, setTab] = useState<LabTab>('towers');
  const [busy, setBusy] = useState<string | null>(null);

  console.log('[Lab] render', { profileId: profile?.id, isLoading: false });

  const getCardData = (
    category: 'tower_cards' | 'orb_cards' | 'ability_cards',
    id: string
  ) => {
    if (!profile) return { level: 0, copies: 0, boughtCopies: 0 };
    const cards =
      category === 'tower_cards' ? profile.tower_cards :
      category === 'orb_cards' ? profile.orb_cards :
      profile.ability_cards;
    return (cards as Record<string, { level: number; copies: number; boughtCopies: number }>)?.[id]
      || { level: 0, copies: 0, boughtCopies: 0 };
  };

  const handleLevelUp = async (category: string, id: string) => {
    console.log('[Lab] Level Up pressed:', category, id);
    if (!profile.id) {
      Alert.alert('Anmelden erforderlich', 'Melde dich an, um Karten zu verbessern.');
      return;
    }
    setBusy(id);
    try {
      const { error } = await supabase.functions.invoke('level-up-card', {
        body: { category, cardId: id },
      });
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
    if (!profile.id) {
      Alert.alert('Anmelden erforderlich', 'Melde dich an, um Karten zu verbessern.');
      return;
    }
    setBusy(id + '_buy');
    try {
      const { error } = await supabase.functions.invoke('buy-card-copy', {
        body: { category, cardId: id },
      });
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
    if (!profile.id) {
      Alert.alert('Anmelden erforderlich', 'Melde dich an, um Karten zu verbessern.');
      return;
    }
    setBusy(type);
    try {
      const fn = type === 'hand' ? 'upgrade-hand' : 'upgrade-side-tower';
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

  const renderCard = (
    category: 'tower_cards' | 'orb_cards' | 'ability_cards',
    id: string,
    visual: React.ReactNode,
    name: string
  ) => {
    try {
      const cardData = getCardData(category, id);
      const level = cardData.level;
      const copies = cardData.copies;
      const maxLevel = MAX_CARD_LEVEL;
      const isMaxed = level >= maxLevel;
      const copiesNeeded = CARD_COPIES_NEEDED[level] ?? (level === 0 ? 2 : 999);
      const canLevel = copies >= copiesNeeded && level < maxLevel;
      const shardCost = SHARD_CARD_PRICES[level] ?? 0;
      const isBusy = busy === id;
      const isBuyBusy = busy === id + '_buy';
      const buyCopyCost = SHARD_CARD_PRICES[0] || 4;

      const levelUpLabel = shardCost > 0
        ? t('collection.levelUpShards', { n: shardCost })
        : t('collection.levelUpFree');
      const buyCopyLabel = t('collection.buyCopy', { n: buyCopyCost });

      return (
        <View key={id} style={styles.labCard}>
          <View style={styles.labCardVisual}>{visual}</View>
          <View style={styles.labCardInfo}>
            <Text style={styles.labCardName}>{name}</Text>
            <View style={styles.levelDots}>
              {Array.from({ length: maxLevel }).map((_, i) => (
                <View key={i} style={[styles.levelDot, i < level && styles.levelDotFilled]} />
              ))}
            </View>
            {!isMaxed && (
              <Text style={styles.copiesText}>
                {copies}/{copiesNeeded} {t('collection.copies')}
              </Text>
            )}
          </View>
          <View style={styles.labCardAction}>
            {isMaxed ? (
              <View style={styles.maxBadge}>
                <Text style={styles.maxBadgeText}>{t('collection.maxLevel')}</Text>
              </View>
            ) : canLevel ? (
              <TouchableOpacity
                onPress={() => handleLevelUp(category, id)}
                disabled={!!isBusy}
                style={styles.levelUpBtn}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.levelUpBtnText}>{levelUpLabel}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => handleBuyCopy(category, id)}
                disabled={!!isBuyBusy}
                style={styles.buyBtn}
              >
                {isBuyBusy ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.buyBtnText}>{buyCopyLabel}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : '';
      console.error('[Lab] renderCard ERROR:', msg, stack);
      return (
        <View style={{ padding: 8, backgroundColor: '#1f0000' }}>
          <Text style={{ color: '#ef4444', fontSize: 10 }}>{msg}</Text>
        </View>
      );
    }
  };

  const renderTowers = () =>
    Object.values(TOWER_TYPES).map((def) => {
      const towerInitials = def.name.slice(0, 2).toUpperCase();
      const towerVisual = (
        <View style={{
          width: 36, height: 36, borderRadius: 8,
          backgroundColor: def.color + '33',
          borderWidth: 1.5, borderColor: def.color,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 14, color: def.color, fontWeight: '700' }}>
            {towerInitials}
          </Text>
        </View>
      );
      return renderCard('tower_cards', def.id, towerVisual, def.name);
    });

  const renderOrbs = () =>
    SENDABLE_ORBS.map((id) => {
      const def = ORB_TYPES[id as OrbType];
      if (!def) return null;
      const orbVisual = (
        <View style={[styles.orbDot, { backgroundColor: def.color }]}>
          <Text style={styles.orbDotText}>{def.hp}</Text>
        </View>
      );
      return renderCard('orb_cards', id, orbVisual, def.name);
    });

  const renderPowers = () =>
    Object.values(ABILITIES).map((def) => {
      const icon = ABILITY_ICONS[def.id] || '✨';
      const abilityBg = def.color + '33';
      const abilityVisual = (
        <View style={[styles.abilityDot, { backgroundColor: abilityBg }]}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
      );
      return renderCard('ability_cards', def.id, abilityVisual, def.name);
    });

  const renderUpgrades = () => {
    const handLevel = profile.hand_level || 0;
    const sideTowerLevel = profile.side_tower_level || 0;
    const handMaxed = handLevel >= HAND_UPGRADE_COSTS.length;
    const sideTowerMaxed = sideTowerLevel >= SIDE_TOWER_UPGRADE_COSTS.length;
    const handCost = HAND_UPGRADE_COSTS[handLevel];
    const sideCost = SIDE_TOWER_UPGRADE_COSTS[sideTowerLevel];
    const handLevelLabel = handLevel > 0 ? ` Lv.${handLevel}` : '';
    const sideLevelLabel = sideTowerLevel > 0 ? ` Lv.${sideTowerLevel}` : '';

    return (
      <View style={{ padding: 16 }}>
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>
            {t('collection.handTitle')}
            {handLevelLabel}
          </Text>
          <Text style={styles.upgradeDesc}>{t('collection.handDesc')}</Text>
          {handMaxed ? (
            <View style={styles.maxBadge}>
              <Text style={styles.maxBadgeText}>{t('collection.maxed')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => handleUpgradeMeta('hand')}
              disabled={busy === 'hand'}
              style={styles.upgradeBtn}
            >
              {busy === 'hand' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.upgradeBtnText}>
                  {t('collection.upgrade')} · 🪙{handCost}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>
            {t('collection.sideTowerTitle')}
            {sideLevelLabel}
          </Text>
          <Text style={styles.upgradeDesc}>{t('collection.sideTowerDesc')}</Text>
          {sideTowerMaxed ? (
            <View style={styles.maxBadge}>
              <Text style={styles.maxBadgeText}>{t('collection.maxed')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => handleUpgradeMeta('side_tower')}
              disabled={busy === 'side_tower'}
              style={styles.upgradeBtn}
            >
              {busy === 'side_tower' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.upgradeBtnText}>
                  {t('collection.upgrade')} · 🪙{sideCost}
                </Text>
              )}
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('collection.title')}</Text>
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
              <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                {tb.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scroll}>
        {tab === 'towers' && renderTowers()}
        {tab === 'orbs' && renderOrbs()}
        {tab === 'powers' && renderPowers()}
        {tab === 'upgrades' && renderUpgrades()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  headerHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  tabBtnActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  tabBtnTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  labCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  labCardVisual: { width: 48, alignItems: 'center' },
  labCardInfo: { flex: 1 },
  labCardName: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  levelDots: { flexDirection: 'row', gap: 4, marginBottom: 2 },
  levelDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  levelDotFilled: { backgroundColor: '#F59E0B' },
  copiesText: { fontSize: 11, color: COLORS.textTertiary },
  labCardAction: { alignItems: 'flex-end' },
  maxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  maxBadgeText: { fontSize: 10, fontWeight: '800', color: '#D97706' },
  levelUpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  levelUpBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  buyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  buyBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  orbDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbDotText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  abilityDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 16,
  },
  upgradeTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  upgradeDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 },
  upgradeBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  upgradeBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
