import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { TowerIcon } from '@/components/TowerIcon';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import {
  TOWER_TYPES, ORB_TYPES, ABILITIES,
  STARTER_TOWERS, STARTER_ORBS, STARTER_ABILITIES,
  TOWER_LOADOUT_SIZE, ORB_LOADOUT_SIZE, ABILITY_LOADOUT_SIZE,
  ORB_TROPHY_UNLOCKS, TOWER_TROPHY_UNLOCKS, ABILITY_TROPHY_UNLOCKS,
} from '@/game/constants';
import type { TowerType, OrbType, AbilityType } from '@/game/constants';

type GameMode = 'training' | 'casual' | 'ranked';
type Difficulty = 'easy' | 'normal' | 'hard';

const MODE_PILLS: { key: GameMode; label: string }[] = [
  { key: 'training', label: '🎯 Training' },
  { key: 'casual', label: '🎲 Casual' },
  { key: 'ranked', label: '🏆 Ranked' },
];

const DIFFICULTY_PILLS: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'normal', label: 'Normal' },
  { key: 'hard', label: 'Hard' },
];

const ABILITY_EMOJIS: Record<AbilityType, string> = {
  zap: '⚡', portal: '🌀', repair: '🔧', freeze: '❄️', rage: '🔥',
  shield: '🛡️', burner: '🔥', meteor: '☄️', glue: '🟢', overclock: '⚙️',
  speed_zone: '💨', damage_zone: '💥', frost_zone: '🧊', deep_freeze: '🌨️',
};

const ABILITY_DESCRIPTIONS: Record<AbilityType, string> = {
  zap: 'Stuns nearby orbs', portal: 'Teleport orbs to base', repair: 'Heal your station',
  freeze: 'Freeze all enemy orbs', rage: 'Double tower fire rate', shield: 'Block incoming damage',
  burner: 'Burn area with fire', meteor: 'Targeted meteor strike', glue: 'Slow orbs in area',
  overclock: 'Boost tower speed', speed_zone: 'Speed zone on enemy side', damage_zone: 'Damage zone on enemy side',
  frost_zone: 'Frost zone on enemy side', deep_freeze: 'Freeze everything',
};

