// Orb Clash — Dark game theme with electric blue/purple primary
const PRIMARY = '#4F8EF7'; // Electric blue
const PRIMARY_MUTED = 'rgba(79, 142, 247, 0.12)';
const ACCENT = '#A855F7'; // Purple accent
const DANGER = '#EF4444';
const WARNING = '#F59E0B';
const SUCCESS = '#22C55E';

export const COLORS = {
  // Backgrounds
  background: '#0A0E1A',        // Deep navy-black
  surface: '#111827',           // Dark card surface
  surfaceSecondary: '#1F2937',  // Input backgrounds
  surfaceElevated: '#1A2235',   // Slightly elevated surface

  // Text
  text: '#F1F5F9',              // Off-white
  textSecondary: '#94A3B8',     // Blue-tinted gray
  textTertiary: '#4B5563',      // Dim placeholder

  // Brand
  primary: PRIMARY,
  primaryMuted: PRIMARY_MUTED,
  accent: ACCENT,
  accentMuted: 'rgba(168, 85, 247, 0.12)',

  // Semantic
  success: SUCCESS,
  warning: WARNING,
  danger: DANGER,
  dangerMuted: 'rgba(239, 68, 68, 0.12)',

  // Structural
  border: 'rgba(255, 255, 255, 0.06)',
  divider: 'rgba(255, 255, 255, 0.04)',

  // Game-specific
  gold: '#F59E0B',
  silver: '#94A3B8',
  bronze: '#CD7F32',
  coin: '#FCD34D',
  gem: '#60A5FA',
  shard: '#C084FC',

  // League colors
  leagueBeginner: '#6B7280',
  leagueRookie: '#22C55E',
  leagueCadet: '#3B82F6',
  leagueVeteran: '#8B5CF6',
  leagueChampion: '#F59E0B',
  leagueMaster: '#EF4444',
  leagueLegend: '#F97316',

  // HP bars
  hpGreen: '#22C55E',
  hpYellow: '#F59E0B',
  hpRed: '#EF4444',

  // Tab bar
  tabActive: PRIMARY,
  tabInactive: '#4B5563',
};

export type ColorKey = keyof typeof COLORS;

// Dark theme only (game app)
export default {
  light: COLORS,
  dark: COLORS,
};
