// ─── Board ────────────────────────────────────────────────────────────────────
export const GAME_WIDTH = 600;
export const GAME_HEIGHT = 900;
export const WALL_Y = 450;
export const WALL_THICKNESS = 18;
export const GRID_SIZE = 60;
export const ORB_SLOTS = [100, 200, 300, 400, 500];

// ─── Station / Side Tower ─────────────────────────────────────────────────────
export const STATION_HP = 120;
export const STATION_RADIUS = 34;
export const SIDE_TOWER_HP = 50;
export const SIDE_TOWER_RADIUS = 18;
export const SIDE_TOWER_DAMAGE = 8;
export const SIDE_TOWER_FIRE_RATE = 1.6;
export const SIDE_TOWER_RANGE = 150;
export const SIDE_TOWER_PROJECTILE_SPEED = 340;
export const COMEBACK_HP_THRESHOLD = 0.4;
export const COMEBACK_COIN_PER_SEC = 1;

// ─── Economy ──────────────────────────────────────────────────────────────────
export const STARTING_COINS = 120;
export const COIN_CAP = 999;
export const PROFILE_COIN_CAP = 9999;
export const GEM_TO_COIN_RATE = 10;
export const GEM_EXCHANGE_OPTIONS = [1, 5, 10];

// ─── Spawn pacing ─────────────────────────────────────────────────────────────
// Seconds (used by UI/display)
export const SPAWN_INTERVAL_START_SEC = 3.5;
export const SPAWN_INTERVAL_MIN_SEC = 1.3;
export const SPAWN_RAMP_TIME = 90;
// Milliseconds (used by engine.ts which receives dt in ms)
export const SPAWN_INTERVAL_START = 3500;
export const SPAWN_INTERVAL_MIN = 1300;

// ─── Loadout sizes ────────────────────────────────────────────────────────────
export const TOWER_LOADOUT_SIZE = 4;
export const ORB_LOADOUT_SIZE = 5;
export const ABILITY_LOADOUT_SIZE = 3;

// ─── Card progression ─────────────────────────────────────────────────────────
export const MAX_CARD_LEVEL = 5;
export const MAX_TOWER_LEVEL = 5; // 6 in Legend league (super upgrade)
export const CARD_COPIES_NEEDED: Record<number, number> = { 1: 2, 2: 3, 3: 8, 4: 12 };
export const SHARDS_PER_OVERFLOW = 5;
export const COPY_SHARD_COST_BY_RARITY: Record<string, number> = {
  common: 4, rare: 10, epic: 36, legendary: 128, mythical: 512,
};
export const BUY_CAP = 3;

// ─── Meta upgrades ────────────────────────────────────────────────────────────
export const HAND_UPGRADE_COSTS = [5, 10, 18, 28, 40]; // shards
export const MAX_HAND_LEVEL = 5;
export const SIDE_TOWER_UPGRADE_COSTS = [4, 8, 14, 22, 34]; // shards
export const MAX_SIDE_TOWER_LEVEL = 5;

// Side tower stats per meta level
export const SIDE_TOWER_META_STATS = [
  { hp: 90,  damage: 8,  fireRate: 1.6  },
  { hp: 120, damage: 10, fireRate: 1.48 },
  { hp: 150, damage: 12, fireRate: 1.36 },
  { hp: 180, damage: 14, fireRate: 1.24 },
  { hp: 210, damage: 16, fireRate: 1.12 },
  { hp: 240, damage: 18, fireRate: 1.00 },
];

// ─── Match rewards ────────────────────────────────────────────────────────────
export const MATCH_REWARD_WIN = 50;
export const MATCH_REWARD_LOSS = 20;
export const SHARD_PER_WIN = 1;
export const SHARD_PER_LOSS = 0;
export const SHARD_RANKED_STREAK_BONUS = 1;
export const AI_DAILY_WIN_CAP = 100;
export const AI_MIN_MATCH_DURATION = 60;

// ─── Trophy / Elo ─────────────────────────────────────────────────────────────
export const TROPHY_BASE = 30;

