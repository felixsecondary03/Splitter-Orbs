// Pure TypeScript — no React, no RN imports
import {
  WALL_Y, GAME_WIDTH, GAME_HEIGHT,
  PLAYER_STATION_X, PLAYER_STATION_Y, OPP_STATION_X, OPP_STATION_Y,
} from './constants';
import { Orb, Tower, GameState, Particle, Floater, CoinPickup, Effect } from './engine-types';
import { generateId, distance, normalize, getOrbColor, getOrbRadius, getOrbHp, getOrbDamage, getOrbSpeed } from './engine-helpers';

// ─── Orb movement ─────────────────────────────────────────────────────────────
export function updateOrb(orb: Orb, dt: number, state: GameState): Orb {
  const dtSec = dt / 1000;
  let updated = { ...orb };

  // Frozen: don't move
  if (updated.frozen) {
    const ft = (updated.frozenTimer ?? 0) - dt;
    if (ft <= 0) {
      updated = { ...updated, frozen: false, frozenTimer: 0 };
    } else {
      return { ...updated, frozenTimer: ft };
    }
  }

  // Poison DoT
  if (updated.poisoned) {
    const pt = (updated.poisonTimer ?? 0) - dt;
    const dmg = (updated.poisonDps ?? 3) * dtSec;
    updated = { ...updated, hp: updated.hp - dmg };
    if (pt <= 0) {
      updated = { ...updated, poisoned: false, poisonTimer: 0, poisonDps: 0 };
    } else {
      updated = { ...updated, poisonTimer: pt };
    }
  }

  // Burn DoT
  if (updated.burning) {
    const bt = (updated.burnTimer ?? 0) - dt;
    const dmg = (updated.burnDps ?? 5) * dtSec;
    updated = { ...updated, hp: updated.hp - dmg };
    if (bt <= 0) {
      updated = { ...updated, burning: false, burnTimer: 0, burnDps: 0 };
    } else {
      updated = { ...updated, burnTimer: bt };
    }
  }

  // Growth: increase HP/speed/damage over time
  if (updated.type === 'growth') {
    const gt = (updated.growthTimer ?? 0) + dt;
    const growthFactor = 1 + Math.floor(gt / 5000) * 0.15;
    updated = {
      ...updated,
      growthTimer: gt,
      maxHp: getOrbHp('growth', state.leagueIndex) * growthFactor,
      speed: getOrbSpeed('growth') * growthFactor,
      damage: getOrbDamage('growth', state.leagueIndex) * growthFactor,
    };
  }

  // Berserker: boost at low HP
  if (updated.type === 'berserker' && updated.hp < updated.maxHp * 0.3) {
    updated = {
      ...updated,
      damage: getOrbDamage('berserker', state.leagueIndex) * 1.5,
      speed: getOrbSpeed('berserker') * 1.3,
    };
  }

  // Summoner: spawn minions periodically
  if (updated.type === 'summoner') {
    const st = (updated.summonTimer ?? 0) - dt;
    if (st <= 0) {
      updated = { ...updated, summonTimer: 8000 };
      // Minion spawning is handled in the main update loop via returned state
    } else {
      updated = { ...updated, summonTimer: st };
    }
  }

  // Mine: stationary
  if (updated.type === 'mine') {
    return updated;
  }

  // Sprint / phantom / shadow: ignore towers, go straight to station
  const ignoresTowers = updated.type === 'sprint' || updated.type === 'phantom' || updated.type === 'shadow';

  // Determine target
  let targetX: number;
  let targetY: number;

  if (ignoresTowers) {
    // Go straight to opponent station
    if (updated.side === 0) {
      targetX = PLAYER_STATION_X;
      targetY = PLAYER_STATION_Y;
    } else {
      targetX = OPP_STATION_X;
      targetY = OPP_STATION_Y;
    }
  } else {
    // Check for towers in range to attack
    const enemyTowers = updated.side === 0
      ? state.player.towers
      : state.opponent.towers;

    let closestTower: Tower | null = null;
    let closestDist = Infinity;
    for (const t of enemyTowers) {
      const d = distance(updated.x, updated.y, t.x, t.y);
      if (d < closestDist) {
        closestDist = d;
        closestTower = t;
      }
    }

    const ATTACK_RANGE = 60;
    if (closestTower && closestDist < ATTACK_RANGE) {
      targetX = closestTower.x;
      targetY = closestTower.y;
    } else if (updated.side === 0) {
      targetX = PLAYER_STATION_X;
      targetY = PLAYER_STATION_Y;
    } else {
      targetX = OPP_STATION_X;
      targetY = OPP_STATION_Y;
    }
  }

  // Leech: latch onto tower
  if (updated.type === 'leech' && updated.latchTarget) {
    // Stay near latched tower — handled in main loop
    return updated;
  }

  // Fog: move slowly across the field
  if (updated.type === 'fog') {
    const fogDir = updated.side === 0 ? 1 : -1;
    return {
      ...updated,
      x: updated.x + updated.vx * dtSec,
      y: updated.y + fogDir * updated.speed * dtSec,
    };
  }

  // Zap: jump between towers (handled in main loop)
  if (updated.type === 'zap') {
    return {
      ...updated,
      x: updated.x + updated.vx * dtSec,
      y: updated.y + updated.vy * dtSec,
    };
  }

  // Normal movement toward target
  const { nx, ny } = normalize(targetX - updated.x, targetY - updated.y);
  const speed = updated.speed;

  return {
    ...updated,
    x: updated.x + nx * speed * dtSec,
    y: updated.y + ny * speed * dtSec,
    vx: nx * speed,
    vy: ny * speed,
  };
}

