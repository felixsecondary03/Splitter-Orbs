// Cosmetics: orb patterns, station skins, side-tower skins, emblems.

export interface Rarity {
  id: string;
  name: string;
  color: string;
  order: number;
  shardConvert: number;
}

export const RARITIES: Record<string, Rarity> = {
  common: { id: 'common', name: 'Common', color: '#94a3b8', order: 0, shardConvert: 2 },
  rare: { id: 'rare', name: 'Rare', color: '#3b82f6', order: 1, shardConvert: 5 },
  epic: { id: 'epic', name: 'Epic', color: '#8b5cf6', order: 2, shardConvert: 12 },
  legendary: { id: 'legendary', name: 'Legendary', color: '#fbbf24', order: 3, shardConvert: 25 },
  mythical: { id: 'mythical', name: 'Mythical', color: '#e11d48', order: 4, shardConvert: 50 },
};

export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythical'];

export interface OrbPattern {
  id: string;
  name: string;
  rarity: string;
  source: 'default' | 'shop' | 'chest';
  price: number;
  pattern: string;
  accent: string;
}

export const ORB_PATTERNS: Record<string, OrbPattern> = {
  default:    { id: 'default',    name: 'Plain',      rarity: 'common',    source: 'default', price: 0,   pattern: 'stripe',    accent: '#ffffff' },
  stripe:     { id: 'stripe',     name: 'Stripes',    rarity: 'rare',      source: 'shop',    price: 20,  pattern: 'stripe',    accent: '#ffffff' },
  dots:       { id: 'dots',       name: 'Dots',       rarity: 'common',    source: 'shop',    price: 0,   pattern: 'dots',      accent: '#ffffff' },
  crosshatch: { id: 'crosshatch', name: 'Crosshatch', rarity: 'common',    source: 'shop',    price: 0,   pattern: 'crosshatch',accent: '#fbbf24' },
  chevron:    { id: 'chevron',    name: 'Chevron',    rarity: 'rare',      source: 'shop',    price: 60,  pattern: 'chevron',   accent: '#22d3ee' },
  ring:       { id: 'ring',       name: 'Haloring',   rarity: 'epic',      source: 'shop',    price: 120, pattern: 'ring',      accent: '#a78bfa' },
  tree:       { id: 'tree',       name: 'Tree',       rarity: 'rare',      source: 'shop',    price: 60,  pattern: 'tree',      accent: '#14532d' },
  fortress:   { id: 'fortress',   name: 'Fortress',   rarity: 'epic',      source: 'shop',    price: 120, pattern: 'fortress',  accent: '#57534e' },
  diamonds:   { id: 'diamonds',   name: 'Diamonds',   rarity: 'epic',      source: 'chest',   price: 0,   pattern: 'diamonds',  accent: '#e0f2fe' },
  dragon:     { id: 'dragon',     name: 'Dragon',     rarity: 'legendary', source: 'chest',   price: 0,   pattern: 'dragon',    accent: '#0f172a' },
  inferno:    { id: 'inferno',    name: 'Inferno',    rarity: 'mythical',  source: 'chest',   price: 0,   pattern: 'inferno',   accent: '#e11d48' },
  smiley:     { id: 'smiley',     name: 'Smiley',     rarity: 'common',    source: 'shop',    price: 10,  pattern: 'smiley',    accent: '#fde047' },
  heart:      { id: 'heart',      name: 'Heart',      rarity: 'common',    source: 'shop',    price: 20,  pattern: 'heart',     accent: '#f43f5e' },
  star:       { id: 'star',       name: 'Star',       rarity: 'common',    source: 'shop',    price: 20,  pattern: 'star',      accent: '#fbbf24' },
  cloud:      { id: 'cloud',      name: 'Cloud',      rarity: 'common',    source: 'shop',    price: 20,  pattern: 'cloud',     accent: '#e2e8f0' },
  raindrop:   { id: 'raindrop',   name: 'Raindrop',   rarity: 'common',    source: 'shop',    price: 20,  pattern: 'raindrop',  accent: '#38bdf8' },
  wave:       { id: 'wave',       name: 'Wave',       rarity: 'rare',      source: 'shop',    price: 60,  pattern: 'wave',      accent: '#0ea5e9' },
  leaf:       { id: 'leaf',       name: 'Leaf',       rarity: 'rare',      source: 'shop',    price: 60,  pattern: 'leaf',      accent: '#16a34a' },
  feather:    { id: 'feather',    name: 'Feather',    rarity: 'rare',      source: 'shop',    price: 60,  pattern: 'feather',   accent: '#a78bfa' },
  snowflake:  { id: 'snowflake',  name: 'Snowflake',  rarity: 'rare',      source: 'shop',    price: 60,  pattern: 'snowflake', accent: '#7dd3fc' },
  moon:       { id: 'moon',       name: 'Moon',       rarity: 'rare',      source: 'shop',    price: 60,  pattern: 'moon',      accent: '#c7d2fe' },
  sun:        { id: 'sun',        name: 'Sun',        rarity: 'rare',      source: 'shop',    price: 60,  pattern: 'sun',       accent: '#f59e0b' },
  mushroom:   { id: 'mushroom',   name: 'Mushroom',   rarity: 'rare',      source: 'shop',    price: 60,  pattern: 'mushroom',  accent: '#dc2626' },
  fire:       { id: 'fire',       name: 'Fire',       rarity: 'epic',      source: 'shop',    price: 120, pattern: 'fire',      accent: '#f97316' },
  lightning:  { id: 'lightning',  name: 'Lightning',  rarity: 'epic',      source: 'shop',    price: 120, pattern: 'lightning', accent: '#facc15' },
  lantern:    { id: 'lantern',    name: 'Lantern',    rarity: 'epic',      source: 'shop',    price: 120, pattern: 'lantern',   accent: '#fbbf24' },
  eye:        { id: 'eye',        name: 'Eye',        rarity: 'epic',      source: 'shop',    price: 120, pattern: 'eye',       accent: '#8b5cf6' },
  crown:      { id: 'crown',      name: 'Crown',      rarity: 'epic',      source: 'shop',    price: 120, pattern: 'crown',     accent: '#eab308' },
  claw:       { id: 'claw',       name: 'Claw',       rarity: 'epic',      source: 'shop',    price: 120, pattern: 'claw',      accent: '#451a03' },
  volcano:    { id: 'volcano',    name: 'Volcano',    rarity: 'legendary', source: 'chest',   price: 0,   pattern: 'volcano',   accent: '#ea580c' },
  windstorm:  { id: 'windstorm',  name: 'Windstorm',  rarity: 'legendary', source: 'chest',   price: 0,   pattern: 'windstorm', accent: '#64748b' },
  bone:       { id: 'bone',       name: 'Bone',       rarity: 'legendary', source: 'chest',   price: 0,   pattern: 'bone',      accent: '#f5f5f4' },
  spider:     { id: 'spider',     name: 'Spider',     rarity: 'legendary', source: 'chest',   price: 0,   pattern: 'spider',    accent: '#0f172a' },
  phoenix:    { id: 'phoenix',    name: 'Phoenix',    rarity: 'mythical',  source: 'chest',   price: 0,   pattern: 'phoenix',   accent: '#ef4444' },
  kraken:     { id: 'kraken',     name: 'Kraken',     rarity: 'mythical',  source: 'chest',   price: 0,   pattern: 'kraken',    accent: '#0891b2' },
  eclipse:    { id: 'eclipse',    name: 'Eclipse',    rarity: 'mythical',  source: 'chest',   price: 0,   pattern: 'eclipse',   accent: '#1e1b4b' },
};

