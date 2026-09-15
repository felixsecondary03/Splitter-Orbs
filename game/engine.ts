// Pure TypeScript — no React, no RN imports
import {
  WALL_Y,
  PLAYER_STATION_X, PLAYER_STATION_Y, OPP_STATION_X, OPP_STATION_Y,
  SIDE_TOWER_POSITIONS, STATION_HP, STARTING_COINS, COIN_CAP,
  SPAWN_INTERVAL_START, SPAWN_INTERVAL_MIN, SPAWN_RAMP_DURATION,
  ESCALATION_CASUAL, ESCALATION_RANKED,
  TOWER_COSTS, UPGRADE_COST_MULT_ARRAY, SELL_RATIO,
  GAME_WIDTH,
  CRIT_CHANCE, CRIT_MULT, COMBO_WINDOW, COMBO_GRACE,
  COMEBACK_HP_THRESHOLD, COMEBACK_COIN_RATE,
  TOWER_BLEED_RATE, STATION_BLEED_FLOOR,
  OVERTIME_ORB_HP_SCALE, OVERTIME_SCALE_INTERVAL,
  CLICK_DAMAGE_BY_LEAGUE, getLeague,
  OrbType, TowerType, AbilityType,
  LEAGUES,
  ORB_SLOTS, ORB_TYPES,
} from './constants';
import type {
  MatchMode, GameState, PlayerState, Tower, SideTower, Station,
  AbilityState, Orb, Projectile, Effect, Floater, Particle, CoinPickup,
  MeteorState, GlueState, ZoneState, MagnetState, AiAction, Loadout,
} from './engine-types';
import {
  generateId, distance, normalize, createRng,
  getTowerRange, getTowerDamage, getTowerFireRate, getTowerMaxHp,
  getOrbColor, getTowerColor, getOrbRadius, getOrbHp, getOrbDamage, getOrbSpeed,
} from './engine-helpers';
import { updateOrb, spawnOrb, handleOrbDeath, checkOrbReachedStation, isOrbOutOfBounds } from './orb-behaviors';
import { fireTower, fireSideTower, updateProjectile } from './tower-behaviors';

export type {
  MatchMode, EscalationTier, GameStatus,
  Orb, Tower, SideTower, Station, Projectile, Effect, Floater, Particle,
  CoinPickup, AbilityState, PlayerState, GameState, AiAction, Loadout,
  MeteorState, GlueState, ZoneState, MagnetState, TargetingState, AimingState,
} from './engine-types';
export {
  getOrbColor, getTowerColor, getOrbRadius,
  getTowerRange, getTowerDamage, getTowerFireRate,
  getOrbHp, getOrbDamage, getOrbSpeed,
  distance, generateId,
} from './engine-helpers';

// ─── Ability cooldowns (ms) ───────────────────────────────────────────────────
const ABILITY_COOLDOWNS: Partial<Record<AbilityType, number>> = {
  zap:         16000,
  portal:      22000,
  repair:      30000,
  freeze:      24000,
  rage:        28000,
  shield:      26000,
  burner:      16000,
  meteor:      24000,
  glue:        22000,
  overclock:   28000,
  speed_zone:  22000,
  damage_zone: 24000,
  frost_zone:  26000,
  deep_freeze: 32000,
};

// ─── createInitialState ───────────────────────────────────────────────────────
export function createInitialState(
  mode: MatchMode,
  playerTrophies: number,
  seed: number,
  loadout: Loadout,
): GameState {
  console.log(`[Engine] createInitialState mode=${mode} trophies=${playerTrophies} seed=${seed}`);

  const rng = createRng(seed);
  const leagueIndex = LEAGUES.findIndex(l => l === getLeague(playerTrophies));
  const safeLeagueIndex = leagueIndex < 0 ? 0 : leagueIndex;
  const clickDamage = CLICK_DAMAGE_BY_LEAGUE[safeLeagueIndex] ?? 8;

  const maxClicks = 20 + loadout.handLevel * 2;
  const rechargeInterval = Math.max(100, 500 - loadout.handLevel * 40);

  const makeStation = (x: number, y: number): Station => ({
    x, y, hp: STATION_HP, maxHp: STATION_HP,
  });

  const makeSideTowers = (side: 0 | 1): SideTower[] =>
    SIDE_TOWER_POSITIONS.map((pos, i) => ({
      id: generateId(),
      x: pos.x,
      y: side === 0 ? pos.y : WALL_Y - (pos.y - WALL_Y),
      level: loadout.sideTowerLevel,
      hp: 60 + loadout.sideTowerLevel * 20,
      maxHp: 60 + loadout.sideTowerLevel * 20,
      fireTimer: 0,
      side,
    }));

  const makeAbilities = (): AbilityState[] =>
    loadout.abilities.map(type => ({
      type,
      cooldown: 0,
      maxCooldown: ABILITY_COOLDOWNS[type] ?? 20000,
      level: loadout.cardLevels[type] ?? 1,
    }));

  const makePlayer = (side: 0 | 1): PlayerState => ({
    hp: STATION_HP,
    maxHp: STATION_HP,
    coins: STARTING_COINS,
    towers: [],
    sideTowers: makeSideTowers(side),
    station: makeStation(
      side === 0 ? PLAYER_STATION_X : OPP_STATION_X,
      side === 0 ? PLAYER_STATION_Y : OPP_STATION_Y,
    ),
    abilities: makeAbilities(),
    selectedTower: null,
    clicks: maxClicks,
    maxClicks,
    rechargeInterval,
    rechargeTimer: rechargeInterval,
    effects: {
      freeze: false, freezeTimer: 0,
      rage: false, rageTimer: 0,
      shield: false, shieldTimer: 0,
      overclock: false, overclockTimer: 0,
    },
  });

  return {
    status: 'waiting',
    time: 0,
    matchMode: mode,
    escalationTier: 'none',
    player: makePlayer(0),
    opponent: makePlayer(1),
    orbs: [],
    projectiles: [],
    effects: [],
    floaters: [],
    particles: [],
    coinPickups: [],
    spawnTimer: SPAWN_INTERVAL_START,
    spawnInterval: SPAWN_INTERVAL_START,
    combo: 0,
    comboTimer: 0,
    editMode: false,
    hitStop: 0,
    shake: 0,
    overtimeTimer: 0,
    overtimeActive: false,
    overtimeScale: 1,
    overtimeScaleTimer: 0,
    meteors: [],
    glues: [],
    zones: [],
    magnets: [],
    targeting: null,
    aiming: null,
    playerTrophies,
    leagueIndex: safeLeagueIndex,
    clickDamage,
    seed,
    rng,
    winner: null,
  };
}

