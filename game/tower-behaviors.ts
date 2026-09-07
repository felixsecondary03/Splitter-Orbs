// Pure TypeScript — no React, no RN imports
import { TowerType } from './constants';
import { Tower, SideTower, Orb, Projectile, Effect, GameState } from './engine-types';
import { generateId, distance, normalize, getTowerColor, getTowerRange, getTowerDamage, getTowerFireRate } from './engine-helpers';

// ─── Find nearest orb in range ────────────────────────────────────────────────
function findTarget(tower: Tower | SideTower, orbs: Orb[]): Orb | null {
  const range = 'type' in tower
    ? getTowerRange((tower as Tower).type, tower.level)
    : 160 + tower.level * 20;

  let best: Orb | null = null;
  let bestDist = Infinity;

  for (const orb of orbs) {
    if (orb.stealth) continue; // stealth orbs not targetable
    const d = distance(tower.x, tower.y, orb.x, orb.y);
    if (d <= range && d < bestDist) {
      bestDist = d;
      best = orb;
    }
  }
  return best;
}

// ─── Build projectile ─────────────────────────────────────────────────────────
function makeProjectile(
  tower: Tower,
  target: Orb,
  overrides: Partial<Projectile> = {},
): Projectile {
  const { nx, ny } = normalize(target.x - tower.x, target.y - tower.y);
  const speed = 280;
  const color = getTowerColor(tower.type);

  return {
    id: generateId(),
    x: tower.x,
    y: tower.y,
    vx: nx * speed,
    vy: ny * speed,
    damage: getTowerDamage(tower.type, tower.level),
    type: 'bullet',
    targetId: target.id,
    ownerId: tower.id,
    side: tower.side,
    radius: 5,
    color,
    trail: [],
    trailMaxLen: 6,
    ...overrides,
  };
}

// ─── Tower fire logic ─────────────────────────────────────────────────────────
export interface TowerFireResult {
  tower: Tower;
  projectiles: Projectile[];
  effects: Effect[];
  orbUpdates: Map<string, Partial<Orb>>; // direct orb modifications (no projectile)
}