export const REMOVED_SKINS = ['spark', 'frost', 'galaxy', 'ember'];

export interface StationSkin {
  id: string;
  name: string;
  rarity: string;
  source: 'default' | 'shop' | 'chest';
  price: number;
  body: string[];
  trim: string;
}

export const STATION_SKINS: Record<string, StationSkin> = {
  default:  { id: 'default',  name: 'Stone Keep', rarity: 'common',    source: 'default', price: 0,   body: ['#cbd5e1', '#94a3b8', '#64748b'], trim: '#cbd5e1' },
  obsidian: { id: 'obsidian', name: 'Obsidian',   rarity: 'rare',      source: 'shop',    price: 80,  body: ['#475569', '#334155', '#1e293b'], trim: '#64748b' },
  ivory:    { id: 'ivory',    name: 'Ivory',      rarity: 'rare',      source: 'shop',    price: 80,  body: ['#fafaf9', '#e7e5e4', '#d6d3d1'], trim: '#fafaf9' },
  gilded:   { id: 'gilded',   name: 'Gilded',     rarity: 'epic',      source: 'chest',   price: 0,   body: ['#fde68a', '#fbbf24', '#d97706'], trim: '#fde68a' },
  timber:   { id: 'timber',   name: 'Timber',     rarity: 'common',    source: 'shop',    price: 40,  body: ['#fcd34d', '#d97706', '#78350f'], trim: '#fcd34d' },
  mossy:    { id: 'mossy',    name: 'Mossy',      rarity: 'rare',      source: 'chest',   price: 0,   body: ['#d9f99d', '#84cc16', '#4d7c0f'], trim: '#d9f99d' },
  crystal:  { id: 'crystal',  name: 'Crystal',    rarity: 'epic',      source: 'chest',   price: 0,   body: ['#c4b5fd', '#a78bfa', '#7c3aed'], trim: '#c4b5fd' },
  infernal: { id: 'infernal', name: 'Infernal',   rarity: 'mythical',  source: 'chest',   price: 0,   body: ['#fda4af', '#f43f5e', '#9f1239'], trim: '#fda4af' },
};