// ─── Leagues ──────────────────────────────────────────────────────────────────
export interface LeagueDef {
  id: number; name: string; min: number; color: string;
  skill: number; cardMult: number; maxLevel: number; clickDmg: number;
}
export const LEAGUES: LeagueDef[] = [
  { id: 0, name: 'Beginner',  min: 0,    color: '#94a3b8', skill: 0.35, cardMult: 0.30, maxLevel: 3, clickDmg: 12 },
  { id: 1, name: 'Rookie',    min: 100,  color: '#84cc16', skill: 0.45, cardMult: 0.50, maxLevel: 3, clickDmg: 13 },
  { id: 2, name: 'Cadet',     min: 300,  color: '#22d3ee', skill: 0.55, cardMult: 0.75, maxLevel: 4, clickDmg: 15 },
  { id: 3, name: 'Veteran',   min: 600,  color: '#3b82f6', skill: 0.65, cardMult: 1.00, maxLevel: 4, clickDmg: 16 },
  { id: 4, name: 'Champion',  min: 1000, color: '#8b5cf6', skill: 0.78, cardMult: 1.00, maxLevel: 5, clickDmg: 17 },
  { id: 5, name: 'Master',    min: 1500, color: '#f43f5e', skill: 0.90, cardMult: 1.00, maxLevel: 5, clickDmg: 19 },
  { id: 6, name: 'Legend',    min: 2000, color: '#fbbf24', skill: 0.95, cardMult: 1.00, maxLevel: 6, clickDmg: 20 },
];

export function getLeague(trophies: number): LeagueDef {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (trophies >= LEAGUES[i].min) return LEAGUES[i];
  }
  return LEAGUES[0];
}

// ─── Tower level scaling ──────────────────────────────────────────────────────
export const TOWER_LEVEL_SCALING = [
  { dmgMult: 1.0,  rangeMult: 1.0,  fireRateMult: 1.0  },
  { dmgMult: 1.4,  rangeMult: 1.15, fireRateMult: 0.82 },
  { dmgMult: 1.85, rangeMult: 1.3,  fireRateMult: 0.66 },
  { dmgMult: 2.4,  rangeMult: 1.45, fireRateMult: 0.52 },
  { dmgMult: 3.0,  rangeMult: 1.6,  fireRateMult: 0.42 },
  { dmgMult: 4.5,  rangeMult: 1.8,  fireRateMult: 0.30 }, // L6 super upgrade
];
export const UPGRADE_COST_MULT = 0.5;
export const SELL_RATIO = 0.5;

// ─── Tower types ──────────────────────────────────────────────────────────────
export type TowerType = 'basic' | 'machinegun' | 'sniper' | 'boomerang' | 'rebound' | 'bomb' |
  'bouncer' | 'glacier' | 'arc' | 'pyre' | 'venom' | 'siege' | 'orb_mortar' | 'lava_mortar' |
  'repulsor' | 'cryo' | 'seeker' | 'prism' | 'flak' | 'harpoon' | 'twin' | 'tesla' |
  'detonator' | 'magnet' | 'capacitor' | 'overcharger' | 'mine_layer';

export interface TowerDef {
  id: TowerType; name: string; rarity: string; cost: number;
  range: number; fireRate: number; damage: number; projectileSpeed: number;
  color: string; unlockTrophies?: number; crateOnly?: boolean; crateTrophyMin?: number;
  // special flags
  splash?: number; pierce?: number; bouncer?: boolean; slow?: number; chain?: number;
  burn?: number; burnDps?: number; burnChance?: number; poison?: boolean; homing?: boolean;
  homingCount?: number; mortar?: boolean; knockback?: boolean; freezeBeam?: boolean;
  freezeDur?: number; freezePerLvl?: number; rampLaser?: boolean; rampMax?: number;
  flak?: boolean; pelletCount?: number; spreadAngle?: number; harpoon?: boolean;
  twin?: boolean; tesla?: boolean; detonator?: boolean; magnet?: boolean;
  chargeTime?: number; capacitor?: boolean; overcharger?: boolean; mineLayer?: boolean;
}