export function fireTower(tower: Tower, enemyOrbs: Orb[], state: GameState): TowerFireResult {
  const result: TowerFireResult = {
    tower,
    projectiles: [],
    effects: [],
    orbUpdates: new Map(),
  };

  const target = findTarget(tower, enemyOrbs);
  if (!target) return result;

  const type = tower.type as TowerType;

  switch (type) {
    case 'blaster': {
      result.projectiles.push(makeProjectile(tower, target));
      break;
    }

    case 'vulcan': {
      // Rapid fire single bullet
      result.projectiles.push(makeProjectile(tower, target, { radius: 4, type: 'bullet' }));
      break;
    }

    case 'lancer': {
      // High damage, slow, long range
      result.projectiles.push(makeProjectile(tower, target, { radius: 7, type: 'bullet', color: '#8B5CF6' }));
      break;
    }

    case 'piercer': {
      result.projectiles.push(makeProjectile(tower, target, { piercing: true, type: 'bullet' }));
      break;
    }

    case 'boomerang': {
      result.projectiles.push(makeProjectile(tower, target, { bounces: 1, type: 'boomerang' }));
      break;
    }

    case 'mortar': {
      result.projectiles.push(makeProjectile(tower, target, { aoe: 55, type: 'mortar', radius: 8 }));
      break;
    }

    case 'bouncer': {
      result.projectiles.push(makeProjectile(tower, target, { bounces: 3, type: 'bullet' }));
      break;
    }

    case 'glacier': {
      // Slow aura — apply slow to all orbs in range directly
      const range = getTowerRange(tower.type, tower.level);
      for (const orb of enemyOrbs) {
        const d = distance(tower.x, tower.y, orb.x, orb.y);
        if (d <= range) {
          result.orbUpdates.set(orb.id, { speed: orb.speed * 0.6 });
        }
      }
      break;
    }

    case 'arc': {
      // Chain lightning: hits up to 3 orbs
      const range = getTowerRange(tower.type, tower.level);
      const inRange = enemyOrbs
        .filter(o => !o.stealth && distance(tower.x, tower.y, o.x, o.y) <= range)
        .slice(0, 3);
      for (const orb of inRange) {
        result.effects.push({
          id: generateId(),
          type: 'lightning',
          x: tower.x,
          y: tower.y,
          timer: 150,
          maxTimer: 150,
          data: { targetX: orb.x, targetY: orb.y, orbId: orb.id },
          color: '#FDE68A',
        });
        result.orbUpdates.set(orb.id, { hp: orb.hp - getTowerDamage(tower.type, tower.level) });
      }
      break;
    }

    case 'pyre': {
      result.projectiles.push(makeProjectile(tower, target, {
        burn: true,
        type: 'bullet',
        color: '#F97316',
      }));
      break;
    }

    case 'venom': {
      result.projectiles.push(makeProjectile(tower, target, {
        poison: true,
        type: 'bullet',
        color: '#84CC16',
      }));
      break;
    }

    case 'siege': {
      result.projectiles.push(makeProjectile(tower, target, { radius: 9, type: 'bullet', color: '#6B7280' }));
      break;
    }

    case 'orb_mortar': {
      result.projectiles.push(makeProjectile(tower, target, { aoe: 45, type: 'mortar', color: '#A855F7' }));
      break;
    }

    case 'lava_mortar': {
      result.projectiles.push(makeProjectile(tower, target, {
        aoe: 60,
        burn: true,
        type: 'mortar',
        color: '#DC2626',
      }));
      break;
    }

    case 'repulsor': {
      // Knockback: push orbs away
      const range = getTowerRange(tower.type, tower.level);
      for (const orb of enemyOrbs) {
        const d = distance(tower.x, tower.y, orb.x, orb.y);
        if (d <= range) {
          const { nx, ny } = normalize(orb.x - tower.x, orb.y - tower.y);
          result.orbUpdates.set(orb.id, {
            x: orb.x + nx * 30,
            y: orb.y + ny * 30,
            vx: nx * orb.speed,
            vy: ny * orb.speed,
          });
        }
      }
      break;
    }

    case 'cryo': {
      result.projectiles.push(makeProjectile(tower, target, {
        freeze: true,
        type: 'bullet',
        color: '#7DD3FC',
      }));
      break;
    }

    case 'seeker': {
      result.projectiles.push(makeProjectile(tower, target, {
        homing: true,
        type: 'missile',
        radius: 6,
        color: '#EC4899',
      }));
      break;
    }

    case 'prism_lance': {
      result.projectiles.push(makeProjectile(tower, target, {
        piercing: true,
        type: 'beam',
        color: '#E879F9',
      }));
      break;
    }

    case 'flak': {
      // 3-way spread
      const angles = [-0.3, 0, 0.3];
      const baseAngle = Math.atan2(target.y - tower.y, target.x - tower.x);
      for (const offset of angles) {
        const a = baseAngle + offset;
        const speed = 260;
        result.projectiles.push({
          id: generateId(),
          x: tower.x,
          y: tower.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          damage: getTowerDamage(tower.type, tower.level),
          type: 'bullet',
          ownerId: tower.id,
          side: tower.side,
          radius: 4,
          color: '#FB923C',
          trail: [],
          trailMaxLen: 4,
        });
      }
      break;
    }

    case 'harpoon': {
      // Yank orb toward tower
      result.projectiles.push(makeProjectile(tower, target, { type: 'harpoon', color: '#78716C' }));
      const { nx, ny } = normalize(tower.x - target.x, tower.y - target.y);
      result.orbUpdates.set(target.id, {
        x: target.x + nx * 40,
        y: target.y + ny * 40,
      });
      break;
    }

    case 'twin': {
      // Target 2 orbs
      const range = getTowerRange(tower.type, tower.level);
      const targets = enemyOrbs
        .filter(o => !o.stealth && distance(tower.x, tower.y, o.x, o.y) <= range)
        .slice(0, 2);
      for (const t of targets) {
        result.projectiles.push(makeProjectile(tower, t));
      }
      break;
    }

    case 'tesla': {
      // AoE pulse
      const range = getTowerRange(tower.type, tower.level);
      result.effects.push({
        id: generateId(),
        type: 'tesla_pulse',
        x: tower.x,
        y: tower.y,
        timer: 300,
        maxTimer: 300,
        radius: range,
        color: '#FCD34D',
      });
      for (const orb of enemyOrbs) {
        const d = distance(tower.x, tower.y, orb.x, orb.y);
        if (d <= range) {
          result.orbUpdates.set(orb.id, { hp: orb.hp - getTowerDamage(tower.type, tower.level) });
        }
      }
      break;
    }

    case 'detonator': {
      // Instant kill + AoE
      result.orbUpdates.set(target.id, { hp: 0 });
      result.effects.push({
        id: generateId(),
        type: 'explosion',
        x: target.x,
        y: target.y,
        timer: 400,
        maxTimer: 400,
        radius: 70,
        color: '#F87171',
      });
      // AoE damage to nearby orbs
      const aoeRange = 70;
      for (const orb of enemyOrbs) {
        if (orb.id === target.id) continue;
        const d = distance(target.x, target.y, orb.x, orb.y);
        if (d <= aoeRange) {
          result.orbUpdates.set(orb.id, { hp: orb.hp - getTowerDamage(tower.type, tower.level) * 0.5 });
        }
      }
      break;
    }

    case 'magnet': {
      // Attract orbs toward tower
      const range = getTowerRange(tower.type, tower.level);
      for (const orb of enemyOrbs) {
        const d = distance(tower.x, tower.y, orb.x, orb.y);
        if (d <= range && d > 20) {
          const { nx, ny } = normalize(tower.x - orb.x, tower.y - orb.y);
          result.orbUpdates.set(orb.id, {
            x: orb.x + nx * 15,
            y: orb.y + ny * 15,
          });
        }
      }
      break;
    }

    default:
      result.projectiles.push(makeProjectile(tower, target));
  }

  return result;
}

