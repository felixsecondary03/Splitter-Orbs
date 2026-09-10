import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { X, Pause, Play, Flag } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useProfile } from '@/contexts/ProfileContext';
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
  collectCoin,
  selectTower,
} from '@/game/engine';
import type { GameState, Tower, Loadout } from '@/game/engine-types';
import type { TowerType, AbilityType, OrbType } from '@/game/constants';
import { TOWER_COSTS, TOWER_TYPES, ORB_TYPES, UPGRADE_COST_MULT_ARRAY, SELL_RATIO, GAME_WIDTH, GAME_HEIGHT, WALL_Y } from '@/game/constants';
import { TowerIcon } from '@/components/TowerIcon';
import { distance } from '@/game/engine-helpers';
import type { MatchMode } from '@/game/engine-types';
import { useGameLoop } from '@/hooks/useGameLoop';
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { profile } = useProfile();
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
  const seed = paramsReady ? parseInt(params.seed ?? String(Date.now()), 10) : Date.now();

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

  // ── New state variables ──
  const [searching, setSearching] = useState(true);
  const [searchTime, setSearchTime] = useState(15);
  const [searchToast, setSearchToast] = useState('');
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [placementMode, setPlacementMode] = useState<{ active: boolean; typeId: string | null }>({ active: false, typeId: null });
  const [editMode, setEditMode] = useState(false);
  const [selectedTowerForEdit, setSelectedTowerForEdit] = useState<Tower | null>(null);
  const [showOrbShop, setShowOrbShop] = useState(false);
  const [showForfeitDialog, setShowForfeitDialog] = useState(false);

  // ── Initial state (created once) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialState = useMemo(() => {
    try {
      console.log('[Game] createInitialState', { engineMode, seed });
      return createInitialState(engineMode, 0, seed, loadout);
    } catch (e) {
      console.error('[Game] createInitialState failed, using fallback:', e);
      return createInitialState('ai_normal', 0, Date.now(), DEFAULT_LOADOUT);
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionIdParam = params?.mode ? (params.sessionId as string | undefined) : undefined;
  const opponentNameParam = params?.mode ? (params.opponentName as string | undefined) : undefined;

  // ── beginMatch ──
  const beginMatch = useCallback(() => {
    console.log('[Game] beginMatch called, mode=', uiMode);
    setSearching(false);
    setSearchToast('');
  }, [uiMode]);

  // ── On mount: skip search for training/tutorial ──
  useEffect(() => {
    if (!params?.mode) return;
    if (params.mode === 'training' || params.mode === 'tutorial') {
      console.log('[Game] Skipping search for mode=', params.mode);
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
      console.log('[Game] Search countdown hit 0, starting vs AI');
      setSearchToast('No player found — starting vs AI');
      const t = setTimeout(() => {
        console.log('[Game] Auto-starting vs AI after toast');
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
  }, [uiMode, difficulty, engineMode, sessionIdParam, opponentNameParam]);

  const { renderState, stateRef: gameStateRef, dispatch, pause, resume } = useGameLoop({
    initialState,
    mode: engineMode,
    onGameEnd: handleGameEnd,
  });

  // ── Canvas dimensions ──
  const HUD_TOP_HEIGHT = 80 + insets.top;
  const HUD_BOTTOM_HEIGHT = 180;
  const canvasHeight = screenHeight - HUD_TOP_HEIGHT - HUD_BOTTOM_HEIGHT;
  const canvasWidth = screenWidth;

  // ── Touch handling ──
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event) => {
      const { x, y } = event;
      const gameX = (x / canvasWidth) * GAME_WIDTH;
      const gameY = (y / canvasHeight) * GAME_HEIGHT;

      console.log(`[Game] Tap at screen=(${x.toFixed(0)},${y.toFixed(0)}) game=(${gameX.toFixed(0)},${gameY.toFixed(0)})`);

      const state = gameStateRef.current as GameState;

      if (state.aiming) {
        console.log(`[Game] Confirming aim at game=(${gameX.toFixed(0)},${gameY.toFixed(0)})`);
        dispatch((s) => confirmAim(s, gameX, gameY));
        return;
      }

      const coin = findCoinAtPosition(state, gameX, gameY);
      if (coin) {
        console.log(`[Game] Collecting coin id=${coin.id}`);
        dispatch((s) => collectCoin(s, coin.id));
        return;
      }

      const tappedOrb = findOrbAtPosition(state, gameX, gameY);
      if (tappedOrb) {
        console.log(`[Game] Tapped orb id=${tappedOrb.id} clicks=${state.player.clicks}`);
        dispatch((s) => clickOrb(s, tappedOrb.id));
        return;
      }

      // Edit mode: select tower on tap
      if (editMode) {
        const tower = findTowerAtPosition(state, gameX, gameY);
        if (tower) {
          console.log(`[Game] Edit mode: selected tower id=${tower.id} type=${tower.type}`);
          setSelectedTowerForEdit({ ...tower });
          return;
        }
        return;
      }

      if (state.player.selectedTower && gameY > WALL_Y) {
        console.log(`[Game] Placing tower type=${state.player.selectedTower} at game=(${gameX.toFixed(0)},${gameY.toFixed(0)})`);
        dispatch((s) => placeTower(s, s.player.selectedTower!, gameX, gameY));
        return;
      }
    });

  const longPressGesture = Gesture.LongPress()
    .runOnJS(true)
    .minDuration(400)
    .onStart((event) => {
      const { x, y } = event;
      const gameX = (x / canvasWidth) * GAME_WIDTH;
      const gameY = (y / canvasHeight) * GAME_HEIGHT;
      const tower = findTowerAtPosition(gameStateRef.current, gameX, gameY);
      if (tower) {
        console.log(`[Game] Long press on tower id=${tower.id} type=${tower.type}`);
        setSelectedTowerForEdit({ ...tower });
        setEditMode(true);
      }
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  // ── Tower selection ──
  const handleSelectTower = useCallback((type: TowerType | null) => {
    console.log(`[Game] Select tower for placement type=${type}`);
    dispatch((s) => selectTower(s, type));
  }, [dispatch]);

  // ── Ability activation ──
  const handleAbility = useCallback((abilityType: AbilityType) => {
    console.log(`[Game] Activate ability type=${abilityType}`);
    dispatch((s) => activateAbility(s, abilityType));
  }, [dispatch]);

  // ── Tower edit actions ──
  const handleUpgradeTower = useCallback(() => {
    if (!selectedTowerForEdit) return;
    console.log(`[Game] Upgrade tower id=${selectedTowerForEdit.id}`);
    dispatch((s) => upgradeTower(s, selectedTowerForEdit.id));
    setSelectedTowerForEdit(null);
  }, [selectedTowerForEdit, dispatch]);

  const handleSellTower = useCallback(() => {
    if (!selectedTowerForEdit) return;
    console.log(`[Game] Sell tower id=${selectedTowerForEdit.id}`);
    dispatch((s) => sellTower(s, selectedTowerForEdit.id));
    setSelectedTowerForEdit(null);
  }, [selectedTowerForEdit, dispatch]);

  const handleCleanseTower = useCallback(() => {
    if (!selectedTowerForEdit) return;
    console.log(`[Game] Cleanse tower id=${selectedTowerForEdit.id}`);
    dispatch((s) => cleanseTower(s, selectedTowerForEdit.id));
    setSelectedTowerForEdit(null);
  }, [selectedTowerForEdit, dispatch]);

  // ── Orb shop ──
  const handleOpenOrbShop = useCallback(() => {
    console.log('[Game] Open orb shop pressed');
    setShowOrbShop(true);
  }, []);

  const handleSelectOrbType = useCallback((typeId: string) => {
    console.log(`[Game] Orb type selected for placement typeId=${typeId}`);
    setShowOrbShop(false);
    setPlacementMode({ active: true, typeId });
  }, []);

  const handlePlaceOrbAtSlot = useCallback((slotIndex: number) => {
    if (!placementMode.typeId) return;
    const typeId = placementMode.typeId as OrbType;
    const orbDef = ORB_TYPES[typeId];
    const cost = orbDef?.cost ?? 20;
    const state = gameStateRef.current as GameState;
    if (state.player.coins < cost) {
      console.log(`[Game] Cannot place orb — not enough coins. Have=${state.player.coins} need=${cost}`);
      return;
    }
    console.log(`[Game] Place orb typeId=${typeId} slotIndex=${slotIndex} cost=${cost}`);
    // Spawn orb on player side by deducting coins and adding to orbs array
    dispatch((s) => {
      if (s.player.coins < cost) return s;
      const slotX = (GAME_WIDTH / 6) * (slotIndex + 1);
      const slotY = WALL_Y + 30;
      const speed = orbDef?.speed ?? 42;
      const hp = orbDef?.hp ?? 27;
      const radius = orbDef?.radius ?? 22;
      const damage = orbDef?.damage ?? 6;
      const color = orbDef?.color ?? '#60a5fa';
      const newOrb = {
        id: `orb_${Date.now()}_${slotIndex}`,
        type: typeId,
        x: slotX,
        y: slotY,
        vx: 0,
        vy: -speed,
        hp,
        maxHp: hp,
        damage,
        speed,
        radius,
        color,
        side: 0 as const,
        owner: 'player' as const,
        frozen: false,
        frozenTimer: 0,
        poisoned: false,
        poisonTimer: 0,
        poisonDps: 0,
        shieldHp: 0,
        growthTimer: 0,
        summonTimer: 0,
      };
      return {
        ...s,
        player: { ...s.player, coins: s.player.coins - cost },
        orbs: [...s.orbs, newOrb],
      };
    });
    setPlacementMode({ active: false, typeId: null });
  }, [placementMode.typeId, dispatch, gameStateRef]);

  const handleCancelPlacement = useCallback(() => {
    console.log('[Game] Cancel orb placement');
    setPlacementMode({ active: false, typeId: null });
  }, []);

  // ── Edit mode toggle ──
  const handleToggleEditMode = useCallback(() => {
    const next = !editMode;
    console.log(`[Game] Toggle edit mode → ${next}`);
    setEditMode(next);
    if (!next) {
      setSelectedTowerForEdit(null);
    }
  }, [editMode]);

  // ── Pause ──
  const handlePause = useCallback(() => {
    console.log('[Game] Pause button pressed');
    pause();
    setIsPaused(true);
    setShowPauseMenu(true);
  }, [pause]);

  const handleResume = useCallback(() => {
    console.log('[Game] Resume pressed');
    setShowPauseMenu(false);
    setIsPaused(false);
    resume();
  }, [resume]);

  const handleForfeit = useCallback(() => {
    console.log('[Game] Forfeit confirmed');
    setShowForfeitDialog(false);
    setShowPauseMenu(false);
    router.push('/');
  }, []);

  const handleCancelAim = useCallback(() => {
    console.log('[Game] Cancel aim pressed');
    dispatch((s) => cancelAim(s));
  }, [dispatch]);

  // ── Derived display values ──
  const playerHp = renderState?.player?.station?.hp ?? 0;
  const playerMaxHp = renderState?.player?.station?.maxHp ?? 100;
  const oppHp = renderState?.opponent?.station?.hp ?? 0;
  const oppMaxHp = renderState?.opponent?.station?.maxHp ?? 100;
  const playerCoins = Math.floor(renderState?.player?.coins ?? 0);
  const timeDisplay = formatTime(renderState?.time ?? 0);
  const selectedTowerType = renderState?.player?.selectedTower ?? null;
  const isAiming = (renderState?.aiming ?? null) !== null;
  const clicksLeft = renderState?.player?.clicks ?? 0;
  const maxClicks = renderState?.player?.maxClicks ?? 5;
  const escalationTier = renderState?.escalationTier ?? 'none';

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

  // Guard: params not ready
  if (!params?.mode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 32 }}>⏳</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: COLORS.background }]}>
      {/* ── Top HUD ── */}
      <View style={[styles.topHud, { paddingTop: insets.top + 8 }]}>
        <View style={styles.hudTopRow}>
          <Pressable style={styles.pauseBtn} onPress={handlePause}>
            <Pause size={14} color={COLORS.textSecondary} strokeWidth={2} />
          </Pressable>

          <View style={styles.hudCenterBlock}>
            <View style={styles.opponentNameRow}>
              <Text style={styles.hudName} numberOfLines={1}>{opponentName}</Text>
              {isAiMode && (
                <View style={styles.kiBadge}>
                  <Text style={styles.kiBadgeText}>KI</Text>
                </View>
              )}
            </View>
            <Text style={styles.timerText}>{timeDisplay}</Text>
          </View>

          <View style={styles.hudPills}>
            <View style={styles.clicksPill}>
              <Text style={styles.pillText}>👆 {clicksLeft}/{maxClicks}</Text>
            </View>
            <View style={styles.coinsPill}>
              <Text style={styles.pillText}>🪙 {playerCoins}</Text>
            </View>
          </View>
        </View>

        <View style={styles.hpBarsRow}>
          <View style={styles.hpBarBlock}>
            <Text style={styles.hpLabel}>OPP</Text>
            <HPBar current={oppHp} max={oppMaxHp} width={screenWidth - 100} height={6} />
          </View>
        </View>
        <View style={styles.hpBarsRow}>
          <View style={styles.hpBarBlock}>
            <Text style={styles.hpLabel}>YOU</Text>
            <HPBar current={playerHp} max={playerMaxHp} width={screenWidth - 100} height={6} />
          </View>
        </View>

        {escalationTier !== 'none' && (
          <View style={styles.timerRow}>
            <View style={[styles.escalationBadge, { borderColor: escalationColor[escalationTier] ?? COLORS.danger }]}>
              <Text style={[styles.escalationText, { color: escalationColor[escalationTier] ?? COLORS.danger }]}>
                {escalationLabel[escalationTier] ?? escalationTier.toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Game Canvas ── */}
      <View style={{ position: 'relative' }}>
        {Platform.OS === 'web' ? (
          <Pressable
            style={{ width: canvasWidth, height: canvasHeight }}
            onPress={(e) => {
              const x = e.nativeEvent.locationX;
              const y = e.nativeEvent.locationY;
              const gameX = (x / canvasWidth) * GAME_WIDTH;
              const gameY = (y / canvasHeight) * GAME_HEIGHT;

              console.log(`[Game] Web tap at screen=(${x.toFixed(0)},${y.toFixed(0)}) game=(${gameX.toFixed(0)},${gameY.toFixed(0)})`);

              const state = gameStateRef.current as GameState;

              if (state.aiming) {
                console.log(`[Game] Web confirming aim at game=(${gameX.toFixed(0)},${gameY.toFixed(0)})`);
                dispatch((s) => confirmAim(s, gameX, gameY));
                return;
              }

              const coin = findCoinAtPosition(state, gameX, gameY);
              if (coin) {
                console.log(`[Game] Web collecting coin id=${coin.id}`);
                dispatch((s) => collectCoin(s, coin.id));
                return;
              }

              const tappedOrb = findOrbAtPosition(state, gameX, gameY);
              if (tappedOrb) {
                console.log(`[Game] Web tapped orb id=${tappedOrb.id}`);
                dispatch((s) => clickOrb(s, tappedOrb.id));
                return;
              }

              if (editMode) {
                const tower = findTowerAtPosition(state, gameX, gameY);
                if (tower) {
                  console.log(`[Game] Web edit mode: selected tower id=${tower.id}`);
                  setSelectedTowerForEdit({ ...tower });
                }
                return;
              }

              if (state.player.selectedTower && gameY > WALL_Y) {
                console.log(`[Game] Web placing tower type=${state.player.selectedTower} at game=(${gameX.toFixed(0)},${gameY.toFixed(0)})`);
                dispatch((s) => placeTower(s, s.player.selectedTower!, gameX, gameY));
                return;
              }
            }}
          >
            <GameCanvas
              state={renderState}
              width={canvasWidth}
              height={canvasHeight}
              onOrbTap={() => {}}
              onFieldTap={() => {}}
            />
            {isAiming && (
              <View style={styles.aimingBanner}>
                <Text style={styles.aimingText}>Tap to aim — </Text>
                <Pressable onPress={handleCancelAim}>
                  <Text style={styles.aimingCancel}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        ) : (
          <GestureDetector gesture={composedGesture}>
            <View style={{ width: canvasWidth, height: canvasHeight }}>
              <GameCanvas
                state={renderState}
                width={canvasWidth}
                height={canvasHeight}
                onOrbTap={() => {}}
                onFieldTap={() => {}}
              />
              {isAiming && (
                <View style={styles.aimingBanner}>
                  <Text style={styles.aimingText}>Tap to aim — </Text>
                  <Pressable onPress={handleCancelAim}>
                    <Text style={styles.aimingCancel}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </GestureDetector>
        )}

        {/* ── Placement Overlay ── */}
        {placementMode.active && (
          <View style={[StyleSheet.absoluteFill, styles.placementOverlay]} pointerEvents="box-none">
            {Array.from({ length: 5 }, (_, i) => i).map((i) => {
              const slotLeft = (canvasWidth / 6) * (i + 1) - 20;
              const slotTop = canvasHeight - 60;
              return (
                <Pressable
                  key={i}
                  style={[styles.orbSlot, { left: slotLeft, top: slotTop }]}
                  onPress={() => {
                    console.log(`[Game] Orb slot ${i + 1} tapped`);
                    handlePlaceOrbAtSlot(i);
                  }}
                >
                  <Text style={styles.orbSlotText}>{i + 1}</Text>
                </Pressable>
              );
            })}
            <Pressable style={styles.cancelPlacementBtn} onPress={handleCancelPlacement}>
              <Text style={styles.cancelPlacementText}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {/* ── UpgradePopup (edit mode) ── */}
        {editMode && selectedTowerForEdit && (
          <View style={styles.upgradePopup} pointerEvents="box-none">
            <View style={styles.upgradePopupCard}>
              <View style={styles.upgradePopupHeader}>
                <View style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: (TOWER_TYPES[selectedTowerForEdit.type]?.color ?? '#64748b') + '33',
                  borderWidth: 1.5, borderColor: TOWER_TYPES[selectedTowerForEdit.type]?.color ?? '#64748b',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 10, color: TOWER_TYPES[selectedTowerForEdit.type]?.color ?? '#64748b', fontWeight: '700' }}>
                    {(TOWER_TYPES[selectedTowerForEdit.type]?.name ?? selectedTowerForEdit.type).slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upgradePopupName}>
                    {selectedTowerForEdit.type.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.upgradePopupLevel}>Level {selectedTowerForEdit.level}</Text>
                </View>
                <HPBar
                  current={selectedTowerForEdit.hp}
                  max={selectedTowerForEdit.maxHp}
                  width={70}
                  height={5}
                  showText
                />
                <Pressable onPress={() => { console.log('[Game] Close upgrade popup'); setSelectedTowerForEdit(null); }} style={styles.upgradePopupClose}>
                  <X size={14} color={COLORS.textSecondary} strokeWidth={2} />
                </Pressable>
              </View>
              <View style={styles.upgradePopupActions}>
                <Pressable
                  style={[
                    styles.upgradePopupBtn,
                    styles.upgradePopupBtnUpgrade,
                    (playerCoins < getTowerUpgradeCost(selectedTowerForEdit) || selectedTowerForEdit.level >= 5) && styles.upgradePopupBtnDisabled,
                  ]}
                  onPress={handleUpgradeTower}
                >
                  <Text style={styles.upgradePopupBtnText}>Upgrade</Text>
                  <Text style={styles.upgradePopupBtnSub}>{getTowerUpgradeCost(selectedTowerForEdit)} coins</Text>
                </Pressable>

                {selectedTowerForEdit.poisoned && (
                  <Pressable
                    style={[styles.upgradePopupBtn, styles.upgradePopupBtnCleanse, playerCoins < 20 && styles.upgradePopupBtnDisabled]}
                    onPress={handleCleanseTower}
                  >
                    <Text style={styles.upgradePopupBtnText}>Cleanse</Text>
                    <Text style={styles.upgradePopupBtnSub}>20 coins</Text>
                  </Pressable>
                )}

                <Pressable style={[styles.upgradePopupBtn, styles.upgradePopupBtnSell]} onPress={handleSellTower}>
                  <Text style={styles.upgradePopupBtnText}>Sell</Text>
                  <Text style={styles.upgradePopupBtnSub}>+{getTowerSellValue(selectedTowerForEdit)}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── Bottom HUD ── */}
      <View style={[styles.bottomHud, { paddingBottom: insets.bottom + 4 }]}>
        {/* Row 1: Ability buttons + orb shop circle + edit toggle */}
        <View style={styles.abilityRow}>
          <View style={styles.abilityButtons}>
            {(renderState?.player?.abilities ?? []).map((ability) => (
              <AbilityButton
                key={ability.type}
                abilityType={ability.type}
                cooldown={ability.cooldown}
                maxCooldown={ability.maxCooldown}
                onPress={() => handleAbility(ability.type)}
                size={56}
              />
            ))}
          </View>
          <View style={styles.abilityRightBtns}>
            <Pressable
              style={styles.orbShopCircleBtn}
              onPress={handleOpenOrbShop}
            >
              <Text style={styles.orbShopCircleBtnText}>🔮</Text>
            </Pressable>
            <Pressable
              style={[styles.editToggleBtn, editMode && styles.editToggleBtnActive]}
              onPress={handleToggleEditMode}
            >
              <Text style={styles.editToggleBtnText}>{editMode ? '✓' : '🔧'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Row 2: Tower selection tray */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.towerBar}
          contentContainerStyle={styles.towerBarContent}
        >
          {(loadout.towers ?? []).map((towerType) => {
            const cost = TOWER_COSTS[towerType] ?? 60;
            const towerName = TOWER_TYPES[towerType]?.name ?? String(towerType);
            const isSelected = selectedTowerType === towerType;
            const canAfford = playerCoins >= cost;
            return (
              <Pressable
                key={towerType}
                style={[
                  styles.towerCard,
                  isSelected && styles.towerCardSelected,
                  !canAfford && styles.towerCardDisabled,
                ]}
                onPress={() => {
                  console.log(`[Game] Tower card pressed type=${towerType} cost=${cost} coins=${playerCoins}`);
                  handleSelectTower(isSelected ? null : towerType);
                }}
              >
                <TowerIcon type={towerType} size={32} />
                <Text style={styles.towerName} numberOfLines={1}>{towerName}</Text>
                <View style={styles.towerCostRow}>
                  <Text style={[styles.towerCost, !canAfford && { color: COLORS.textTertiary }]}>
                    🪙
                  </Text>
                  <Text style={[styles.towerCost, !canAfford && { color: COLORS.textTertiary }]}>
                    {cost}
                  </Text>
                  <Text style={styles.towerDiscount}>-20%</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Orb Shop Panel ── */}
      {showOrbShop && (
        <View style={styles.orbShopOverlay}>
          <Pressable style={styles.orbShopBackdrop} onPress={() => { console.log('[Game] Orb shop dismissed'); setShowOrbShop(false); }} />
          <View style={styles.orbShopPanel}>
            <View style={styles.orbShopHeader}>
              <Text style={styles.orbShopTitle}>Send Orb</Text>
              <Pressable onPress={() => { console.log('[Game] Orb shop close pressed'); setShowOrbShop(false); }}>
                <X size={18} color={COLORS.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.orbShopRow}>
              {(loadout.orbs ?? []).map((orbType) => {
                const orbDef = ORB_TYPES[orbType];
                if (!orbDef) return null;
                const canAfford = playerCoins >= orbDef.cost;
                return (
                  <Pressable
                    key={orbType}
                    style={[styles.orbShopCard, !canAfford && styles.orbShopCardDisabled]}
                    onPress={() => {
                      console.log(`[Game] Orb shop card pressed type=${orbType} cost=${orbDef.cost}`);
                      handleSelectOrbType(orbType);
                    }}
                  >
                    <View style={[styles.orbShopCircle, { backgroundColor: orbDef.color }]}>
                      <Text style={styles.orbShopCircleText}>{orbDef.hp}</Text>
                    </View>
                    <Text style={styles.orbShopName} numberOfLines={1}>{orbDef.name}</Text>
                    <Text style={[styles.orbShopCost, !canAfford && { color: COLORS.textTertiary }]}>
                      🪙 {orbDef.cost}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── Forfeit Dialog (inline overlay) ── */}
      {showForfeitDialog && (
        <View style={styles.forfeitOverlay}>
          <View style={styles.forfeitCard}>
            <Text style={styles.forfeitEmoji}>🏳️</Text>
            <Text style={styles.forfeitTitle}>Forfeit Match?</Text>
            <Text style={styles.forfeitSubtitle}>vs {opponentName}</Text>
            <Pressable style={styles.forfeitCancelBtn} onPress={() => { console.log('[Game] Forfeit cancelled'); setShowForfeitDialog(false); }}>
              <Text style={styles.forfeitCancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.forfeitYesBtn} onPress={handleForfeit}>
              <Text style={styles.forfeitYesBtnText}>Forfeit</Text>
            </Pressable>
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
            <Text style={styles.pauseTitle}>PAUSED</Text>
            <Pressable style={[styles.pauseBtn2, styles.pauseResume]} onPress={handleResume}>
              <Play size={18} color="#000" strokeWidth={2.5} />
              <Text style={styles.pauseResumeText}>Resume</Text>
            </Pressable>
            <Pressable
              style={[styles.pauseBtn2, styles.pauseForfeit]}
              onPress={() => {
                console.log('[Game] Forfeit button pressed in pause menu');
                setShowPauseMenu(false);
                setShowForfeitDialog(true);
              }}
            >
              <Flag size={16} color={COLORS.danger} strokeWidth={2} />
              <Text style={styles.pauseForfeitText}>Forfeit</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Searching Screen ── */}
      {searching && (
        <View style={[StyleSheet.absoluteFill, styles.searchingOverlay]}>
          <Text style={styles.searchingEmoji}>🛰️</Text>
          <Text style={styles.searchingTitle}>Finding opponent...</Text>
          <Text style={styles.searchingTimer}>{searchTime}</Text>
          <Text style={styles.searchingHint}>Searching for a live match nearby</Text>
          <Pressable
            style={styles.searchVsAiBtn}
            onPress={() => {
              console.log('[Game] Play vs AI button pressed from searching screen');
              beginMatch();
            }}
          >
            <Text style={styles.searchVsAiBtnText}>Play vs AI</Text>
          </Pressable>
          {searchToast.length > 0 && (
            <View style={styles.searchToast}>
              <Text style={styles.searchToastText}>{searchToast}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Result Screen ── */}
      {resultData !== null && (
        <View style={[StyleSheet.absoluteFill, resultWon ? styles.resultOverlayWin : styles.resultOverlayLoss]}>
          <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.resultEmoji}>{resultEmoji}</Text>
            <Text style={[styles.resultTitle, resultWon ? styles.resultTitleWin : styles.resultTitleLoss]}>
              {resultTitle}
            </Text>
            <Text style={styles.resultVsText}>
              vs
            </Text>
            <Text style={styles.resultOpponentText}>
              {resultData.opponent ?? 'Opponent'}
            </Text>

            {!resultData.training && (
              <Text style={[styles.resultTrophyBig, { color: resultChange >= 0 ? '#10B981' : '#EF4444' }]}>
                {resultChangeSign}
                {resultChange}
              </Text>
            )}

            {!resultData.training && (
              <View style={styles.resultTrophyRow}>
                <View style={styles.resultTrophyBlock}>
                  <Text style={styles.resultTrophyLabel}>Trophies</Text>
                  <View style={styles.resultTrophyChange}>
                    <Text style={styles.resultTrophyOld}>{resultOldTrophies}</Text>
                    <Text style={styles.resultTrophyArrow}>→</Text>
                    <Text style={styles.resultTrophyNew}>{resultNewTrophies}</Text>
                  </View>
                </View>
              </View>
            )}

            {!resultData.training && (resultData.promoted || resultData.demoted) && (
              <View style={styles.resultLeagueRow}>
                <LeagueBadge trophies={resultOldTrophies} size="md" />
                <Text style={styles.resultLeagueArrow}>→</Text>
                <LeagueBadge trophies={resultNewTrophies} size="md" />
              </View>
            )}

            {resultShardsEarned > 0 && (
              <View style={styles.resultShardsRow}>
                <Text style={styles.resultShardsText}>🔷</Text>
                <Text style={styles.resultShardsText}>
                  +{resultShardsEarned}
                </Text>
                <Text style={styles.resultShardsText}>shards</Text>
              </View>
            )}

            {resultHasUnlocks && (
              <View style={styles.resultUnlocks}>
                <Text style={styles.resultUnlocksTitle}>New cards unlocked!</Text>
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
                  console.log('[Game] Home pressed from result screen');
                  router.push('/');
                }}
              >
                <Text style={styles.resultHomeBtnText}>Home</Text>
              </Pressable>
              <Pressable
                style={styles.resultPlayAgainBtn}
                onPress={() => {
                  console.log('[Game] Play Again pressed from result screen');
                  router.push('/setup');
                }}
              >
                <Text style={styles.resultPlayAgainBtnText}>Play Again</Text>
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
  },
  topHud: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudPlayerInfo: {
    width: 72,
    gap: 1,
  },
  hudName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  hudHpBarWrap: {
    flex: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  pauseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'SpaceMono',
    letterSpacing: 1,
  },
  escalationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  escalationText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    letterSpacing: 0.5,
  },
  bottomHud: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  clickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clickLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textTertiary,
    fontFamily: 'SpaceMono',
    letterSpacing: 0.5,
    width: 44,
  },
  clickDots: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  clickDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hudActionBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  hudActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hudActionBtnActive: {
    backgroundColor: 'rgba(79,142,247,0.12)',
    borderColor: COLORS.primary,
  },
  hudActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  abilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  abilityButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  abilityRightBtns: {
    flexDirection: 'column',
    gap: 6,
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
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editToggleBtnActive: {
    backgroundColor: 'rgba(79,142,247,0.12)',
    borderColor: COLORS.primary,
  },
  editToggleBtnText: {
    fontSize: 16,
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
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    minWidth: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  towerCardSelected: {
    borderColor: '#F59E0B',
    borderWidth: 2,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  towerCardDisabled: {
    opacity: 0.45,
  },
  towerName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  towerCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  towerCost: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
    fontFamily: 'SpaceMono',
  },
  towerDiscount: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: 'SpaceMono',
  },
  abilityBar: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 2,
  },
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
  // Placement overlay
  placementOverlay: {
    zIndex: 10,
  },
  orbSlot: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79,142,247,0.85)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbSlotText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelPlacementBtn: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.9)',
  },
  cancelPlacementText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // UpgradePopup
  upgradePopup: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    zIndex: 20,
  },
  upgradePopupCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
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
    fontFamily: 'SpaceMono',
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
    fontFamily: 'SpaceMono',
  },
  // Orb shop
  orbShopOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 30,
    justifyContent: 'flex-end',
  },
  orbShopBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  orbShopPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  orbShopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orbShopTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  orbShopRow: {
    gap: 10,
    paddingRight: 8,
  },
  orbShopCard: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    minWidth: 72,
  },
  orbShopCardDisabled: {
    opacity: 0.45,
  },
  orbShopCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbShopCircleText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  orbShopName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  orbShopCost: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
    fontFamily: 'SpaceMono',
  },
  // Forfeit dialog
  forfeitOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  forfeitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: 280,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  forfeitEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  forfeitTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  forfeitSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  forfeitYesBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  forfeitYesBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  forfeitCancelBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  forfeitCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
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
    fontFamily: 'SpaceMono',
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
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudCenterBlock: {
    flex: 1,
    alignItems: 'center',
  },
  opponentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kiBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  kiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  hudPills: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  clicksPill: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coinsPill: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  hpBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  hpBarBlock: {
    flex: 1,
    gap: 2,
  },
  hpLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  // Searching screen
  searchingOverlay: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    gap: 10,
    paddingHorizontal: 32,
  },
  searchingEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  searchingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  searchingTimer: {
    fontSize: 72,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: 'SpaceMono',
    lineHeight: 80,
  },
  searchingHint: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 8,
  },
  searchToast: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchToastText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
    textAlign: 'center',
  },
  searchVsAiBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  searchVsAiBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  // Result screen
  resultOverlayWin: {
    backgroundColor: '#FFFFFF',
    zIndex: 90,
  },
  resultOverlayLoss: {
    backgroundColor: '#FFFFFF',
    zIndex: 90,
  },
  resultContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  resultEmoji: {
    fontSize: 72,
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: 'SpaceMono',
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
    fontWeight: '500',
  },
  resultOpponentText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  resultTrophyBig: {
    fontSize: 56,
    fontWeight: '900',
    fontFamily: 'SpaceMono',
    lineHeight: 64,
  },
  resultTrophyRow: {
    alignItems: 'center',
    gap: 4,
  },
  resultTrophyBlock: {
    alignItems: 'center',
    gap: 4,
  },
  resultTrophyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultTrophyChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTrophyOld: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
    fontFamily: 'SpaceMono',
  },
  resultTrophyArrow: {
    fontSize: 16,
    color: '#94A3B8',
  },
  resultTrophyNew: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'SpaceMono',
  },
  resultChangeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  resultChangeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
  },
  resultLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  resultLeagueArrow: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
  },
  resultShardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(132,204,22,0.1)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultShardsText: {
    fontSize: 16,
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
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  resultPlayAgainBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  resultPlayAgainBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultHomeBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  resultHomeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
});
