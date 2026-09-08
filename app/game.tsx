import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { X, Pause, Play, Flag } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { GameCanvas } from '@/components/GameCanvas';
import { HPBar } from '@/components/HPBar';
import { CoinDisplay } from '@/components/CoinDisplay';
import { TowerIcon } from '@/components/TowerIcon';
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
import { TOWER_COSTS, UPGRADE_COST_MULT, SELL_RATIO, GAME_WIDTH, GAME_HEIGHT, WALL_Y } from '@/game/constants';
import { distance } from '@/game/engine-helpers';
import type { MatchMode } from '@/game/engine-types';
import { useGameLoop } from '@/hooks/useGameLoop';
import { supabase } from '@/utils/supabase';

// ─── Default loadout ──────────────────────────────────────────────────────────
const DEFAULT_LOADOUT: Loadout = {
  towers: ['blaster', 'vulcan', 'glacier', 'mortar'],
  orbs: ['normal', 'fast', 'bomb', 'splitter', 'tank'],
  abilities: ['meteor', 'freeze', 'rage'],
  sideTowerLevel: 1,
  handLevel: 1,
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
  return Math.round(base * (UPGRADE_COST_MULT[tower.level] ?? 1));
}

function getTowerSellValue(tower: Tower): number {
  const base = TOWER_COSTS[tower.type] ?? 60;
  let total = base;
  for (let l = 1; l < tower.level; l++) {
    total += Math.round(base * (UPGRADE_COST_MULT[l] ?? 1));
  }
  return Math.round(total * SELL_RATIO);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{
    mode?: string;
    difficulty?: string;
    towers?: string;
    orbs?: string;
    abilities?: string;
    sessionId?: string;
    seed?: string;
  }>();

  const uiMode = params.mode ?? 'casual';
  const difficulty = params.difficulty ?? 'normal';
  const engineMode = resolveEngineMode(uiMode, difficulty);
  const seed = parseInt(params.seed ?? String(Date.now()), 10);

  // Parse loadout from params or fall back to defaults
  const loadout: Loadout = {
    towers: params.towers ? (JSON.parse(params.towers) as TowerType[]) : DEFAULT_LOADOUT.towers,
    orbs: params.orbs ? (JSON.parse(params.orbs) as OrbType[]) : DEFAULT_LOADOUT.orbs,
    abilities: params.abilities ? (JSON.parse(params.abilities) as AbilityType[]) : DEFAULT_LOADOUT.abilities,
    sideTowerLevel: DEFAULT_LOADOUT.sideTowerLevel,
    handLevel: DEFAULT_LOADOUT.handLevel,
    cardLevels: DEFAULT_LOADOUT.cardLevels,
  };

  const opponentName = AI_NAMES[difficulty] ?? 'Opponent';

  const [isPaused, setIsPaused] = useState(false);
  const [selectedTowerMenu, setSelectedTowerMenu] = useState<Tower | null>(null);
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  const initialState = useRef(createInitialState(engineMode, 0, seed, loadout)).current;

  const handleGameEnd = useCallback(async (state: GameState) => {
    const isWin = state.winner === 'player';
    console.log(`[Game] Game finished winner=${state.winner} mode=${uiMode} difficulty=${difficulty}`);
    const trophiesChange = isWin ? 25 : -15;
    const coinsEarned = isWin ? 45 : 20;
    const shardsEarned = isWin ? 10 : 0;

    // Call Supabase edge function to finalize match
    try {
      console.log('[Game] Calling finalizeAiMatch edge function');
      const { data, error } = await supabase.functions.invoke('finalizeAiMatch', {
        body: {
          result: isWin ? 'win' : 'loss',
          mode: uiMode,
          difficulty,
          trophiesChange,
          coinsEarned,
          shardsEarned,
          gameDuration: Math.floor(state.time / 1000),
        },
      });
      if (error) {
        console.warn('[Game] finalizeAiMatch error:', error.message);
      } else {
        console.log('[Game] finalizeAiMatch response:', data);
      }
    } catch (err) {
      console.warn('[Game] finalizeAiMatch exception:', err);
    }

    setTimeout(() => {
      router.replace({
        pathname: '/match-result',
        params: {
          result: isWin ? 'win' : 'loss',
          trophiesChange: String(trophiesChange),
          newTrophies: '125',
          coinsEarned: String(coinsEarned),
          shardsEarned: String(shardsEarned),
        },
      });
    }, 800);
  }, [uiMode, difficulty]);

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

  // ── Derived display values ──
  const playerHp = renderState.player.station.hp;
  const playerMaxHp = renderState.player.station.maxHp;
  const oppHp = renderState.opponent.station.hp;
  const oppMaxHp = renderState.opponent.station.maxHp;
  const playerCoins = Math.floor(renderState.player.coins);
  const oppCoins = Math.floor(renderState.opponent.coins);
  const timeDisplay = formatTime(renderState.time);
  const selectedTowerType = renderState.player.selectedTower;
  const isAiming = renderState.aiming !== null;
  const clicksLeft = renderState.player.clicks;
  const maxClicks = renderState.player.maxClicks;
  const escalationTier = renderState.escalationTier;

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

  const isAiMode = engineMode.startsWith('ai_');

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
          {DEFAULT_LOADOUT.towers.map((towerType) => {
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
                <TowerIcon type={towerType} size={30} selected={isSelected} />
                <Text style={[styles.towerCost, !canAfford && { color: COLORS.textTertiary }]}>
                  {cost}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Ability bar */}
        <View style={styles.abilityBar}>
          {renderState.player.abilities.map((ability) => (
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
                  <TowerIcon type={selectedTowerMenu.type} size={36} selected />
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