// ─── Side tower fire ──────────────────────────────────────────────────────────
export function fireSideTower(
  sideTower: SideTower,
  enemyOrbs: Orb[],
): { sideTower: SideTower; projectiles: Projectile[] } {
  const target = findTarget(sideTower, enemyOrbs);
  if (!target) return { sideTower, projectiles: [] };

  const { nx, ny } = normalize(target.x - sideTower.x, target.y - sideTower.y);
  const speed = 240;
  const damage = 10 + sideTower.level * 5;

  const proj: Projectile = {
    id: generateId(),
    x: sideTower.x,
    y: sideTower.y,
    vx: nx * speed,
    vy: ny * speed,
    damage,
    type: 'bullet',
    targetId: target.id,
    ownerId: sideTower.id,
    side: sideTower.side,
    radius: 5,
    color: '#94A3B8',
    trail: [],
    trailMaxLen: 5,
  };

  return { sideTower, projectiles: [proj] };
}

// ─── Projectile update ────────────────────────────────────────────────────────
export interface ProjectileUpdateResult {
  projectile: Projectile | null; // null = remove
  orbUpdates: Map<string, Partial<Orb>>;
  effects: Effect[];
}

export function updateProjectile(
  proj: Projectile,
  dt: number,
  enemyOrbs: Orb[],
  state: GameState,
): ProjectileUpdateResult {
  const dtSec = dt / 1000;
  const result: ProjectileUpdateResult = {
    projectile: proj,
    orbUpdates: new Map(),
    effects: [],
  };

  // Homing: steer toward target
  let updated = { ...proj };
  if (updated.homing && updated.targetId) {
    const target = enemyOrbs.find(o => o.id === updated.targetId);
    if (target) {
      const { nx, ny } = normalize(target.x - updated.x, target.y - updated.y);
      const speed = Math.sqrt(updated.vx * updated.vx + updated.vy * updated.vy);
      const turnRate = 0.15;
      updated = {
        ...updated,
        vx: updated.vx + nx * speed * turnRate,
        vy: updated.vy + ny * speed * turnRate,
      };
      // Re-normalize speed
      const newSpeed = Math.sqrt(updated.vx * updated.vx + updated.vy * updated.vy);
      if (newSpeed > 0) {
        updated = {
          ...updated,
          vx: (updated.vx / newSpeed) * speed,
          vy: (updated.vy / newSpeed) * speed,
        };
      }
    }
  }

  // Move
  const newX = updated.x + updated.vx * dtSec;
  const newY = updated.y + updated.vy * dtSec;

  // Update trail
  const trail = [{ x: updated.x, y: updated.y }, ...updated.trail].slice(0, updated.trailMaxLen);
  updated = { ...updated, x: newX, y: newY, trail };

  // Out of bounds check
  if (newX < -50 || newX > 650 || newY < -50 || newY > 950) {
    result.projectile = null;
    return result;
  }

  // Collision with orbs
  let hitCount = 0;
  for (const orb of enemyOrbs) {
    const d = distance(updated.x, updated.y, orb.x, orb.y);
    const hitRadius = updated.radius + orb.radius;

    if (d <= hitRadius) {
      hitCount++;
      let dmg = updated.damage;

      // Crit
      if (state.rng() < 0.18) dmg *= 2.0;

      // Armored orb: 50% reduction
      if (orb.type === 'armored') dmg *= 0.5;

      // Shield absorbs first
      let newHp = orb.hp;
      let newShieldHp = orb.shieldHp;
      if (newShieldHp && newShieldHp > 0) {
        newShieldHp -= dmg;
        if (newShieldHp < 0) {
          newHp += newShieldHp; // overflow damage
          newShieldHp = 0;
        }
      } else {
        newHp -= dmg;
      }

      const orbUpdate: Partial<Orb> = { hp: newHp, shieldHp: newShieldHp };

      // Apply status effects
      if (updated.burn) {
        orbUpdate.burning = true;
        orbUpdate.burnTimer = 3000;
        orbUpdate.burnDps = 8;
      }
      if (updated.poison) {
        orbUpdate.poisoned = true;
        orbUpdate.poisonTimer = 4000;
        orbUpdate.poisonDps = 5;
      }
      if (updated.freeze) {
        orbUpdate.frozen = true;
        orbUpdate.frozenTimer = 2000;
      }
      if (updated.slow) {
        orbUpdate.speed = orb.speed * (1 - updated.slow);
      }

      result.orbUpdates.set(orb.id, orbUpdate);

      // AoE
      if (updated.aoe) {
        result.effects.push({
          id: generateId(),
          type: 'explosion',
          x: updated.x,
          y: updated.y,
          timer: 350,
          maxTimer: 350,
          radius: updated.aoe,
          color: updated.color,
        });
        // AoE damage to nearby orbs handled in main loop
      }

      if (!updated.piercing) {
        result.projectile = null;
        return result;
      }

      if (hitCount >= 3) {
        result.projectile = null;
        return result;
      }
    }
  }

  result.projectile = updated;
  return result;
}
