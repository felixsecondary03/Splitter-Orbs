// Pure TypeScript — no React, no RN imports
import { AI_DIFFICULTY, TOWER_COSTS, TowerType, TOWER_TYPES } from './constants';
import { GameState, AiAction } from './engine-types';
import { getTowerRange, distance } from './engine-helpers';

export type { AiAction } from './engine-types';

export function computeAiAction(state: GameState, difficulty: 'easy' | 'normal' | 'hard'): AiAction {
  const { skill } = AI_DIFFICULTY[difficulty];

  // Skill check — lower skill = more often does nothing
  if (state.rng() > skill) return { type: 'none' };

  const opp = state.opponent;
  const coins = opp.coins;

  // Hard: prioritize dangerous orbs approaching station
  if (difficulty === 'hard') {
    const dangerOrbs = state.orbs.filter(o => {
      if (o.side !== 1) return false; // orbs heading to opponent station
      return o.y > 100 && o.y < 300; // close to opponent station
    });

    if (dangerOrbs.length >= 3 && opp.abilities.length > 0) {
      const readyAbility = opp.abilities.find(a => a.cooldown === 0);
      if (readyAbility) {
        return {
          type: 'ability',
          payload: { abilityType: readyAbility.type },
        };
      }
    }
  }

  // Place a tower if we have enough coins and few towers
  const affordableTowers = (TOWER_TYPES as readonly TowerType[]).filter(
    t => (TOWER_COSTS[t] ?? 60) <= coins,
  );

  if (opp.towers.length < 3 && affordableTowers.length > 0) {
    const pick = affordableTowers[Math.floor(state.rng() * affordableTowers.length)];
    const pos = findTowerPlacement(state, difficulty);
    if (pos) {
      return {
        type: 'place_tower',
        payload: { type: pick, x: pos.x, y: pos.y },
      };
    }
  }

  // Upgrade cheapest tower if coins > threshold
  const upgradeThreshold = difficulty === 'hard' ? 100 : difficulty === 'normal' ? 150 : 200;
  if (coins > upgradeThreshold && opp.towers.length > 0) {
    const upgradeable = opp.towers.filter(t => t.level < 5);
    if (upgradeable.length > 0) {
      const target = upgradeable[Math.floor(state.rng() * upgradeable.length)];
      return {
        type: 'upgrade_tower',
        payload: { towerId: target.id },
      };
    }
  }

  // Sell and replace a low-level tower if coins are high
  if (difficulty === 'hard' && coins > 200 && opp.towers.length > 0) {
    const lowLevel = opp.towers.find(t => t.level === 1);
    if (lowLevel) {
      return {
        type: 'sell_tower',
        payload: { towerId: lowLevel.id },
      };
    }
  }

  return { type: 'none' };
}

function findTowerPlacement(
  state: GameState,
  difficulty: 'easy' | 'normal' | 'hard',
): { x: number; y: number } | null {
  const WALL_Y = 450;
  const attempts = difficulty === 'hard' ? 20 : 10;

  for (let i = 0; i < attempts; i++) {
    const x = Math.round((60 + state.rng() * 480) / 30) * 30;
    const y = Math.round((60 + state.rng() * (WALL_Y - 120)) / 30) * 30;

    // Must be on opponent side (y < WALL_Y)
    if (y >= WALL_Y) continue;

    // No overlap with existing towers
    const overlap = state.opponent.towers.some(t => distance(t.x, t.y, x, y) < 40);
    if (overlap) continue;

    return { x, y };
  }

  return null;
}