// ─── update ───────────────────────────────────────────────────────────────────
export function update(state: GameState, dt: number, aiAction?: AiAction): GameState {
  if (state.status === 'finished' || state.status === 'paused') return state;

  let s = state;

  // 1. Time advance
  s = { ...s, time: s.time + dt };

  // 2. Escalation
  s = updateEscalation(s);

  // 3. Tower bleed
  if (s.escalationTier === 'tower_bleed') {
    s = applyTowerBleed(s, dt);
  }

  // 4. Overtime orb scaling
  if (s.overtimeActive) {
    const newScaleTimer = s.overtimeScaleTimer + dt;
    if (newScaleTimer >= OVERTIME_SCALE_INTERVAL) {
      const scaledOrbs = s.orbs.map(o => ({
        ...o,
        maxHp: o.maxHp * OVERTIME_ORB_HP_SCALE,
        hp: Math.min(o.hp * OVERTIME_ORB_HP_SCALE, o.maxHp * OVERTIME_ORB_HP_SCALE),
      }));
      s = { ...s, orbs: scaledOrbs, overtimeScaleTimer: 0 };
    } else {
      s = { ...s, overtimeScaleTimer: newScaleTimer };
    }
  }

  // 5. Comeback coins
  const dtSec = dt / 1000;
  if (s.player.hp < COMEBACK_HP_THRESHOLD * s.player.maxHp) {
    const newCoins = Math.min(s.player.coins + COMEBACK_COIN_RATE * dtSec, COIN_CAP);
    s = { ...s, player: { ...s.player, coins: newCoins } };
  }

  // 6. Click recharge
  s = updateClickRecharge(s, dt);

  // 7. Ability cooldowns
  s = updateAbilityCooldowns(s, dt);

  // 8. Effect timers
  s = updateEffectTimers(s, dt);

  // 9. Spawn orbs
  s = updateSpawn(s, dt);

  // 10. Healer orbs heal nearby allies (before orb movement)
  s = tickHealers(s, dt);

  // 11. Update orbs
  s = updateOrbs(s, dt);

  // 12. Summoner orbs spawn minions (after orb movement)
  s = tickSummoners(s, dt);

  // 13. Update towers
  s = updateTowers(s, dt);

  // 14. Bouncer towers pull and bounce orbs (after tower update)
  s = bouncerUpdate(s, dt);

  // 15. Update side towers
  s = updateSideTowers(s, dt);

  // 16. Update projectiles
  s = updateProjectiles(s, dt);

  // 17. Update meteors
  s = updateMeteors(s, dt);

  // 18. Update glues/zones/magnets
  s = updateZoneEffects(s, dt);

  // 19. Update effects/particles/floaters
  s = updateVisuals(s, dt);

  // 20. Combo timer
  s = updateCombo(s, dt);

  // 21. Coin pickups
  s = { ...s, coinPickups: s.coinPickups.map(c => ({ ...c, timer: c.timer - dt })).filter(c => c.timer > 0) };

  // 22. AI action
  if (aiAction && aiAction.type !== 'none') {
    s = applyAiAction(s, aiAction);
  }

  // 23. Win check
  if (s.player.station.hp <= 0 && !s.winner) {
    console.log('[Engine] Game over — opponent wins');
    s = { ...s, winner: 'opponent', status: 'finished' };
  } else if (s.opponent.station.hp <= 0 && !s.winner) {
    console.log('[Engine] Game over — player wins');
    s = { ...s, winner: 'player', status: 'finished' };
  }

  // 21. Hit-stop
  if (s.hitStop > 0) {
    s = { ...s, hitStop: Math.max(0, s.hitStop - dt) };
  }

  return s;
}

// ─── Sub-update helpers ───────────────────────────────────────────────────────

function tickHealers(s: GameState, dt: number): GameState {
  const dtSec = dt / 1000;
  let newOrbs = [...s.orbs];
  let newParticles = [...s.particles];
  let newEffects = [...s.effects];

  for (let i = 0; i < newOrbs.length; i++) {
    const orb = newOrbs[i];
    if (orb.type !== 'healer' || orb.hp <= 0) continue;

    const healTimer = (orb.healTimer ?? 0) + dtSec;
    const interval = 2; // seconds between heal pulses
    if (healTimer < interval) {
      newOrbs[i] = { ...orb, healTimer };
      continue;
    }

    newOrbs[i] = { ...orb, healTimer: 0 };
    const radius = 120;
    const pulse = 8;
    let healed = false;

    for (let j = 0; j < newOrbs.length; j++) {
      if (i === j) continue;
      const ally = newOrbs[j];
      if (ally.side !== orb.side || ally.hp <= 0 || ally.hp >= ally.maxHp) continue;
      const d = Math.hypot(ally.x - orb.x, ally.y - orb.y);
      if (d > radius) continue;
      newOrbs[j] = { ...ally, hp: Math.min(ally.maxHp, ally.hp + pulse) };
      healed = true;
      newParticles.push({
        id: generateId(), x: orb.x, y: orb.y,
        vx: (ally.x - orb.x) * 0.5, vy: (ally.y - orb.y) * 0.5,
        color: '#4ade80', radius: 3, alpha: 1, timer: 400, maxTimer: 400,
      });
    }

    if (healed) {
      newEffects.push({
        id: generateId(), type: 'heal_pulse',
        x: orb.x, y: orb.y,
        timer: 500, maxTimer: 500, color: '#4ade80',
      });
    }
  }

  return { ...s, orbs: newOrbs, particles: newParticles, effects: newEffects };
}

function tickSummoners(s: GameState, dt: number): GameState {
  const dtSec = dt / 1000;
  let newOrbs = [...s.orbs];
  let newEffects = [...s.effects];

  for (let i = 0; i < newOrbs.length; i++) {
    const orb = newOrbs[i];
    if (orb.type !== 'summoner' || orb.hp <= 0) continue;

    const summonTimer = (orb.summonTimer ?? 0) + dtSec;
    const interval = 2.5;
    if (summonTimer < interval) {
      newOrbs[i] = { ...orb, summonTimer };
      continue;
    }

    newOrbs[i] = { ...orb, summonTimer: 0 };

    const minion: Orb = {
      id: generateId(),
      type: 'normal',
      side: orb.side,
      owner: orb.owner,
      x: orb.x + (Math.random() * 30 - 15),
      y: orb.y,
      vx: 0,
      vy: orb.side === 0 ? 40 : -40,
      hp: 8,
      maxHp: 8,
      damage: 3,
      speed: 40,
      radius: 10,
      color: orb.color,
    };
    newOrbs.push(minion);
    newEffects.push({
      id: generateId(), type: 'spawn_portal',
      x: orb.x, y: orb.y,
      timer: 300, maxTimer: 300, color: orb.color,
    });
  }

  return { ...s, orbs: newOrbs, effects: newEffects };
}