export const TOWER_TYPES: Record<TowerType, TowerDef> = {
  basic:       { id: 'basic',       name: 'Blaster',     rarity: 'common',    cost: 60,  range: 170, fireRate: 0.70, damage: 12, projectileSpeed: 360, color: '#3b82f6' },
  machinegun:  { id: 'machinegun',  name: 'Vulcan',      rarity: 'common',    cost: 90,  range: 140, fireRate: 0.18, damage: 4,  projectileSpeed: 420, color: '#f59e0b' },
  sniper:      { id: 'sniper',      name: 'Lancer',      rarity: 'epic',      cost: 140, range: 340, fireRate: 1.60, damage: 45, projectileSpeed: 700, color: '#8b5cf6', unlockTrophies: 800 },
  boomerang:   { id: 'boomerang',   name: 'Piercer',     rarity: 'common',    cost: 110, range: 200, fireRate: 1.10, damage: 10, projectileSpeed: 320, color: '#10b981', unlockTrophies: 600, pierce: 3 },
  rebound:     { id: 'rebound',     name: 'Boomerang',   rarity: 'rare',      cost: 120, range: 200, fireRate: 1.40, damage: 9,  projectileSpeed: 340, color: '#059669', unlockTrophies: 700, bouncer: true },
  bomb:        { id: 'bomb',        name: 'Mortar',      rarity: 'common',    cost: 160, range: 260, fireRate: 1.80, damage: 28, projectileSpeed: 240, color: '#f43f5e', unlockTrophies: 1000, splash: 70 },
  bouncer:     { id: 'bouncer',     name: 'Bouncer',     rarity: 'rare',      cost: 120, range: 155, fireRate: 0,    damage: 0,  projectileSpeed: 0,   color: '#14b8a6', unlockTrophies: 700, bouncer: true },
  glacier:     { id: 'glacier',     name: 'Glacier',     rarity: 'rare',      cost: 130, range: 160, fireRate: 0.90, damage: 7,  projectileSpeed: 300, color: '#38bdf8', unlockTrophies: 700, slow: 0.5 },
  arc:         { id: 'arc',         name: 'Arc',         rarity: 'epic',      cost: 150, range: 200, fireRate: 1.10, damage: 23, projectileSpeed: 0,   color: '#a78bfa', unlockTrophies: 900, chain: 3 },
  pyre:        { id: 'pyre',        name: 'Pyre',        rarity: 'epic',      cost: 120, range: 130, fireRate: 0.60, damage: 4,  projectileSpeed: 300, color: '#fb923c', unlockTrophies: 800, burn: 8 },
  venom:       { id: 'venom',       name: 'Venom',       rarity: 'rare',      cost: 110, range: 175, fireRate: 0.70, damage: 3,  projectileSpeed: 320, color: '#84cc16', unlockTrophies: 750, poison: true },
  siege:       { id: 'siege',       name: 'Siege',       rarity: 'legendary', cost: 200, range: 300, fireRate: 2.40, damage: 45, projectileSpeed: 200, color: '#78716c', unlockTrophies: 1200, splash: 110 },
  orb_mortar:  { id: 'orb_mortar',  name: 'Orb Mortar',  rarity: 'rare',      cost: 140, range: 0,   fireRate: 6.00, damage: 0,  projectileSpeed: 0,   color: '#f59e0b', unlockTrophies: 300, mortar: true },
  lava_mortar: { id: 'lava_mortar', name: 'Lava Mortar', rarity: 'epic',      cost: 170, range: 260, fireRate: 2.00, damage: 18, projectileSpeed: 240, color: '#f97316', unlockTrophies: 1100, splash: 50, burnChance: 0.18, burnDps: 6 },
  repulsor:    { id: 'repulsor',    name: 'Repulsor',    rarity: 'rare',      cost: 130, range: 170, fireRate: 1.20, damage: 8,  projectileSpeed: 300, color: '#6366f1', knockback: true },
  cryo:        { id: 'cryo',        name: 'Cryo Cannon', rarity: 'epic',      cost: 150, range: 150, fireRate: 2.00, damage: 6,  projectileSpeed: 320, color: '#0ea5e9', freezeBeam: true, freezeDur: 0.6, freezePerLvl: 0.15 },
  seeker:      { id: 'seeker',      name: 'Seeker',      rarity: 'epic',      cost: 160, range: 220, fireRate: 1.00, damage: 14, projectileSpeed: 260, color: '#ec4899', homing: true, homingCount: 2, splash: 30 },
  prism:       { id: 'prism',       name: 'Prism Lance', rarity: 'legendary', cost: 200, range: 200, fireRate: 0,    damage: 10, projectileSpeed: 0,   color: '#a855f7', rampLaser: true, rampMax: 3 },
  flak:        { id: 'flak',        name: 'Flak Cannon', rarity: 'common',    cost: 100, range: 130, fireRate: 1.00, damage: 4,  projectileSpeed: 320, color: '#64748b', flak: true, pelletCount: 5, spreadAngle: 0.55 },
  harpoon:     { id: 'harpoon',     name: 'Harpoon',     rarity: 'common',    cost: 110, range: 200, fireRate: 3.00, damage: 8,  projectileSpeed: 500, color: '#0891b2', harpoon: true },
  twin:        { id: 'twin',        name: 'Twin Cannon', rarity: 'common',    cost: 90,  range: 160, fireRate: 0.80, damage: 8,  projectileSpeed: 360, color: '#0d9488', twin: true, unlockTrophies: 100 },
  tesla:       { id: 'tesla',       name: 'Tesla Coil',  rarity: 'rare',      cost: 130, range: 110, fireRate: 1.50, damage: 10, projectileSpeed: 0,   color: '#7c3aed', tesla: true, unlockTrophies: 600 },
  detonator:   { id: 'detonator',   name: 'Detonator',   rarity: 'rare',      cost: 120, range: 130, fireRate: 1.50, damage: 0,  projectileSpeed: 0,   color: '#dc2626', detonator: true, unlockTrophies: 600 },
  magnet:      { id: 'magnet',      name: 'Magnet',      rarity: 'epic',      cost: 140, range: 0,   fireRate: 5.00, damage: 0,  projectileSpeed: 0,   color: '#6366f1', magnet: true, unlockTrophies: 600 },
  capacitor:   { id: 'capacitor',   name: 'Capacitor',   rarity: 'epic',      cost: 160, range: 220, fireRate: 0,    damage: 120,projectileSpeed: 0,   color: '#fbbf24', capacitor: true, chargeTime: 3, unlockTrophies: 1000 },
  overcharger: { id: 'overcharger', name: 'Overcharger', rarity: 'legendary', cost: 180, range: 130, fireRate: 3.00, damage: 0,  projectileSpeed: 0,   color: '#22d3ee', overcharger: true, unlockTrophies: 1500 },
  mine_layer:  { id: 'mine_layer',  name: 'Mine Layer',  rarity: 'legendary', cost: 150, range: 0,   fireRate: 4.00, damage: 40, projectileSpeed: 0,   color: '#f97316', mineLayer: true, crateOnly: true, crateTrophyMin: 2000 },
};

