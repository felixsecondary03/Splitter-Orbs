// Pure TypeScript — no React, no RN imports

export interface SkinDefinition {
  id: string;
  name: string;
  category: 'orb_pattern' | 'station' | 'tower';
  gemCost: number;
  colors: string[];
  description: string;
}

export const ORB_PATTERNS: SkinDefinition[] = [
  { id: 'default',   name: 'Default',   category: 'orb_pattern', gemCost: 0,   colors: [],                       description: 'Standard orb pattern' },
  { id: 'stars',     name: 'Stars',     category: 'orb_pattern', gemCost: 50,  colors: ['#FCD34D', '#F59E0B'],   description: 'Starfield pattern' },
  { id: 'hex',       name: 'Hexagon',   category: 'orb_pattern', gemCost: 75,  colors: ['#60A5FA', '#3B82F6'],   description: 'Hexagonal grid' },
  { id: 'spiral',    name: 'Spiral',    category: 'orb_pattern', gemCost: 100, colors: ['#A855F7', '#7C3AED'],   description: 'Spiral vortex' },
  { id: 'lightning', name: 'Lightning', category: 'orb_pattern', gemCost: 150, colors: ['#FCD34D', '#EF4444'],   description: 'Electric bolts' },
  { id: 'flame',     name: 'Flame',     category: 'orb_pattern', gemCost: 200, colors: ['#F97316', '#EF4444'],   description: 'Burning flames' },
];

export const STATION_SKINS: SkinDefinition[] = [
  { id: 'default',  name: 'Default',  category: 'station', gemCost: 0,   colors: ['#4F8EF7'],           description: 'Standard station' },
  { id: 'crystal',  name: 'Crystal',  category: 'station', gemCost: 100, colors: ['#60A5FA', '#A855F7'], description: 'Crystal fortress' },
  { id: 'volcanic', name: 'Volcanic', category: 'station', gemCost: 150, colors: ['#EF4444', '#F97316'], description: 'Volcanic stronghold' },
  { id: 'shadow',   name: 'Shadow',   category: 'station', gemCost: 200, colors: ['#1F2937', '#374151'], description: 'Shadow realm' },
];

export const TOWER_SKINS: SkinDefinition[] = [
  { id: 'default', name: 'Default', category: 'tower', gemCost: 0,   colors: ['#4F8EF7'],           description: 'Standard tower' },
  { id: 'golden',  name: 'Golden',  category: 'tower', gemCost: 200, colors: ['#F59E0B', '#FCD34D'], description: 'Golden towers' },
  { id: 'neon',    name: 'Neon',    category: 'tower', gemCost: 250, colors: ['#22C55E', '#4ADE80'], description: 'Neon glow' },
];

export function getSkinById(id: string): SkinDefinition | undefined {
  return [...ORB_PATTERNS, ...STATION_SKINS, ...TOWER_SKINS].find(s => s.id === id);
}

export function getSkinsByCategory(category: SkinDefinition['category']): SkinDefinition[] {
  return [...ORB_PATTERNS, ...STATION_SKINS, ...TOWER_SKINS].filter(s => s.category === category);
}
