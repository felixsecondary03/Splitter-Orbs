// Field dimensions
export const GAME_WIDTH = 600;
export const GAME_HEIGHT = 900;
export const WALL_Y = 450;

// Station positions
export const PLAYER_STATION_X = 300;
export const PLAYER_STATION_Y = 852;
export const OPP_STATION_X = 300;
export const OPP_STATION_Y = 48;

// Side tower positions (2 per side)
export const SIDE_TOWER_POSITIONS = [
  { x: 90, y: 750 },
  { x: 510, y: 750 },
];

// Game balance
export const STATION_HP = 120;
export const STARTING_COINS = 120;
export const COIN_CAP = 999;
export const MAX_TOWER_LEVEL = 5; // L6 = Super-Upgrade in Legend league
export const MAX_CARD_LEVEL = 5;
export const CARD_COPIES_NEEDED: Record<number, number> = { 1: 2, 2: 3, 3: 8, 4: 12 };
export const ORB_LOADOUT_SIZE = 5;
export const TOWER_LOADOUT_SIZE = 4;

// Spawn timing
export const SPAWN_INTERVAL_START = 3500; // ms
export const SPAWN_INTERVAL_MIN = 1300; // ms
export const SPAWN_RAMP_DURATION = 90000; // 90s

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

// Leagues
export const LEAGUES = [
  { name: 'Beginner', minTrophies: 0, maxTowerLevel: 3 },
  { name: 'Rookie', minTrophies: 100, maxTowerLevel: 3 },
  { name: 'Cadet', minTrophies: 300, maxTowerLevel: 4 },
  { name: 'Veteran', minTrophies: 600, maxTowerLevel: 4 },
  { name: 'Champion', minTrophies: 1000, maxTowerLevel: 5 },
  { name: 'Master', minTrophies: 1500, maxTowerLevel: 5 },
  { name: 'Legend', minTrophies: 2000, maxTowerLevel: 6 },
] as const;

export type LeagueName = typeof LEAGUES[number]['name'];

export function getLeague(trophies: number): typeof LEAGUES[number] {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (trophies >= LEAGUES[i].minTrophies) return LEAGUES[i];
  }
  return LEAGUES[0];
}

// AI difficulty
export const AI_DIFFICULTY = {
  easy: { skill: 0.3, spawnMult: 1.4 },
  normal: { skill: 0.5, spawnMult: 1.0 },
  hard: { skill: 0.8, spawnMult: 0.82 },
} as const;

// Click damage by league index
export const CLICK_DAMAGE_BY_LEAGUE = [8, 10, 12, 15, 18, 22, 28];

// Orb types
export const ORB_TYPES = [
  'normal', 'fast', 'bomb', 'splitter', 'tank',
  'carrier', 'sprint', 'swarmer', 'shielder', 'healer',
  'radioactive', 'shadow', 'ice', 'fog', 'zap',
  'armored', 'growth', 'shield_bubble', 'berserker',
  'phantom', 'leech', 'summoner', 'mine',
] as const;
export type OrbType = typeof ORB_TYPES[number];

// Tower types
export const TOWER_TYPES = [
  'blaster', 'vulcan', 'lancer', 'piercer', 'boomerang',
  'mortar', 'bouncer', 'glacier', 'arc', 'pyre',
  'venom', 'siege', 'orb_mortar', 'lava_mortar', 'repulsor',
  'cryo', 'seeker', 'prism_lance', 'flak', 'harpoon',
  'twin', 'tesla', 'detonator', 'magnet',
] as const;
export type TowerType = typeof TOWER_TYPES[number];

// Tower costs
export const TOWER_COSTS: Record<string, number> = {
  blaster: 60, vulcan: 80, lancer: 100, piercer: 90, boomerang: 70,
  mortar: 110, bouncer: 75, glacier: 120, arc: 130, pyre: 85,
  venom: 95, siege: 150, orb_mortar: 140, lava_mortar: 130, repulsor: 100,
  cryo: 125, seeker: 115, prism_lance: 160, flak: 90, harpoon: 105,
  twin: 120, tesla: 145, detonator: 135, magnet: 110,
};

// Upgrade cost multiplier per level
export const UPGRADE_COST_MULT = [0, 0.5, 0.75, 1.0, 1.5, 2.0];

// Sell value = 60% of total spent
export const SELL_RATIO = 0.6;

// Ability types
export const ABILITY_TYPES = [
  'meteor', 'freeze', 'rage', 'shield', 'overclock',
  'glue', 'zone', 'portal', 'burner',
] as const;
export type AbilityType = typeof ABILITY_TYPES[number];

// EULA
export const CURRENT_EULA_VERSION = '1.0';

// Economy
export const GEM_TO_COIN_RATE = 10; // 1 gem = 10 coins
export const SHARD_CARD_PRICES: Record<number, number> = { 1: 50, 2: 100, 3: 200, 4: 400 };

// Trophy changes
export const TROPHY_WIN_BASE = 30;
export const TROPHY_LOSS_BASE = -20;

// Daily limits
export const AI_DAILY_WIN_CAP = 20;
export const AI_MATCH_MIN_DURATION = 60000; // 1 minute minimum

// Crit chance
export const CRIT_CHANCE = 0.18;
export const CRIT_MULT = 2.0;

// Combo
export const COMBO_WINDOW = 2000; // ms
export const COMBO_GRACE = 500; // ms

// Comeback mechanic
export const COMEBACK_HP_THRESHOLD = 0.4; // below 40% HP
export const COMEBACK_COIN_RATE = 1; // coins/sec

// Tower bleed (final escalation)
export const TOWER_BLEED_RATE = 2; // HP/sec
export const STATION_BLEED_FLOOR = 1; // stations can't bleed below 1 HP

// Overtime orb HP scale
export const OVERTIME_ORB_HP_SCALE = 1.15; // +15% every 10s
export const OVERTIME_SCALE_INTERVAL = 10000; // ms