export const TOWER_COSTS: Record<TowerType, number> = Object.fromEntries(
  Object.entries(TOWER_TYPES).map(([k, v]) => [k, v.cost])
) as Record<TowerType, number>;

// Trophy milestone unlocks
export const TOWER_TROPHY_UNLOCKS: Partial<Record<TowerType, number>> = {
  twin: 100, orb_mortar: 300, flak: 300, harpoon: 300,
  tesla: 600, detonator: 600, magnet: 600, capacitor: 1000, overcharger: 1500,
};

// Starter towers
export const STARTER_TOWERS: TowerType[] = ['basic', 'machinegun', 'boomerang', 'bomb'];

// ─── Orb types ────────────────────────────────────────────────────────────────
export type OrbType = 'normal' | 'fast' | 'bomb' | 'splitter' | 'tank' | 'mine' | 'sprint' |
  'swarmer' | 'shield' | 'healer' | 'radioactive' | 'shadow' | 'ice' | 'fog' | 'zap_orb' |
  'armored' | 'carrier' | 'growth' | 'shield_bubble' | 'berserker' | 'phantom' | 'leech' | 'summoner';

export interface OrbDef {
  id: OrbType; name: string; rarity: string; hp: number; speed: number;
  damage: number; reward: number; radius: number; color: string; cost: number;
  targetsMain?: boolean; explodesOnDeath?: boolean; splitsInto?: number; splitType?: OrbType;
  attacker?: boolean; detonateOnClick?: boolean; ignoresTowers?: boolean; clusterSize?: number;
  shield?: number; healPulse?: number; healRadius?: number; healInterval?: number;
  infectOnContact?: boolean; infectionChance?: number; poisonDur?: number; poisonDps?: number;
  stealth?: boolean; attackWindow?: number; structureTarget?: boolean; arrivalDelay?: number;
  damageDuration?: number; dps?: number; freezeOnImpact?: boolean; freezeDur?: number;
  freezePerLvl?: number; multiTower?: boolean; zapHop?: boolean; zapInterval?: number;
  zapDamage?: number; zapRange?: number; armor?: number; splitHpMult?: number; splitDmgMult?: number;
  growth?: boolean; growthDuration?: number; growthHpMult?: number; growthSpeedMult?: number;
  growthDmgMult?: number; shieldBubble?: boolean; shieldRadius?: number; shieldCap?: number;
  shieldRegenInterval?: number; berserker?: boolean; phantom?: boolean; revealDuration?: number;
  leech?: boolean; leechDps?: number; leechHealMult?: number; summoner?: boolean;
  summonInterval?: number; crateOnly?: boolean; crateTrophyMin?: number;
}

