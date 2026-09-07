// Pure TypeScript — no React, no RN imports

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rewardCoins: number;
  rewardGems: number;
  condition: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  wins: number;
  losses: number;
  trophies: number;
  totalGamesPlayed: number;
  orbsDestroyed: number;
  towersPlaced: number;
  abilitiesUsed: number;
  winStreak: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win',     name: 'First Victory', description: 'Win your first match',    icon: 'trophy',   rewardCoins: 100,  rewardGems: 5,  condition: s => s.wins >= 1 },
  { id: 'win_10',        name: 'Veteran',        description: 'Win 10 matches',          icon: 'shield',   rewardCoins: 200,  rewardGems: 10, condition: s => s.wins >= 10 },
  { id: 'win_50',        name: 'Champion',       description: 'Win 50 matches',          icon: 'crown',    rewardCoins: 500,  rewardGems: 25, condition: s => s.wins >= 50 },
  { id: 'streak_5',      name: 'On Fire',        description: 'Win 5 in a row',          icon: 'flame',    rewardCoins: 300,  rewardGems: 15, condition: s => s.winStreak >= 5 },
  { id: 'trophies_100',  name: 'Rookie',         description: 'Reach 100 trophies',      icon: 'star',     rewardCoins: 150,  rewardGems: 8,  condition: s => s.trophies >= 100 },
  { id: 'trophies_1000', name: 'Champion',       description: 'Reach 1000 trophies',     icon: 'zap',      rewardCoins: 1000, rewardGems: 50, condition: s => s.trophies >= 1000 },
  { id: 'orbs_1000',     name: 'Orb Slayer',     description: 'Destroy 1000 orbs',       icon: 'target',   rewardCoins: 250,  rewardGems: 12, condition: s => s.orbsDestroyed >= 1000 },
  { id: 'towers_100',    name: 'Builder',        description: 'Place 100 towers',        icon: 'building', rewardCoins: 200,  rewardGems: 10, condition: s => s.towersPlaced >= 100 },
  { id: 'abilities_50',  name: 'Spellcaster',    description: 'Use 50 abilities',        icon: 'wand',     rewardCoins: 180,  rewardGems: 9,  condition: s => s.abilitiesUsed >= 50 },
  { id: 'games_100',     name: 'Dedicated',      description: 'Play 100 matches',        icon: 'gamepad',  rewardCoins: 300,  rewardGems: 15, condition: s => s.totalGamesPlayed >= 100 },
];

export function checkAchievements(stats: AchievementStats, claimed: string[]): Achievement[] {
  return ACHIEVEMENTS.filter(a => !claimed.includes(a.id) && a.condition(stats));
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
