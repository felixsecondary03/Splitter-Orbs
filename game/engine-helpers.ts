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
  const colors: Record<OrbType, string> = {
    normal:       '#60A5FA',
    fast:         '#34D399',
    bomb:         '#F87171',
    splitter:     '#FBBF24',
    tank:         '#9CA3AF',
    carrier:      '#A78BFA',
    sprint:       '#6EE7B7',
    swarmer:      '#FCD34D',
    shielder:     '#93C5FD',
    healer:       '#86EFAC',
    radioactive:  '#A3E635',
    shadow:       '#6B7280',
    ice:          '#BAE6FD',
    fog:          '#D1D5DB',
    zap:          '#FDE68A',
    armored:      '#78716C',
    growth:       '#4ADE80',
    shield_bubble:'#7DD3FC',
    berserker:    '#FC8181',
    phantom:      '#C4B5FD',
    leech:        '#F9A8D4',
    summoner:     '#DDD6FE',
    mine:         '#FCA5A5',
  };
  return colors[type] ?? '#60A5FA';
}

export function getOrbRadius(type: OrbType): number {
  const radii: Record<OrbType, number> = {
    normal: 14, fast: 11, bomb: 16, splitter: 13, tank: 20,
    carrier: 18, sprint: 12, swarmer: 10, shielder: 14, healer: 13,
    radioactive: 15, shadow: 13, ice: 14, fog: 16, zap: 12,
    armored: 18, growth: 13, shield_bubble: 14, berserker: 14,
    phantom: 13, leech: 12, summoner: 16, mine: 15,
  };
  return radii[type] ?? 14;
}

export function getOrbHp(type: OrbType, leagueIndex: number): number {
  const base: Record<OrbType, number> = {
    normal: 30, fast: 18, bomb: 40, splitter: 25, tank: 100,
    carrier: 60, sprint: 22, swarmer: 15, shielder: 30, healer: 28,
    radioactive: 35, shadow: 25, ice: 30, fog: 45, zap: 20,
    armored: 80, growth: 25, shield_bubble: 30, berserker: 35,
    phantom: 22, leech: 28, summoner: 50, mine: 40,
  };
  const mult = 1 + leagueIndex * 0.25;
  return Math.round((base[type] ?? 30) * mult);
}

export function getOrbDamage(type: OrbType, leagueIndex: number): number {
  const base: Record<OrbType, number> = {
    normal: 8, fast: 6, bomb: 20, splitter: 8, tank: 15,
    carrier: 10, sprint: 12, swarmer: 5, shielder: 8, healer: 6,
    radioactive: 10, shadow: 12, ice: 8, fog: 15, zap: 12,
    armored: 12, growth: 8, shield_bubble: 6, berserker: 14,
    phantom: 10, leech: 5, summoner: 8, mine: 30,
  };
  const mult = 1 + leagueIndex * 0.2;
  return Math.round((base[type] ?? 8) * mult);
}

export function getOrbSpeed(type: OrbType): number {
  const speeds: Record<OrbType, number> = {
    normal: 60, fast: 110, bomb: 55, splitter: 65, tank: 40,
    carrier: 50, sprint: 130, swarmer: 80, shielder: 55, healer: 50,
    radioactive: 60, shadow: 70, ice: 55, fog: 45, zap: 90,
    armored: 45, growth: 55, shield_bubble: 50, berserker: 65,
    phantom: 75, leech: 50, summoner: 45, mine: 0,
  };
  return speeds[type] ?? 60;
}

// ─── Tower helpers ────────────────────────────────────────────────────────────
export function getTowerColor(type: TowerType): string {
  const colors: Record<TowerType, string> = {
    blaster:     '#4F8EF7',
    vulcan:      '#F59E0B',
    lancer:      '#8B5CF6',
    piercer:     '#06B6D4',
    boomerang:   '#10B981',
    mortar:      '#EF4444',
    bouncer:     '#F97316',
    glacier:     '#BAE6FD',
    arc:         '#FDE68A',
    pyre:        '#F97316',
    venom:       '#84CC16',
    siege:       '#6B7280',
    orb_mortar:  '#A855F7',
    lava_mortar: '#DC2626',
    repulsor:    '#0EA5E9',
    cryo:        '#7DD3FC',
    seeker:      '#EC4899',
    prism_lance: '#E879F9',
    flak:        '#FB923C',
    harpoon:     '#78716C',
    twin:        '#34D399',
    tesla:       '#FCD34D',
    detonator:   '#F87171',
    magnet:      '#C084FC',
  };
  return colors[type] ?? '#4F8EF7';
}

export function getTowerRange(type: TowerType, level: number): number {
  const base: Record<TowerType, number> = {
    blaster: 140, vulcan: 110, lancer: 220, piercer: 160, boomerang: 130,
    mortar: 200, bouncer: 150, glacier: 120, arc: 130, pyre: 120,
    venom: 120, siege: 250, orb_mortar: 180, lava_mortar: 190, repulsor: 130,
    cryo: 130, seeker: 200, prism_lance: 170, flak: 120, harpoon: 140,
    twin: 140, tesla: 150, detonator: 130, magnet: 160,
  };
  return (base[type] ?? 140) + (level - 1) * 15;
}

export function getTowerDamage(type: TowerType, level: number): number {
  const base: Record<TowerType, number> = {
    blaster: 18, vulcan: 8, lancer: 45, piercer: 22, boomerang: 20,
    mortar: 35, bouncer: 16, glacier: 0, arc: 20, pyre: 12,
    venom: 10, siege: 80, orb_mortar: 30, lava_mortar: 40, repulsor: 5,
    cryo: 8, seeker: 28, prism_lance: 15, flak: 12, harpoon: 20,
    twin: 16, tesla: 25, detonator: 60, magnet: 0,
  };
  return Math.round((base[type] ?? 18) * (1 + (level - 1) * 0.3));
}

export function getTowerFireRate(type: TowerType, level: number): number {
  const base: Record<TowerType, number> = {
    blaster: 1200, vulcan: 300, lancer: 2500, piercer: 1400, boomerang: 1600,
    mortar: 2200, bouncer: 1100, glacier: 500, arc: 1800, pyre: 1000,
    venom: 1000, siege: 4000, orb_mortar: 2000, lava_mortar: 2400, repulsor: 1500,
    cryo: 1800, seeker: 1600, prism_lance: 800, flak: 1400, harpoon: 1800,
    twin: 1300, tesla: 3000, detonator: 2800, magnet: 600,
  };
  const reduction = 1 - (level - 1) * 0.08;
  return Math.round((base[type] ?? 1200) * Math.max(reduction, 0.5));
}

export function getTowerMaxHp(type: TowerType, level: number): number {
  const base: Record<TowerType, number> = {
    blaster: 80, vulcan: 60, lancer: 90, piercer: 75, boomerang: 70,
    mortar: 100, bouncer: 70, glacier: 110, arc: 85, pyre: 75,
    venom: 75, siege: 120, orb_mortar: 95, lava_mortar: 100, repulsor: 80,
    cryo: 85, seeker: 80, prism_lance: 90, flak: 70, harpoon: 85,
    twin: 80, tesla: 95, detonator: 90, magnet: 85,
  };
  return Math.round((base[type] ?? 80) * (1 + (level - 1) * 0.2));
}