export interface TowerSkin {
  id: string;
  name: string;
  rarity: string;
  source: 'default' | 'shop' | 'chest';
  price: number;
  body: string[];
  trim: string;
}

export const TOWER_SKINS: Record<string, TowerSkin> = {
  default:   { id: 'default',   name: 'Stone Gate', rarity: 'common',    source: 'default', price: 0,   body: ['#cbd5e1', '#94a3b8', '#64748b'], trim: '#cbd5e1' },
  iron:      { id: 'iron',      name: 'Iron',       rarity: 'rare',      source: 'shop',    price: 60,  body: ['#94a3b8', '#64748b', '#475569'], trim: '#cbd5e1' },
  sandstone: { id: 'sandstone', name: 'Sandstone',  rarity: 'rare',      source: 'shop',    price: 60,  body: ['#fde68a', '#fbbf24', '#b45309'], trim: '#fde68a' },
  jade:      { id: 'jade',      name: 'Jade',       rarity: 'epic',      source: 'shop',    price: 120, body: ['#86efac', '#4ade80', '#16a34a'], trim: '#bbf7d0' },
  oak:       { id: 'oak',       name: 'Oak',        rarity: 'common',    source: 'shop',    price: 20,  body: ['#fcd34d', '#b45309', '#78350f'], trim: '#fcd34d' },
  rust:      { id: 'rust',      name: 'Rust',       rarity: 'rare',      source: 'shop',    price: 120, body: ['#fed7aa', '#fb923c', '#9a3412'], trim: '#fed7aa' },
  amethyst:  { id: 'amethyst',  name: 'Amethyst',   rarity: 'epic',      source: 'chest',   price: 0,   body: ['#ddd6fe', '#a78bfa', '#6d28d9'], trim: '#ddd6fe' },
  void:      { id: 'void',      name: 'Void',       rarity: 'mythical',  source: 'chest',   price: 0,   body: ['#1e293b', '#0f172a', '#020617'], trim: '#475569' },
};

export interface Emblem {
  id: string;
  name: string;
  rarity: string;
  source: 'default' | 'shop' | 'chest';
  shape: string;
  accent: string;
}

