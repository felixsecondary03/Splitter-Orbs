import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Info, Lock } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { TowerIcon } from '@/components/TowerIcon';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/utils/supabase';
import { TOWER_COSTS, TOWER_TYPES, ORB_TYPES, ABILITY_TYPES } from '@/game/constants';
import type { TowerType, OrbType, AbilityType } from '@/game/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GameMode = 'training' | 'casual' | 'ranked';
type Difficulty = 'easy' | 'normal' | 'hard';
type ViewMode = 'quick' | 'loadout';

// ─── Tower display names ──────────────────────────────────────────────────────
const TOWER_NAMES: Record<string, string> = {
  blaster: 'Blaster', vulcan: 'Vulcan', lancer: 'Lancer', piercer: 'Piercer',
  boomerang: 'Bouncer', mortar: 'Mortar', bouncer: 'Bouncer', glacier: 'Glacier',
  arc: 'Arc', pyre: 'Pyre', venom: 'Venom', siege: 'Siege',
  orb_mortar: 'Orb Mortar', lava_mortar: 'Lava Mortar', repulsor: 'Repulsor',
  cryo: 'Kryo-Kanone', seeker: 'Seeker', prism_lance: 'Prism Lance',
  flak: 'Flak', harpoon: 'Harpoon', twin: 'Twin', tesla: 'Tesla',
  detonator: 'Detonator', magnet: 'Magnet',
};

// ─── Orb display names + colors ──────────────────────────────────────────────
const ORB_NAMES: Record<string, string> = {
  normal: 'Normal', fast: 'Fast', bomb: 'Bomb', splitter: 'Splitter', tank: 'Tank',
  carrier: 'Carrier', sprint: 'Sprint', swarmer: 'Swarmer', shielder: 'Shielder',
  healer: 'Healer', radioactive: 'Radioactive', shadow: 'Shadow', ice: 'Ice',
  fog: 'Fog', zap: 'Zap', armored: 'Armored', growth: 'Growth',
  shield_bubble: 'Shield', berserker: 'Berserker', phantom: 'Phantom',
  leech: 'Leech', summoner: 'Summoner', mine: 'Mine',
};

const ORB_COLORS: Record<string, string> = {
  normal: '#3B82F6', fast: '#06B6D4', bomb: '#EF4444', splitter: '#8B5CF6',
  tank: '#F59E0B', carrier: '#10B981', sprint: '#06B6D4', swarmer: '#F97316',
  shielder: '#6366F1', healer: '#22C55E', radioactive: '#84CC16', shadow: '#475569',
  ice: '#38BDF8', fog: '#94A3B8', zap: '#F59E0B', armored: '#64748B',
  growth: '#22C55E', shield_bubble: '#6366F1', berserker: '#DC2626',
  phantom: '#A78BFA', leech: '#7C3AED', summoner: '#EC4899', mine: '#F97316',
};

const ORB_HP: Record<string, number> = {
  normal: 27, fast: 16, bomb: 45, splitter: 30, tank: 80,
  carrier: 35, sprint: 20, swarmer: 12, shielder: 40, healer: 35,
  radioactive: 28, shadow: 25, ice: 22, fog: 18, zap: 20,
  armored: 60, growth: 32, shield_bubble: 38, berserker: 24,
  phantom: 22, leech: 30, summoner: 35, mine: 15,
};

// ─── Ability display names + icons ───────────────────────────────────────────
const ABILITY_NAMES: Record<string, string> = {
  meteor: 'Meteor', freeze: 'Freeze', rage: 'Rage', shield: 'Shield',
  overclock: 'Overclock', glue: 'Glue', zone: 'Zone', portal: 'Portal', burner: 'Burner',
};

const ABILITY_ICONS: Record<string, string> = {
  meteor: '☄️', freeze: '❄️', rage: '🔥', shield: '🛡️',
  overclock: '⚡', glue: '🟡', zone: '🔵', portal: '🌀', burner: '🔥',
};

