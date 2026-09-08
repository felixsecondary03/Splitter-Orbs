// Pure TypeScript — no React, no RN imports
import { OrbType, TowerType } from './constants';

// ─── ID generation ───────────────────────────────────────────────────────────
let _idCounter = 0;
export function generateId(): string {
  _idCounter = (_idCounter + 1) & 0xffffff;
  return `${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

// ─── Math helpers ─────────────────────────────────────────────────────────────
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(dx: number, dy: number): { nx: number; ny: number } {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { nx: 0, ny: 0 };
  return { nx: dx / len, ny: dy / len };
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
export function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Orb helpers ──────────────────────────────────────────────────────────────
export function getOrbColor(type: OrbType): string {
  const colors: Partial<Record<OrbType, string>> = {
    normal:       '#60a5fa',
    fast:         '#22d3ee',
    bomb:         '#f43f5e',
    splitter:     '#c084fc',
    tank:         '#7c3aed',
    mine:         '#f97316',
    sprint:       '#06b6d4',
    swarmer:      '#a855f7',
    shield:       '#fb923c',
    healer:       '#4ade80',
    radioactive:  '#84cc16',
    shadow:       '#0f172a',
    ice:          '#67e8f9',
    fog:          '#64748b',
    zap_orb:      '#3b82f6',
    armored:      '#64748b',
    carrier:      '#f97316',
    growth:       '#16a34a',
    shield_bubble:'#38bdf8',
    berserker:    '#dc2626',
    phantom:      '#8b5cf6',
    leech:        '#be123c',
    summoner:     '#7c3aed',
  };
  return colors[type] ?? '#60a5fa';
}

export function getOrbRadius(type: OrbType): number {
  const radii: Partial<Record<OrbType, number>> = {
    normal: 22, fast: 17, bomb: 30, splitter: 25, tank: 30,
    mine: 26, sprint: 18, swarmer: 14, shield: 28, healer: 24,
    radioactive: 24, shadow: 26, ice: 20, fog: 18, zap_orb: 22,
    armored: 24, carrier: 26, growth: 22, shield_bubble: 24,
    berserker: 22, phantom: 24, leech: 22, summoner: 26,
  };
  return radii[type] ?? 22;
}

export function getOrbHp(type: OrbType, leagueIndex: number): number {
  const base: Partial<Record<OrbType, number>> = {
    normal: 27, fast: 16, bomb: 45, splitter: 38, tank: 106,
    mine: 24, sprint: 16, swarmer: 9, shield: 56, healer: 34,
    radioactive: 34, shadow: 80, ice: 30, fog: 40, zap_orb: 50,
    armored: 40, carrier: 50, growth: 20, shield_bubble: 30,
    berserker: 35, phantom: 60, leech: 45, summoner: 55,
  };
  const mult = 1 + leagueIndex * 0.25;
  return Math.round((base[type] ?? 27) * mult);
}

export function getOrbDamage(type: OrbType, leagueIndex: number): number {
  const base: Partial<Record<OrbType, number>> = {
    normal: 6, fast: 8, bomb: 20, splitter: 7, tank: 16,
    mine: 22, sprint: 10, swarmer: 5, shield: 12, healer: 8,
    radioactive: 10, shadow: 0, ice: 5, fog: 0, zap_orb: 0,
    armored: 10, carrier: 8, growth: 4, shield_bubble: 6,
    berserker: 5, phantom: 12, leech: 8, summoner: 6,
  };
  const mult = 1 + leagueIndex * 0.2;
  return Math.round((base[type] ?? 6) * mult);
}

export function getOrbSpeed(type: OrbType): number {
  const speeds: Partial<Record<OrbType, number>> = {
    normal: 42, fast: 92, bomb: 34, splitter: 38, tank: 26,
    mine: 30, sprint: 130, swarmer: 70, shield: 36, healer: 40,
    radioactive: 38, shadow: 22, ice: 52, fog: 38, zap_orb: 40,
    armored: 32, carrier: 34, growth: 24, shield_bubble: 36,
    berserker: 30, phantom: 28, leech: 24, summoner: 22,
  };
  return speeds[type] ?? 42;
}

// ─── Tower helpers ────────────────────────────────────────────────────────────
export function getTowerColor(type: TowerType): string {
  const colors: Partial<Record<TowerType, string>> = {
    basic:       '#3b82f6',
    machinegun:  '#f59e0b',
    sniper:      '#8b5cf6',
    boomerang:   '#10b981',
    rebound:     '#059669',
    bomb:        '#f43f5e',
    bouncer:     '#14b8a6',
    glacier:     '#38bdf8',
    arc:         '#a78bfa',
    pyre:        '#fb923c',
    venom:       '#84cc16',
    siege:       '#78716c',
    orb_mortar:  '#f59e0b',
    lava_mortar: '#f97316',
    repulsor:    '#6366f1',
    cryo:        '#0ea5e9',
    seeker:      '#ec4899',
    prism:       '#a855f7',
    flak:        '#64748b',
    harpoon:     '#0891b2',
    twin:        '#0d9488',
    tesla:       '#7c3aed',
    detonator:   '#dc2626',
    magnet:      '#6366f1',
    capacitor:   '#fbbf24',
    overcharger: '#22d3ee',
    mine_layer:  '#f97316',
  };
  return colors[type] ?? '#3b82f6';
}

export function getTowerRange(type: TowerType, level: number): number {
  const base: Partial<Record<TowerType, number>> = {
    basic: 170, machinegun: 140, sniper: 340, boomerang: 200, rebound: 200,
    bomb: 260, bouncer: 155, glacier: 160, arc: 200, pyre: 130,
    venom: 175, siege: 300, orb_mortar: 0, lava_mortar: 260, repulsor: 170,
    cryo: 150, seeker: 220, prism: 200, flak: 130, harpoon: 200,
    twin: 160, tesla: 110, detonator: 130, magnet: 0,
    capacitor: 220, overcharger: 130, mine_layer: 0,
  };
  return (base[type] ?? 170) + (level - 1) * 15;
}

export function getTowerDamage(type: TowerType, level: number): number {
  const base: Partial<Record<TowerType, number>> = {
    basic: 12, machinegun: 4, sniper: 45, boomerang: 10, rebound: 9,
    bomb: 28, bouncer: 0, glacier: 7, arc: 23, pyre: 4,
    venom: 3, siege: 45, orb_mortar: 0, lava_mortar: 18, repulsor: 8,
    cryo: 6, seeker: 14, prism: 10, flak: 4, harpoon: 8,
    twin: 8, tesla: 10, detonator: 0, magnet: 0,
    capacitor: 120, overcharger: 0, mine_layer: 40,
  };
  return Math.round((base[type] ?? 12) * (1 + (level - 1) * 0.3));
}

export function getTowerFireRate(type: TowerType, level: number): number {
  // fireRate in constants is seconds between shots; convert to ms for engine
  const base: Partial<Record<TowerType, number>> = {
    basic: 700, machinegun: 180, sniper: 1600, boomerang: 1100, rebound: 1400,
    bomb: 1800, bouncer: 0, glacier: 900, arc: 1100, pyre: 600,
    venom: 700, siege: 2400, orb_mortar: 6000, lava_mortar: 2000, repulsor: 1200,
    cryo: 2000, seeker: 1000, prism: 0, flak: 1000, harpoon: 3000,
    twin: 800, tesla: 1500, detonator: 1500, magnet: 5000,
    capacitor: 0, overcharger: 3000, mine_layer: 4000,
  };
  const reduction = 1 - (level - 1) * 0.08;
  return Math.round((base[type] ?? 700) * Math.max(reduction, 0.5));
}

export function getTowerMaxHp(type: TowerType, level: number): number {
  const base: Partial<Record<TowerType, number>> = {
    basic: 80, machinegun: 60, sniper: 90, boomerang: 75, rebound: 75,
    bomb: 100, bouncer: 70, glacier: 110, arc: 85, pyre: 75,
    venom: 75, siege: 120, orb_mortar: 95, lava_mortar: 100, repulsor: 80,
    cryo: 85, seeker: 80, prism: 90, flak: 70, harpoon: 85,
    twin: 80, tesla: 95, detonator: 90, magnet: 85,
    capacitor: 90, overcharger: 100, mine_layer: 80,
  };
  return Math.round((base[type] ?? 80) * (1 + (level - 1) * 0.2));
}