export const ORB_TYPES: Record<OrbType, OrbDef> = {
  normal:       { id: 'normal',       name: 'Normal',       rarity: 'common',    hp: 27,  speed: 42,  damage: 6,  reward: 6,  radius: 22, color: '#60a5fa', cost: 20 },
  fast:         { id: 'fast',         name: 'Fast',         rarity: 'common',    hp: 16,  speed: 92,  damage: 8,  reward: 10, radius: 17, color: '#22d3ee', cost: 32, targetsMain: true },
  bomb:         { id: 'bomb',         name: 'Bomb',         rarity: 'common',    hp: 45,  speed: 34,  damage: 20, reward: 18, radius: 30, color: '#f43f5e', cost: 63, explodesOnDeath: true },
  splitter:     { id: 'splitter',     name: 'Splitter',     rarity: 'common',    hp: 38,  speed: 38,  damage: 7,  reward: 13, radius: 25, color: '#c084fc', cost: 44, splitsInto: 2, splitType: 'normal' },
  tank:         { id: 'tank',         name: 'Tank',         rarity: 'common',    hp: 106, speed: 26,  damage: 16, reward: 24, radius: 30, color: '#7c3aed', cost: 81, attacker: true },
  mine:         { id: 'mine',         name: 'Mine',         rarity: 'common',    hp: 24,  speed: 30,  damage: 22, reward: 14, radius: 26, color: '#f97316', cost: 60, detonateOnClick: true },
  sprint:       { id: 'sprint',       name: 'Sprint',       rarity: 'rare',      hp: 16,  speed: 130, damage: 10, reward: 5,  radius: 18, color: '#06b6d4', cost: 42, targetsMain: true, ignoresTowers: true },
  swarmer:      { id: 'swarmer',      name: 'Swarmer',      rarity: 'rare',      hp: 9,   speed: 70,  damage: 5,  reward: 3,  radius: 14, color: '#a855f7', cost: 28, clusterSize: 3 },
  shield:       { id: 'shield',       name: 'Shielder',     rarity: 'rare',      hp: 56,  speed: 36,  damage: 12, reward: 24, radius: 28, color: '#fb923c', cost: 70, shield: 40 },
  healer:       { id: 'healer',       name: 'Healer',       rarity: 'rare',      hp: 34,  speed: 40,  damage: 8,  reward: 20, radius: 24, color: '#4ade80', cost: 58, healPulse: 8, healRadius: 120, healInterval: 2 },
  radioactive:  { id: 'radioactive',  name: 'Radioactive',  rarity: 'rare',      hp: 34,  speed: 38,  damage: 10, reward: 18, radius: 24, color: '#84cc16', cost: 55, infectOnContact: true, infectionChance: 0.10, poisonDur: 6, poisonDps: 5 },
  shadow:       { id: 'shadow',       name: 'Shadow',       rarity: 'legendary', hp: 80,  speed: 22,  damage: 0,  reward: 35, radius: 26, color: '#0f172a', cost: 95, stealth: true, attackWindow: 1.5, structureTarget: true, arrivalDelay: 0.8, damageDuration: 3, dps: 18 },
  ice:          { id: 'ice',          name: 'Ice',          rarity: 'epic',      hp: 30,  speed: 52,  damage: 5,  reward: 16, radius: 20, color: '#67e8f9', cost: 72, freezeOnImpact: true, freezeDur: 1.0, freezePerLvl: 0.2, attacker: true },
  fog:          { id: 'fog',          name: 'Fog',          rarity: 'legendary', hp: 40,  speed: 38,  damage: 0,  reward: 30, radius: 18, color: '#64748b', cost: 85, stealth: true, attackWindow: 1.2, arrivalDelay: 0.8, damageDuration: 3, dps: 10, multiTower: true },
  zap_orb:      { id: 'zap_orb',      name: 'Zap',          rarity: 'epic',      hp: 50,  speed: 40,  damage: 0,  reward: 20, radius: 22, color: '#3b82f6', cost: 78, structureTarget: true, zapHop: true, zapInterval: 1.5, zapDamage: 15, zapRange: 180 },
  armored:      { id: 'armored',      name: 'Armored',      rarity: 'common',    hp: 40,  speed: 32,  damage: 10, reward: 16, radius: 24, color: '#64748b', cost: 55, armor: 4 },
  carrier:      { id: 'carrier',      name: 'Carrier',      rarity: 'common',    hp: 50,  speed: 34,  damage: 8,  reward: 18, radius: 26, color: '#f97316', cost: 50, splitsInto: 3, splitType: 'normal', splitHpMult: 0.4, splitDmgMult: 0.5 },
  growth:       { id: 'growth',       name: 'Growth',       rarity: 'rare',      hp: 20,  speed: 24,  damage: 4,  reward: 22, radius: 22, color: '#16a34a', cost: 60, growth: true, growthDuration: 8, growthHpMult: 3, growthSpeedMult: 1.8, growthDmgMult: 2.5 },
  shield_bubble:{ id: 'shield_bubble',name: 'Shield-Bubble',rarity: 'common',    hp: 30,  speed: 36,  damage: 6,  reward: 20, radius: 24, color: '#38bdf8', cost: 65, shieldBubble: true, shieldRadius: 100, shieldCap: 30, shieldRegenInterval: 2.5 },
  berserker:    { id: 'berserker',    name: 'Berserker',    rarity: 'epic',      hp: 35,  speed: 30,  damage: 5,  reward: 30, radius: 22, color: '#dc2626', cost: 75, berserker: true },
  phantom:      { id: 'phantom',      name: 'Phantom',      rarity: 'epic',      hp: 60,  speed: 28,  damage: 12, reward: 28, radius: 24, color: '#8b5cf6', cost: 80, stealth: true, phantom: true, revealDuration: 3, structureTarget: true, ignoresTowers: true },
  leech:        { id: 'leech',        name: 'Leech',        rarity: 'epic',      hp: 45,  speed: 24,  damage: 8,  reward: 26, radius: 22, color: '#be123c', cost: 75, leech: true, leechDps: 10, leechHealMult: 1 },
  summoner:     { id: 'summoner',     name: 'Summoner',     rarity: 'legendary', hp: 55,  speed: 22,  damage: 6,  reward: 32, radius: 26, color: '#7c3aed', cost: 85, summoner: true, summonInterval: 2.5, crateOnly: true, crateTrophyMin: 1500 },
};