function bouncerUpdate(s: GameState, dt: number): GameState {
  const dtSec = dt / 1000;
  let newOrbs = [...s.orbs];
  let newEffects = [...s.effects];

  const processBouncer = (towers: Tower[], ownerSide: 0 | 1) => {
    for (const tower of towers) {
      if (tower.type !== 'bouncer' || tower.hp <= 0 || tower.frozen) continue;
      const pullRange = getTowerRange(tower.type, tower.level ?? 1);

      for (let i = 0; i < newOrbs.length; i++) {
        const orb = newOrbs[i];
        if (orb.side !== ownerSide || orb.hp <= 0 || orb.frozen) continue;
        if ((orb.bounceTimer ?? 0) > 0) {
          newOrbs[i] = { ...orb, bounceTimer: Math.max(0, (orb.bounceTimer ?? 0) - dtSec) };
          continue;
        }

        const d = Math.hypot(orb.x - tower.x, orb.y - tower.y);
        if (d > pullRange) continue;

        const dx = tower.x - orb.x;
        const dy = tower.y - orb.y;
        const dist = d || 1;
        const pullSpeed = 160;
        const newX = orb.x + (dx / dist) * pullSpeed * dtSec;
        const newY = orb.y + (dy / dist) * pullSpeed * dtSec;

        if (d < 20 + orb.radius) {
          const bounceSpeed = ownerSide === 0 ? -280 : 280;
          newOrbs[i] = {
            ...orb,
            x: newX, y: newY,
            vy: bounceSpeed,
            vx: (orb.x - tower.x) * 1.5,
            bounceTimer: 1.1,
          };
          newEffects.push({
            id: generateId(), type: 'pop',
            x: tower.x, y: tower.y,
            timer: 300, maxTimer: 300, color: getTowerColor(tower.type),
          });
        } else {
          newOrbs[i] = { ...orb, x: newX, y: newY };
        }
      }
    }
  };

  processBouncer(s.player.towers, 0);
  processBouncer(s.opponent.towers, 1);

  return { ...s, orbs: newOrbs, effects: newEffects };
}

function updateEscalation(s: GameState): GameState {
  const thresholds = s.matchMode === 'ranked' ? ESCALATION_RANKED : ESCALATION_CASUAL;
  let tier = s.escalationTier;
  let overtimeActive = s.overtimeActive;

  if (s.time >= thresholds.TOWER_BLEED && tier !== 'tower_bleed') {
    tier = 'tower_bleed';
  } else if (s.time >= thresholds.MAX_PRESSURE && tier !== 'max_pressure' && tier !== 'tower_bleed') {
    tier = 'max_pressure';
  } else if ('CRITICAL' in thresholds && s.time >= (thresholds as typeof ESCALATION_RANKED).CRITICAL && tier !== 'critical' && tier !== 'max_pressure' && tier !== 'tower_bleed') {
    tier = 'critical';
  } else if (s.time >= thresholds.INTENSIFYING && tier !== 'intensifying' && tier !== 'critical' && tier !== 'max_pressure' && tier !== 'tower_bleed') {
    tier = 'intensifying';
  } else if (s.time >= thresholds.OVERTIME && tier === 'none') {
    tier = 'overtime';
    overtimeActive = true;
  }

  return { ...s, escalationTier: tier, overtimeActive };
}

function applyTowerBleed(s: GameState, dt: number): GameState {
  const dtSec = dt / 1000;
  const bleedHp = TOWER_BLEED_RATE * dtSec;

  const bleedSideTowers = (towers: SideTower[]) =>
    towers.map(t => ({ ...t, hp: Math.max(0, t.hp - bleedHp) }));

  const bleedStation = (station: typeof s.player.station) => ({
    ...station,
    hp: Math.max(STATION_BLEED_FLOOR, station.hp - bleedHp),
  });

  return {
    ...s,
    player: {
      ...s.player,
      sideTowers: bleedSideTowers(s.player.sideTowers),
      station: bleedStation(s.player.station),
    },
    opponent: {
      ...s.opponent,
      sideTowers: bleedSideTowers(s.opponent.sideTowers),
      station: bleedStation(s.opponent.station),
    },
  };
}

function updateClickRecharge(s: GameState, dt: number): GameState {
  if (s.player.clicks >= s.player.maxClicks) return s;
  const newTimer = s.player.rechargeTimer - dt;
  if (newTimer <= 0) {
    return {
      ...s,
      player: {
        ...s.player,
        clicks: Math.min(s.player.clicks + 1, s.player.maxClicks),
        rechargeTimer: s.player.rechargeInterval,
      },
    };
  }
  return { ...s, player: { ...s.player, rechargeTimer: newTimer } };
}

function updateAbilityCooldowns(s: GameState, dt: number): GameState {
  const abilities = s.player.abilities.map(a => ({
    ...a,
    cooldown: Math.max(0, a.cooldown - dt),
  }));
  return { ...s, player: { ...s.player, abilities } };
}

function updateEffectTimers(s: GameState, dt: number): GameState {
  const fx = s.player.effects;
  return {
    ...s,
    player: {
      ...s.player,
      effects: {
        freeze: fx.freeze && fx.freezeTimer > dt,
        freezeTimer: Math.max(0, fx.freezeTimer - dt),
        rage: fx.rage && fx.rageTimer > dt,
        rageTimer: Math.max(0, fx.rageTimer - dt),
        shield: fx.shield && fx.shieldTimer > dt,
        shieldTimer: Math.max(0, fx.shieldTimer - dt),
        overclock: fx.overclock && fx.overclockTimer > dt,
        overclockTimer: Math.max(0, fx.overclockTimer - dt),
      },
    },
  };
}

function updateSpawn(s: GameState, dt: number): GameState {
  const newTimer = s.spawnTimer - dt;
  if (newTimer > 0) return { ...s, spawnTimer: newTimer };

  // Ramp spawn interval
  const t = Math.min(s.time / SPAWN_RAMP_DURATION, 1);
  const newInterval = SPAWN_INTERVAL_START - t * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN);

  // Spawn one orb per side
  const orb0 = spawnOrb(s, 0);
  const orb1 = spawnOrb(s, 1);

  return {
    ...s,
    orbs: [...s.orbs, orb0, orb1],
    spawnTimer: newInterval,
    spawnInterval: newInterval,
  };
}