// ─── Orb death handling ───────────────────────────────────────────────────────
export interface OrbDeathResult {
  newOrbs: Orb[];
  particles: Particle[];
  floaters: Floater[];
  coinPickup: CoinPickup | null;
  effects: Effect[];
  stationDamage: number; // damage to deal to station if orb reached it
}

export function handleOrbDeath(
  orb: Orb,
  state: GameState,
  killedByPlayer: boolean,
): OrbDeathResult {
  console.log(`[OrbDeath] orb=${orb.id} type=${orb.type} killedByPlayer=${killedByPlayer}`);

  const newOrbs: Orb[] = [];
  const particles: Particle[] = [];
  const effects: Effect[] = [];

  // Spawn particles
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const speed = 40 + state.rng() * 60;
    particles.push({
      id: generateId(),
      x: orb.x,
      y: orb.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 3 + state.rng() * 3,
      color: orb.color,
      alpha: 1,
      timer: 600,
      maxTimer: 600,
    });
  }

  // Splitter: spawn 2 normal orbs
  if (orb.type === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2;
      const child = spawnChildOrb('normal', orb, state, angle);
      newOrbs.push(child);
    }
  }

  // Carrier: spawn 3 weaker orbs
  if (orb.type === 'carrier') {
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const child = spawnChildOrb('normal', orb, state, angle);
      newOrbs.push({ ...child, hp: child.hp * 0.5, maxHp: child.maxHp * 0.5 });
    }
  }

  // Bomb: AoE explosion
  if (orb.type === 'bomb') {
    effects.push({
      id: generateId(),
      type: 'explosion',
      x: orb.x,
      y: orb.y,
      timer: 400,
      maxTimer: 400,
      radius: 60,
      color: '#F87171',
    });
  }

  // Mine: AoE explosion on tap
  if (orb.type === 'mine') {
    effects.push({
      id: generateId(),
      type: 'explosion',
      x: orb.x,
      y: orb.y,
      timer: 500,
      maxTimer: 500,
      radius: 80,
      color: '#FCA5A5',
    });
  }

  // Coin pickup for player kills
  let coinPickup: CoinPickup | null = null;
  if (killedByPlayer) {
    const coinValue = orb.type === 'tank' ? 4 : orb.type === 'summoner' ? 5 : 2;
    coinPickup = {
      id: generateId(),
      x: orb.x,
      y: orb.y,
      value: coinValue,
      timer: 5000,
    };
  }

  const floaters: Floater[] = [];

  return { newOrbs, particles, floaters, coinPickup, effects, stationDamage: 0 };
}

function spawnChildOrb(
  type: Orb['type'],
  parent: Orb,
  state: GameState,
  angle: number,
): Orb {
  const speed = getOrbSpeed(type);
  return {
    id: generateId(),
    type,
    x: parent.x + Math.cos(angle) * 20,
    y: parent.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    hp: getOrbHp(type, state.leagueIndex),
    maxHp: getOrbHp(type, state.leagueIndex),
    damage: getOrbDamage(type, state.leagueIndex),
    speed,
    side: parent.side,
    owner: parent.owner,
    radius: getOrbRadius(type),
    color: getOrbColor(type),
  };
}