export const SENDABLE_ORBS: OrbType[] = [
  'normal', 'fast', 'bomb', 'splitter', 'tank', 'mine', 'sprint', 'swarmer',
  'shield', 'healer', 'radioactive', 'shadow', 'ice', 'fog', 'zap_orb',
  'armored', 'carrier', 'growth', 'shield_bubble', 'berserker', 'phantom', 'leech', 'summoner',
];

export const STARTER_ORBS: OrbType[] = ['normal', 'fast', 'bomb', 'splitter', 'tank'];

export const ORB_TROPHY_UNLOCKS: Partial<Record<OrbType, number>> = {
  radioactive: 100, carrier: 100, shield: 300, armored: 300, shield_bubble: 300,
  ice: 500, healer: 600, zap_orb: 600, growth: 600, phantom: 600,
  shadow: 1000, berserker: 1000, leech: 1000, fog: 1200,
};

// ─── Ability types ────────────────────────────────────────────────────────────
export type AbilityType = 'zap' | 'portal' | 'repair' | 'freeze' | 'rage' | 'shield' |
  'burner' | 'meteor' | 'glue' | 'overclock' | 'speed_zone' | 'damage_zone' | 'frost_zone' | 'deep_freeze';

export interface AbilityDef {
  id: AbilityType; name: string; rarity: string; cooldown: number;
  color: string; unlockTrophies?: number; crateOnly?: boolean;
  aimed?: boolean; opponentSide?: boolean;
}