function updateOrbs(s: GameState, dt: number): GameState {
  let newOrbs: Orb[] = [];
  let newParticles = [...s.particles];
  let newEffects = [...s.effects];
  let newCoinPickups = [...s.coinPickups];
  let newFloaters = [...s.floaters];
  let playerCoins = s.player.coins;
  let playerStation = { ...s.player.station };
  let oppStation = { ...s.opponent.station };

  for (const orb of s.orbs) {
    if (orb.hp <= 0) {
      // Orb died — handle death
      const killedByPlayer = orb.side === 0; // opponent's orb killed by player's towers
      const result = handleOrbDeath(orb, s, killedByPlayer);
      newOrbs.push(...result.newOrbs);
      newParticles.push(...result.particles);
      newEffects.push(...result.effects);
      newFloaters.push(...result.floaters);
      if (result.coinPickup) newCoinPickups.push(result.coinPickup);
      // Direct coin reward on every player kill (matching web app killOrb)
      if (killedByPlayer) {
        const reward = ORB_TYPES[orb.type as keyof typeof ORB_TYPES]?.reward ?? 0;
        playerCoins = Math.min(playerCoins + reward, COIN_CAP);
      }
      continue;
    }

    // Bouncing: use current velocity, don't seek target
    if ((orb.bounceTimer ?? 0) > 0) {
      const dtSec = dt / 1000;
      const bounced = {
        ...orb,
        x: orb.x + orb.vx * dtSec,
        y: orb.y + orb.vy * dtSec,
        bounceTimer: Math.max(0, (orb.bounceTimer ?? 0) - dtSec),
      };
      if (!isOrbOutOfBounds(bounced)) newOrbs.push(bounced);
      continue;
    }

    const updated = updateOrb(orb, dt, s);

    // Check if orb reached station
    if (checkOrbReachedStation(updated)) {
      // Deal damage to station
      const dmg = updated.damage;
      if (updated.side === 0) {
        // Orb from opponent side hits player station
        if (playerStation.shieldHp && playerStation.shieldHp > 0) {
          playerStation = { ...playerStation, shieldHp: Math.max(0, playerStation.shieldHp - dmg) };
        } else {
          playerStation = { ...playerStation, hp: Math.max(0, playerStation.hp - dmg) };
        }
      } else {
        // Orb from player side hits opponent station
        if (oppStation.shieldHp && oppStation.shieldHp > 0) {
          oppStation = { ...oppStation, shieldHp: Math.max(0, oppStation.shieldHp - dmg) };
        } else {
          oppStation = { ...oppStation, hp: Math.max(0, oppStation.hp - dmg) };
        }
      }
      // Spawn hit effect
      newEffects.push({
        id: generateId(),
        type: 'station_hit',
        x: updated.x,
        y: updated.y,
        timer: 300,
        maxTimer: 300,
        color: '#F87171',
      });
      continue; // Remove orb
    }

    if (isOrbOutOfBounds(updated)) continue;

    newOrbs.push(updated);
  }

  return {
    ...s,
    orbs: newOrbs,
    particles: newParticles,
    effects: newEffects,
    coinPickups: newCoinPickups,
    floaters: newFloaters,
    player: { ...s.player, coins: playerCoins, station: playerStation },
    opponent: { ...s.opponent, station: oppStation },
  };
}

function updateTowers(s: GameState, dt: number): GameState {
  let newProjectiles = [...s.projectiles];
  let newEffects = [...s.effects];
  let orbUpdatesMap = new Map<string, Partial<Orb>>();

  const processPlayerTowers = (towers: Tower[], side: 0 | 1) => {
    const enemyOrbs = s.orbs.filter(o => o.side === side);
    return towers.map(tower => {
      if (tower.frozen) {
        const ft = (tower.frozenTimer ?? 0) - dt;
        if (ft <= 0) return { ...tower, frozen: false, frozenTimer: 0 };
        return { ...tower, frozenTimer: ft };
      }

      // Poison DoT on tower
      let updatedTower = { ...tower };
      if (updatedTower.poisoned) {
        const pt = (updatedTower.poisonTimer ?? 0) - dt;
        const dmg = (updatedTower.poisonDps ?? 3) * (dt / 1000);
        updatedTower = { ...updatedTower, hp: updatedTower.hp - dmg };
        if (pt <= 0) {
          updatedTower = { ...updatedTower, poisoned: false, poisonTimer: 0, poisonDps: 0 };
        } else {
          updatedTower = { ...updatedTower, poisonTimer: pt };
        }
      }

      const newFireTimer = updatedTower.fireTimer - dt;
      if (newFireTimer > 0) return { ...updatedTower, fireTimer: newFireTimer };

      const result = fireTower(updatedTower, enemyOrbs, s);
      newProjectiles.push(...result.projectiles);
      newEffects.push(...result.effects);
      result.orbUpdates.forEach((v, k) => {
        const existing = orbUpdatesMap.get(k) ?? {};
        orbUpdatesMap.set(k, { ...existing, ...v });
      });

      const fireRate = updatedTower.overclocked
        ? updatedTower.fireRate * 0.5
        : updatedTower.fireRate;

      return { ...updatedTower, fireTimer: fireRate };
    });
  };

  const playerTowers = processPlayerTowers(s.player.towers, 0);
  const oppTowers = processPlayerTowers(s.opponent.towers, 1);

  // Apply orb updates
  const newOrbs = s.orbs.map(orb => {
    const upd = orbUpdatesMap.get(orb.id);
    if (!upd) return orb;
    return { ...orb, ...upd };
  });

  return {
    ...s,
    orbs: newOrbs,
    projectiles: newProjectiles,
    effects: newEffects,
    player: { ...s.player, towers: playerTowers },
    opponent: { ...s.opponent, towers: oppTowers },
  };
}

function updateSideTowers(s: GameState, dt: number): GameState {
  let newProjectiles = [...s.projectiles];

  const processSide = (sideTowers: SideTower[], side: 0 | 1) => {
    const enemyOrbs = s.orbs.filter(o => o.side === side);
    return sideTowers.map(st => {
      if (st.frozen) {
        const ft = (st.frozenTimer ?? 0) - dt;
        if (ft <= 0) return { ...st, frozen: false, frozenTimer: 0 };
        return { ...st, frozenTimer: ft };
      }

      const newFireTimer = st.fireTimer - dt;
      if (newFireTimer > 0) return { ...st, fireTimer: newFireTimer };

      const result = fireSideTower(st, enemyOrbs);
      newProjectiles.push(...result.projectiles);

      const fireRate = 2000 - st.level * 200;
      return { ...st, fireTimer: fireRate };
    });
  };

  return {
    ...s,
    projectiles: newProjectiles,
    player: { ...s.player, sideTowers: processSide(s.player.sideTowers, 0) },
    opponent: { ...s.opponent, sideTowers: processSide(s.opponent.sideTowers, 1) },
  };
}

function updateProjectiles(s: GameState, dt: number): GameState {
  let newProjectiles: Projectile[] = [];
  let newEffects = [...s.effects];
  let orbUpdatesMap = new Map<string, Partial<Orb>>();

  for (const proj of s.projectiles) {
    const enemyOrbs = s.orbs.filter(o => o.side === proj.side);
    const result = updateProjectile(proj, dt, enemyOrbs, s);

    if (result.projectile) newProjectiles.push(result.projectile);
    newEffects.push(...result.effects);
    result.orbUpdates.forEach((v, k) => {
      const existing = orbUpdatesMap.get(k) ?? {};
      orbUpdatesMap.set(k, { ...existing, ...v });
    });
  }

  // Apply orb updates from projectile hits
  const newOrbs = s.orbs.map(orb => {
    const upd = orbUpdatesMap.get(orb.id);
    if (!upd) return orb;
    return { ...orb, ...upd };
  });

  return { ...s, projectiles: newProjectiles, effects: newEffects, orbs: newOrbs };
}

function updateMeteors(s: GameState, dt: number): GameState {
  const dtSec = dt / 1000;
  let newEffects = [...s.effects];
  let newOrbs = [...s.orbs];

  const newMeteors = s.meteors.filter(m => {
    const newProgress = m.progress + dtSec * 0.8;
    if (newProgress >= 1) {
      // Impact
      newEffects.push({
        id: generateId(),
        type: 'explosion',
        x: m.targetX,
        y: m.targetY,
        timer: 500,
        maxTimer: 500,
        radius: m.radius,
        color: '#F97316',
      });
      // AoE damage
      newOrbs = newOrbs.map(orb => {
        const d = distance(orb.x, orb.y, m.targetX, m.targetY);
        if (d <= m.radius) {
          return { ...orb, hp: orb.hp - m.damage * (1 - d / m.radius) };
        }
        return orb;
      });
      return false;
    }
    return true;
  }).map(m => ({ ...m, progress: m.progress + dtSec * 0.8 }));

  return { ...s, meteors: newMeteors, effects: newEffects, orbs: newOrbs };
}

