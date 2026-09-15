import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { GestureDetector, Gesture, Pressable as GHPressable } from 'react-native-gesture-handler';
import { X, Pause, Play, Flag, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useProfile } from '@/contexts/ProfileContext';
import { useTranslation } from '@/i18n/LanguageContext';
import { GameCanvas } from '@/components/GameCanvas';
import { HPBar } from '@/components/HPBar';
import { CoinDisplay } from '@/components/CoinDisplay';
import { AbilityButton } from '@/components/AbilityButton';
import { LeagueBadge } from '@/components/LeagueBadge';
import {
  createInitialState,
  clickOrb,
  placeTower,
  upgradeTower,
  sellTower,
  cleanseTower,
  activateAbility,
  confirmAim,
  cancelAim,
  confirmTargeting,
  collectCoin,
  selectTower,
  addTargetOrb,
  placeOrbAtSlot,
} from '@/game/engine';
import type { GameState, Tower, Loadout, AbilityState } from '@/game/engine-types';
import type { OrbDef } from '@/game/constants';
import type { TowerType, AbilityType, OrbType } from '@/game/constants';
import { TOWER_COSTS, TOWER_TYPES, ORB_TYPES, UPGRADE_COST_MULT_ARRAY, SELL_RATIO, GAME_WIDTH, GAME_HEIGHT, WALL_Y, ORB_SLOTS, PLAYER_STATION_X, PLAYER_STATION_Y } from '@/game/constants';
import { getTowerRange, getTowerDamage, getTowerFireRate, distance } from '@/game/engine-helpers';
import { TowerIcon } from '@/components/TowerIcon';
import { TutorialCoachmark } from '@/components/TutorialCoachmark';
import { setVisibilityAsync as navBarSetVisibility } from 'expo-navigation-bar';
import type { MatchMode } from '@/game/engine-types';
import { useGameLoop } from '@/hooks/useGameLoop';
import type { HudState } from '@/hooks/useGameLoop';
import { supabase } from '@/utils/supabase';
import { getLeague } from '@/game/constants';

// ─── Default loadout ──────────────────────────────────────────────────────────
const DEFAULT_LOADOUT: Loadout = {
  towers: ['basic', 'machinegun', 'boomerang', 'bomb'] as TowerType[],
  orbs: ['normal', 'fast', 'bomb', 'splitter', 'tank'] as OrbType[],
  abilities: ['zap', 'portal', 'repair'] as AbilityType[],
  sideTowerLevel: 0,
  handLevel: 0,
  cardLevels: {},
};

// ─── AI name by difficulty ────────────────────────────────────────────────────
const AI_NAMES: Record<string, string> = {
  easy: 'Rookie Bot',
  normal: 'Veteran Bot',
  hard: 'Elite Bot',
};

