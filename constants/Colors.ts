// Orb Clash — Light modern theme matching original web app
export const COLORS = {
  // Backgrounds
  background: '#F8FAFC',       // slate-50
  card: '#FFFFFF',             // white
  surface: '#FFFFFF',          // white (alias for card)
  surfaceSecondary: '#F1F5F9', // slate-100
  surfaceElevated: '#F8FAFC',  // slate-50
  cardBorder: '#E2E8F0',       // slate-200

  // Text
  text: '#0F172A',             // slate-900
  textSecondary: '#64748B',    // slate-500
  textTertiary: '#94A3B8',     // slate-400
  textMuted: '#94A3B8',        // slate-400

  // Brand
  primary: '#3B82F6',          // blue-500
  primaryMuted: 'rgba(59,130,246,0.10)',
  primaryGradient: ['#3B82F6', '#4F46E5'] as [string, string],
  accent: '#4F46E5',           // indigo-600

  // Semantic
  success: '#10B981',          // emerald-500
  win: '#10B981',
  warning: '#F59E0B',          // amber-500
  danger: '#F43F5E',           // rose-500
  loss: '#F43F5E',
  dangerMuted: 'rgba(244,63,94,0.10)',

  // Structural
  border: '#E2E8F0',           // slate-200
  cardBorderWidth: 2,
  divider: '#F1F5F9',          // slate-100

  // Game-specific
  coin: '#F59E0B',             // amber-500
  shard: '#10B981',            // emerald-500
  gem: '#10B981',              // emerald-500
  gold: '#F59E0B',             // amber-500
  silver: '#94A3B8',           // slate-400
  bronze: '#CD7F32',

  // Selected border (loadout)
  selectedBorder: '#F59E0B',   // amber-500

  // Tab bar
  tabActive: '#3B82F6',        // blue-500
  tabInactive: '#94A3B8',      // slate-400
  tabBar: '#FFFFFF',

  // Game halves
  enemyHalf: '#FFF1F2',        // rose-50
  playerHalf: '#FFFFFF',       // white
  wall: '#334155',             // slate-700

  // League colors
  leagueBeginner: '#CD7F32',   // bronze
  leagueRookie: '#94A3B8',     // silver
  leagueCadet: '#F59E0B',      // gold
  leagueVeteran: '#06B6D4',    // platinum/cyan
  leagueChampion: '#3B82F6',   // diamond/blue
  leagueMaster: '#8B5CF6',     // master/purple
  leagueLegend: '#F43F5E',     // legend/rose

  // HP bars
  hpGreen: '#10B981',
  hpYellow: '#F59E0B',
  hpRed: '#F43F5E',

  // Compat aliases
  accentMuted: 'rgba(79,70,229,0.10)',
};

export type ColorKey = keyof typeof COLORS;

export default {
  light: COLORS,
  dark: COLORS,
};