const ABILITY_DESCS: Record<string, string> = {
  meteor: 'Calls down a meteor strike dealing massive area damage.',
  freeze: 'Freezes all enemy orbs in place for a few seconds.',
  rage: 'Doubles your coin income for a short duration.',
  shield: 'Grants your station a temporary damage shield.',
  overclock: 'Doubles all tower fire rates for a short burst.',
  glue: 'Slows enemy orbs with sticky glue.',
  zone: 'Creates a damage zone on the field.',
  portal: 'Teleports orbs to a different position.',
  burner: 'Burns orbs over time with fire damage.',
};

// ─── Starter cards ────────────────────────────────────────────────────────────
const STARTER_TOWERS: TowerType[] = ['blaster', 'vulcan', 'piercer', 'mortar', 'bouncer', 'glacier', 'pyre', 'venom', 'siege', 'cryo'];
const STARTER_ORBS: OrbType[] = ['normal', 'fast', 'bomb', 'splitter', 'tank', 'carrier', 'sprint', 'shielder', 'healer'];
const STARTER_ABILITIES: AbilityType[] = ['meteor', 'freeze', 'rage', 'shield', 'overclock', 'glue', 'zone', 'portal', 'burner'];

const DEFAULT_TOWERS: TowerType[] = ['blaster', 'vulcan', 'piercer', 'mortar'];
const DEFAULT_ORBS: OrbType[] = ['normal', 'fast', 'bomb', 'splitter', 'tank'];
const DEFAULT_ABILITIES: AbilityType[] = ['meteor', 'freeze', 'rage'];

const MAX_TOWERS = 4;
const MAX_ORBS = 5;
const MAX_ABILITIES = 3;