function updateZoneEffects(s: GameState, dt: number): GameState {
  const dtSec = dt / 1000;

  // Glues
  const newGlues = s.glues
    .map(g => ({ ...g, timer: g.timer - dt }))
    .filter(g => g.timer > 0);

  // Zones
  const newZones = s.zones
    .map(z => ({ ...z, timer: z.timer - dt }))
    .filter(z => z.timer > 0);

  // Magnets
  const newMagnets = s.magnets
    .map(m => ({ ...m, timer: m.timer - dt }))
    .filter(m => m.timer > 0);

  // Apply glue slow to orbs
  let newOrbs = s.orbs.map(orb => {
    let updated = { ...orb };
    for (const g of newGlues) {
      const d = distance(orb.x, orb.y, g.x, g.y);
      if (d <= g.radius) {
        updated = { ...updated, speed: orb.speed * g.slowFactor };
      }
    }
    for (const z of newZones) {
      const d = distance(orb.x, orb.y, z.x, z.y);
      if (d <= z.radius && z.type === 'damage' && z.dps) {
        updated = { ...updated, hp: updated.hp - z.dps * dtSec };
      }
    }
    for (const m of newMagnets) {
      const d = distance(orb.x, orb.y, m.x, m.y);
      if (d <= m.radius && d > 20) {
        const { nx, ny } = normalize(m.x - orb.x, m.y - orb.y);
        updated = { ...updated, x: updated.x + nx * 20 * dtSec, y: updated.y + ny * 20 * dtSec };
      }
    }
    return updated;
  });

  return { ...s, glues: newGlues, zones: newZones, magnets: newMagnets, orbs: newOrbs };
}

function updateVisuals(s: GameState, dt: number): GameState {
  const newEffects = s.effects
    .map(e => ({ ...e, timer: e.timer - dt }))
    .filter(e => e.timer > 0);

  const newParticles = s.particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * (dt / 1000),
      y: p.y + p.vy * (dt / 1000),
      vy: p.vy + 60 * (dt / 1000), // gravity
      alpha: p.timer / p.maxTimer,
      timer: p.timer - dt,
    }))
    .filter(p => p.timer > 0);

  const newFloaters = s.floaters
    .map(f => ({
      ...f,
      y: f.y + f.vy * (dt / 1000),
      timer: f.timer - dt,
    }))
    .filter(f => f.timer > 0);

  return { ...s, effects: newEffects, particles: newParticles, floaters: newFloaters };
}

function updateCombo(s: GameState, dt: number): GameState {
  if (s.combo === 0) return s;
  const newTimer = s.comboTimer - dt;
  if (newTimer <= -COMBO_GRACE) {
    return { ...s, combo: 0, comboTimer: 0 };
  }
  return { ...s, comboTimer: newTimer };
}

function applyAiAction(s: GameState, action: AiAction): GameState {
  if (!action.payload) return s;
  switch (action.type) {
    case 'place_tower':
      return remotePlaceTower(
        s,
        action.payload.type as TowerType,
        action.payload.x as number,
        action.payload.y as number,
      );
    case 'upgrade_tower':
      return remoteUpgradeTower(s, action.payload.towerId as string);
    case 'sell_tower':
      return remoteSellTower(s, action.payload.towerId as string);
    case 'ability':
      return remoteAbility(
        s,
        action.payload.abilityType as AbilityType,
        action.payload.x as number | undefined,
        action.payload.y as number | undefined,
      );
    default:
      return s;
  }
}

// ─── Player actions ───────────────────────────────────────────────────────────

export function clickOrb(state: GameState, orbId: string): GameState {
  console.log(`[Action] clickOrb orbId=${orbId} clicks=${state.player.clicks}`);

  if (state.player.clicks <= 0) return state;

  const orbIndex = state.orbs.findIndex(o => o.id === orbId);
  if (orbIndex < 0) return state;

  const orb = state.orbs[orbIndex];
  const isCrit = state.rng() < CRIT_CHANCE;
  const rageMult = state.player.effects.rage ? 1.5 : 1;
  const critMult = isCrit ? CRIT_MULT : 1;
  const damage = Math.round(state.clickDamage * rageMult * critMult);

  // Apply damage (shield first)
  let newHp = orb.hp;
  let newShieldHp = orb.shieldHp;
  if (newShieldHp && newShieldHp > 0) {
    newShieldHp -= damage;
    if (newShieldHp < 0) { newHp += newShieldHp; newShieldHp = 0; }
  } else {
    newHp -= damage;
  }

  const updatedOrb: Orb = { ...orb, hp: newHp, shieldHp: newShieldHp };

  // Combo
  const newCombo = state.combo + 1;
  const comboMult = 1 + Math.floor(newCombo / 5) * 0.1;

  // Floater
  const floaterText = isCrit ? `CRIT ${damage}` : `${damage}`;
  const floater = {
    id: generateId(),
    x: orb.x + (state.rng() - 0.5) * 30,
    y: orb.y - 20,
    vy: -60,
    text: floaterText,
    color: isCrit ? '#FCD34D' : '#FFFFFF',
    timer: 800,
    maxTimer: 800,
    fontSize: isCrit ? 18 : 14,
  };

  // Particles
  const particles = Array.from({ length: 5 }, () => {
    const angle = state.rng() * Math.PI * 2;
    const speed = 30 + state.rng() * 50;
    return {
      id: generateId(),
      x: orb.x,
      y: orb.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + state.rng() * 2,
      color: orb.color,
      alpha: 1,
      timer: 400,
      maxTimer: 400,
    };
  });

  let newOrbs = [...state.orbs];
  let newCoinPickups = [...state.coinPickups];
  let newEffects = [...state.effects];
  let newParticles = [...state.particles, ...particles];
  let newFloaters = [...state.floaters, floater];
  let newPlayerCoins = state.player.coins;

  if (newHp <= 0) {
    // Orb died
    const clickKilledByPlayer = updatedOrb.side === 0;
    const deathResult = handleOrbDeath(updatedOrb, state, clickKilledByPlayer);
    newOrbs = state.orbs.filter(o => o.id !== orbId);
    newOrbs.push(...deathResult.newOrbs);
    newParticles.push(...deathResult.particles);
    newEffects.push(...deathResult.effects);
    newFloaters.push(...deathResult.floaters);
    if (deathResult.coinPickup) newCoinPickups.push(deathResult.coinPickup);
    // Direct coin reward on click kill
    if (clickKilledByPlayer) {
      const reward = ORB_TYPES[updatedOrb.type as keyof typeof ORB_TYPES]?.reward ?? 0;
      newPlayerCoins = Math.min(newPlayerCoins + reward, COIN_CAP);
    }
  } else {
    newOrbs[orbIndex] = updatedOrb;
  }

  return {
    ...state,
    orbs: newOrbs,
    coinPickups: newCoinPickups,
    effects: newEffects,
    particles: newParticles,
    floaters: newFloaters,
    combo: newCombo,
    comboTimer: COMBO_WINDOW,
    player: {
      ...state.player,
      coins: newPlayerCoins,
      clicks: state.player.clicks - 1,
    },
  };
}

