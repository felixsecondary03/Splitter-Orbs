// Pure TypeScript — no React, no RN imports
import { OrbType, TowerType, AbilityType } from './constants';

export type MatchMode = 'casual' | 'ranked' | 'private' | 'ai_easy' | 'ai_normal' | 'ai_hard' | 'tutorial';
export type EscalationTier = 'none' | 'overtime' | 'intensifying' | 'critical' | 'max_pressure' | 'tower_bleed';
export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

export interface Orb {
  id: string;
  type: OrbType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  side: 0 | 1;
  owner: 'player' | 'opponent';
  shieldHp?: number;
  frozen?: boolean;
  frozenTimer?: number;
  poisoned?: boolean;
  poisonTimer?: number;
  poisonDps?: number;
  burning?: boolean;
  burnTimer?: number;
  burnDps?: number;
  stealth?: boolean;
  latched?: boolean;
  latchTarget?: string;
  growthTimer?: number;
  minions?: string[];
  summonTimer?: number;
  radius: number;
  color: string;
  patternId?: string;
}

export interface Tower {
  id: string;
  type: TowerType;
  x: number;
  y: number;
  level: number;
  hp: number;
  maxHp: number;
  fireTimer: number;
  fireRate: number;
  range: number;
  damage: number;
  side: 0 | 1;
  frozen?: boolean;
  frozenTimer?: number;
  poisoned?: boolean;
  poisonTimer?: number;
  poisonDps?: number;
  overclocked?: boolean;
  overclockedTimer?: number;
}

export interface SideTower {
  id: string;
  x: number;
  y: number;
  level: number;
  hp: number;
  maxHp: number;
  fireTimer: number;
  side: 0 | 1;
  frozen?: boolean;
  frozenTimer?: number;
}

export interface Station {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shieldHp?: number;
  skinId?: string;
  emblemId?: string;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  type: string;
  targetId?: string;
  ownerId: string;
  side: 0 | 1;
  radius: number;
  color: string;
  trail: { x: number; y: number }[];
  trailMaxLen: number;
  piercing?: boolean;
  bounces?: number;
  homing?: boolean;
  aoe?: number;
  slow?: number;
  freeze?: boolean;
  burn?: boolean;
  poison?: boolean;
  chain?: number;
  chainTargets?: string[];
}

export interface Effect {
  id: string;
  type: string;
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
  radius?: number;
  color?: string;
  data?: Record<string, unknown>;
}

export interface Floater {
  id: string;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  timer: number;
  maxTimer: number;
  fontSize: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  timer: number;
  maxTimer: number;
}

export interface CoinPickup {
  id: string;
  x: number;
  y: number;
  value: number;
  timer: number;
}

export interface AbilityState {
  type: AbilityType;
  cooldown: number;
  maxCooldown: number;
  level: number;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  coins: number;
  towers: Tower[];
  sideTowers: SideTower[];
  station: Station;
  abilities: AbilityState[];
  selectedTower: TowerType | null;
  clicks: number;
  maxClicks: number;
  rechargeInterval: number;
  rechargeTimer: number;
  effects: {
    freeze: boolean;
    freezeTimer: number;
    rage: boolean;
    rageTimer: number;
    shield: boolean;
    shieldTimer: number;
    overclock: boolean;
    overclockTimer: number;
  };
}

export interface MeteorState {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  damage: number;
  radius: number;
}

export interface GlueState {
  id: string;
  x: number;
  y: number;
  radius: number;
  timer: number;
  slowFactor: number;
}

export interface ZoneState {
  id: string;
  x: number;
  y: number;
  radius: number;
  timer: number;
  type: 'damage' | 'slow' | 'buff';
  dps?: number;
}

export interface MagnetState {
  id: string;
  x: number;
  y: number;
  radius: number;
  timer: number;
}

export interface TargetingState {
  abilityType: AbilityType;
  targets: string[];
  maxTargets: number;
}

export interface AimingState {
  abilityType: AbilityType;
  x: number;
  y: number;
}

export interface GameState {
  status: GameStatus;
  time: number;
  matchMode: MatchMode;
  escalationTier: EscalationTier;
  player: PlayerState;
  opponent: PlayerState;
  orbs: Orb[];
  projectiles: Projectile[];
  effects: Effect[];
  floaters: Floater[];
  particles: Particle[];
  coinPickups: CoinPickup[];
  spawnTimer: number;
  spawnInterval: number;
  combo: number;
  comboTimer: number;
  editMode: boolean;
  hitStop: number;
  shake: number;
  overtimeTimer: number;
  overtimeActive: boolean;
  overtimeScale: number;
  overtimeScaleTimer: number;
  meteors: MeteorState[];
  glues: GlueState[];
  zones: ZoneState[];
  magnets: MagnetState[];
  targeting: TargetingState | null;
  aiming: AimingState | null;
  playerTrophies: number;
  leagueIndex: number;
  clickDamage: number;
  seed: number;
  rng: () => number;
  winner: 'player' | 'opponent' | null;
  playerPattern?: string;
  playerSkins?: Record<string, string>;
  oppPattern?: string;
  oppSkins?: Record<string, string>;
}

export interface AiAction {
  type: 'place_tower' | 'upgrade_tower' | 'sell_tower' | 'buy_orb' | 'ability' | 'none';
  payload?: Record<string, unknown>;
}

export interface Loadout {
  towers: TowerType[];
  orbs: OrbType[];
  abilities: AbilityType[];
  sideTowerLevel: number;
  handLevel: number;
  cardLevels: Record<string, number>;
}