// ─── Info Modal ───────────────────────────────────────────────────────────────
function InfoModal({ visible, title, description, onClose }: {
  visible: boolean; title: string; description: string; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={infoStyles.overlay} onPress={onClose}>
        <View style={infoStyles.card}>
          <Text style={infoStyles.title}>{title}</Text>
          <Text style={infoStyles.desc}>{description}</Text>
          <TouchableOpacity style={infoStyles.closeBtn} onPress={onClose}>
            <Text style={infoStyles.closeBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const infoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  desc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  closeBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();

  const [viewMode, setViewMode] = useState<ViewMode>('quick');
  const [gameMode, setGameMode] = useState<GameMode>('casual');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [selectedTowers, setSelectedTowers] = useState<TowerType[]>(DEFAULT_TOWERS);
  const [selectedOrbs, setSelectedOrbs] = useState<OrbType[]>(DEFAULT_ORBS);
  const [selectedAbilities, setSelectedAbilities] = useState<AbilityType[]>(DEFAULT_ABILITIES);
  const [infoModal, setInfoModal] = useState<{ title: string; description: string } | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const unlockedTowers = new Set<string>(profile.unlocked_towers?.length ? profile.unlocked_towers : STARTER_TOWERS);
  const unlockedAbilities = new Set<string>(profile.unlocked_abilities?.length ? profile.unlocked_abilities : STARTER_ABILITIES);

  const handleBack = useCallback(() => {
    console.log('[Setup] Back button pressed, viewMode=', viewMode);
    if (viewMode === 'loadout') {
      setViewMode('quick');
    } else {
      router.back();
    }
  }, [viewMode]);

  const handleModeSelect = useCallback((mode: GameMode) => {
    console.log('[Setup] Mode selected', { mode });
    setGameMode(mode);
  }, []);

  const handleDifficultySelect = useCallback((diff: Difficulty) => {
    console.log('[Setup] Difficulty selected', { diff });
    setDifficulty(diff);
  }, []);

  const handleToggleTower = useCallback((type: TowerType) => {
    console.log('[Setup] Tower toggled', { type });
    setSelectedTowers((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type);
      if (prev.length >= MAX_TOWERS) return prev;
      return [...prev, type];
    });
  }, []);

  const handleToggleOrb = useCallback((type: OrbType) => {
    console.log('[Setup] Orb toggled', { type });
    setSelectedOrbs((prev) => {
      if (prev.includes(type)) return prev.filter((o) => o !== type);
      if (prev.length >= MAX_ORBS) return prev;
      return [...prev, type];
    });
  }, []);

  const handleToggleAbility = useCallback((type: AbilityType) => {
    console.log('[Setup] Ability toggled', { type });
    setSelectedAbilities((prev) => {
      if (prev.includes(type)) return prev.filter((a) => a !== type);
      if (prev.length >= MAX_ABILITIES) return prev;
      return [...prev, type];
    });
  }, []);

  const handleShowInfo = useCallback((title: string, description: string) => {
    console.log('[Setup] Info button pressed', { title });
    setInfoModal({ title, description });
  }, []);

  const handleStartMatch = useCallback(async () => {
    const towers = selectedTowers.length === MAX_TOWERS ? selectedTowers : DEFAULT_TOWERS;
    const orbs = selectedOrbs.length === MAX_ORBS ? selectedOrbs : DEFAULT_ORBS;
    const abilities = selectedAbilities.length === MAX_ABILITIES ? selectedAbilities : DEFAULT_ABILITIES;
    const resolvedMode = gameMode === 'training' ? `ai_${difficulty}` : gameMode;

    console.log('[Setup] Start match pressed', { mode: resolvedMode, towers, orbs, abilities });
    setIsStarting(true);

    try {
      console.log('[Setup] Calling set-loadout edge function', { towers, orbs, abilities });
      await supabase.functions.invoke('set-loadout', {
        body: { towers, orbs, abilities },
      });
    } catch (e) {
      console.warn('[Setup] set-loadout edge function failed', e);
    }

    router.push({
      pathname: '/game',
      params: {
        mode: resolvedMode,
        towers: JSON.stringify(towers),
        orbs: JSON.stringify(orbs),
        abilities: JSON.stringify(abilities),
        seed: String(Date.now()),
      },
    });
    setIsStarting(false);
  }, [gameMode, difficulty, selectedTowers, selectedOrbs, selectedAbilities]);

  const handleQuickPlay = useCallback(async () => {
    const resolvedMode = gameMode === 'training' ? `ai_${difficulty}` : gameMode;
    console.log('[Setup] Quick Play pressed', { mode: resolvedMode });
    setIsStarting(true);

    try {
      console.log('[Setup] Calling set-loadout edge function (quick play)');
      await supabase.functions.invoke('set-loadout', {
        body: {
          towers: DEFAULT_TOWERS,
          orbs: DEFAULT_ORBS,
          abilities: DEFAULT_ABILITIES,
        },
      });
    } catch (e) {
      console.warn('[Setup] set-loadout edge function failed', e);
    }

    router.push({
      pathname: '/game',
      params: {
        mode: resolvedMode,
        towers: JSON.stringify(DEFAULT_TOWERS),
        orbs: JSON.stringify(DEFAULT_ORBS),
        abilities: JSON.stringify(DEFAULT_ABILITIES),
        seed: String(Date.now()),
      },
    });
    setIsStarting(false);
  }, [gameMode, difficulty]);

  const canStart =
    selectedTowers.length === MAX_TOWERS &&
    selectedOrbs.length === MAX_ORBS &&
    selectedAbilities.length === MAX_ABILITIES;

  // ─── Mode selector ────────────────────────────────────────────────────────
  const ModeSelector = () => (
    <View style={styles.modeRow}>
      {(['training', 'casual', 'ranked'] as GameMode[]).map((m) => {
        const isActive = gameMode === m;
        const modeEmoji = m === 'training' ? '🎯' : m === 'casual' ? '🎲' : '🏆';
        const modeLabel = m === 'training' ? 'Training' : m === 'casual' ? 'Locker' : 'Rangliste';
        return (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, isActive && styles.modeBtnActive]}
            onPress={() => handleModeSelect(m)}
            activeOpacity={0.8}
          >
            <Text style={styles.modeEmoji}>{modeEmoji}</Text>
            <Text style={[styles.modeBtnText, isActive && styles.modeBtnTextActive]}>
              {modeLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ─── Quick Play View ──────────────────────────────────────────────────────
  if (viewMode === 'quick') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ChevronLeft size={20} color="#64748B" strokeWidth={2} />
          <Text style={styles.backText}>Start</Text>
        </TouchableOpacity>

        <View style={styles.quickContent}>
          <Text style={styles.bigEmoji}>⚔️</Text>

          <ModeSelector />

          {gameMode === 'training' && (
            <View style={styles.diffRow}>
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => {
                const isActive = difficulty === d;
                const diffColors: Record<Difficulty, string> = {
                  easy: '#22C55E',
                  normal: '#F59E0B',
                  hard: '#EF4444',
                };
                const diffColor = diffColors[d];
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.diffBtn, isActive && { borderColor: diffColor, backgroundColor: `${diffColor}15` }]}
                    onPress={() => handleDifficultySelect(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.diffBtnText, isActive && { color: diffColor }]}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.quickPlayBtn, isStarting && { opacity: 0.7 }]}
            onPress={handleQuickPlay}
            disabled={isStarting}
            activeOpacity={0.85}
          >
            <Text style={styles.quickPlayText}>⚡ Quick Play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeLoadoutBtn}
            onPress={() => {
              console.log('[Setup] Change Loadout pressed');
              setViewMode('loadout');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.changeLoadoutText}>⚙️ Change Loadout</Text>
          </TouchableOpacity>
        </View>

        {infoModal && (
          <InfoModal
            visible
            title={infoModal.title}
            description={infoModal.description}
            onClose={() => setInfoModal(null)}
          />
        )}
      </View>
    );
  }

  // ─── Loadout Editor View ──────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <ChevronLeft size={20} color="#64748B" strokeWidth={2} />
        <Text style={styles.backText}>Start</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.loadoutContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.loadoutTitle}>Loadout</Text>
        <Text style={styles.loadoutSubtitle}>Wähle 3 Kräfte, 4 Türme & 5 Orbs</Text>

        <ModeSelector />

        {/* ── Towers ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>TÜRME</Text>
          <Text style={styles.sectionCount}>
            {selectedTowers.length}/{MAX_TOWERS}
          </Text>
        </View>

        <View style={styles.cardGrid}>
          {STARTER_TOWERS.map((type) => {
            const selIdx = selectedTowers.indexOf(type);
            const isSelected = selIdx !== -1;
            const isLocked = !unlockedTowers.has(type);
            const cost = TOWER_COSTS[type] ?? 60;
            const name = TOWER_NAMES[type] ?? type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.towerCard,
                  isSelected && styles.towerCardSelected,
                  isLocked && styles.cardLocked,
                ]}
                onPress={() => !isLocked && handleToggleTower(type)}
                activeOpacity={isLocked ? 1 : 0.8}
              >
                {isSelected && (
                  <View style={styles.selBadge}>
                    <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.infoBtn}
                  onPress={() => handleShowInfo(name, `A powerful tower for your loadout.`)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Text style={styles.infoBtnText}>i</Text>
                </TouchableOpacity>
                <TowerIcon type={type} size={52} />
                <Text style={styles.cardName}>{name}</Text>
                {isLocked ? (
                  <View style={styles.lockedRow}>
                    <Lock size={11} color="#94A3B8" strokeWidth={2} />
                  </View>
                ) : (
                  <View style={styles.costRow}>
                    <Text style={styles.coinEmoji}>🪙</Text>
                    <Text style={styles.costText}>{cost}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.moreInLab}>+{TOWER_TYPES.length - STARTER_TOWERS.length} more in the Lab →</Text>

        {/* ── Orbs ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>ORBS</Text>
          <Text style={styles.sectionCount}>
            {selectedOrbs.length}/{MAX_ORBS}
          </Text>
        </View>

        <View style={styles.cardGrid}>
          {STARTER_ORBS.map((type) => {
            const selIdx = selectedOrbs.indexOf(type);
            const isSelected = selIdx !== -1;
            const hp = ORB_HP[type] ?? 27;
            const color = ORB_COLORS[type] ?? '#3B82F6';
            const name = ORB_NAMES[type] ?? type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.orbCard,
                  isSelected && { borderColor: '#6366F1', borderWidth: 3 },
                ]}
                onPress={() => handleToggleOrb(type)}
                activeOpacity={0.8}
              >
                {isSelected && (
                  <View style={styles.selBadge}>
                    <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.infoBtn}
                  onPress={() => handleShowInfo(name, `An orb type for your loadout.`)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Text style={styles.infoBtnText}>i</Text>
                </TouchableOpacity>
                <View style={[styles.orbCircle, { backgroundColor: color }]}>
                  <Text style={styles.orbHpText}>{hp}</Text>
                </View>
                <Text style={styles.cardName}>{name}</Text>
                <View style={styles.costRow}>
                  <Text style={styles.coinEmoji}>🪙</Text>
                  <Text style={styles.costText}>0</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Abilities ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>KRÄFTE</Text>
          <Text style={styles.sectionCount}>
            {selectedAbilities.length}/{MAX_ABILITIES}
          </Text>
        </View>

        <View style={styles.abilityGrid}>
          {STARTER_ABILITIES.map((type) => {
            const selIdx = selectedAbilities.indexOf(type);
            const isSelected = selIdx !== -1;
            const isLocked = !unlockedAbilities.has(type);
            const name = ABILITY_NAMES[type] ?? type;
            const icon = ABILITY_ICONS[type] ?? '✨';
            const desc = ABILITY_DESCS[type] ?? '';
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.abilityCard,
                  isSelected && styles.abilityCardSelected,
                  isLocked && styles.cardLocked,
                ]}
                onPress={() => !isLocked && handleToggleAbility(type)}
                activeOpacity={isLocked ? 1 : 0.8}
              >
                {isSelected && (
                  <View style={styles.selBadge}>
                    <Text style={styles.selBadgeText}>{selIdx + 1}</Text>
                  </View>
                )}
                <View style={styles.abilityIconCircle}>
                  <Text style={styles.abilityIconText}>{icon}</Text>
                </View>
                <View style={styles.abilityInfo}>
                  <Text style={styles.abilityName}>{name}</Text>
                  <Text style={styles.abilityDesc} numberOfLines={2}>{desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Start Match button ── */}
      <View style={[styles.startBtnWrap, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.startMatchBtn, (!canStart || isStarting) && styles.startMatchBtnDisabled]}
          onPress={handleStartMatch}
          disabled={!canStart || isStarting}
          activeOpacity={0.85}
        >
          <Text style={styles.startMatchText}>
            {canStart ? 'Start Match →' : `Select ${MAX_TOWERS - selectedTowers.length > 0 ? `${MAX_TOWERS - selectedTowers.length} more tower(s)` : MAX_ORBS - selectedOrbs.length > 0 ? `${MAX_ORBS - selectedOrbs.length} more orb(s)` : `${MAX_ABILITIES - selectedAbilities.length} more ability(s)`}`}
          </Text>
        </TouchableOpacity>
      </View>

      {infoModal && (
        <InfoModal
          visible
          title={infoModal.title}
          description={infoModal.description}
          onClose={() => setInfoModal(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  // ── Quick Play ──
  quickContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  bigEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  modeBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  modeEmoji: {
    fontSize: 16,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  diffRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  diffBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  quickPlayBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  quickPlayText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  changeLoadoutBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  changeLoadoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  // ── Loadout ──
  loadoutContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  loadoutTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  loadoutSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: -4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  towerCard: {
    width: (SCREEN_WIDTH - 32 - 16) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  towerCardSelected: {
    borderColor: '#F59E0B',
    borderWidth: 3,
  },
  cardLocked: {
    opacity: 0.4,
  },
  selBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  selBadgeText: {
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
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  cardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  coinEmoji: {
    fontSize: 11,
  },
  costText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  moreInLab: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
    marginTop: 4,
  },
  orbCard: {
    width: (SCREEN_WIDTH - 32 - 16) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  orbCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbHpText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  abilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  abilityCard: {
    width: (SCREEN_WIDTH - 32 - 8) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  abilityCardSelected: {
    borderColor: '#3B82F6',
    borderWidth: 3,
  },
  abilityIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  abilityIconText: {
    fontSize: 22,
  },
  abilityInfo: {
    flex: 1,
    gap: 3,
  },
  abilityName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  abilityDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  startBtnWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#F1F5F9',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  startMatchBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  startMatchBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  startMatchText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