export const EMBLEMS: Record<string, Emblem> = {
  default:   { id: 'default',   name: 'None',            rarity: 'common',    source: 'default', shape: 'none',      accent: '#ffffff' },
  shield:    { id: 'shield',    name: 'Aegis',           rarity: 'common',    source: 'chest',   shape: 'shield',    accent: '#3b82f6' },
  crest:     { id: 'crest',     name: 'Crest',           rarity: 'common',    source: 'chest',   shape: 'crest',     accent: '#94a3b8' },
  starburst: { id: 'starburst', name: 'Starburst',       rarity: 'rare',      source: 'chest',   shape: 'starburst', accent: '#fbbf24' },
  swords:    { id: 'swords',    name: 'Crossed Swords',  rarity: 'rare',      source: 'chest',   shape: 'swords',    accent: '#e2e8f0' },
  sun:       { id: 'sun',       name: 'Radiant Sun',     rarity: 'rare',      source: 'chest',   shape: 'sun',       accent: '#f59e0b' },
  crown:     { id: 'crown',     name: 'Crown',           rarity: 'epic',      source: 'chest',   shape: 'crown',     accent: '#eab308' },
  moon:      { id: 'moon',      name: 'Crescent',        rarity: 'epic',      source: 'chest',   shape: 'moon',      accent: '#c7d2fe' },
  flame:     { id: 'flame',     name: 'Eternal Flame',   rarity: 'epic',      source: 'chest',   shape: 'flame',     accent: '#f97316' },
  eye:       { id: 'eye',       name: 'All-Seeing Eye',  rarity: 'legendary', source: 'chest',   shape: 'eye',       accent: '#8b5cf6' },
  fang:      { id: 'fang',      name: 'Wolf Fang',       rarity: 'legendary', source: 'chest',   shape: 'fang',      accent: '#e5e7eb' },
  kraken:    { id: 'kraken',    name: 'Kraken',          rarity: 'legendary', source: 'chest',   shape: 'kraken',    accent: '#0891b2' },
  phoenix:   { id: 'phoenix',   name: 'Phoenix',         rarity: 'mythical',  source: 'chest',   shape: 'phoenix',   accent: '#ef4444' },
  anvil:     { id: 'anvil',     name: 'Anvil',           rarity: 'common',    source: 'chest',   shape: 'anvil',     accent: '#64748b' },
  compass:   { id: 'compass',   name: 'Compass',         rarity: 'rare',      source: 'chest',   shape: 'compass',   accent: '#0ea5e9' },
  serpent:   { id: 'serpent',   name: 'Serpent',         rarity: 'epic',      source: 'chest',   shape: 'serpent',   accent: '#16a34a' },
  griffin:   { id: 'griffin',   name: 'Griffin',         rarity: 'legendary', source: 'chest',   shape: 'griffin',   accent: '#d97706' },
  titan:     { id: 'titan',     name: 'Titan',           rarity: 'mythical',  source: 'chest',   shape: 'titan',     accent: '#dc2626' },
};

export const EMBLEM_SLOTS = [
  { id: 'station',    name: 'Station',     field: 'equipped_station_emblem' },
  { id: 'leftTower',  name: 'Left Tower',  field: 'equipped_left_tower_emblem' },
  { id: 'rightTower', name: 'Right Tower', field: 'equipped_right_tower_emblem' },
];

export const TOWER_SKIN_SLOTS = [
  { id: 'leftTower',  name: 'Left Tower',  field: 'equipped_left_tower_skin' },
  { id: 'rightTower', name: 'Right Tower', field: 'equipped_right_tower_skin' },
];

export const SKIN_CATEGORIES = {
  orb:     { id: 'orb',     name: 'Orb Patterns',   catalog: ORB_PATTERNS,   equippedField: 'equipped_orb_pattern',    hidden: false },
  station: { id: 'station', name: 'Station Skins',  catalog: STATION_SKINS,  equippedField: 'equipped_station_skin',   hidden: false },
  tower:   { id: 'tower',   name: 'Tower Skins',    catalog: TOWER_SKINS,    equippedField: 'equipped_tower_skin',     hidden: true },
  emblem:  { id: 'emblem',  name: 'Emblems',        catalog: EMBLEMS,        equippedField: 'equipped_station_emblem', hidden: true },
};

export function getSkin(category: string, id: string) {
  const cat = (SKIN_CATEGORIES as any)[category];
  return cat?.catalog?.[id] || cat?.catalog?.default;
}

export function isSkinOwned(profile: any, category: string, id: string): boolean {
  if (id === 'default') return true;
  return (profile?.owned_skins || []).includes(id);
}

export function chestSkinPool(maxRarityOrder: number) {
  const pool: any[] = [];
  for (const cat of Object.values(SKIN_CATEGORIES)) {
    for (const skin of Object.values((cat as any).catalog)) {
      const s = skin as any;
      if (s.source !== 'chest') continue;
      if (RARITIES[s.rarity].order <= maxRarityOrder) pool.push({ ...s, category: (cat as any).id });
    }
  }
  return pool;
}