// ─── Map UI mode+difficulty → engine MatchMode ───────────────────────────────
function resolveEngineMode(mode: string, difficulty: string): MatchMode {
  if (mode === 'ranked') return 'ranked';
  if (mode === 'private') return 'private';
  if (mode === 'tutorial') return 'tutorial';
  const diff = difficulty === 'hard' ? 'hard' : difficulty === 'easy' ? 'easy' : 'normal';
  return `ai_${diff}` as MatchMode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function findOrbAtPosition(state: GameState, gx: number, gy: number): { id: string } | null {
  const TAP_RADIUS = 28;
  for (const orb of state.orbs) {
    if (orb.side !== 0) continue; // only click opponent orbs (side=0)
    if (distance(orb.x, orb.y, gx, gy) <= orb.radius + TAP_RADIUS) {
      return { id: orb.id };
    }
  }
  return null;
}

function findCoinAtPosition(state: GameState, gx: number, gy: number): { id: string } | null {
  for (const coin of state.coinPickups) {
    if (distance(coin.x, coin.y, gx, gy) <= 20) {
      return { id: coin.id };
    }
  }
  return null;
}

function findTowerAtPosition(state: GameState, gx: number, gy: number): Tower | null {
  for (const tower of state.player.towers) {
    if (distance(tower.x, tower.y, gx, gy) <= 20) {
      return tower;
    }
  }
  return null;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTowerUpgradeCost(tower: Tower): number {
  const base = TOWER_COSTS[tower.type] ?? 60;
  return Math.round(base * (UPGRADE_COST_MULT_ARRAY[tower.level] ?? 1));
}

function getTowerSellValue(tower: Tower): number {
  const base = TOWER_COSTS[tower.type] ?? 60;
  let total = base;
  for (let l = 1; l < tower.level; l++) {
    total += Math.round(base * (UPGRADE_COST_MULT_ARRAY[l] ?? 1));
  }
  return Math.round(total * SELL_RATIO);
}

function getTowerStats(type: string, level: number) {
  return {
    damage: getTowerDamage(type as any, level),
    fireRate: getTowerFireRate(type as any, level),
    range: getTowerRange(type as any, level),
    perk: null as { label: string } | null,
  };
}

// ─── Result data type ─────────────────────────────────────────────────────────
interface ResultData {
  won: boolean;
  change?: number;
  opponent?: string;
  oldTrophies?: number;
  newTrophies?: number;
  oldLeague?: string;
  newLeague?: string;
  promoted?: boolean;
  demoted?: boolean;
  shardDrop?: boolean;
  shardCrateAmt?: number;
  orbUnlocks?: string[];
  towerUnlocks?: string[];
  shardsEarned?: number;
  training?: boolean;
}

// ─── TopHUD ───────────────────────────────────────────────────────────────────
interface TopHUDProps {
  opponentName: string;
  isAiMode: boolean;
  insets: { top: number; bottom: number };
  timeDisplay: string;
  escalationTier: string;
  clicksLeft: number;
  maxClicks: number;
  playerCoins: number;
  onPause: () => void;
  firstPlacement: boolean;
  loadoutTowers: string[];
}

const TopHUD = React.memo(function TopHUD({
  opponentName,
  isAiMode,
  insets,
  timeDisplay,
  escalationTier,
  clicksLeft,
  maxClicks,
  playerCoins,
  onPause,
  firstPlacement,
  loadoutTowers,
}: TopHUDProps) {
  const escalationLabel: Record<string, string> = {
    overtime: 'OT',
    intensifying: 'INT',
    critical: 'CRIT',
    max_pressure: 'MAX',
    tower_bleed: 'BLEED',
  };

  const timerPillBg = escalationTier === 'tower_bleed'
    ? '#7F1D1D'
    : escalationTier === 'critical' || escalationTier === 'max_pressure'
    ? '#FEE2E2'
    : escalationTier === 'overtime' || escalationTier === 'intensifying'
    ? '#FFEDD5'
    : '#F1F5F9';
  const timerPillTextColor = escalationTier === 'tower_bleed'
    ? '#FEF2F2'
    : escalationTier === 'critical' || escalationTier === 'max_pressure'
    ? '#DC2626'
    : escalationTier === 'overtime' || escalationTier === 'intensifying'
    ? '#EA580C'
    : '#334155';
  const timerLabel = escalationTier !== 'none'
    ? (escalationLabel[escalationTier] ?? escalationTier.toUpperCase())
    : null;
  const clicksPillBg = clicksLeft >= maxClicks
    ? 'rgba(16,185,129,0.12)'
    : clicksLeft === 0
    ? 'rgba(244,63,94,0.12)'
    : '#F1F5F9';
  const clicksPillBorder = clicksLeft >= maxClicks
    ? '#10B981'
    : clicksLeft === 0
    ? '#F43F5E'
    : '#E2E8F0';

  const cheapestCost = loadoutTowers.length > 0
    ? Math.min(...loadoutTowers.map((t) => {
        const base = TOWER_COSTS[t as TowerType] ?? 60;
        return firstPlacement ? Math.round(base * 0.8) : base;
      }))
    : 60;
  const coinTextColor = playerCoins < cheapestCost ? '#EF4444' : '#0F172A';

  const timerText = timerLabel ?? timeDisplay;

  return (
    <View style={[styles.topHud, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
      <View style={styles.hudTopRow}>
        <Pressable onPress={onPause} hitSlop={8}>
          <ArrowLeft size={22} color="#94A3B8" strokeWidth={2} />
        </Pressable>

        <View style={styles.hudCenterBlock}>
          <View style={styles.opponentNameRow}>
            <Text style={styles.hudOpponentName} numberOfLines={1}>{opponentName}</Text>
            {isAiMode && (
              <View style={styles.kiBadge}>
                <Text style={styles.kiBadgeText}>AI</Text>
              </View>
            )}
          </View>
          <View style={[styles.timerPill, { backgroundColor: timerPillBg }]}>
            <Text style={[styles.timerPillText, { color: timerPillTextColor }]}>{timerText}</Text>
          </View>
        </View>

        <View style={styles.hudPills}>
          <View style={[styles.clicksPill, { backgroundColor: clicksPillBg, borderColor: clicksPillBorder }]}>
            <Text style={styles.pillText}>👆 {clicksLeft}/{maxClicks}</Text>
          </View>
          <View style={styles.coinsPill}>
            <View style={styles.coinDot} />
            <Text style={[styles.pillText, { color: coinTextColor }]}>{playerCoins}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

// ─── BottomHUD ────────────────────────────────────────────────────────────────
interface BottomHUDProps {
  abilities: AbilityState[];
  onAbility: (type: AbilityType) => void;
  editMode: boolean;
  placementModeActive: boolean;
  loadoutTowers: TowerType[];
  selectedTowerType: TowerType | null;
  playerCoinsForTower: number;
  onToggleEditMode: () => void;
  onOpenOrbShop: () => void;
  onSelectTower: (type: TowerType | null) => void;
  onDragMove?: (absX: number, absY: number) => void;
  onDragEnd?: (absX: number, absY: number) => void;
  insets: { top: number; bottom: number };
  firstPlacement: boolean;
}

const BottomHUD = React.memo(function BottomHUD({
  abilities,
  onAbility,
  editMode,
  placementModeActive,
  loadoutTowers,
  selectedTowerType,
  playerCoinsForTower,
  onToggleEditMode,
  onOpenOrbShop,
  onSelectTower,
  onDragMove,
  onDragEnd,
  insets,
  firstPlacement,
}: BottomHUDProps) {
  const towerNameFirst = (type: TowerType) => {
    const name = TOWER_TYPES[type]?.name ?? String(type);
    return name.split(' ')[0];
  };

  return (
    <View style={[styles.bottomHud, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
      <View style={styles.abilityRow}>
        <View style={styles.abilityButtons}>
          {abilities.map((ability) => (
            <AbilityButton
              key={ability.type}
              abilityType={ability.type}
              cooldown={ability.cooldown}
              maxCooldown={ability.maxCooldown}
              onPress={() => {
                console.log('[Game] Ability pressed:', ability.type);
                onAbility(ability.type);
              }}
              size={56}
            />
          ))}
        </View>

        {/* Orb shop + edit toggle grouped on the right */}
        <View style={{ position: 'relative', overflow: 'visible' }}>
          {placementModeActive ? (
            <View style={{ width: 56, height: 56 }} />
          ) : (
            <GHPressable
              style={styles.orbShopCircleBtn}
              onPress={() => {
                console.log('[Game] Orb shop button pressed');
                onOpenOrbShop();
              }}
            >
              <Text style={styles.orbShopCircleBtnText}>🌀</Text>
            </GHPressable>
          )}
          {/* Edit toggle: diagonally below-left of orb shop */}
          <GHPressable
            style={[styles.editToggleBtn, editMode && styles.editToggleBtnActive, { position: 'absolute', bottom: -28, left: -46 }]}
            onPress={() => {
              console.log('[Game] Edit mode toggle pressed, current:', editMode);
              onToggleEditMode();
            }}
          >
            <Text style={styles.editToggleBtnText}>{editMode ? '✅' : '✏️'}</Text>
          </GHPressable>
        </View>
      </View>

      <View style={styles.towerTrayBorder}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.towerBar}
          contentContainerStyle={styles.towerBarContent}
        >
          {loadoutTowers.map((towerType) => {
            const baseCost = TOWER_COSTS[towerType] ?? 60;
            const cost = firstPlacement ? Math.round(baseCost * 0.8) : baseCost;
            const isSelected = selectedTowerType === towerType;
            const canAfford = playerCoinsForTower >= cost;
            const firstName = towerNameFirst(towerType);
            return (
              <GestureDetector
                key={towerType}
                gesture={Gesture.Race(
                  Gesture.Pan()
                    .runOnJS(true)
                    .minDistance(8)
                    .onBegin(() => {
                      onSelectTower(towerType);
                    })
                    .onUpdate((e) => {
                      onDragMove?.(e.absoluteX, e.absoluteY);
                    })
                    .onEnd((e) => {
                      onDragEnd?.(e.absoluteX, e.absoluteY);
                    }),
                  Gesture.Tap()
                    .runOnJS(true)
                    .onEnd(() => {
                      onSelectTower(isSelected ? null : towerType);
                    }),
                )}
              >
                <Animated.View
                  style={[
                    styles.towerCard,
                    isSelected && styles.towerCardSelected,
                    !canAfford && styles.towerCardDisabled,
                  ]}
                >
                  <TowerIcon type={towerType} size={34} />
                  <Text style={styles.towerName} numberOfLines={1}>{firstName}</Text>
                  <View style={styles.towerCostRow}>
                    <Text style={[styles.towerCost, !canAfford && { color: COLORS.textTertiary }]}>
                      🪙 {cost}
                    </Text>
                  </View>
                  {firstPlacement && (
                    <Text style={styles.towerDiscountBadge}>−20%</Text>
                  )}
                </Animated.View>
              </GestureDetector>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    mode?: string;
    difficulty?: string;
    towers?: string;
    orbs?: string;
    abilities?: string;
    sessionId?: string;
    seed?: string;
    opponentName?: string;
    opponentTrophies?: string;
    role?: string;
  }>();

  const paramsReady = !!params && typeof params === 'object';

  const uiMode = paramsReady ? (params.mode ?? 'casual') : 'casual';
  const difficulty = paramsReady ? (params.difficulty ?? 'normal') : 'normal';
  const engineMode = resolveEngineMode(uiMode, difficulty);
  const seedFallbackRef = useRef(Date.now());
  const seed = paramsReady ? parseInt(params.seed ?? String(seedFallbackRef.current), 10) : seedFallbackRef.current;

  let parsedTowers: TowerType[] = DEFAULT_LOADOUT.towers;
  try {
    if (paramsReady && params.towers) parsedTowers = JSON.parse(params.towers) as TowerType[];
  } catch {
    parsedTowers = DEFAULT_LOADOUT.towers;
  }

  let parsedOrbs: OrbType[] = DEFAULT_LOADOUT.orbs;
  try {
    if (paramsReady && params.orbs) parsedOrbs = JSON.parse(params.orbs) as OrbType[];
  } catch {
    parsedOrbs = DEFAULT_LOADOUT.orbs;
  }

  let parsedAbilities: AbilityType[] = DEFAULT_LOADOUT.abilities;
  try {
    if (paramsReady && params.abilities) parsedAbilities = JSON.parse(params.abilities) as AbilityType[];
  } catch {
    parsedAbilities = DEFAULT_LOADOUT.abilities;
  }

  const loadout: Loadout = {
    towers: parsedTowers,
    orbs: parsedOrbs,
    abilities: parsedAbilities,
    sideTowerLevel: profile?.side_tower_level ?? 0,
    handLevel: profile?.hand_level ?? 0,
    cardLevels: {},
  };

  const opponentName = paramsReady ? (params.opponentName ?? AI_NAMES[difficulty] ?? 'Opponent') : 'Opponent';
  const isAiMode = engineMode.startsWith('ai_');

  // ── Core game state ──
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  // ── Tutorial state (only active when mode === 'tutorial') ──
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const tutorialStepRef = useRef<number | null>(null);
  const [orbTapCount, setOrbTapCount] = useState(0);
  const orbTapCountRef = useRef(0);
  const [tutorialUpgraded, setTutorialUpgraded] = useState(false);
  const tutorialUpgradedRef = useRef(false);
  const [coachmarkHidden, setCoachmarkHidden] = useState(false);

  // ── New state variables ──
  const [searching, setSearching] = useState(true);
  const [searchTime, setSearchTime] = useState(15);
  const [searchToast, setSearchToast] = useState('');
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [placementMode, setPlacementMode] = useState<{ active: boolean; typeId: string | null }>({ active: false, typeId: null });
  const [editMode, setEditMode] = useState(false);
  const [selectedTowerForEdit, setSelectedTowerForEdit] = useState<Tower | null>(null);

  const [showForfeitDialog, setShowForfeitDialog] = useState(false);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [towerPopupPos, setTowerPopupPos] = useState<{ x: number; y: number } | null>(null);

  // ── Initial state (created once) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialState = useMemo(() => {
    try {
      return createInitialState(engineMode, 0, seed, loadout);
    } catch (e) {
      console.error('[Game] createInitialState failed, using fallback:', e);
      return createInitialState('ai_normal', 0, seedFallbackRef.current, DEFAULT_LOADOUT);
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionIdParam = params?.mode ? (params.sessionId as string | undefined) : undefined;
  const opponentNameParam = params?.mode ? (params.opponentName as string | undefined) : undefined;

  // ── beginMatch ──
  const beginMatch = useCallback(() => {
    setSearching(false);
    setSearchToast('');
  }, []);

  // ── On mount: skip search for training/tutorial ──
  useEffect(() => {
    if (!params?.mode) return;
    if (params.mode === 'training' || params.mode === 'tutorial') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      beginMatch();
      return;
    }
    // For other modes, countdown starts via the searchTime effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.mode]);

  // ── Countdown timer ──
  useEffect(() => {
    if (!searching) return;
    if (searchTime <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchToast('No player found — starting vs AI');
      const t = setTimeout(() => {
        beginMatch();
      }, 1400);
      return () => clearTimeout(t);
    }
    const iv = setInterval(() => setSearchTime((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(iv);
  }, [searching, searchTime, beginMatch]);

  // ── Notify backend that match has started ──
  useEffect(() => {
    if (searching) return; // only after match begins
    if (isAiMode || uiMode === 'ranked') {
      console.log('[Game] Calling start-ai-match on game start', { mode: uiMode });
      supabase.functions.invoke('start-ai-match', {}).catch((e) => {
        console.warn('[Game] start-ai-match exception', e);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  // ── handleMatchEnd — sets resultData inline ──
  const handleGameEnd = useCallback(async (state: GameState) => {
    const isWin = state.winner === 'player';
    const elapsedSeconds = Math.floor(state.time / 1000);
    const sessionId = sessionIdParam;
    const isMultiplayer = !!sessionId;
    const isAiGame = engineMode.startsWith('ai_');

    console.log(`[Game] Game finished winner=${state.winner} mode=${uiMode} difficulty=${difficulty} elapsed=${elapsedSeconds}s multiplayer=${isMultiplayer}`);

    let trophyChange = isWin ? 25 : -15;
    let oldTrophies = 0;
    let newTrophies = 0;
    let oldLeague = 'Beginner';
    let newLeague = 'Beginner';
    let promoted = false;
    let demoted = false;
    let shardDrop = false;
    let shardCrateAmt = 0;
    let orbUnlocks: string[] = [];
    let towerUnlocks: string[] = [];
    let shardsEarned = 0;

    if (isMultiplayer && sessionId) {
      const myHp = state.player.station.hp;
      const oppHp = state.opponent.station.hp;
      try {
        console.log('[Game] Calling finalize-match edge function', { sessionId, outcome: isWin ? 'win' : 'loss' });
        const { data, error } = await supabase.functions.invoke('finalize-match', {
          body: { sessionId, outcome: isWin ? 'win' : 'loss', gameTime: elapsedSeconds, myHp, oppHp },
        });
        if (error) {
          console.warn('[Game] finalize-match error:', error.message);
        } else {
          console.log('[Game] finalize-match response:', data);
          const d = data || {};
          trophyChange = d.trophyChange ?? trophyChange;
          oldTrophies = d.oldTrophies ?? 0;
          newTrophies = d.newTrophies ?? 0;
          oldLeague = d.oldLeague ?? 'Beginner';
          newLeague = d.newLeague ?? 'Beginner';
          promoted = d.promoted ?? false;
          demoted = d.demoted ?? false;
          shardDrop = d.shardDrop ?? false;
          shardCrateAmt = d.shardCrateAmt ?? 0;
          orbUnlocks = d.orbUnlocks ?? [];
          towerUnlocks = d.towerUnlocks ?? [];
          shardsEarned = d.shardsEarned ?? 0;
        }
      } catch (err) {
        console.warn('[Game] finalize-match exception:', err);
      }
    } else if (isAiGame) {
      try {
        console.log('[Game] Calling finalize-ai-match edge function', { outcome: isWin ? 'win' : 'loss', difficulty });
        const { data, error } = await supabase.functions.invoke('finalize-ai-match', {
          body: { outcome: isWin ? 'win' : 'loss', gameTime: elapsedSeconds, difficulty },
        });
        if (error) {
          console.warn('[Game] finalize-ai-match error:', error.message);
        } else {
          console.log('[Game] finalize-ai-match response:', data);
          const d = data || {};
          trophyChange = d.trophyChange ?? trophyChange;
          oldTrophies = d.oldTrophies ?? 0;
          newTrophies = d.newTrophies ?? 0;
          oldLeague = d.oldLeague ?? 'Beginner';
          newLeague = d.newLeague ?? 'Beginner';
          promoted = d.promoted ?? false;
          demoted = d.demoted ?? false;
          shardDrop = d.shardDrop ?? false;
          shardCrateAmt = d.shardCrateAmt ?? 0;
          orbUnlocks = d.orbUnlocks ?? [];
          towerUnlocks = d.towerUnlocks ?? [];
          shardsEarned = d.shardsEarned ?? 0;
        }
      } catch (err) {
        console.warn('[Game] finalize-ai-match exception:', err);
      }
    }

    const finalOpponentName = opponentNameParam ?? AI_NAMES[difficulty] ?? 'Opponent';

    setTimeout(() => {
      setResultData({
        won: isWin,
        change: trophyChange,
        opponent: finalOpponentName,
        oldTrophies,
        newTrophies,
        oldLeague,
        newLeague,
        promoted,
        demoted,
        shardDrop,
        shardCrateAmt,
        orbUnlocks,
        towerUnlocks,
        shardsEarned,
        training: uiMode === 'training',
      });
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiMode, difficulty, sessionIdParam, opponentNameParam]);

  const { hudState, stateRef: gameStateRef, dispatch, pause, resume, forceHudUpdate } = useGameLoop({
    initialState,
    mode: engineMode,
    onGameEnd: handleGameEnd,
  });

  // ── Canvas dimensions ──
  const HUD_TOP_HEIGHT = 80 + insets.top;
  const HUD_BOTTOM_HEIGHT = 180;
  const [canvasDims, setCanvasDims] = React.useState({ width: 320, height: 480 });
  const canvasContainerRef = React.useRef<View>(null);
  const canvasContainerLayout = React.useRef({ x: 0, y: 0, width: 320, height: 480 });
  const dragTowerTypeRef = useRef<string | null>(null);
  const canvasWidth = canvasDims.width;
  const canvasHeight = canvasDims.height;
  const canvasScale = canvasWidth > 0 && canvasHeight > 0
    ? Math.min(canvasWidth / GAME_WIDTH, canvasHeight / GAME_HEIGHT)
    : 1;

  // ── Tutorial helpers ──
  const advanceTutorial = useCallback(() => {
    const next = tutorialStepRef.current === null ? 0 : tutorialStepRef.current + 1;
    tutorialStepRef.current = next;
    setTutorialStep(next);
    setCoachmarkHidden(true);
    setTimeout(() => setCoachmarkHidden(false), 300);
  }, []);

  const completeTutorial = useCallback(async () => {
    tutorialStepRef.current = null;
    setTutorialStep(null);
    try {
      await supabase.functions.invoke('complete-tutorial', {});
    } catch (e) {
      console.warn('[Tutorial] complete-tutorial error', e);
    }
    router.replace('/(tabs)/(home)' as any);
  }, []);

  // ── Android nav bar: hide on mount, restore on unmount ──
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    navBarSetVisibility('hidden').catch(() => {});
    return () => {
      navBarSetVisibility('visible').catch(() => {});
    };
  }, []);

  // ── Initialize tutorial on mount ──
  useEffect(() => {
    if (uiMode !== 'tutorial') return;
    const t = setTimeout(() => {
      tutorialStepRef.current = 0;
      setTutorialStep(0);
    }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tower selection ──
  const handleSelectTower = useCallback((type: TowerType | null) => {
    dragTowerTypeRef.current = type;
    dispatch((s) => selectTower(s, type));
  }, [dispatch]);

  // ── Touch handling ──
  const tapGesture = useMemo(() => Gesture.Tap()
    .runOnJS(true)
    .maxDuration(250)
    .onEnd((event) => {
      const { x, y } = event;
      const gameX = x / canvasScale;
      const gameY = y / canvasScale;

      const state = gameStateRef.current as GameState;

      if (state.aiming) {
        dispatch((s) => confirmAim(s, gameX, gameY));
        return;
      }

      // Portal targeting mode: tap selects/deselects orbs
      if (state.targeting) {
        const tappedOrb = findOrbAtPosition(state, gameX, gameY);
        if (tappedOrb) {
          dispatch((s) => addTargetOrb(s, tappedOrb.id));
          return;
        }
        return; // tap outside orb cancels nothing — just ignore
      }

      const coin = findCoinAtPosition(state, gameX, gameY);
      if (coin) {
        dispatch((s) => collectCoin(s, coin.id));
        return;
      }

      const tappedOrb = findOrbAtPosition(state, gameX, gameY);
      if (tappedOrb) {
        dispatch((s) => clickOrb(s, tappedOrb.id));
        forceHudUpdate();
        // Tutorial step 0: count orb taps
        if (tutorialStepRef.current === 0) {
          const newCount = orbTapCountRef.current + 1;
          orbTapCountRef.current = newCount;
          setOrbTapCount(newCount);
          if (newCount >= 5) {
            advanceTutorial();
          }
        }
        return;
      }

      // Tower tap: always open upgrade popup (towerMenuAnytime)
      const tappedTower = findTowerAtPosition(state, gameX, gameY);
      if (tappedTower && tappedTower.side === 1) {
        setSelectedTowerForEdit({ ...tappedTower });
        setTowerPopupPos({ x: tappedTower.x * canvasScale, y: tappedTower.y * canvasScale });
        return;
      }

      if (state.player.selectedTower && gameY > WALL_Y) {
        dispatch((s) => placeTower(s, s.player.selectedTower!, gameX, gameY));
        handleSelectTower(null);
        if (tutorialStepRef.current === 1) {
          advanceTutorial();
        }
        return;
      }
    }),
  [canvasScale, dispatch, gameStateRef, advanceTutorial, handleSelectTower, forceHudUpdate]);

  const longPressGesture = useMemo(() => Gesture.LongPress()
    .runOnJS(true)
    .minDuration(400)
    .onStart((event) => {
      const { x, y } = event;
      const gameX = x / canvasScale;
      const gameY = y / canvasScale;
      const tower = findTowerAtPosition(gameStateRef.current, gameX, gameY);
      if (tower) {
        setSelectedTowerForEdit({ ...tower });
        setEditMode(true);
      }
    }),
  [canvasScale, gameStateRef]);

  const composedGesture = useMemo(
    () => Gesture.Exclusive(longPressGesture, tapGesture),
    [longPressGesture, tapGesture]
  );

  // ── Ability activation ──
  const handleAbility = useCallback((abilityType: AbilityType) => {
    dispatch((s) => activateAbility(s, abilityType));
    // Tutorial step 3: ability used
    if (tutorialStepRef.current === 3) {
      setTimeout(() => advanceTutorial(), 2500);
    }
  }, [dispatch, advanceTutorial]);

  const handleConfirmTargeting = useCallback(() => {
    dispatch((s) => confirmTargeting(s));
  }, [dispatch]);

  // ── Tower edit actions ──
  const handleUpgradeTower = useCallback(() => {
    if (!selectedTowerForEdit) return;
    dispatch((s) => upgradeTower(s, selectedTowerForEdit.id));
    // Tutorial step 2: mark upgrade done
    if (tutorialStepRef.current === 2) {
      tutorialUpgradedRef.current = true;
      setTutorialUpgraded(true);
    }
    setSelectedTowerForEdit(null);
    setTowerPopupPos(null);
  }, [selectedTowerForEdit, dispatch]);

  const handleSellTower = useCallback(() => {
    if (!selectedTowerForEdit) return;
    dispatch((s) => sellTower(s, selectedTowerForEdit.id));
    setSelectedTowerForEdit(null);
    setTowerPopupPos(null);
  }, [selectedTowerForEdit, dispatch]);

  const handleCleanseTower = useCallback(() => {
    if (!selectedTowerForEdit) return;
    dispatch((s) => cleanseTower(s, selectedTowerForEdit.id));
    setSelectedTowerForEdit(null);
    setTowerPopupPos(null);
  }, [selectedTowerForEdit, dispatch]);

  // ── Orb shop ──
  const handleOpenOrbShop = useCallback(() => {
    console.log('[Game] Open orb shop pressed, entering placement mode');
    const typeId = placementMode.typeId || (loadout.orbs?.[0] ?? 'normal');
    setPlacementMode({ active: true, typeId });
  }, [placementMode.typeId, loadout.orbs]);

  const handleSwitchPlacementOrb = useCallback((typeId: string) => {
    console.log('[Game] Switch placement orb:', typeId);
    setPlacementMode({ active: true, typeId });
  }, []);

  const handlePlaceOrbAtSlot = useCallback((slotIndex: number) => {
    if (!placementMode.typeId) return;
    const typeId = placementMode.typeId as OrbType;
    const orbDef = ORB_TYPES[typeId];
    if (!orbDef) return;
    const state = gameStateRef.current as GameState;
    if (state.player.coins < orbDef.cost) return;
    dispatch((s) => placeOrbAtSlot(s, typeId, slotIndex));
    // Tutorial step 4: orb sent
    if (tutorialStepRef.current === 4) {
      setTimeout(() => advanceTutorial(), 2500);
    }
  }, [placementMode.typeId, dispatch, gameStateRef, advanceTutorial]);

  const handleCancelPlacement = useCallback(() => {
    setPlacementMode({ active: false, typeId: null });
  }, []);

  // ── Edit mode toggle ──
  const handleToggleEditMode = useCallback(() => {
    const next = !editMode;
    setEditMode(next);
    if (!next) {
      setSelectedTowerForEdit(null);
      setTowerPopupPos(null);
    }
  }, [editMode]);

  const handleDragMove = useCallback((absX: number, absY: number) => {
    const layout = canvasContainerLayout.current;
    if (layout.width === 0) return;
    const relX = absX - layout.x;
    const relY = absY - layout.y;
    const gx = (relX / layout.width) * GAME_WIDTH;
    const gy = (relY / layout.height) * GAME_HEIGHT;
    setPreviewPos({ x: gx, y: gy });
  }, []);

  const handleDragEnd = useCallback((absX: number, absY: number) => {
    const layout = canvasContainerLayout.current;
    if (layout.width === 0) return;
    const relX = absX - layout.x;
    const relY = absY - layout.y;
    const gx = (relX / layout.width) * GAME_WIDTH;
    const gy = (relY / layout.height) * GAME_HEIGHT;
    const type = dragTowerTypeRef.current;
    if (!type) return;
    if (gy > WALL_Y + 18 && gy < GAME_HEIGHT - 24 && gx > 20 && gx < GAME_WIDTH - 20) {
      // Station clearance (matching web app)
      const distToPlayerStation = Math.hypot(gx - PLAYER_STATION_X, gy - PLAYER_STATION_Y);
      if (distToPlayerStation < 64) {
        setPreviewPos(null);
        dragTowerTypeRef.current = null;
        handleSelectTower(null);
        return;
      }
      dispatch((s) => {
        const result = placeTower(s, type as TowerType, gx, gy);
        return result ?? s;
      });
    }
    setPreviewPos(null);
    dragTowerTypeRef.current = null;
    handleSelectTower(null);
  }, [dispatch, handleSelectTower]);

  // ── Pause ──
  const handlePause = useCallback(() => {
    pause();
    setIsPaused(true);
    setShowPauseMenu(true);
  }, [pause]);

  const handleResume = useCallback(() => {
    setShowPauseMenu(false);
    setIsPaused(false);
    resume();
  }, [resume, setShowPauseMenu, setIsPaused]);

  const handleForfeit = useCallback(() => {
    setShowForfeitDialog(false);
    setShowPauseMenu(false);
    router.push('/');
  }, [setShowForfeitDialog, setShowPauseMenu]);

  const handleCancelAim = useCallback(() => {
    dispatch((s) => cancelAim(s));
  }, [dispatch]);

  // ── Derived display values (from hudState at ~30fps) ──
  const playerHp = hudState?.playerHp ?? 0;
  const playerMaxHp = hudState?.playerMaxHp ?? 100;
  const oppHp = hudState?.oppHp ?? 0;
  const oppMaxHp = hudState?.oppMaxHp ?? 100;
  const playerCoins = Math.floor(hudState?.coins ?? 0);
  const timeDisplay = formatTime(hudState?.time ?? 0);
  const selectedTowerType = (hudState?.selectedTower ?? null) as TowerType | null;
  const isAiming = (gameStateRef.current?.aiming ?? null) !== null;
  const clicksLeft = hudState?.clicks ?? 0;
  const maxClicks = hudState?.maxClicks ?? 5;
  const escalationTier = hudState?.escalationTier ?? 'none';
  const hudAbilities = hudState?.abilities ?? [];

  const escalationLabel: Record<string, string> = {
    overtime: 'OT',
    intensifying: 'INT',
    critical: 'CRIT',
    max_pressure: 'MAX',
    tower_bleed: 'BLEED',
  };
  const escalationColor: Record<string, string> = {
    overtime: COLORS.warning,
    intensifying: '#F97316',
    critical: COLORS.danger,
    max_pressure: '#DC2626',
    tower_bleed: '#7F1D1D',
  };

  // ── Result screen derived values ──
  const resultWon = resultData?.won ?? false;
  const resultChange = resultData?.change ?? 0;
  const resultChangeSign = resultChange >= 0 ? '+' : '';
  const resultOldTrophies = resultData?.oldTrophies ?? 0;
  const resultNewTrophies = resultData?.newTrophies ?? 0;
  const resultShardsEarned = resultData?.shardsEarned ?? 0;
  const resultOrbUnlocks = resultData?.orbUnlocks ?? [];
  const resultTowerUnlocks = resultData?.towerUnlocks ?? [];
  const resultHasUnlocks = resultOrbUnlocks.length > 0 || resultTowerUnlocks.length > 0;
  const resultTitle = resultWon ? 'VICTORY' : 'DEFEAT';
  const resultEmoji = resultWon ? '🏆' : '💀';

  // ── Searching screen bob animation ──
  const searchBobAnimRef = useRef(new Animated.Value(0));
  const searchBobAnim = searchBobAnimRef.current;
  useEffect(() => {
    if (!searching) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(searchBobAnim, { toValue: -8, duration: 700, useNativeDriver: true }),
        Animated.timing(searchBobAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [searching, searchBobAnim]);

  // Guard: params not ready
  if (!params?.mode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 32 }}>⏳</Text>
      </View>
    );
  }

  const searchEmoji = uiMode === 'training' || uiMode === 'tutorial' ? '🎯' : '🛰️';
  const searchTitle = uiMode === 'training' || uiMode === 'tutorial'
    ? t('game.startingMatch')
    : t('game.searching');
  const isTrainingOrTutorial = uiMode === 'training' || uiMode === 'tutorial';

  return (
    <View style={styles.root}>
      {/* ── Top HUD (~10fps) ── */}
      <TopHUD
        opponentName={opponentName}
        isAiMode={isAiMode}
        insets={insets}
        timeDisplay={timeDisplay}
        escalationTier={escalationTier}
        clicksLeft={clicksLeft}
        maxClicks={maxClicks}
        playerCoins={playerCoins}
        onPause={handlePause}
        firstPlacement={hudState?.firstPlacement ?? true}
        loadoutTowers={loadout.towers}
      />

      {/* ── Game Canvas ── */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4, overflow: 'visible' }}>
        <View
          style={{
            aspectRatio: 600 / 900,
            maxWidth: 460,
            maxHeight: '100%',
            width: '100%',
            borderRadius: 24,
            overflow: 'visible',
            borderWidth: 2,
            borderColor: '#e2e8f0',
          }}
          ref={canvasContainerRef}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            // subtract border (2px each side = 4px total) so scale matches gesture coords
            setCanvasDims({ width: width - 4, height: height - 4 });
            canvasContainerRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
              canvasContainerLayout.current = { x: pageX, y: pageY, width: w, height: h };
            });
          }}
        >
          {/* Inner clipped canvas view */}
          <View style={{ width: canvasWidth, height: canvasHeight, borderRadius: 22, overflow: 'hidden' }}>
          {Platform.OS === 'web' ? (
            <Pressable
              style={{ width: canvasWidth, height: canvasHeight }}
              onPress={(e) => {
                const x = e.nativeEvent.locationX;
                const y = e.nativeEvent.locationY;
                const gameX = x / canvasScale;
                const gameY = y / canvasScale;

                const state = gameStateRef.current as GameState;

                if (state.aiming) {
                  dispatch((s) => confirmAim(s, gameX, gameY));
                  return;
                }

                // Portal targeting mode: tap selects/deselects orbs
                if (state.targeting) {
                  const tappedOrb = findOrbAtPosition(state, gameX, gameY);
                  if (tappedOrb) {
                    dispatch((s) => addTargetOrb(s, tappedOrb.id));
                    return;
                  }
                  return; // tap outside orb cancels nothing — just ignore
                }

                const coin = findCoinAtPosition(state, gameX, gameY);
                if (coin) {
                  dispatch((s) => collectCoin(s, coin.id));
                  return;
                }

                const tappedOrb = findOrbAtPosition(state, gameX, gameY);
                if (tappedOrb) {
                  dispatch((s) => clickOrb(s, tappedOrb.id));
                  forceHudUpdate();
                  return;
                }

                // Tower tap: always open upgrade popup (towerMenuAnytime)
                const tappedTowerWeb = findTowerAtPosition(state, gameX, gameY);
                if (tappedTowerWeb && tappedTowerWeb.side === 1) {
                  setSelectedTowerForEdit({ ...tappedTowerWeb });
                  setTowerPopupPos({ x: tappedTowerWeb.x * canvasScale, y: tappedTowerWeb.y * canvasScale });
                  return;
                }

                if (state.player.selectedTower && gameY > WALL_Y) {
                  dispatch((s) => placeTower(s, s.player.selectedTower!, gameX, gameY));
                  handleSelectTower(null);
                  return;
                }
              }}
            >
              <GameCanvas
                state={gameStateRef.current!}
                liveStateRef={gameStateRef}
                width={canvasWidth}
                height={canvasHeight}
              />
              {isAiming && (
                <View style={styles.aimingBanner}>
                  <Text style={styles.aimingText}>{t('game.tapToAim')}</Text>
                  <Pressable onPress={handleCancelAim}>
                    <Text style={styles.aimingCancel}>{t('game.cancel')}</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          ) : (
            <GestureDetector gesture={composedGesture}>
              <View collapsable={false} style={{ width: canvasWidth, height: canvasHeight }}>
                <GameCanvas
                  state={gameStateRef.current!}
                  liveStateRef={gameStateRef}
                  width={canvasWidth}
                  height={canvasHeight}
                />
                {isAiming && (
                  <View style={styles.aimingBanner}>
                    <Text style={styles.aimingText}>{t('game.tapToAim')}</Text>
                    <Pressable onPress={handleCancelAim}>
                      <Text style={styles.aimingCancel}>{t('game.cancel')}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </GestureDetector>
          )}
          </View>

          {/* ── Placement Overlay ── */}
          {placementMode.active && (
            <View
              pointerEvents="box-none"
              style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth, height: canvasHeight, zIndex: 30 }}
            >
              {/* Slot dots at 47% canvas height */}
              {ORB_SLOTS.map((sx, i) => {
                const slotLeft = (sx / GAME_WIDTH) * canvasWidth;
                const slotTop = canvasHeight * 0.47;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      console.log('[Game] Place orb at slot', i, 'type:', placementMode.typeId);
                      handlePlaceOrbAtSlot(i);
                    }}
                    style={[styles.orbSlotDot, { left: slotLeft - 18, top: slotTop - 18 }]}
                  >
                    <View style={styles.orbSlotDotInner} />
                  </Pressable>
                );
              })}

              {/* Active orb name label at 93% height */}
              {(() => {
                const activeDef = ORB_TYPES[placementMode.typeId as OrbType];
                const labelColor = activeDef ? activeDef.color : '#6366F1';
                const labelName = activeDef ? activeDef.name : '';
                return activeDef ? (
                  <View style={[styles.orbNameLabel, { top: canvasHeight * 0.93, left: canvasWidth / 2 - 60 }]} pointerEvents="none">
                    <Text style={[styles.orbNameText, { color: labelColor }]}>{labelName}</Text>
                  </View>
                ) : null;
              })()}

              {/* Orb ring + cancel X at 74% height */}
              {(() => {
                const ringSize = 180;
                const cx = ringSize / 2;
                const cy = ringSize / 2;
                const R = 74;
                const orbIds = loadout.orbs ?? [];
                const orbs = orbIds
                  .map((id) => ORB_TYPES[id as OrbType])
                  .filter((d): d is OrbDef => !!d);
                const n = orbs.length;
                const coins = gameStateRef.current?.player.coins ?? 0;
                return (
                  <View
                    pointerEvents="box-none"
                    style={{
                      position: 'absolute',
                      left: canvasWidth / 2 - ringSize / 2,
                      top: canvasHeight * 0.74 - ringSize / 2,
                      width: ringSize,
                      height: ringSize,
                    }}
                  >
                    {orbs.map((def, i) => {
                      const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
                      const x = cx + R * Math.cos(ang) - 26;
                      const y = cy + R * Math.sin(ang) - 26;
                      const affordable = coins >= def.cost;
                      const active = def.id === placementMode.typeId;
                      return (
                        <Pressable
                          key={def.id}
                          onPress={() => {
                            if (affordable) {
                              handleSwitchPlacementOrb(def.id);
                            }
                          }}
                          style={[
                            styles.orbRingBtn,
                            active && styles.orbRingBtnActive,
                            !affordable && styles.orbRingBtnDisabled,
                            { left: x, top: y },
                          ]}
                        >
                          <View style={[styles.orbRingDisc, { backgroundColor: def.color, shadowColor: def.color }]}>
                            <Text style={styles.orbRingDiscText}>{def.hp}</Text>
                          </View>
                          <Text style={styles.orbRingCost}>
                            {'🪙 '}
                            {def.cost}
                          </Text>
                        </Pressable>
                      );
                    })}

                    {/* Central X cancel */}
                    <Pressable
                      onPress={() => {
                        console.log('[Game] Cancel placement pressed');
                        handleCancelPlacement();
                      }}
                      style={[styles.orbRingCancel, { left: cx - 32, top: cy - 32 }]}
                    >
                      <Text style={styles.orbRingCancelText}>✕</Text>
                    </Pressable>
                  </View>
                );
              })()}
            </View>
          )}

          {/* ── UpgradePopup — anchored above tapped tower ── */}
          {selectedTowerForEdit && (() => {
            const level = selectedTowerForEdit.level || 1;
            const stats = getTowerStats(selectedTowerForEdit.type, level);
            const next = getTowerStats(selectedTowerForEdit.type, level + 1);
            const maxLevel = 5;
            const maxed = level >= maxLevel;
            const isSuper = level >= 6;
            const upgradeCost = getTowerUpgradeCost(selectedTowerForEdit);
            const sellValue = getTowerSellValue(selectedTowerForEdit);
            const canUpgrade = !maxed && playerCoins >= upgradeCost;
            const dpsNow = stats ? stats.damage / stats.fireRate : 0;
            const dpsNext = next ? next.damage / next.fireRate : 0;
            const dDps = next ? Math.round((dpsNext - dpsNow) * 10) / 10 : 0;
            const dRange = next && stats ? Math.round((next.range - stats.range) * 10) / 10 : 0;
            const towerNameDisplay = t(`towers.${selectedTowerForEdit.type}.name`) || selectedTowerForEdit.type.replace(/_/g, ' ').toUpperCase();
            const upgradeLabel = isSuper ? '★ SUPER MAX ★' : 'MAX LEVEL';
            const upgradeBtnBg = level + 1 >= 6 ? '#F59E0B' : '#10B981';
            const upgradeBtnLabel = level + 1 >= 6 ? `★ SUPER ⬆ Lv ${level}→${level + 1}` : `⬆ Lv ${level}→${level + 1}`;
            const sellLabel = `Sell · 🪙 ${sellValue}`;
            return (
              <View
                style={{
                  position: 'absolute',
                  left: towerPopupPos ? towerPopupPos.x - 160 : canvasWidth / 2 - 160,
                  top: towerPopupPos ? Math.max(8, towerPopupPos.y - 230) : canvasHeight / 2 - 115,
                  width: 320,
                  zIndex: 100,
                }}
                pointerEvents="box-none"
              >
                <View style={[styles.upgradePopupCard, isSuper && { borderColor: '#F59E0B', borderWidth: 2 }]}>
                  {/* Header */}
                  <View style={styles.upgradePopupHeader}>
                    <TowerIcon type={selectedTowerForEdit.type} size={30} level={level} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.upgradePopupName} numberOfLines={1}>
                        {towerNameDisplay}
                      </Text>
                      {/* Level pips */}
                      <View style={{ flexDirection: 'row', gap: 3, marginTop: 2 }}>
                        {Array.from({ length: maxLevel }, (_, i) => {
                          const pipFilled = level >= i + 1;
                          const pipColor = pipFilled ? (level >= 6 ? '#F59E0B' : '#FBBF24') : '#E2E8F0';
                          return (
                            <View key={i} style={{
                              width: 8, height: 8, borderRadius: 4,
                              backgroundColor: pipColor,
                            }} />
                          );
                        })}
                      </View>
                    </View>
                    <Pressable onPress={() => {
                      // Tutorial step 2: if upgraded, advance on close
                      if (tutorialStepRef.current === 2 && tutorialUpgradedRef.current) {
                        advanceTutorial();
                      }
                      setSelectedTowerForEdit(null);
                      setTowerPopupPos(null);
                    }} style={styles.upgradePopupClose}>
                      <X size={14} color="#94A3B8" strokeWidth={2} />
                    </Pressable>
                  </View>

                  {/* Super perk label */}
                  {isSuper && stats?.perk && (
                    <View style={{ alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#D97706' }}>
                          {'★ '}
                          {stats.perk.label}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Stat deltas */}
                  {!maxed && next && (dDps > 0 || dRange > 0) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                      {dDps > 0 && <Text style={{ fontSize: 9, fontWeight: '700', color: '#059669' }}>DPS +{dDps}</Text>}
                      {dRange > 0 && <Text style={{ fontSize: 9, fontWeight: '700', color: '#059669' }}>Range +{dRange}</Text>}
                    </View>
                  )}

                  {/* Upgrade button */}
                  {maxed ? (
                    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#F59E0B' }}>
                        {upgradeLabel}
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => {
                        console.log(`[Game] Upgrade tower pressed id=${selectedTowerForEdit.id} level=${level}`);
                        handleUpgradeTower();
                      }}
                      disabled={!canUpgrade}
                      style={[{
                        paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                        flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 6,
                        backgroundColor: upgradeBtnBg,
                        opacity: canUpgrade ? 1 : 0.4,
                      }]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#fff' }}>
                        {upgradeBtnLabel}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                        {'🪙 '}
                        {upgradeCost}
                      </Text>
                    </Pressable>
                  )}

                  {/* Sell button */}
                  <Pressable
                    onPress={() => {
                      console.log(`[Game] Sell tower pressed id=${selectedTowerForEdit.id}`);
                      handleSellTower();
                    }}
                    style={{
                      paddingVertical: 8, borderRadius: 12, alignItems: 'center',
                      flexDirection: 'row', justifyContent: 'center', gap: 4,
                      backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#F43F5E' }}>
                      {sellLabel}
                    </Text>
                  </Pressable>
                </View>
                {/* Pointer triangle */}
                <View style={{
                  width: 14, height: 14, backgroundColor: '#fff',
                  borderRightWidth: 2, borderBottomWidth: 2, borderColor: '#1E293B',
                  transform: [{ rotate: '45deg' }], alignSelf: 'center', marginTop: -8,
                }} />
              </View>
            );
          })()}
        </View>
      </View>

      {/* ── Portal Targeting Overlay ── */}
      {hudState?.targeting && (
        <View style={{ position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', gap: 8, zIndex: 30 }}>
          <Pressable
            onPress={handleConfirmTargeting}
            style={{ backgroundColor: '#818CF8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {'Portal ('}
              {hudState.targeting.targets?.length ?? 0}
              {'/'}
              {hudState.targeting.maxTargets}
              {')'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Bottom HUD (~10fps) ── */}
      <BottomHUD
        abilities={hudAbilities}
        onAbility={handleAbility}
        editMode={editMode}
        placementModeActive={placementMode.active}
        loadoutTowers={loadout.towers}
        selectedTowerType={selectedTowerType}
        playerCoinsForTower={playerCoins}
        onToggleEditMode={handleToggleEditMode}
        onOpenOrbShop={handleOpenOrbShop}
        onSelectTower={handleSelectTower}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        insets={insets}
        firstPlacement={hudState?.firstPlacement ?? true}
      />

      {/* ── Forfeit Dialog ── */}
      {showForfeitDialog && (
        <View style={styles.forfeitOverlay}>
          <View style={styles.forfeitCard}>
            <Text style={styles.forfeitEmoji}>🏳️</Text>
            <Text style={styles.forfeitTitle}>{t('game.forfeitMatch')}?</Text>
            <Text style={styles.forfeitSubtitle}>vs {opponentName}</Text>
            <View style={styles.forfeitBtns}>
              <Pressable
                style={styles.forfeitCancelBtn}
                onPress={() => { setShowForfeitDialog(false); }}
              >
                <Text style={styles.forfeitCancelBtnText}>{t('game.cancel')}</Text>
              </Pressable>
              <Pressable style={styles.forfeitYesBtn} onPress={handleForfeit}>
                <Text style={styles.forfeitYesBtnText}>{t('game.forfeitMatch')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* ── Pause menu ── */}
      <Modal
        visible={showPauseMenu}
        transparent
        animationType="fade"
        onRequestClose={handleResume}
      >
        <View style={styles.pauseBackdrop}>
          <View style={styles.pauseMenu}>
            <Text style={styles.pauseTitle}>{t('game.paused')}</Text>
            <Pressable style={[styles.pauseBtn2, styles.pauseResume]} onPress={handleResume}>
              <Play size={18} color="#000" strokeWidth={2.5} />
              <Text style={styles.pauseResumeText}>{t('game.resume')}</Text>
            </Pressable>
            <Pressable
              style={[styles.pauseBtn2, styles.pauseForfeit]}
              onPress={() => {
                setShowPauseMenu(false);
                setShowForfeitDialog(true);
              }}
            >
              <Flag size={16} color={COLORS.danger} strokeWidth={2} />
              <Text style={styles.pauseForfeitText}>{t('game.forfeitMatch')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Searching Screen ── */}
      {searching && (
        <View style={[StyleSheet.absoluteFill, styles.searchingOverlay]}>
          <Animated.Text style={[styles.searchingEmoji, { transform: [{ translateY: searchBobAnim }] }]}>
            {searchEmoji}
          </Animated.Text>
          <Text style={styles.searchingTitle}>{searchTitle}</Text>
          {!isTrainingOrTutorial && (
            <Text style={styles.searchingTimer}>{searchTime}</Text>
          )}
          {!isTrainingOrTutorial && (
            <Text style={styles.searchingHint}>{t('game.searchingHint')}</Text>
          )}
          {!isTrainingOrTutorial && (
            <Pressable
              style={styles.searchVsAiBtn}
              onPress={() => {
                beginMatch();
              }}
            >
              <Text style={styles.searchVsAiBtnText}>{t('game.playVsAi')}</Text>
            </Pressable>
          )}
          {searchToast.length > 0 && (
            <View style={styles.searchToast}>
              <Text style={styles.searchToastText}>{searchToast}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Tutorial Coachmark ── */}
      {tutorialStep !== null && !searching && !resultData && !coachmarkHidden && (() => {
        if (tutorialStep === 0) {
          const pct = Math.min(1, orbTapCount / 5);
          return (
            <TutorialCoachmark
              title="Tap orbs!"
              body="Tap the orbs coming toward your station to destroy them. Tap 5 orbs to continue."
              progress={{ label: `${orbTapCount}/5 orbs tapped`, pct }}
              skippable
              onSkip={completeTutorial}
              position="bottom"
            />
          );
        }
        if (tutorialStep === 1) {
          return (
            <TutorialCoachmark
              title="Place a tower"
              body="Drag a tower from the tray and drop it on the grid to defend your station."
              skippable
              onSkip={completeTutorial}
              position="bottom"
            />
          );
        }
        if (tutorialStep === 2) {
          return (
            <TutorialCoachmark
              title="Upgrade it!"
              body="Tap your tower to select it, then tap Upgrade to level it up."
              skippable
              onSkip={completeTutorial}
              position="bottom"
            />
          );
        }
        if (tutorialStep === 3) {
          return (
            <TutorialCoachmark
              title="Use an ability!"
              body="Tap one of your ability buttons to activate a special power."
              skippable
              onSkip={completeTutorial}
              position="bottom"
            />
          );
        }
        if (tutorialStep === 4) {
          return (
            <TutorialCoachmark
              title="Send orbs!"
              body="Tap an orb type in the shop to send orbs at your opponent."
              skippable
              onSkip={completeTutorial}
              position="bottom"
            />
          );
        }
        if (tutorialStep === 5) {
          return (
            <TutorialCoachmark
              title="You're ready!"
              body="You know the basics. Good luck in your first real match!"
              cta="Let's go!"
              onCta={completeTutorial}
              skippable={false}
              position="center"
            />
          );
        }
        return null;
      })()}

      {/* ── Result Screen ── */}
      {resultData !== null && (
        <View style={[StyleSheet.absoluteFill, styles.resultOverlay]}>
          <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.resultEmoji}>{resultEmoji}</Text>
            <Text style={[styles.resultTitle, resultWon ? styles.resultTitleWin : styles.resultTitleLoss]}>
              {resultData.training
                ? (resultWon ? t('game.trainingWin') : t('game.trainingLoss'))
                : (resultWon ? t('game.victory') : t('game.defeat'))}
            </Text>
            <Text style={styles.resultVsText}>
              vs {resultData.opponent ?? 'Opponent'}
            </Text>

            {!resultData.training && resultChange !== 0 && (
              <Text style={[styles.resultTrophyBig, { color: resultChange >= 0 ? '#10B981' : '#EF4444' }]}>
                {resultChangeSign}{Math.abs(resultChange)}
              </Text>
            )}
            {!resultData.training && resultChange === 0 && (
              <Text style={styles.noTrophyChange}>{t('game.noTrophyChange')}</Text>
            )}

            {resultShardsEarned > 0 && (
              <View style={styles.resultShardsRow}>
                <Text style={styles.resultShardsText}>🔷</Text>
                <Text style={styles.resultShardsText}>+{resultShardsEarned}</Text>
                <Text style={styles.resultShardsText}>shards</Text>
              </View>
            )}

            {!resultData.training && (
              <View style={styles.resultLeagueRow}>
                <LeagueBadge trophies={resultOldTrophies} size="sm" />
                <Text style={styles.resultLeagueArrow}>→</Text>
                <LeagueBadge trophies={resultNewTrophies} size="md" />
              </View>
            )}

            {resultHasUnlocks && (
              <View style={styles.resultUnlocks}>
                <Text style={styles.resultUnlocksTitle}>{t('game.newCardsUnlocked')}</Text>
                {resultTowerUnlocks.map((name) => (
                  <Text key={name} style={styles.resultUnlockItem}>🏰 {name}</Text>
                ))}
                {resultOrbUnlocks.map((name) => (
                  <Text key={name} style={styles.resultUnlockItem}>🔵 {name}</Text>
                ))}
              </View>
            )}

            <View style={styles.resultButtons}>
              <Pressable
                style={styles.resultHomeBtn}
                onPress={() => {
                  router.push('/');
                }}
              >
                <Text style={styles.resultHomeBtnText}>{t('game.home')}</Text>
              </Pressable>
              <Pressable
                style={styles.resultPlayAgainBtn}
                onPress={() => {
                  router.push('/setup');
                }}
              >
                <Text style={styles.resultPlayAgainBtnText}>{t('game.playAgain')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    zIndex: 0,
  },
  // Top HUD
  topHud: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 20,
    zIndex: 20,
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
  },
  hudCenterBlock: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
    minWidth: 0,
    paddingLeft: 4,
  },
  opponentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudOpponentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    maxWidth: 120,
  },
  kiBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  kiBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
  },
  timerPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  timerPillText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#334155',
  },
  hudPills: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  clicksPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  coinsPill: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
  },
  pillText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  // Bottom HUD
  bottomHud: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  abilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 20,
  },
  abilityButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  orbShopCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  orbShopCircleBtnText: {
    fontSize: 24,
  },
  editToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  editToggleBtnActive: {
    backgroundColor: '#0F172A',
  },
  editToggleBtnText: {
    fontSize: 16,
  },
  towerTrayBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  towerBar: {
    flexGrow: 0,
  },
  towerBarContent: {
    gap: 6,
    paddingRight: 8,
  },
  towerCard: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    width: 72,
    height: 94,
    justifyContent: 'center',
  },
  towerCardSelected: {
    borderColor: '#0F172A',
  },
  towerCardDisabled: {
    opacity: 0.7,
  },
  towerName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 12,
  },
  towerCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  towerCost: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  towerDiscount: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  towerDiscountBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    marginTop: 1,
  },
  // Canvas overlays
  aimingBanner: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  aimingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  aimingCancel: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '700',
  },
  // Placement overlay styles
  orbSlotDot: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(99,102,241,0.8)',
    backgroundColor: 'rgba(99,102,241,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbSlotDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  orbNameLabel: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 120,
    alignItems: 'center',
  },
  orbNameText: {
    fontSize: 13,
    fontWeight: '900',
  },
  orbRingBtn: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  orbRingBtnActive: {
    borderColor: '#6366F1',
    transform: [{ scale: 1.1 }],
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  orbRingBtnDisabled: {
    opacity: 0.4,
  },
  orbRingDisc: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  orbRingDiscText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  orbRingCost: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
  orbRingCancel: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  orbRingCancelText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 32,
  },
  // UpgradePopup
  upgradePopup: {
    marginHorizontal: 16,
    marginBottom: 4,
    alignItems: 'center',
  },
  upgradePopupCard: {
    width: 176,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1E293B',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  upgradePopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upgradePopupName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  upgradePopupLevel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  upgradePopupClose: {
    padding: 4,
  },
  upgradePopupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  upgradePopupBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
  },
  upgradePopupBtnUpgrade: {
    backgroundColor: 'rgba(79,142,247,0.12)',
    borderColor: COLORS.primary,
  },
  upgradePopupBtnSell: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: COLORS.danger,
  },
  upgradePopupBtnCleanse: {
    backgroundColor: 'rgba(132,204,22,0.1)',
    borderColor: '#84CC16',
  },
  upgradePopupBtnDisabled: {
    opacity: 0.4,
  },
  upgradePopupBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  upgradePopupBtnSub: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },

  // Forfeit dialog
  forfeitOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 50,
  },
  forfeitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    maxWidth: 384,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  forfeitEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  forfeitTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  forfeitSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  forfeitBtns: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  forfeitCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  forfeitCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  forfeitYesBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  forfeitYesBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Pause menu
  pauseBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseMenu: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 20,
    padding: 28,
    width: 240,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pauseTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 3,
  },
  pauseBtn2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  pauseResume: {
    backgroundColor: COLORS.primary,
  },
  pauseResumeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  pauseForfeit: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  pauseForfeitText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
  },
  // Searching screen
  searchingOverlay: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    gap: 10,
    paddingHorizontal: 16,
  },
  searchingEmoji: {
    fontSize: 48,
    marginBottom: 24,
  },
  searchingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  searchingTimer: {
    fontSize: 72,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 80,
  },
  searchingHint: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  searchToast: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  searchToastText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  searchVsAiBtn: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  searchVsAiBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  // Result screen
  resultOverlay: {
    backgroundColor: '#FFFFFF',
    zIndex: 90,
  },
  resultContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 16,
    gap: 12,
  },
  resultEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 8,
  },
  resultTitleWin: {
    color: '#0F172A',
  },
  resultTitleLoss: {
    color: '#0F172A',
  },
  resultVsText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  noTrophyChange: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  resultTrophyBig: {
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 12,
  },
  resultLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  resultLeagueArrow: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '700',
  },
  resultShardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  resultShardsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#65A30D',
  },
  resultUnlocks: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    width: '100%',
  },
  resultUnlocksTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultUnlockItem: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  resultHomeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  resultHomeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  resultPlayAgainBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  resultPlayAgainBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Unused but kept for compatibility
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hudPlayerInfo: { width: 72, gap: 1 },
  hudName: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  hudHpBarWrap: { flex: 1 },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 2 },
  pauseBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  timerText: { fontSize: 15, fontWeight: '700', color: '#334155', letterSpacing: 1 },
  escalationBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  escalationText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  clickRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clickLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 0.5, width: 44 },
  clickDots: { flexDirection: 'row', gap: 4, flex: 1 },
  clickDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#E2E8F0' },
  hudActionBtns: { flexDirection: 'row', gap: 6 },
  hudActionBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  hudActionBtnActive: { backgroundColor: 'rgba(79,142,247,0.12)', borderColor: COLORS.primary },
  hudActionBtnText: { fontSize: 10, fontWeight: '700', color: '#334155' },
  abilityBar: { flexDirection: 'row', gap: 12, justifyContent: 'center', paddingVertical: 2 },
  hpBarsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  hpBarBlock: { flex: 1, gap: 2 },
  hpLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  resultTrophyRow: { alignItems: 'center', gap: 4 },
  resultTrophyBlock: { alignItems: 'center', gap: 4 },
  resultTrophyLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 },
  resultTrophyChange: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTrophyOld: { fontSize: 18, fontWeight: '700', color: '#94A3B8' },
  resultTrophyArrow: { fontSize: 16, color: '#94A3B8' },
  resultTrophyNew: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  resultChangeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  resultChangeBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  resultOverlayWin: { backgroundColor: '#FFFFFF', zIndex: 90 },
  resultOverlayLoss: { backgroundColor: '#FFFFFF', zIndex: 90 },
});