// ─── Orb spawning ─────────────────────────────────────────────────────────────
export function spawnOrb(state: GameState, side: 0 | 1): Orb {
  const timeRatio = Math.min(state.time / 90000, 1);

  // Weighted orb pool based on game time
  type OrbWeight = { type: Orb['type']; weight: number; minTime: number };
  const pool: OrbWeight[] = [
    { type: 'normal',       weight: 30, minTime: 0 },
    { type: 'fast',         weight: 20, minTime: 0 },
    { type: 'bomb',         weight: 10, minTime: 0 },
    { type: 'splitter',     weight: 12, minTime: 0.2 },
    { type: 'tank',         weight: 8,  minTime: 0.2 },
    { type: 'carrier',      weight: 8,  minTime: 0.25 },
    { type: 'sprint',       weight: 10, minTime: 0.25 },
    { type: 'swarmer',      weight: 8,  minTime: 0.3 },
    { type: 'shielder',     weight: 6,  minTime: 0.35 },
    { type: 'healer',       weight: 5,  minTime: 0.35 },
    { type: 'radioactive',  weight: 5,  minTime: 0.4 },
    { type: 'shadow',       weight: 4,  minTime: 0.45 },
    { type: 'ice',          weight: 5,  minTime: 0.4 },
    { type: 'fog',          weight: 3,  minTime: 0.5 },
    { type: 'zap',          weight: 4,  minTime: 0.5 },
    { type: 'armored',      weight: 5,  minTime: 0.45 },
    { type: 'growth',       weight: 4,  minTime: 0.55 },
    { type: 'shield_bubble',weight: 3,  minTime: 0.55 },
    { type: 'berserker',    weight: 4,  minTime: 0.6 },
    { type: 'phantom',      weight: 3,  minTime: 0.6 },
    { type: 'leech',        weight: 3,  minTime: 0.65 },
    { type: 'summoner',     weight: 2,  minTime: 0.7 },
  ];

  const available = pool.filter(p => timeRatio >= p.minTime);
  const totalWeight = available.reduce((s, p) => s + p.weight, 0);
  let roll = state.rng() * totalWeight;
  let chosenType: Orb['type'] = 'normal';
  for (const p of available) {
    roll -= p.weight;
    if (roll <= 0) { chosenType = p.type; break; }
  }

  const x = 50 + state.rng() * (GAME_WIDTH - 100);
  const y = side === 0 ? WALL_Y - 30 : WALL_Y + 30;
  const speed = getOrbSpeed(chosenType);
  const targetY = side === 0 ? PLAYER_STATION_Y : OPP_STATION_Y;
  const targetX = side === 0 ? PLAYER_STATION_X : OPP_STATION_X;
  const { nx, ny } = normalize(targetX - x, targetY - y);

  const hp = getOrbHp(chosenType, state.leagueIndex);
  const orb: Orb = {
    id: generateId(),
    type: chosenType,
    x,
    y,
    vx: nx * speed,
    vy: ny * speed,
    hp,
    maxHp: hp,
    damage: getOrbDamage(chosenType, state.leagueIndex),
    speed,
    side,
    owner: side === 0 ? 'opponent' : 'player',
    radius: getOrbRadius(chosenType),
    color: getOrbColor(chosenType),
  };

  // Type-specific init
  if (chosenType === 'shielder') {
    return { ...orb, shieldHp: hp * 0.5 };
  }
  if (chosenType === 'shield_bubble') {
    return { ...orb, shieldHp: hp * 0.3 };
  }
  if (chosenType === 'summoner') {
    return { ...orb, summonTimer: 8000, minions: [] };
  }
  if (chosenType === 'growth') {
    return { ...orb, growthTimer: 0 };
  }
  if (chosenType === 'mine') {
    return { ...orb, vx: 0, vy: 0, speed: 0 };
  }

  return orb;
}

// ─── Orb-station collision ────────────────────────────────────────────────────
export function checkOrbReachedStation(orb: Orb): boolean {
  if (orb.side === 0) {
    // Orb from opponent side heading to player station
    return orb.y >= PLAYER_STATION_Y - 30;
  } else {
    // Orb from player side heading to opponent station
    return orb.y <= OPP_STATION_Y + 30;
  }
}

// ─── Orb out of bounds ────────────────────────────────────────────────────────
export function isOrbOutOfBounds(orb: Orb): boolean {
  return orb.x < -50 || orb.x > GAME_WIDTH + 50 || orb.y < -50 || orb.y > GAME_HEIGHT + 50;
}
