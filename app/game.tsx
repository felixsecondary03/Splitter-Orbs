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
import { TOWER_COSTS, TOWER_TYPES, UPGRADE_COST_MULT_ARRAY, SELL_RATIO, GAME_WIDTH, GAME_HEIGHT, WALL_Y } from '@/game/constants';
import { TowerIcon } from '@/components/TowerIcon';
import { distance } from '@/game/engine-helpers';
import type { MatchMode } from '@/game/engine-types';
import { useGameLoop } from '@/hooks/useGameLoop';
import { supabase } from '@/utils/supabase';

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
  // training / casual → ai_*
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

  // Safely parse params — on web, Expo Router may not have initialized route params yet
  const paramsReady = !!params && typeof params === 'object';

  const uiMode = paramsReady ? (params.mode ?? 'casual') : 'casual';
  const difficulty = paramsReady ? (params.difficulty ?? 'normal') : 'normal';
  const engineMode = resolveEngineMode(uiMode, difficulty);
  const seed = paramsReady ? parseInt(params.seed ?? String(Date.now()), 10) : Date.now();

  // Parse loadout from params or fall back to defaults
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
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTowerMenu, setSelectedTowerMenu] = useState<Tower | null>(null);
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialState = useMemo(() => {
    try {
      console.log('[Game] createInitialState', { engineMode, seed });
      return createInitialState(engineMode, 0, seed, loadout);
    } catch (e) {
      console.error('[Game] createInitialState failed, using fallback:', e);
      return createInitialState('ai_normal', 0, Date.now(), DEFAULT_LOADOUT);
    }
  // Only run once on mount — seed and loadout are stable at this point
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify backend that match has started
  useEffect(() => {
    if (isAiMode || uiMode === 'ranked') {
      console.log('[Game] Calling start-ai-match on game start', { mode: uiMode });
      supabase.functions.invoke('start-ai-match', {}).catch((e) => {
        console.warn('[Game] start-ai-match exception', e);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionIdParam = paramsReady ? params.sessionId : undefined;
  const opponentNameParam = paramsReady ? params.opponentName : undefined;

  const handleGameEnd = useCallback(async (state: GameState) => {
    const isWin = state.winner === 'player';
    const elapsedSeconds = Math.floor(state.time / 1000);
    const sessionId = sessionIdParam;
    const isMultiplayer = !!sessionId;
    const isAiGame = engineMode.startsWith('ai_');

    console.log(`[Game] Game finished winner=${state.winner} mode=${uiMode} difficulty=${difficulty} elapsed=${elapsedSeconds}s multiplayer=${isMultiplayer}`);

    let trophyChange = isWin ? 25 : -15;
    let coinsEarned = isWin ? 45 : 20;
    let newTrophies: number | undefined;

    if (isMultiplayer && sessionId) {
      // Multiplayer finalize
      const myHp = state.player.station.hp;
      const oppHp = state.opponent.station.hp;
      try {
        console.log('[Game] Calling finalize-match edge function', { sessionId, outcome: isWin ? 'win' : 'loss' });
        const { data, error } = await supabase.functions.invoke('finalize-match', {
          body: {
            sessionId,
            outcome: isWin ? 'win' : 'loss',
            gameTime: elapsedSeconds,
            myHp,
            oppHp,
          },
        });
        if (error) {
          console.warn('[Game] finalize-match error:', error.message);
        } else {
          console.log('[Game] finalize-match response:', data);
          if (data?.trophyChange !== undefined) trophyChange = Number(data.trophyChange);
          if (data?.newTrophies !== undefined) newTrophies = Number(data.newTrophies);
          if (data?.coinsEarned !== undefined) coinsEarned = Number(data.coinsEarned);
        }
      } catch (err) {
        console.warn('[Game] finalize-match exception:', err);
      }
    } else if (isAiGame) {
      // AI finalize
      const aiDifficulty = difficulty;
      try {
        console.log('[Game] Calling finalize-ai-match edge function', { outcome: isWin ? 'win' : 'loss', aiDifficulty });
        const { data, error } = await supabase.functions.invoke('finalize-ai-match', {
          body: {
            outcome: isWin ? 'win' : 'loss',
            gameTime: elapsedSeconds,
            difficulty: aiDifficulty,
          },
        });
        if (error) {
          console.warn('[Game] finalize-ai-match error:', error.message);
        } else {
          console.log('[Game] finalize-ai-match response:', data);
          if (data?.trophyChange !== undefined) trophyChange = Number(data.trophyChange);
          if (data?.newTrophies !== undefined) newTrophies = Number(data.newTrophies);
          if (data?.coinsEarned !== undefined) coinsEarned = Number(data.coinsEarned);
        }
      } catch (err) {
        console.warn('[Game] finalize-ai-match exception:', err);
      }
    }

    const opponentName = opponentNameParam ?? AI_NAMES[difficulty] ?? 'Opponent';

    setTimeout(() => {
      router.replace({
        pathname: '/match-result',
        params: {
          outcome: isWin ? 'WIN' : 'LOSS',
          trophyChange: (trophyChange >= 0 ? '+' : '') + String(trophyChange),
          newTrophies: String(newTrophies ?? 0),
          coinsEarned: String(coinsEarned),
          opponentName,
          mode: uiMode,
        },
      });
    }, 800);
  }, [uiMode, difficulty, engineMode, paramsReady, sessionIdParam, opponentNameParam]);

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

  // ── Pause/resume sync ──
  // Handled by useGameLoop via pause/resume callbacks

  // ── Touch handling ──
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event) => {
      const { x, y } = event;
      const gameX = (x / canvasWidth) * GAME_WIDTH;
      const gameY = (y / canvasHeight) * GAME_HEIGHT;

      console.log(`[Game] Tap at screen=(${x.toFixed(0)},${y.toFixed(0)}) game=(${gameX.toFixed(0)},${gameY.toFixed(0)})`);

      const state = gameStateRef.current as GameState;

      // Check aiming mode
      if (state.aiming) {
        console.log(`[Game] Confirming aim at game=(${gameX.toFixed(0)},${gameY.toFixed(0)})`);
        dispatch((s) => confirmAim(s, gameX, gameY));
        return;
      }

      // Check coin pickup
      const coin = findCoinAtPosition(state, gameX, gameY);
      if (coin) {
        console.log(`[Game] Collecting coin id=${coin.id}`);
        dispatch((s) => collectCoin(s, coin.id));
        return;
      }

      // Check orb tap
      const tappedOrb = findOrbAtPosition(state, gameX, gameY);
      if (tappedOrb) {
        console.log(`[Game] Tapped orb id=${tappedOrb.id} clicks=${state.player.clicks}`);
        dispatch((s) => clickOrb(s, tappedOrb.id));
        return;
      }

      // Tower placement
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
        setSelectedTowerMenu({ ...tower });
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

  // ── Tower menu actions ──
  const handleUpgradeTower = useCallback(() => {
    if (!selectedTowerMenu) return;
    console.log(`[Game] Upgrade tower id=${selectedTowerMenu.id}`);
    dispatch((s) => upgradeTower(s, selectedTowerMenu.id));
    setSelectedTowerMenu(null);
  }, [selectedTowerMenu, dispatch]);

  const handleSellTower = useCallback(() => {
    if (!selectedTowerMenu) return;
    console.log(`[Game] Sell tower id=${selectedTowerMenu.id}`);
    dispatch((s) => sellTower(s, selectedTowerMenu.id));
    setSelectedTowerMenu(null);
  }, [selectedTowerMenu, dispatch]);

  const handleCleanseTower = useCallback(() => {
    if (!selectedTowerMenu) return;
    console.log(`[Game] Cleanse tower id=${selectedTowerMenu.id}`);
    dispatch((s) => cleanseTower(s, selectedTowerMenu.id));
    setSelectedTowerMenu(null);
  }, [selectedTowerMenu, dispatch]);

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
    console.log('[Game] Forfeit pressed');
    router.replace({
      pathname: '/match-result',
      params: { result: 'loss', trophiesChange: '-15', newTrophies: '85', coinsEarned: '10', shardsEarned: '0' },
    });
  }, []);

  const handleCancelAim = useCallback(() => {
    console.log('[Game] Cancel aim pressed');
    dispatch((s) => cancelAim(s));
  }, [dispatch]);

  // ── Derived display values (null-guarded for safety during first render) ──
  const playerHp = renderState?.player?.station?.hp ?? 0;
  const playerMaxHp = renderState?.player?.station?.maxHp ?? 100;
  const oppHp = renderState?.opponent?.station?.hp ?? 0;
  const oppMaxHp = renderState?.opponent?.station?.maxHp ?? 100;
  const playerCoins = Math.floor(renderState?.player?.coins ?? 0);
  const oppCoins = Math.floor(renderState?.opponent?.coins ?? 0);
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

  // Guard: on web, Expo Router may not have initialized route params yet
  if (!paramsReady) {
    return <View style={{ flex: 1, backgroundColor: '#0A0E1A' }} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: COLORS.background }]}>
      {/* ── Top HUD ── */}
      <View style={[styles.topHud, { paddingTop: insets.top + 8 }]}>
        {/* Opponent name + timer row */}
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

        {/* HP bars */}
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
            {/* Aiming cancel overlay */}
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

      {/* ── Bottom HUD ── */}
      <View style={[styles.bottomHud, { paddingBottom: insets.bottom + 4 }]}>
        {/* Player HP + coins */}
        <View style={styles.hudRow}>
          <View style={styles.hudPlayerInfo}>
            <Text style={styles.hudName} numberOfLines={1}>You</Text>
          </View>
          <View style={styles.hudHpBarWrap}>
            <HPBar current={playerHp} max={playerMaxHp} width={screenWidth - 160} height={7} />
          </View>
          <CoinDisplay coins={playerCoins} size="sm" />
        </View>

        {/* Click stamina */}
        <View style={styles.clickRow}>
          <Text style={styles.clickLabel}>CLICKS</Text>
          <View style={styles.clickDots}>
            {Array.from({ length: maxClicks }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.clickDot,
                  { backgroundColor: i < clicksLeft ? COLORS.primary : '#E2E8F0' },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Tower selection bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.towerBar}
          contentContainerStyle={styles.towerBarContent}
        >
          {(loadout.towers ?? []).map((towerType) => {
            const cost = TOWER_COSTS[towerType] ?? 60;
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
                <Text style={[styles.towerCost, !canAfford && { color: COLORS.textTertiary }]}>
                  {cost}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Ability bar */}
        <View style={styles.abilityBar}>
          {(renderState?.player?.abilities ?? []).map((ability) => (
            <AbilityButton
              key={ability.type}
              abilityType={ability.type}
              cooldown={ability.cooldown}
              maxCooldown={ability.maxCooldown}
              onPress={() => handleAbility(ability.type)}
              size={48}
            />
          ))}
        </View>
      </View>

      {/* ── Tower context menu ── */}
      <Modal
        visible={selectedTowerMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTowerMenu(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedTowerMenu(null)}>
          <View style={styles.towerMenu}>
            {selectedTowerMenu && (
              <>
                <View style={styles.towerMenuHeader}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 8,
                    backgroundColor: (TOWER_TYPES[selectedTowerMenu.type]?.color ?? '#64748b') + '33',
                    borderWidth: 1.5, borderColor: TOWER_TYPES[selectedTowerMenu.type]?.color ?? '#64748b',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 12, color: TOWER_TYPES[selectedTowerMenu.type]?.color ?? '#64748b', fontWeight: '700' }}>
                      {(TOWER_TYPES[selectedTowerMenu.type]?.name ?? selectedTowerMenu.type).slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.towerMenuName}>
                      {selectedTowerMenu.type.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.towerMenuLevel}>Level {selectedTowerMenu.level}</Text>
                  </View>
                  <HPBar
                    current={selectedTowerMenu.hp}
                    max={selectedTowerMenu.maxHp}
                    width={80}
                    height={5}
                    showText
                  />
                </View>

                <View style={styles.towerMenuActions}>
                  <Pressable
                    style={[
                      styles.menuBtn,
                      styles.menuBtnUpgrade,
                      (playerCoins < getTowerUpgradeCost(selectedTowerMenu) || selectedTowerMenu.level >= 5) && styles.menuBtnDisabled,
                    ]}
                    onPress={handleUpgradeTower}
                  >
                    <Text style={styles.menuBtnText}>
                      Upgrade
                    </Text>
                    <Text style={styles.menuBtnSub}>
                      {getTowerUpgradeCost(selectedTowerMenu)} coins
                    </Text>
                  </Pressable>

                  {selectedTowerMenu.poisoned && (
                    <Pressable
                      style={[styles.menuBtn, styles.menuBtnCleanse, playerCoins < 20 && styles.menuBtnDisabled]}
                      onPress={handleCleanseTower}
                    >
                      <Text style={styles.menuBtnText}>Cleanse</Text>
                      <Text style={styles.menuBtnSub}>20 coins</Text>
                    </Pressable>
                  )}

                  <Pressable style={[styles.menuBtn, styles.menuBtnSell]} onPress={handleSellTower}>
                    <Text style={styles.menuBtnText}>Sell</Text>
                    <Text style={styles.menuBtnSub}>+{getTowerSellValue(selectedTowerMenu)} coins</Text>
                  </Pressable>

                  <Pressable style={[styles.menuBtn, styles.menuBtnClose]} onPress={() => setSelectedTowerMenu(null)}>
                    <X size={16} color={COLORS.textSecondary} strokeWidth={2} />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

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
            <Pressable style={[styles.pauseBtn2, styles.pauseForfeit]} onPress={handleForfeit}>
              <Flag size={16} color={COLORS.danger} strokeWidth={2} />
              <Text style={styles.pauseForfeitText}>Forfeit</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  hudTrophies: {
    fontSize: 9,
    color: COLORS.gold,
    fontFamily: 'SpaceMono',
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
  },
  clickDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    minWidth: 56,
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
  towerCost: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
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
  // Tower menu modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    paddingBottom: 200,
    paddingHorizontal: 20,
  },
  towerMenu: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  towerMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  towerMenuName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  towerMenuLevel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'SpaceMono',
  },
  towerMenuActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  menuBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
  },
  menuBtnUpgrade: {
    backgroundColor: 'rgba(79,142,247,0.12)',
    borderColor: COLORS.primary,
  },
  menuBtnSell: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: COLORS.danger,
  },
  menuBtnCleanse: {
    backgroundColor: 'rgba(132,204,22,0.1)',
    borderColor: '#84CC16',
  },
  menuBtnClose: {
    flex: 0,
    width: 40,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  menuBtnDisabled: {
    opacity: 0.4,
  },
  menuBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  menuBtnSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontFamily: 'SpaceMono',
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
});