export function placeTower(state: GameState, type: TowerType, x: number, y: number): GameState {
  console.log(`[Action] placeTower type=${type} x=${x} y=${y} coins=${state.player.coins}`);

  const baseCost = TOWER_COSTS[type] ?? 60;
  const isFirst = state.player.towers.length === 0;
  const cost = isFirst ? Math.round(baseCost * 0.8) : baseCost;

  if (state.player.coins < cost) return state;

  // Grid snap
  const snappedX = Math.round(x / 30) * 30;
  const snappedY = Math.round(y / 30) * 30;

  // Must be on player side
  if (snappedY <= WALL_Y) return state;

  // No overlap
  const overlap = state.player.towers.some(t => distance(t.x, t.y, snappedX, snappedY) < 40);
  if (overlap) return state;

  const level = 1;
  const maxHp = getTowerMaxHp(type, level);
  const newTower: Tower = {
    id: generateId(),
    type,
    x: snappedX,
    y: snappedY,
    level,
    hp: maxHp,
    maxHp,
    fireTimer: 0,
    fireRate: getTowerFireRate(type, level),
    range: getTowerRange(type, level),
    damage: getTowerDamage(type, level),
    side: 0,
  };

  return {
    ...state,
    player: {
      ...state.player,
      coins: state.player.coins - cost,
      towers: [...state.player.towers, newTower],
    },
  };
}

export function upgradeTower(state: GameState, towerId: string): GameState {
  console.log(`[Action] upgradeTower towerId=${towerId}`);

  const towerIndex = state.player.towers.findIndex(t => t.id === towerId);
  if (towerIndex < 0) return state;

  const tower = state.player.towers[towerIndex];
  const league = getLeague(state.playerTrophies);
  if (tower.level >= (league.maxLevel ?? 5)) return state;

  const baseCost = TOWER_COSTS[tower.type] ?? 60;
  const upgradeCost = Math.round(baseCost * (UPGRADE_COST_MULT_ARRAY[tower.level] ?? 1));

  if (state.player.coins < upgradeCost) return state;

  const newLevel = tower.level + 1;
  const newMaxHp = getTowerMaxHp(tower.type, newLevel);
  const upgradedTower: Tower = {
    ...tower,
    level: newLevel,
    maxHp: newMaxHp,
    hp: newMaxHp,
    fireRate: getTowerFireRate(tower.type, newLevel),
    range: getTowerRange(tower.type, newLevel),
    damage: getTowerDamage(tower.type, newLevel),
  };

  const newTowers = [...state.player.towers];
  newTowers[towerIndex] = upgradedTower;

  return {
    ...state,
    player: {
      ...state.player,
      coins: state.player.coins - upgradeCost,
      towers: newTowers,
    },
  };
}

export function sellTower(state: GameState, towerId: string): GameState {
  console.log(`[Action] sellTower towerId=${towerId}`);

  const tower = state.player.towers.find(t => t.id === towerId);
  if (!tower) return state;

  // Calculate total spent
  const baseCost = TOWER_COSTS[tower.type] ?? 60;
  let totalSpent = baseCost;
  for (let l = 1; l < tower.level; l++) {
    totalSpent += Math.round(baseCost * (UPGRADE_COST_MULT_ARRAY[l] ?? 1));
  }
  const sellValue = Math.round(totalSpent * SELL_RATIO);

  return {
    ...state,
    player: {
      ...state.player,
      coins: Math.min(state.player.coins + sellValue, COIN_CAP),
      towers: state.player.towers.filter(t => t.id !== towerId),
    },
  };
}

export function selectTower(state: GameState, type: TowerType | null): GameState {
  console.log(`[Action] selectTower type=${type}`);
  return {
    ...state,
    player: { ...state.player, selectedTower: type },
    editMode: type !== null,
  };
}

export function activateAbility(state: GameState, abilityType: AbilityType): GameState {
  console.log(`[Action] activateAbility type=${abilityType}`);

  const abilityIndex = state.player.abilities.findIndex(a => a.type === abilityType);
  if (abilityIndex < 0) return state;

  const ability = state.player.abilities[abilityIndex];
  if (ability.cooldown > 0) return state;

  // Targeted abilities: set aiming state
  if (abilityType === 'meteor' || abilityType === 'glue' || abilityType === 'speed_zone' || abilityType === 'damage_zone' || abilityType === 'frost_zone') {
    return {
      ...state,
      aiming: { abilityType, x: GAME_WIDTH / 2, y: WALL_Y - 100 },
    };
  }

  // Portal: set targeting state
  if (abilityType === 'portal') {
    return {
      ...state,
      targeting: { abilityType, targets: [], maxTargets: 3 },
    };
  }

  // Instant abilities
  return applyInstantAbility(state, abilityType, abilityIndex);
}