export const ABILITIES: Record<AbilityType, AbilityDef> = {
  zap:         { id: 'zap',         name: 'Zap',         rarity: 'common',    cooldown: 16, color: '#fbbf24' },
  portal:      { id: 'portal',      name: 'Portal',      rarity: 'common',    cooldown: 22, color: '#8b5cf6' },
  repair:      { id: 'repair',      name: 'Repair',      rarity: 'common',    cooldown: 30, color: '#10b981' },
  freeze:      { id: 'freeze',      name: 'Freeze',      rarity: 'rare',      cooldown: 24, color: '#38bdf8', unlockTrophies: 500 },
  rage:        { id: 'rage',        name: 'Rage',        rarity: 'rare',      cooldown: 28, color: '#f43f5e', unlockTrophies: 300 },
  shield:      { id: 'shield',      name: 'Shield',      rarity: 'rare',      cooldown: 26, color: '#6366f1', unlockTrophies: 300 },
  burner:      { id: 'burner',      name: 'Burner',      rarity: 'rare',      cooldown: 16, color: '#f97316', unlockTrophies: 300 },
  meteor:      { id: 'meteor',      name: 'Meteor',      rarity: 'epic',      cooldown: 24, color: '#dc2626', unlockTrophies: 800, crateOnly: true, aimed: true },
  glue:        { id: 'glue',        name: 'Glue',        rarity: 'rare',      cooldown: 22, color: '#84cc16', unlockTrophies: 300, aimed: true },
  overclock:   { id: 'overclock',   name: 'Overclock',   rarity: 'epic',      cooldown: 28, color: '#fbbf24', unlockTrophies: 600 },
  speed_zone:  { id: 'speed_zone',  name: 'Speed Zone',  rarity: 'epic',      cooldown: 22, color: '#22d3ee', unlockTrophies: 800, crateOnly: true, aimed: true, opponentSide: true },
  damage_zone: { id: 'damage_zone', name: 'Damage Zone', rarity: 'epic',      cooldown: 24, color: '#f43f5e', unlockTrophies: 800, crateOnly: true, aimed: true, opponentSide: true },
  frost_zone:  { id: 'frost_zone',  name: 'Frost Zone',  rarity: 'epic',      cooldown: 26, color: '#38bdf8', unlockTrophies: 900, crateOnly: true, aimed: true, opponentSide: true },
  deep_freeze: { id: 'deep_freeze', name: 'Deep Freeze', rarity: 'legendary', cooldown: 32, color: '#0ea5e9', unlockTrophies: 1200, crateOnly: true },
};

export const STARTER_ABILITIES: AbilityType[] = ['zap', 'portal', 'repair'];

export const ABILITY_TROPHY_UNLOCKS: Partial<Record<AbilityType, number>> = {
  rage: 300, shield: 300, burner: 300, glue: 300, overclock: 600,
};

// ─── AI levels ────────────────────────────────────────────────────────────────
export const AI_LEVELS = {
  easy:    { skill: 0.3,  spawnMult: 1.4  },
  normal:  { skill: 0.5,  spawnMult: 1.0  },
  hard:    { skill: 0.8,  spawnMult: 0.82 },
};

// ─── Crate types ──────────────────────────────────────────────────────────────
export interface CrateDef {
  id: string; name: string; cost: number; currency: 'free' | 'coins' | 'gems';
  itemCount: number; cardChance: number; gemChance: number; skinChance: number;
  coinChance: number; bonusChance: number; maxRarity: number; guaranteedCards: number;
  guaranteeNewCard?: boolean; tone: string;
}

