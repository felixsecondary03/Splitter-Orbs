import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/utils/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import { useTranslation } from '@/i18n/LanguageContext';
import { TowerIcon } from '@/components/TowerIcon';
import {
  TOWER_TYPES, TOWER_LOADOUT_SIZE, STARTER_TOWERS,
  ORB_TYPES, SENDABLE_ORBS, ORB_LOADOUT_SIZE, STARTER_ORBS,
  ABILITIES, STARTER_ABILITIES, AI_LEVELS,
} from '@/game/constants';
import type { TowerType, OrbType, AbilityType } from '@/game/constants';

const ABILITY_ICONS: Record<string, string> = {
  zap: '⚡', portal: '🌀', repair: '➕', freeze: '❄️', rage: '🔥',
  shield: '🛡️', burner: '🌋', meteor: '☄️', glue: '🟢', overclock: '⚙️',
  speed_zone: '💨', damage_zone: '💢', frost_zone: '🌨️', deep_freeze: '🧊',
};

export default function SetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useProfile();

  const [mode, setMode] = useState<'training' | 'casual' | 'ranked'>('casual');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [showQuickPlay, setShowQuickPlay] = useState(true);

  const [towers, setTowers] = useState<TowerType[]>(['basic', 'machinegun', 'boomerang', 'bomb']);
  const [orbs, setOrbs] = useState<OrbType[]>(['normal', 'fast', 'bomb', 'splitter', 'tank']);
  const [abilities, setAbilities] = useState<AbilityType[]>(['zap', 'portal', 'repair']);

  useEffect(() => {
    if (profile) {
      const validTowers = (profile.selected_towers || []).filter((t) => t in TOWER_TYPES) as TowerType[];
      setTowers(validTowers.length >= 1 ? validTowers : [...STARTER_TOWERS]);

      const validOrbs = (profile.selected_orbs || []).filter((o) => SENDABLE_ORBS.includes(o as OrbType)) as OrbType[];
      setOrbs(validOrbs.length >= 1 ? validOrbs : [...STARTER_ORBS]);

      const validAbilities = (profile.selected_abilities || []).filter((a) => a in ABILITIES) as AbilityType[];
      setAbilities(validAbilities.length >= 1 ? validAbilities : [...STARTER_ABILITIES]);
    }
  }, [profile]);

  const unlockedTowers = Object.keys(profile.tower_cards || {}).filter(
    (id) => (profile.tower_cards[id]?.level || 0) >= 1
  );
  const unlockedOrbs = Object.keys(profile.orb_cards || {}).filter(
    (id) => (profile.orb_cards[id]?.level || 0) >= 1
  );
  const unlockedAbilities = Object.keys(profile.ability_cards || {}).filter(
    (id) => (profile.ability_cards[id]?.level || 0) >= 1
  );

  // Fall back to starter sets if profile has no cards yet
  const effectiveUnlockedTowers = unlockedTowers.length > 0
    ? unlockedTowers
    : ['basic', 'machinegun', 'boomerang', 'bomb'];
  const effectiveUnlockedOrbs = unlockedOrbs.length > 0
    ? unlockedOrbs
    : ['normal', 'fast', 'bomb', 'splitter', 'tank'];
  const effectiveUnlockedAbilities = unlockedAbilities.length > 0
    ? unlockedAbilities
    : ['zap', 'portal', 'repair', 'freeze'];

  const lockedTowerCount = Object.values(TOWER_TYPES).filter(
    (def) => !effectiveUnlockedTowers.includes(def.id)
  ).length;
  const lockedOrbCount = SENDABLE_ORBS.filter(
    (id) => !effectiveUnlockedOrbs.includes(id)
  ).length;
  const lockedAbilityCount = Object.values(ABILITIES).filter(
    (def) => !effectiveUnlockedAbilities.includes(def.id)
  ).length;

  const toggleTower = (id: TowerType) => {
    console.log('[Setup] Tower toggled:', id);
    setTowers((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= TOWER_LOADOUT_SIZE
        ? cur
        : [...cur, id]
    );
  };

  const toggleOrb = (id: OrbType) => {
    console.log('[Setup] Orb toggled:', id);
    setOrbs((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= ORB_LOADOUT_SIZE
        ? cur
        : [...cur, id]
    );
  };

  const toggleAbility = (id: AbilityType) => {
    console.log('[Setup] Ability toggled:', id);
    setAbilities((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= 3
        ? cur
        : [...cur, id]
    );
  };

  const start = async () => {
    console.log('[Setup] Start Match pressed', { mode, difficulty, towers, orbs, abilities });
    try {
      await supabase.functions.invoke('set-loadout', { body: { towers, orbs, abilities } });
    } catch (e) {
      console.warn('[Setup] set-loadout error', e);
    }
    const engineMode =
      mode === 'training' ? `ai_${difficulty}` : mode === 'casual' ? 'ai_normal' : 'ranked';
    router.push({
      pathname: '/game',
      params: {
        mode: engineMode,
        abilities: JSON.stringify(abilities),
        difficulty,
        towers: JSON.stringify(towers),
        orbs: JSON.stringify(orbs),
      },
    });
  };

  const MODES = [
    { id: 'training' as const, label: t('setup.training'), icon: '🎯' },
    { id: 'casual' as const, label: t('setup.casual'), icon: '🎲' },
    { id: 'ranked' as const, label: t('setup.ranked'), icon: '🏆' },
  ];

  // ── QUICK PLAY VIEW ──
  if (showQuickPlay) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity
            onPress={() => {
              console.log('[Setup] Back pressed');
              router.back();
            }}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>← {t('game.home')}</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>{t('setup.title')}</Text>
          <Text style={styles.pageSubtitle}>{t('setup.quickPlayHint')}</Text>

          <Text style={styles.bigEmoji}>⚔️</Text>

          <View style={styles.modePills}>
            {MODES.map((m) => {
              const isActive = mode === m.id;
              const pillLabel = `${m.icon} ${m.label}`;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => {
                    console.log('[Setup] Mode selected:', m.id);
                    setMode(m.id);
                  }}
                  style={[styles.modePill, isActive && styles.modePillActive]}
                >
                  <Text style={[styles.modePillText, isActive && styles.modePillTextActive]}>
                    {pillLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === 'ranked' && (
            <Text style={styles.disclaimer}>{t('setup.rankedBetaDisclaimer')}</Text>
          )}

          <TouchableOpacity onPress={start} style={styles.playBtn}>
            <Text style={styles.playBtnText}>⚡ {t('setup.quickPlay')} →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              console.log('[Setup] Change Loadout pressed');
              setShowQuickPlay(false);
            }}
            style={styles.loadoutBtn}
          >
            <Text style={styles.loadoutBtnText}>⚙️ {t('setup.changeLoadout')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── LOADOUT EDITOR VIEW ──
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          onPress={() => {
            console.log('[Setup] Back pressed');
            router.back();
          }}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>← {t('game.home')}</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>{t('setup.title')}</Text>
        <Text style={styles.pageSubtitle}>
          {t('setup.subtitle', { towers: TOWER_LOADOUT_SIZE, orbs: ORB_LOADOUT_SIZE })}
        </Text>

        <View style={styles.modePills}>
          {MODES.map((m) => {
            const isActive = mode === m.id;
            const pillLabel = `${m.icon} ${m.label}`;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => {
                  console.log('[Setup] Mode selected:', m.id);
                  setMode(m.id);
                }}
                style={[styles.modePill, isActive && styles.modePillActive]}
              >
                <Text style={[styles.modePillText, isActive && styles.modePillTextActive]}>
                  {pillLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {mode === 'ranked' && (
          <Text style={styles.disclaimer}>{t('setup.rankedBetaDisclaimer')}</Text>
        )}

        {mode === 'training' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('setup.aiDifficulty')}</Text>
            <View style={styles.modePills}>
              {(Object.keys(AI_LEVELS) as ('easy' | 'normal' | 'hard')[]).map((id) => {
                const isActive = difficulty === id;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => {
                      console.log('[Setup] Difficulty selected:', id);
                      setDifficulty(id);
                    }}
                    style={[styles.modePill, isActive && styles.modePillActive]}
                  >
                    <Text style={[styles.modePillText, isActive && styles.modePillTextActive]}>
                      {t(`difficulty.${id}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Tower grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {t('setup.towers')} · {towers.length}/{TOWER_LOADOUT_SIZE}
          </Text>
          <View style={styles.cardGrid}>
            {Object.values(TOWER_TYPES)
              .filter((def) => effectiveUnlockedTowers.includes(def.id))
              .map((def) => {
                const isSel = towers.includes(def.id as TowerType);
                const selIdx = towers.indexOf(def.id as TowerType);
                const selBorderStyle = isSel
                  ? { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }
                  : undefined;
                return (
                  <TouchableOpacity
                    key={def.id}
                    onPress={() => toggleTower(def.id as TowerType)}
                    style={styles.cardItem}
                  >
                    <View style={[styles.cardItemInner, selBorderStyle]}>
                      {isSel && (
                        <View style={styles.selBadge}>
                          <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                        </View>
                      )}
                      <TowerIcon type={def.id as TowerType} size={32} />
                      <Text style={styles.cardName} numberOfLines={1}>
                        {t(`towers.${def.id}.name`)}
                      </Text>
                      <Text style={styles.cardCost}>🪙{def.cost}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
          {lockedTowerCount > 0 && (
            <Text style={styles.moreHint}>{t('setup.moreInLab', { n: lockedTowerCount })}</Text>
          )}
        </View>

        {/* Orb grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {t('setup.orbs')} · {orbs.length}/{ORB_LOADOUT_SIZE}
          </Text>
          <View style={styles.cardGrid}>
            {SENDABLE_ORBS.filter((id) => effectiveUnlockedOrbs.includes(id)).map((id) => {
              const def = ORB_TYPES[id as OrbType];
              if (!def) return null;
              const isSel = orbs.includes(id as OrbType);
              const selIdx = orbs.indexOf(id as OrbType);
              const selBorderStyle = isSel
                ? { borderColor: '#818CF8', backgroundColor: '#EEF2FF' }
                : undefined;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => toggleOrb(id as OrbType)}
                  style={styles.cardItem}
                >
                  <View style={[styles.cardItemInner, selBorderStyle]}>
                    {isSel && (
                      <View style={styles.selBadge}>
                        <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                      </View>
                    )}
                    <View style={[styles.orbCircle, { backgroundColor: def.color }]}>
                      <Text style={styles.orbHp}>{def.hp}</Text>
                    </View>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {t(`orbs.${id}.name`)}
                    </Text>
                    <Text style={styles.cardCost}>🪙{def.cost}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {lockedOrbCount > 0 && (
            <Text style={styles.moreHint}>{t('setup.moreInLab', { n: lockedOrbCount })}</Text>
          )}
        </View>

        {/* Ability grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {t('setup.powers')} · {abilities.length}/3
          </Text>
          <View style={styles.abilityGrid}>
            {Object.values(ABILITIES)
              .filter((def) => effectiveUnlockedAbilities.includes(def.id))
              .map((def) => {
                const isSel = abilities.includes(def.id as AbilityType);
                const selIdx = abilities.indexOf(def.id as AbilityType);
                const selBorderStyle = isSel
                  ? { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' }
                  : undefined;
                const abilityIcon = ABILITY_ICONS[def.id] || '✨';
                const abilityIconBg = def.color + '22';
                return (
                  <TouchableOpacity
                    key={def.id}
                    onPress={() => toggleAbility(def.id as AbilityType)}
                    style={styles.abilityItem}
                  >
                    <View style={[styles.abilityItemInner, selBorderStyle]}>
                      {isSel && (
                        <View style={[styles.selBadge, styles.selBadgeAbsolute]}>
                          <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                        </View>
                      )}
                      <View style={styles.abilityIconRow}>
                        <View style={[styles.abilityIcon, { backgroundColor: abilityIconBg }]}>
                          <Text style={styles.abilityEmoji}>{abilityIcon}</Text>
                        </View>
                        <Text style={styles.abilityName}>{t(`abilities.${def.id}.name`)}</Text>
                      </View>
                      <Text style={styles.abilityDesc} numberOfLines={2}>
                        {t(`abilities.${def.id}.desc`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
          {lockedAbilityCount > 0 && (
            <Text style={styles.moreHint}>{t('setup.moreInLab', { n: lockedAbilityCount })}</Text>
          )}
        </View>

        {/* Start button */}
        <TouchableOpacity
          onPress={start}
          disabled={abilities.length !== 3 || towers.length < 1 || orbs.length < 1}
          style={[
            styles.startBtn,
            (abilities.length !== 3 || towers.length < 1 || orbs.length < 1) &&
              styles.startBtnDisabled,
          ]}
        >
          <Text style={styles.startBtnText}>{t('setup.startMatch')} →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 100, alignItems: 'center' },
  backLink: { alignSelf: 'flex-start', marginBottom: 8 },
  backLinkText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  bigEmoji: { fontSize: 64, marginBottom: 24 },
  modePills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  modePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  modePillActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  modePillText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  modePillTextActive: { color: '#fff' },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 320,
  },
  playBtn: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  playBtnText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  loadoutBtn: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  loadoutBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  section: { width: '100%', marginBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cardItem: { width: '33.333%', padding: 4 },
  cardItemInner: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 8,
    alignItems: 'center',
    position: 'relative',
  },
  selBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  selBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  cardName: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 4,
  },
  cardCost: { fontSize: 10, fontWeight: '700', color: '#F59E0B', marginTop: 2 },
  orbCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbHp: { fontSize: 10, fontWeight: '900', color: '#fff' },
  moreHint: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  abilityGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  abilityItem: { width: '50%', padding: 4 },
  abilityItemInner: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 12,
    position: 'relative',
  },
  selBadgeAbsolute: { position: 'absolute', top: -6, right: -6 },
  abilityIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  abilityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityEmoji: { fontSize: 18 },
  abilityName: { fontSize: 13, fontWeight: '800', color: COLORS.text, flex: 1 },
  abilityDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  startBtn: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { fontSize: 18, fontWeight: '900', color: '#fff' },
});