function applyInstantAbility(state: GameState, abilityType: AbilityType, abilityIndex: number): GameState {
  const abilities = [...state.player.abilities];
  abilities[abilityIndex] = { ...abilities[abilityIndex], cooldown: ABILITY_COOLDOWNS[abilityType] ?? 0 };

  let newState = { ...state, player: { ...state.player, abilities } };

  switch (abilityType) {
    case 'freeze': {
      // Freeze all opponent orbs
      const frozenOrbs = newState.orbs.map(o =>
        o.side === 0 ? { ...o, frozen: true, frozenTimer: 4000 } : o,
      );
      newState = { ...newState, orbs: frozenOrbs };
      newState.effects.push({
        id: generateId(),
        type: 'freeze',
        x: GAME_WIDTH / 2,
        y: WALL_Y,
        timer: 600,
        maxTimer: 600,
        radius: 300,
        color: '#BAE6FD',
      });
      break;
    }
    case 'rage': {
      newState = {
        ...newState,
        player: {
          ...newState.player,
          effects: { ...newState.player.effects, rage: true, rageTimer: 8000 },
        },
      };
      break;
    }
    case 'shield': {
      newState = {
        ...newState,
        player: {
          ...newState.player,
          station: { ...newState.player.station, shieldHp: 40 },
          effects: { ...newState.player.effects, shield: true, shieldTimer: 10000 },
        },
      };
      break;
    }
    case 'overclock': {
      const overclockedTowers = newState.player.towers.map(t => ({
        ...t,
        overclocked: true,
        overclockedTimer: 6000,
      }));
      newState = {
        ...newState,
        player: {
          ...newState.player,
          towers: overclockedTowers,
          effects: { ...newState.player.effects, overclock: true, overclockTimer: 6000 },
        },
      };
      break;
    }
    case 'burner': {
      // Burn all orbs on player side
      const burnedOrbs = newState.orbs.map(o =>
        o.side === 0 ? { ...o, burning: true, burnTimer: 3000, burnDps: 10 } : o,
      );
      newState = { ...newState, orbs: burnedOrbs };
      break;
    }
    case 'zap': {
      // Damage all opponent orbs (side=0)
      const zapDmg = 30;
      const zapTargets = newState.orbs.filter(o => o.side === 0 && o.hp > 0);
      const newOrbs = newState.orbs.map(o => {
        if (o.side !== 0 || o.hp <= 0) return o;
        const newHp = o.hp - zapDmg;
        return { ...o, hp: newHp };
      }).filter(o => o.hp > 0 || o.side !== 0);
      // Lightning chain effects — one per target
      const zapEffects: Effect[] = zapTargets.map(o => ({
        id: generateId(),
        type: 'lightning_chain',
        x: GAME_WIDTH / 2,
        y: WALL_Y,
        timer: 500,
        maxTimer: 500,
        color: '#FACC15',
        data: { x2: o.x, y2: o.y },
      }));
      newState = {
        ...newState,
        orbs: newOrbs,
        effects: [...newState.effects, ...zapEffects],
      };
      break;
    }
    case 'repair': {
      const healAmount = 35;
      const maxHp = newState.player.station.maxHp ?? 1000;
      newState = {
        ...newState,
        player: {
          ...newState.player,
          hp: Math.min(maxHp, newState.player.hp + healAmount),
        },
        effects: [...newState.effects, {
          id: generateId(),
          type: 'repair',
          x: PLAYER_STATION_X,
          y: PLAYER_STATION_Y,
          timer: 600,
          maxTimer: 600,
          color: '#4ADE80',
        }],
      };
      break;
    }
    case 'deep_freeze': {
      // Freeze all opponent towers and side towers
      const frozenTowers = newState.opponent.towers.map(t =>
        t.hp > 0 ? { ...t, frozen: true, frozenTimer: 2000 } : t
      );
      const frozenSideTowers = newState.opponent.sideTowers.map(st =>
        st.hp > 0 ? { ...st, frozen: true, frozenTimer: 2000 } : st
      );
      newState = {
        ...newState,
        opponent: {
          ...newState.opponent,
          towers: frozenTowers,
          sideTowers: frozenSideTowers,
        },
        effects: [...newState.effects, {
          id: generateId(),
          type: 'freeze' as const,
          x: GAME_WIDTH / 2,
          y: WALL_Y - 100,
          timer: 600,
          maxTimer: 600,
          color: '#67E8F9',
        }],
      };
      break;
    }
  }

  return newState;
}

export function confirmAim(state: GameState, x: number, y: number): GameState {
  console.log(`[Action] confirmAim x=${x} y=${y} ability=${state.aiming?.abilityType}`);

  if (!state.aiming) return state;
  const { abilityType } = state.aiming;

  const abilityIndex = state.player.abilities.findIndex(a => a.type === abilityType);
  if (abilityIndex < 0) return { ...state, aiming: null };

  const abilities = [...state.player.abilities];
  abilities[abilityIndex] = { ...abilities[abilityIndex], cooldown: ABILITY_COOLDOWNS[abilityType] ?? 0 };

  let newState = { ...state, aiming: null, player: { ...state.player, abilities } };

  switch (abilityType) {
    case 'meteor': {
      const meteor = {
        id: generateId(),
        x: x - 50,
        y: -100,
        targetX: x,
        targetY: y,
        progress: 0,
        damage: 60 + state.leagueIndex * 10,
        radius: 70,
      };
      newState = { ...newState, meteors: [...newState.meteors, meteor] };
      break;
    }
    case 'glue': {
      const glue = {
        id: generateId(),
        x,
        y,
        radius: 80,
        timer: 6000,
        slowFactor: 0.35,
      };
      newState = { ...newState, glues: [...newState.glues, glue] };
      break;
    }
    case 'damage_zone': {
      const zone = {
        id: generateId(),
        x,
        y,
        radius: 90,
        timer: 8000,
        type: 'damage' as const,
        dps: 15,
      };
      newState = { ...newState, zones: [...newState.zones, zone] };
      break;
    }
    case 'speed_zone': {
      const zone = {
        id: generateId(),
        x,
        y,
        radius: 90,
        timer: 8000,
        type: 'speed' as const,
        speedBoost: 0.15,
      };
      newState = { ...newState, zones: [...newState.zones, zone] };
      break;
    }
    case 'frost_zone': {
      // Freeze all opponent towers within radius
      const frozenTowers = newState.opponent.towers.map(t => {
        if (t.hp <= 0) return t;
        const dx = t.x - x;
        const dy = t.y - y;
        if (Math.sqrt(dx * dx + dy * dy) <= 90) {
          return { ...t, frozen: true, frozenTimer: 3000 };
        }
        return t;
      });
      const frozenSide = newState.opponent.sideTowers.map(st => {
        if (st.hp <= 0) return st;
        const dx = st.x - x;
        const dy = st.y - y;
        if (Math.sqrt(dx * dx + dy * dy) <= 90) {
          return { ...st, frozen: true, frozenTimer: 3000 };
        }
        return st;
      });
      newState = {
        ...newState,
        opponent: { ...newState.opponent, towers: frozenTowers, sideTowers: frozenSide },
        effects: [...newState.effects, {
          id: generateId(),
          type: 'freeze' as const,
          x,
          y,
          timer: 600,
          maxTimer: 600,
          color: '#67E8F9',
        }],
      };
      break;
    }
  }

  return newState;
}

export function cancelAim(state: GameState): GameState {
  console.log('[Action] cancelAim');
  return { ...state, aiming: null, targeting: null };
}

export function confirmTargeting(state: GameState): GameState {
  console.log(`[Action] confirmTargeting targets=${state.targeting?.targets?.length ?? 0}`);
  if (!state.targeting) return state;
  const { targets } = state.targeting;

  const abilityIndex = state.player.abilities.findIndex(a => a.type === 'portal');
  const abilities = [...state.player.abilities];
  if (abilityIndex >= 0) {
    abilities[abilityIndex] = { ...abilities[abilityIndex], cooldown: ABILITY_COOLDOWNS['portal'] ?? 22000 };
  }

  // Remove targeted orbs from player's side and re-spawn them on opponent's side
  const targetSet = new Set(targets);
  const remainingOrbs = state.orbs.filter(o => !targetSet.has(o.id));

  // Re-spawn each targeted orb heading toward the opponent station
  const portaledOrbs = targets.map(id => {
    const orb = state.orbs.find(o => o.id === id);
    if (!orb) return null;
    const newX = 50 + state.rng() * (GAME_WIDTH - 100);
    const newY = WALL_Y + 30; // player side, heading up
    const dx = OPP_STATION_X - newX;
    const dy = OPP_STATION_Y - newY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return {
      ...orb,
      id: generateId(),
      x: newX,
      y: newY,
      side: 1 as const,
      owner: 'player' as const,
      vx: (dx / dist) * orb.speed,
      vy: (dy / dist) * orb.speed,
    };
  }).filter(Boolean) as typeof state.orbs;

  return {
    ...state,
    player: { ...state.player, abilities },
    orbs: [...remainingOrbs, ...portaledOrbs],
    targeting: null,
    effects: [...state.effects, {
      id: generateId(),
      type: 'freeze' as const, // reuse freeze visual as portal flash
      x: GAME_WIDTH / 2,
      y: WALL_Y,
      timer: 400,
      maxTimer: 400,
      color: '#818CF8',
    }],
  };
}

