// Pure TypeScript — no React, no RN imports
import { CARD_COPIES_NEEDED, MAX_CARD_LEVEL, SHARD_CARD_PRICES } from './constants';

export const STARTER_TOWERS = ['basic', 'machinegun', 'boomerang', 'bomb'];
export const STARTER_ABILITIES = ['zap', 'portal', 'repair', 'freeze'];
export const STARTER_ORBS = ['normal', 'fast', 'bomb', 'splitter', 'tank'];

export interface CardState {
  level: number;
  copies: number;
  boughtCopies: number;
}

export function canLevelUp(card: CardState): boolean {
  if (card.level >= MAX_CARD_LEVEL) return false;
  return card.copies >= (CARD_COPIES_NEEDED[card.level] ?? 999);
}

export function levelUpCard(card: CardState): CardState {
  if (!canLevelUp(card)) return card;
  const needed = CARD_COPIES_NEEDED[card.level] ?? 999;
  return {
    ...card,
    level: card.level + 1,
    copies: card.copies - needed,
  };
}

export function getCardMultiplier(cardLevel: number, leagueIndex: number): number {
  const dampening = Math.max(0, 1 - (5 - leagueIndex) * 0.08);
  const baseBonus = 1 + (cardLevel - 1) * 0.15;
  return 1 + (baseBonus - 1) * dampening;
}

export interface CrateReward {
  type: 'card' | 'coins' | 'gems' | 'shards' | 'skin';
  cardType?: string;
  cardCategory?: 'tower' | 'orb' | 'ability';
  amount?: number;
  skinId?: string;
}

export function openCrate(crateType: 'free' | 'gem' | 'premium', rng: () => number): CrateReward[] {
  console.log(`[Progression] openCrate type=${crateType}`);
  const rewards: CrateReward[] = [];

  if (crateType === 'free') {
    rewards.push({ type: 'coins', amount: 50 + Math.floor(rng() * 50) });
    for (let i = 0; i < 3; i++) rewards.push(randomCard(rng));
  } else if (crateType === 'gem') {
    rewards.push({ type: 'coins', amount: 100 + Math.floor(rng() * 100) });
    for (let i = 0; i < 5; i++) rewards.push(randomCard(rng));
    if (rng() < 0.3) rewards.push({ type: 'gems', amount: 5 });
  } else {
    rewards.push({ type: 'coins', amount: 200 + Math.floor(rng() * 200) });
    rewards.push({ type: 'gems', amount: 10 + Math.floor(rng() * 10) });
    for (let i = 0; i < 10; i++) rewards.push(randomCard(rng));
    if (rng() < 0.15) rewards.push({ type: 'skin', skinId: 'random' });
  }

  return rewards;
}

function randomCard(rng: () => number): CrateReward {
  const categories: ('tower' | 'orb' | 'ability')[] = ['tower', 'orb', 'ability'];
  const category = categories[Math.floor(rng() * categories.length)];
  return { type: 'card', cardCategory: category, cardType: 'random' };
}

export function getShardCost(cardLevel: number): number {
  return SHARD_CARD_PRICES[cardLevel] ?? 400;
}

export function canBuyWithShards(card: CardState, shards: number): boolean {
  const cost = getShardCost(card.level);
  return shards >= cost && card.level < MAX_CARD_LEVEL;
}
