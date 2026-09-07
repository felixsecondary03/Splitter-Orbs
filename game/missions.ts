// Pure TypeScript — no React, no RN imports

export interface Mission {
  id: string;
  description: string;
  target: number;
  rewardCoins: number;
  rewardGems: number;
  type: 'wins' | 'orbs_destroyed' | 'towers_placed' | 'abilities_used' | 'matches_played';
}

export const DAILY_MISSIONS: Mission[] = [
  { id: 'daily_win_1',      description: 'Win 1 match',       target: 1,  rewardCoins: 50,  rewardGems: 2, type: 'wins' },
  { id: 'daily_win_3',      description: 'Win 3 matches',     target: 3,  rewardCoins: 150, rewardGems: 5, type: 'wins' },
  { id: 'daily_orbs_50',    description: 'Destroy 50 orbs',   target: 50, rewardCoins: 75,  rewardGems: 3, type: 'orbs_destroyed' },
  { id: 'daily_towers_10',  description: 'Place 10 towers',   target: 10, rewardCoins: 60,  rewardGems: 2, type: 'towers_placed' },
  { id: 'daily_abilities_5',description: 'Use 5 abilities',   target: 5,  rewardCoins: 80,  rewardGems: 3, type: 'abilities_used' },
  { id: 'daily_play_5',     description: 'Play 5 matches',    target: 5,  rewardCoins: 100, rewardGems: 4, type: 'matches_played' },
];

export function getDailyMissions(seed: number): Mission[] {
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  const shuffled = [...DAILY_MISSIONS].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3);
}

export function getMissionProgress(
  mission: Mission,
  stats: Record<string, number>,
): number {
  return Math.min(stats[mission.type] ?? 0, mission.target);
}

export function isMissionComplete(
  mission: Mission,
  stats: Record<string, number>,
): boolean {
  return getMissionProgress(mission, stats) >= mission.target;
}