export const CRATE_TYPES: Record<string, CrateDef> = {
  wooden:    { id: 'wooden',    name: 'Wooden',    cost: 0,   currency: 'free',  itemCount: 2, cardChance: 0.35, gemChance: 0.08, skinChance: 0.02, coinChance: 0.30, bonusChance: 0.05, maxRarity: 1, guaranteedCards: 0, tone: 'wood' },
  silver:    { id: 'silver',    name: 'Silver',    cost: 200, currency: 'coins', itemCount: 2, cardChance: 0.55, gemChance: 0.12, skinChance: 0.05, coinChance: 0.20, bonusChance: 0.08, maxRarity: 1, guaranteedCards: 1, tone: 'silver' },
  gold:      { id: 'gold',      name: 'Gold',      cost: 30,  currency: 'gems',  itemCount: 3, cardChance: 0.70, gemChance: 0,    skinChance: 0.15, coinChance: 0.10, bonusChance: 0.12, maxRarity: 2, guaranteedCards: 1, tone: 'gold' },
  mythical:  { id: 'mythical',  name: 'Mythical',  cost: 80,  currency: 'gems',  itemCount: 3, cardChance: 0.80, gemChance: 0,    skinChance: 0.30, coinChance: 0.05, bonusChance: 0.18, maxRarity: 3, guaranteedCards: 2, tone: 'crystal' },
  legendary: { id: 'legendary', name: 'Legendary', cost: 180, currency: 'gems',  itemCount: 4, cardChance: 0.85, gemChance: 0,    skinChance: 0.45, coinChance: 0.05, bonusChance: 0.25, maxRarity: 4, guaranteedCards: 2, tone: 'legendary' },
  discovery: { id: 'discovery', name: 'Discovery', cost: 280, currency: 'gems',  itemCount: 3, cardChance: 0.70, gemChance: 0,    skinChance: 0.10, coinChance: 0.15, bonusChance: 0.10, maxRarity: 2, guaranteedCards: 1, guaranteeNewCard: true, tone: 'emerald' },
};

// ─── Combo / click ────────────────────────────────────────────────────────────
export const COMBO_GRACE = 1.2;
export const COMBO_WINDOW = 0.5;
export const BASE_CLICK_DAMAGE = 12;
export const CLICK_DAMAGE_BY_LEAGUE = [12, 13, 15, 16, 17, 19, 20];

// ─── Backward-compat exports for engine.ts ────────────────────────────────────
// These are used by game/engine.ts and other game files that haven't been updated yet.

export const PLAYER_STATION_X = 300;
export const PLAYER_STATION_Y = 852;
export const OPP_STATION_X = 300;
export const OPP_STATION_Y = 48;

export const SIDE_TOWER_POSITIONS = [
  { x: 90, y: 750 },
  { x: 510, y: 750 },
];

// Spawn timing (ms versions for engine.ts which uses ms)
export const SPAWN_INTERVAL_START_MS = 3500;
export const SPAWN_INTERVAL_MIN_MS = 1300;
export const SPAWN_RAMP_DURATION = 90000;

// Escalation timings (ms)
export const ESCALATION_CASUAL = {
  OVERTIME: 3 * 60 * 1000,
  INTENSIFYING: 4 * 60 * 1000,
  MAX_PRESSURE: 5 * 60 * 1000,
  TOWER_BLEED: 6 * 60 * 1000,
};
export const ESCALATION_RANKED = {
  OVERTIME: 3 * 60 * 1000,
  INTENSIFYING: 4 * 60 * 1000,
  CRITICAL: 6 * 60 * 1000,
  MAX_PRESSURE: 7 * 60 * 1000,
  TOWER_BLEED: 8 * 60 * 1000,
};

// Upgrade cost multiplier per level (array form for engine.ts)
export const UPGRADE_COST_MULT_ARRAY = [0, 0.5, 0.75, 1.0, 1.5, 2.0];

// AI difficulty (old name)
export const AI_DIFFICULTY = {
  easy: { skill: 0.3, spawnMult: 1.4 },
  normal: { skill: 0.5, spawnMult: 1.0 },
  hard: { skill: 0.8, spawnMult: 0.82 },
} as const;

// Economy
export const SHARD_CARD_PRICES: Record<number, number> = { 1: 50, 2: 100, 3: 200, 4: 400 };

// Trophy changes
export const TROPHY_WIN_BASE = 30;
export const TROPHY_LOSS_BASE = -20;

// Daily limits (old name)
export const AI_MATCH_MIN_DURATION = 60000;

// Crit
export const CRIT_CHANCE = 0.18;
export const CRIT_MULT = 2.0;

// Comeback (old name)
export const COMEBACK_COIN_RATE = 1;

// Tower bleed
export const TOWER_BLEED_RATE = 2;
export const STATION_BLEED_FLOOR = 1;

// Overtime
export const OVERTIME_ORB_HP_SCALE = 1.15;
export const OVERTIME_SCALE_INTERVAL = 10000;

// EULA
export const CURRENT_EULA_VERSION = '1.0';
