import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TowerIcon } from '@/components/TowerIcon';
import { supabase } from '@/utils/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  TOWER_TYPES, TOWER_LOADOUT_SIZE, STARTER_TOWERS,
  ORB_TYPES, SENDABLE_ORBS, ORB_LOADOUT_SIZE, STARTER_ORBS,
  ABILITIES, STARTER_ABILITIES, AI_LEVELS, TOWER_COSTS,
} from '@/game/constants';
import type { TowerType, OrbType, AbilityType } from '@/game/constants';

// ─── LoadoutInfoBadge ─────────────────────────────────────────────────────────
function LoadoutInfoBadge({ title, description }: { title: string; description: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => {
          console.log('[Setup] Info badge pressed:', title);
          setVisible(true);
        }}
        style={infoStyles.btn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={infoStyles.btnText}>ℹ️</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={infoStyles.backdrop} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={infoStyles.card}>
            <Text style={infoStyles.cardTitle}>{title}</Text>
            <Text style={infoStyles.cardDesc}>{description}</Text>
            <TouchableOpacity onPress={() => setVisible(false)} style={infoStyles.closeBtn}>
              <Text style={infoStyles.closeBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const infoStyles = StyleSheet.create({
  btn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  btnText: { fontSize: 10 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  cardDesc: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 16 },
  closeBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const ABILITY_ICONS: Record<string, string> = {
  zap: '⚡', portal: '🌀', repair: '➕', freeze: '❄️', rage: '🔥',
  shield: '🛡️', burner: '🌋', meteor: '☄️', glue: '🟢', overclock: '⚙️',
  speed_zone: '💨', damage_zone: '💢', frost_zone: '🌨️', deep_freeze: '🧊',
};

export default function SetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useProfile();

  const bobAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -12, duration: 700, useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [bobAnim]);

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

  const unlockedTowers = Object.keys(profile.tower_cards ?? {}).filter(
    (id) => ((profile.tower_cards ?? {})[id]?.level ?? 0) >= 1
  );
  const unlockedOrbs = Object.keys(profile.orb_cards ?? {}).filter(
    (id) => ((profile.orb_cards ?? {})[id]?.level ?? 0) >= 1
  );
  const unlockedAbilities = Object.keys(profile.ability_cards ?? {}).filter(
    (id) => ((profile.ability_cards ?? {})[id]?.level ?? 0) >= 1
  );

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
    if (profile.id) {
      try {
        console.log('[Setup] Saving loadout for user', profile.id);
        await supabase.functions.invoke('set-loadout', { body: { towers, orbs, abilities } });
      } catch (e) {
        console.warn('[Setup] set-loadout error', e);
      }
    } else {
      console.log('[Setup] Guest mode — skipping set-loadout');
    }
    router.push({
      pathname: '/game',
      params: {
        mode,
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
        <ScrollView contentContainerStyle={styles.quickPlayContent}>
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
          <Text style={styles.pageSubtitleCenter}>{t('setup.quickPlayHint')}</Text>

          <Animated.Text style={[styles.bigEmoji, { transform: [{ translateY: bobAnim }] }]}>⚔️</Animated.Text>

          {/* Mode pills */}
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

          {/* Big play button */}
          <TouchableOpacity onPress={start} style={styles.playBtn}>
            <Text style={styles.playBtnText}>⚡ {t('setup.quickPlay')} →</Text>
          </TouchableOpacity>

          {/* Change loadout button */}
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

        {/* Mode pills */}
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

        {/* AI Difficulty (training only) */}
        {mode === 'training' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabelCenter}>{t('setup.aiDifficulty')}</Text>
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

        {/* Tower grid — show ALL, locked ones dimmed */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>
              {t('setup.towers')} · {towers.length}/{TOWER_LOADOUT_SIZE}
            </Text>
            <LoadoutInfoBadge
              title="Towers"
              description={`Pick up to ${TOWER_LOADOUT_SIZE} towers. Higher level cards = stronger towers.`}
            />
          </View>
          <View style={styles.cardGrid}>
            {Object.values(TOWER_TYPES).map((def) => {
              const isLocked = !effectiveUnlockedTowers.includes(def.id);
              const isSel = towers.includes(def.id as TowerType);
              const selIdx = towers.indexOf(def.id as TowerType);
              const cardStyle = isSel
                ? { borderColor: '#fbbf24', backgroundColor: '#fffbeb' }
                : isLocked
                ? { borderColor: '#e2e8f0', opacity: 0.4 }
                : { borderColor: '#e2e8f0' };
              return (
                <TouchableOpacity
                  key={def.id}
                  onPress={() => {
                    if (!isLocked) toggleTower(def.id as TowerType);
                  }}
                  style={styles.cardItem}
                  activeOpacity={isLocked ? 1 : 0.7}
                >
                  <View style={[styles.cardItemInner, cardStyle]}>
                    {isSel && (
                      <View style={styles.selBadge}>
                        <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                      </View>
                    )}
                    <TowerIcon type={def.id as TowerType} size={32} />
                    <Text style={styles.cardName} numberOfLines={1}>
                      {t(`towers.${def.id}.name`)}
                    </Text>
                    {isLocked ? (
                      <Text style={styles.cardLock}>🔒</Text>
                    ) : (
                      <Text style={styles.cardCost}>🪙{def.cost}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {lockedTowerCount > 0 && (
            <Text style={styles.moreHint}>{t('setup.moreInLab', { n: lockedTowerCount })}</Text>
          )}
        </View>

        {/* Orb grid — show ALL */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>
              {t('setup.orbs')} · {orbs.length}/{ORB_LOADOUT_SIZE}
            </Text>
            <LoadoutInfoBadge
              title="Orbs"
              description={`Pick up to ${ORB_LOADOUT_SIZE} orbs to send at your opponent.`}
            />
          </View>
          <View style={styles.cardGrid}>
            {SENDABLE_ORBS.map((id) => {
              const def = ORB_TYPES[id as OrbType];
              if (!def) return null;
              const isLocked = !effectiveUnlockedOrbs.includes(id);
              const isSel = orbs.includes(id as OrbType);
              const selIdx = orbs.indexOf(id as OrbType);
              const cardStyle = isSel
                ? { borderColor: '#818cf8', backgroundColor: '#eef2ff' }
                : isLocked
                ? { borderColor: '#e2e8f0', opacity: 0.4 }
                : { borderColor: '#e2e8f0' };
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => {
                    if (!isLocked) toggleOrb(id as OrbType);
                  }}
                  style={styles.cardItem}
                  activeOpacity={isLocked ? 1 : 0.7}
                >
                  <View style={[styles.cardItemInner, cardStyle]}>
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
                    {isLocked ? (
                      <Text style={styles.cardLock}>🔒</Text>
                    ) : (
                      <Text style={styles.cardCost}>🪙{def.cost}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {lockedOrbCount > 0 && (
            <Text style={styles.moreHint}>{t('setup.moreInLab', { n: lockedOrbCount })}</Text>
          )}
        </View>

        {/* Ability grid — show ALL */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>
              {t('setup.powers')} · {abilities.length}/3
            </Text>
            <LoadoutInfoBadge
              title="Abilities"
              description="Pick 3 abilities. Use them during battle for powerful effects."
            />
          </View>
          <View style={styles.abilityGrid}>
            {Object.values(ABILITIES).map((def) => {
              const isLocked = !effectiveUnlockedAbilities.includes(def.id);
              const isSel = abilities.includes(def.id as AbilityType);
              const selIdx = abilities.indexOf(def.id as AbilityType);
              const abilityIcon = ABILITY_ICONS[def.id] || '✨';
              const abilityIconBg = def.color + '22';
              const cardStyle = isSel
                ? { borderColor: '#60a5fa', backgroundColor: '#eff6ff' }
                : isLocked
                ? { borderColor: '#e2e8f0', opacity: 0.4 }
                : { borderColor: '#e2e8f0' };
              return (
                <TouchableOpacity
                  key={def.id}
                  onPress={() => {
                    if (!isLocked) toggleAbility(def.id as AbilityType);
                  }}
                  style={styles.abilityItem}
                  activeOpacity={isLocked ? 1 : 0.7}
                >
                  <View style={[styles.abilityItemInner, cardStyle]}>
                    {isSel && (
                      <View style={[styles.selBadge, styles.selBadgeAbsolute]}>
                        <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                      </View>
                    )}
                    {isLocked && (
                      <View style={[styles.selBadge, styles.selBadgeAbsolute]}>
                        <Text style={styles.selBadgeText}>🔒</Text>
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
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  quickPlayContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  backLink: { alignSelf: 'flex-start', marginBottom: 8, marginTop: 4 },
  backLinkText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  pageTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
    alignSelf: 'flex-start',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  pageSubtitleCenter: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 32,
    textAlign: 'center',
  },
  bigEmoji: { fontSize: 64, marginBottom: 24 },
  modePills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  modePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  modePillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  modePillText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  modePillTextActive: { color: '#fff' },
  disclaimer: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 320,
  },
  playBtn: {
    width: '100%',
    maxWidth: 384,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  playBtnText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  loadoutBtn: {
    width: '100%',
    maxWidth: 384,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  loadoutBtnText: { fontSize: 14, fontWeight: '800', color: '#374151' },
  section: { width: '100%', marginBottom: 24 },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionLabelCenter: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cardItem: { width: '33.333%', padding: 4 },
  cardItemInner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  selBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  cardName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginTop: 4,
  },
  cardCost: { fontSize: 10, fontWeight: '700', color: '#f59e0b', marginTop: 2 },
  cardLock: { fontSize: 10, marginTop: 2 },
  orbCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbHp: { fontSize: 10, fontWeight: '900', color: '#fff' },
  moreHint: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  abilityGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  abilityItem: { width: '50%', padding: 4 },
  abilityItemInner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
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
  abilityName: { fontSize: 13, fontWeight: '800', color: '#1e293b', flex: 1 },
  abilityDesc: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  startBtn: {
    width: '100%',
    maxWidth: 384,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { fontSize: 18, fontWeight: '900', color: '#fff' },
});