type PlayerProfile = {
  tower_cards?: Record<string, number>;
  orb_cards?: Record<string, number>;
  ability_cards?: Record<string, number>;
  trophies?: number;
};

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [showQuickPlay, setShowQuickPlay] = useState(true);
  const [mode, setMode] = useState<GameMode>('casual');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [towers, setTowers] = useState<TowerType[]>([...STARTER_TOWERS]);
  const [orbs, setOrbs] = useState<OrbType[]>([...STARTER_ORBS]);
  const [abilities, setAbilities] = useState<AbilityType[]>([...STARTER_ABILITIES]);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  // Load profile to determine unlocked cards
  useEffect(() => {
    if (!user) return;
    console.log('[Setup] Loading player profile for user', user.id);
    supabase
      .from('player_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[Setup] Failed to load profile', error.message);
          return;
        }
        console.log('[Setup] Profile loaded', { trophies: data?.trophies });
        setProfile(data);
      });
  }, [user]);

  const trophies = profile?.trophies ?? 0;

  // Determine unlocked items
  const unlockedTowers = (Object.keys(TOWER_TYPES) as TowerType[]).filter((t) => {
    const def = TOWER_TYPES[t];
    if (def.crateOnly) return false;
    const trophyReq = TOWER_TROPHY_UNLOCKS[t] ?? def.unlockTrophies ?? 0;
    if (trophyReq > trophies) return false;
    const cardLevel = (profile?.tower_cards as Record<string, number> | undefined)?.[t] ?? 0;
    return cardLevel >= 1 || STARTER_TOWERS.includes(t);
  });

  const unlockedOrbs = (Object.keys(ORB_TYPES) as OrbType[]).filter((o) => {
    const def = ORB_TYPES[o];
    if (def.crateOnly) return false;
    const trophyReq = ORB_TROPHY_UNLOCKS[o] ?? 0;
    if (trophyReq > trophies) return false;
    const cardLevel = (profile?.orb_cards as Record<string, number> | undefined)?.[o] ?? 0;
    return cardLevel >= 1 || STARTER_ORBS.includes(o);
  });

  const unlockedAbilities = (Object.keys(ABILITIES) as AbilityType[]).filter((a) => {
    const def = ABILITIES[a];
    if (def.crateOnly) return false;
    const trophyReq = ABILITY_TROPHY_UNLOCKS[a] ?? def.unlockTrophies ?? 0;
    if (trophyReq > trophies) return false;
    const cardLevel = (profile?.ability_cards as Record<string, number> | undefined)?.[a] ?? 0;
    return cardLevel >= 1 || STARTER_ABILITIES.includes(a);
  });

  const lockedTowerCount = (Object.keys(TOWER_TYPES) as TowerType[]).filter(
    (t) => !unlockedTowers.includes(t)
  ).length;

  const toggleTower = useCallback((t: TowerType) => {
    setTowers((prev) => {
      if (prev.includes(t)) {
        console.log(`[Setup] Tower deselected: ${t}`);
        return prev.filter((x) => x !== t);
      }
      if (prev.length >= TOWER_LOADOUT_SIZE) {
        console.log(`[Setup] Tower swap: removed ${prev[0]}, added ${t}`);
        return [...prev.slice(1), t];
      }
      console.log(`[Setup] Tower selected: ${t}`);
      return [...prev, t];
    });
  }, []);

  const toggleOrb = useCallback((o: OrbType) => {
    setOrbs((prev) => {
      if (prev.includes(o)) {
        console.log(`[Setup] Orb deselected: ${o}`);
        return prev.filter((x) => x !== o);
      }
      if (prev.length >= ORB_LOADOUT_SIZE) {
        console.log(`[Setup] Orb swap: removed ${prev[0]}, added ${o}`);
        return [...prev.slice(1), o];
      }
      console.log(`[Setup] Orb selected: ${o}`);
      return [...prev, o];
    });
  }, []);

  const toggleAbility = useCallback((a: AbilityType) => {
    setAbilities((prev) => {
      if (prev.includes(a)) {
        console.log(`[Setup] Ability deselected: ${a}`);
        return prev.filter((x) => x !== a);
      }
      if (prev.length >= ABILITY_LOADOUT_SIZE) {
        console.log(`[Setup] Ability swap: removed ${prev[0]}, added ${a}`);
        return [...prev.slice(1), a];
      }
      console.log(`[Setup] Ability selected: ${a}`);
      return [...prev, a];
    });
  }, []);

  const handleStart = useCallback(async () => {
    if (starting) return;
    console.log('[Setup] Start Match pressed', { mode, difficulty, towers, orbs, abilities });
    setStarting(true);
    try {
      await supabase.functions.invoke('set-loadout', {
        body: { towers, orbs, abilities },
      });
    } catch (e) {
      console.warn('[Setup] set-loadout error', e);
    }
    router.push({
      pathname: '/game',
      params: {
        mode,
        difficulty,
        towers: JSON.stringify(towers),
        orbs: JSON.stringify(orbs),
        abilities: JSON.stringify(abilities),
      },
    });
    setStarting(false);
  }, [starting, mode, difficulty, towers, orbs, abilities]);

  const handleQuickPlay = useCallback(async () => {
    if (starting) return;
    console.log('[Setup] Quick Play pressed', { mode, difficulty });
    setStarting(true);
    try {
      await supabase.functions.invoke('set-loadout', {
        body: { towers, orbs, abilities },
      });
    } catch (e) {
      console.warn('[Setup] set-loadout error (quick play)', e);
    }
    router.push({
      pathname: '/game',
      params: {
        mode,
        difficulty,
        towers: JSON.stringify(towers),
        orbs: JSON.stringify(orbs),
        abilities: JSON.stringify(abilities),
      },
    });
    setStarting(false);
  }, [starting, mode, difficulty, towers, orbs, abilities]);

  const canStart = abilities.length >= ABILITY_LOADOUT_SIZE && towers.length >= 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            console.log('[Setup] Back button pressed');
            router.back();
          }}
        >
          <ChevronLeft size={20} color="#64748b" strokeWidth={2} />
          <Text style={styles.backText}>Home</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Setup</Text>
          <Text style={styles.subtitle}>
            {showQuickPlay ? 'Quick play with your saved loadout' : 'Choose your loadout'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode pills */}
        <View style={styles.pillRow}>
          {MODE_PILLS.map((p) => (
            <Pressable
              key={p.key}
              style={[styles.pill, mode === p.key && styles.pillActive]}
              onPress={() => {
                console.log(`[Setup] Mode selected: ${p.key}`);
                setMode(p.key);
              }}
            >
              <Text style={[styles.pillText, mode === p.key && styles.pillTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Training difficulty */}
        {mode === 'training' && (
          <View style={styles.pillRow}>
            {DIFFICULTY_PILLS.map((p) => (
              <Pressable
                key={p.key}
                style={[styles.pill, difficulty === p.key && styles.pillActive]}
                onPress={() => {
                  console.log(`[Setup] Difficulty selected: ${p.key}`);
                  setDifficulty(p.key);
                }}
              >
                <Text style={[styles.pillText, difficulty === p.key && styles.pillTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Ranked disclaimer */}
        {mode === 'ranked' && (
          <Text style={styles.disclaimer}>
            Ranked matches affect your trophy count. Win to climb leagues!
          </Text>
        )}

        {showQuickPlay ? (
          /* ── Quick Play view ── */
          <View style={styles.quickPlaySection}>
            <Text style={styles.bigEmoji}>⚔️</Text>
            <AnimatedPressable
              style={styles.quickPlayBtn}
              onPress={handleQuickPlay}
              disabled={starting}
            >
              {starting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.quickPlayBtnText}>⚡ Quick Play →</Text>
              )}
            </AnimatedPressable>
            <Pressable
              style={styles.changeLoadoutBtn}
              onPress={() => {
                console.log('[Setup] Change Loadout pressed');
                setShowQuickPlay(false);
              }}
            >
              <Text style={styles.changeLoadoutText}>⚙️ Change Loadout</Text>
            </Pressable>
          </View>
        ) : (
          /* ── Full loadout view ── */
          <>
            {/* TOWERS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TOWERS</Text>
              <Text style={styles.sectionCount}>{towers.length}/{TOWER_LOADOUT_SIZE}</Text>
            </View>
            <View style={styles.cardGrid}>
              {(Object.keys(TOWER_TYPES) as TowerType[]).map((t) => {
                const def = TOWER_TYPES[t];
                const isSelected = towers.includes(t);
                const isUnlocked = unlockedTowers.includes(t);
                const selIdx = towers.indexOf(t);
                const trophyReq = TOWER_TROPHY_UNLOCKS[t] ?? def.unlockTrophies ?? 0;
                const lockLabel = def.crateOnly ? 'Crate' : trophyReq > 0 ? `${trophyReq}🏆` : '🔒';
                return (
                  <Pressable
                    key={t}
                    style={styles.cardItem}
                    onPress={() => {
                      if (!isUnlocked) return;
                      toggleTower(t);
                    }}
                  >
                    <View style={[
                      styles.cardItemInner,
                      isSelected && styles.cardItemSelected,
                      !isUnlocked && styles.cardItemLocked,
                    ]}>
                      {isSelected && (
                        <View style={styles.selBadge}>
                          <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                        </View>
                      )}
                      <TowerIcon type={t} size={32} level={1} />
                      <Text style={styles.cardName} numberOfLines={1}>{def.name}</Text>
                      {isUnlocked ? (
                        <Text style={styles.cardCost}>{def.cost}🪙</Text>
                      ) : (
                        <View style={styles.lockRow}>
                          <Lock size={10} color="#94a3b8" strokeWidth={2} />
                          <Text style={styles.lockText}>{lockLabel}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {lockedTowerCount > 0 && (
              <Text style={styles.lockedHint}>{lockedTowerCount} more in Lab</Text>
            )}

            {/* ORBS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ORBS</Text>
              <Text style={styles.sectionCount}>{orbs.length}/{ORB_LOADOUT_SIZE}</Text>
            </View>
            <View style={styles.cardGrid}>
              {(Object.keys(ORB_TYPES) as OrbType[]).map((o) => {
                const def = ORB_TYPES[o];
                const isSelected = orbs.includes(o);
                const isUnlocked = unlockedOrbs.includes(o);
                const selIdx = orbs.indexOf(o);
                const trophyReq = ORB_TROPHY_UNLOCKS[o] ?? 0;
                const lockLabel = def.crateOnly ? 'Crate' : trophyReq > 0 ? `${trophyReq}🏆` : '🔒';
                return (
                  <Pressable
                    key={o}
                    style={styles.cardItem}
                    onPress={() => {
                      if (!isUnlocked) return;
                      toggleOrb(o);
                    }}
                  >
                    <View style={[
                      styles.cardItemInner,
                      isSelected && styles.cardItemOrbSelected,
                      !isUnlocked && styles.cardItemLocked,
                    ]}>
                      {isSelected && (
                        <View style={[styles.selBadge, styles.selBadgeOrb]}>
                          <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                        </View>
                      )}
                      <View style={[styles.orbCircle, { backgroundColor: def.color }]}>
                        <Text style={styles.orbHpText}>{def.hp}</Text>
                      </View>
                      <Text style={styles.cardName} numberOfLines={1}>{def.name}</Text>
                      {isUnlocked ? (
                        <Text style={styles.cardCost}>{def.cost}🪙</Text>
                      ) : (
                        <View style={styles.lockRow}>
                          <Lock size={10} color="#94a3b8" strokeWidth={2} />
                          <Text style={styles.lockText}>{lockLabel}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* ABILITIES */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ABILITIES</Text>
              <Text style={styles.sectionCount}>{abilities.length}/{ABILITY_LOADOUT_SIZE}</Text>
            </View>
            <View style={styles.abilityGrid}>
              {(Object.keys(ABILITIES) as AbilityType[]).map((a) => {
                const def = ABILITIES[a];
                const isSelected = abilities.includes(a);
                const isUnlocked = unlockedAbilities.includes(a);
                const selIdx = abilities.indexOf(a);
                const trophyReq = ABILITY_TROPHY_UNLOCKS[a] ?? def.unlockTrophies ?? 0;
                const lockLabel = def.crateOnly ? 'Crate' : trophyReq > 0 ? `${trophyReq}🏆` : '🔒';
                return (
                  <Pressable
                    key={a}
                    style={[
                      styles.abilityItem,
                      isSelected && styles.abilityItemSelected,
                      !isUnlocked && styles.cardItemLocked,
                    ]}
                    onPress={() => {
                      if (!isUnlocked) return;
                      toggleAbility(a);
                    }}
                  >
                    {isSelected && (
                      <View style={[styles.selBadge, styles.selBadgeAbility]}>
                        <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                      </View>
                    )}
                    <Text style={styles.abilityEmoji}>{ABILITY_EMOJIS[a]}</Text>
                    <View style={styles.abilityInfo}>
                      <Text style={styles.abilityName}>{def.name}</Text>
                      <Text style={styles.abilityDesc} numberOfLines={1}>
                        {ABILITY_DESCRIPTIONS[a]}
                      </Text>
                    </View>
                    {!isUnlocked && (
                      <View style={styles.lockRow}>
                        <Lock size={10} color="#94a3b8" strokeWidth={2} />
                        <Text style={styles.lockText}>{lockLabel}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      {!showQuickPlay && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <AnimatedPressable
            style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
            onPress={handleStart}
            disabled={!canStart || starting}
          >
            {starting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startBtnText}>Start Match →</Text>
            )}
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  pillActive: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
  },
  quickPlaySection: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  bigEmoji: {
    fontSize: 64,
  },
  quickPlayBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 48,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    minWidth: 200,
    alignItems: 'center',
  },
  quickPlayBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  changeLoadoutBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  changeLoadoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b82f6',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  cardItem: {
    width: '33.333%',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  cardItemInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  cardItemSelected: {
    backgroundColor: '#fffbeb',
    borderColor: '#fbbf24',
  },
  cardItemOrbSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#818cf8',
  },
  cardItemLocked: {
    opacity: 0.4,
  },
  selBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selBadgeOrb: {
    backgroundColor: '#4f46e5',
  },
  selBadgeAbility: {
    backgroundColor: '#2563eb',
  },
  selBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  cardCost: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  lockText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  orbCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbHpText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lockedHint: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  abilityGrid: {
    gap: 8,
  },
  abilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  abilityItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#60a5fa',
  },
  abilityEmoji: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  abilityInfo: {
    flex: 1,
    gap: 2,
  },
  abilityName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  abilityDesc: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  startBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  startBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