export function addTargetOrb(state: GameState, orbId: string): GameState {
  console.log(`[Action] addTargetOrb orbId=${orbId}`);
  if (!state.targeting) return state;
  const orb = state.orbs.find((o) => o.id === orbId);
  if (!orb || orb.side !== 0 || orb.hp <= 0) return state;
  const tg = state.targeting;
  const idx = tg.targets.indexOf(orbId);
  if (idx >= 0) {
    // deselect
    return { ...state, targeting: { ...tg, targets: tg.targets.filter(id => id !== orbId) } };
  }
  if (tg.targets.length >= tg.maxTargets) {
    // auto-confirm when max reached
    return confirmTargeting({ ...state, targeting: { ...tg, targets: [...tg.targets, orbId] } });
  }
  return { ...state, targeting: { ...tg, targets: [...tg.targets, orbId] } };
}

export function placeOrbAtSlot(state: GameState, typeId: OrbType, slotIndex: number): GameState {
  console.log(`[Action] placeOrbAtSlot typeId=${typeId} slotIndex=${slotIndex}`);
  const def = ORB_TYPES[typeId];
  if (!def || state.player.coins < def.cost) return state;
  const slotX = ORB_SLOTS[slotIndex] ?? ORB_SLOTS[0];
  const newState = { ...state, player: { ...state.player, coins: state.player.coins - def.cost } };
  // Use spawnOrb with side=1 (player orbs go toward opponent)
  const orb = spawnOrb(newState, 1);
  // Override x to the slot position and type/stats to the selected orb type
  const typedOrb = {
    ...orb,
    id: `orb_${Date.now()}_${slotIndex}`,
    type: typeId,
    x: slotX,
    y: WALL_Y + 30,
    hp: def.hp,
    maxHp: def.hp,
    damage: def.damage,
    speed: def.speed,
    radius: def.radius,
    color: def.color,
    vx: 0,
    vy: -def.speed,
  };
  return { ...newState, orbs: [...newState.orbs, typedOrb] };
}

export function collectCoin(state: GameState, coinId: string): GameState {
  console.log(`[Action] collectCoin coinId=${coinId}`);

  const coin = state.coinPickups.find(c => c.id === coinId);
  if (!coin) return state;

  return {
    ...state,
    player: {
      ...state.player,
      coins: Math.min(state.player.coins + coin.value, COIN_CAP),
    },
    coinPickups: state.coinPickups.filter(c => c.id !== coinId),
  };
}

export function cleanseTower(state: GameState, towerId: string): GameState {
  console.log(`[Action] cleanseTower towerId=${towerId}`);

  if (state.player.coins < 20) return state;

  const towerIndex = state.player.towers.findIndex(t => t.id === towerId);
  if (towerIndex < 0) return state;

  const newTowers = [...state.player.towers];
  newTowers[towerIndex] = {
    ...newTowers[towerIndex],
    poisoned: false,
    poisonTimer: 0,
    poisonDps: 0,
  };

  return {
    ...state,
    player: {
      ...state.player,
      coins: state.player.coins - 20,
      towers: newTowers,
    },
  };
}

// ─── Remote actions (multiplayer) ─────────────────────────────────────────────

export function remotePlaceTower(state: GameState, type: TowerType, x: number, y: number): GameState {
  console.log(`[Remote] placeTower type=${type} x=${x} y=${y}`);

  const snappedX = Math.round(x / 30) * 30;
  const snappedY = Math.round(y / 30) * 30;

  // Opponent side: y < WALL_Y
  if (snappedY >= WALL_Y) return state;

  const overlap = state.opponent.towers.some(t => distance(t.x, t.y, snappedX, snappedY) < 40);
  if (overlap) return state;

  const level = 1;
  const maxHp = getTowerMaxHp(type, level);
  const newTower: Tower = {
    id: generateId(),
    type,
    x: snappedX,
    y: snappedY,
    level,
    hp: maxHp,
    maxHp,
    fireTimer: 0,
    fireRate: getTowerFireRate(type, level),
    range: getTowerRange(type, level),
    damage: getTowerDamage(type, level),
    side: 1,
  };

  return {
    ...state,
    opponent: {
      ...state.opponent,
      towers: [...state.opponent.towers, newTower],
    },
  };
}

export function remoteUpgradeTower(state: GameState, towerId: string): GameState {
  console.log(`[Remote] upgradeTower towerId=${towerId}`);

  const towerIndex = state.opponent.towers.findIndex(t => t.id === towerId);
  if (towerIndex < 0) return state;

  const tower = state.opponent.towers[towerIndex];
  const newLevel = Math.min(tower.level + 1, 6);
  const newMaxHp = getTowerMaxHp(tower.type, newLevel);
  const upgradedTower: Tower = {
    ...tower,
    level: newLevel,
    maxHp: newMaxHp,
    hp: newMaxHp,
    fireRate: getTowerFireRate(tower.type, newLevel),
    range: getTowerRange(tower.type, newLevel),
    damage: getTowerDamage(tower.type, newLevel),
  };

  const newTowers = [...state.opponent.towers];
  newTowers[towerIndex] = upgradedTower;

  return { ...state, opponent: { ...state.opponent, towers: newTowers } };
}

export function remoteSellTower(state: GameState, towerId: string): GameState {
  console.log(`[Remote] sellTower towerId=${towerId}`);
  return {
    ...state,
    opponent: {
      ...state.opponent,
      towers: state.opponent.towers.filter(t => t.id !== towerId),
    },
  };
}

export function remoteBuyOrb(state: GameState, orbType: OrbType): GameState {
  console.log(`[Remote] buyOrb type=${orbType}`);
  // Spawn orb on opponent side
  const orb = spawnOrb({ ...state, time: state.time }, 1);
  return { ...state, orbs: [...state.orbs, { ...orb, type: orbType }] };
}

export function remoteAbility(state: GameState, abilityType: AbilityType, x?: number, y?: number): GameState {
  console.log(`[Remote] ability type=${abilityType} x=${x} y=${y}`);

  switch (abilityType) {
    case 'freeze': {
      const frozenOrbs = state.orbs.map(o =>
        o.side === 1 ? { ...o, frozen: true, frozenTimer: 4000 } : o,
      );
      return { ...state, orbs: frozenOrbs };
    }
    case 'meteor': {
      if (x === undefined || y === undefined) return state;
      const meteor = {
        id: generateId(),
        x: x - 50,
        y: 1000,
        targetX: x,
        targetY: y,
        progress: 0,
        damage: 60,
        radius: 70,
      };
      return { ...state, meteors: [...state.meteors, meteor] };
    }
    default:
      return state;
  }
}
