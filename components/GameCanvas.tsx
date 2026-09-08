import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import {
  GameState,
  Orb,
  Tower,
  SideTower,
  Station,
  Projectile,
  Effect,
  Floater,
  Particle,
  CoinPickup,
  MeteorState,
  GlueState,
  ZoneState,
  MagnetState,
} from '@/game/engine-types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WALL_Y,
} from '@/game/constants';
import { getOrbColor, getTowerColor } from '@/game/engine-helpers';

export interface GameCanvasProps {
  state: GameState;
  width: number;
  height: number;
  onOrbTap: (orbId: string) => void;
  onFieldTap: (x: number, y: number) => void;
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function makeScalers(width: number, height: number) {
  const scaleX = width / GAME_WIDTH;
  const scaleY = height / GAME_HEIGHT;
  const sx = (x: number) => x * scaleX;
  const sy = (y: number) => y * scaleY;
  const sr = (r: number) => r * Math.min(scaleX, scaleY);
  return { sx, sy, sr, scaleX, scaleY };
}

// ─── HP bar color ─────────────────────────────────────────────────────────────

function hpColor(pct: number) {
  return pct > 0.6 ? '#22C55E' : pct > 0.3 ? '#F59E0B' : '#EF4444';
}

// ─── Station ──────────────────────────────────────────────────────────────────

function StationView({
  station,
  color,
  sx,
  sy,
  sr,
}: {
  station: Station;
  color: string;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(station.x);
  const cy = sy(station.y);
  const r = sr(35);
  const hpPct = station.maxHp > 0 ? Math.max(0, station.hp / station.maxHp) : 0;
  const barW = r * 2.2;
  const barH = 5;

  return (
    <>
      {station.shieldHp != null && station.shieldHp > 0 && (
        <View
          style={{
            position: 'absolute',
            left: cx - r - 8,
            top: cy - r - 8,
            width: (r + 8) * 2,
            height: (r + 8) * 2,
            borderRadius: r + 8,
            backgroundColor: 'rgba(96,165,250,0.2)',
            borderWidth: 1.5,
            borderColor: 'rgba(96,165,250,0.5)',
          }}
        />
      )}
      <View
        style={{
          position: 'absolute',
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: color + '22',
          borderWidth: 2,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: r * 0.6,
            height: r * 0.9,
            backgroundColor: color + '88',
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
      {/* HP bar background */}
      <View
        style={{
          position: 'absolute',
          left: cx - barW / 2,
          top: cy + r + 6,
          width: barW,
          height: barH,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 2,
        }}
      />
      {/* HP bar fill */}
      <View
        style={{
          position: 'absolute',
          left: cx - barW / 2,
          top: cy + r + 6,
          width: barW * hpPct,
          height: barH,
          backgroundColor: hpColor(hpPct),
          borderRadius: 2,
        }}
      />
    </>
  );
}

// ─── Side tower ───────────────────────────────────────────────────────────────

function SideTowerView({
  tower,
  sx,
  sy,
  sr,
}: {
  tower: SideTower;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(tower.x);
  const cy = sy(tower.y);
  const half = sr(10);
  const hpPct = tower.maxHp > 0 ? Math.max(0, tower.hp / tower.maxHp) : 0;
  const towerColor = tower.frozen ? '#BAE6FD' : '#6B7280';

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: cx - half,
          top: cy - half,
          width: half * 2,
          height: half * 2,
          backgroundColor: towerColor,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cx - half,
          top: cy - half - 6,
          width: half * 2,
          height: 3,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cx - half,
          top: cy - half - 6,
          width: half * 2 * hpPct,
          height: 3,
          backgroundColor: hpColor(hpPct),
          borderRadius: 1,
        }}
      />
    </>
  );
}

// ─── Tower ────────────────────────────────────────────────────────────────────

function TowerView({
  tower,
  sx,
  sy,
  sr,
}: {
  tower: Tower;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(tower.x);
  const cy = sy(tower.y);
  const half = sr(14);
  const color = getTowerColor(tower.type);
  const hpPct = tower.maxHp > 0 ? Math.max(0, tower.hp / tower.maxHp) : 0;

  const tintColor = tower.frozen
    ? '#BAE6FD'
    : tower.poisoned
    ? '#84CC16'
    : tower.overclocked
    ? '#FCD34D'
    : color;

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: cx - half,
          top: cy - half,
          width: half * 2,
          height: half * 2,
          backgroundColor: tintColor + '33',
          borderWidth: 1.5,
          borderColor: tintColor,
          borderRadius: 4,
        }}
      />
      {/* Level badge */}
      <View
        style={{
          position: 'absolute',
          left: cx + half - sr(5) - 2,
          top: cy - half - sr(5) + 2,
          width: sr(10),
          height: sr(10),
          borderRadius: sr(5),
          backgroundColor: '#1F2937',
          borderWidth: 1,
          borderColor: tintColor,
        }}
      />
      {/* HP bar background */}
      <View
        style={{
          position: 'absolute',
          left: cx - half,
          top: cy - half - 7,
          width: half * 2,
          height: 3,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 1,
        }}
      />
      {/* HP bar fill */}
      <View
        style={{
          position: 'absolute',
          left: cx - half,
          top: cy - half - 7,
          width: half * 2 * hpPct,
          height: 3,
          backgroundColor: hpColor(hpPct),
          borderRadius: 1,
        }}
      />
    </>
  );
}

// ─── Orb ──────────────────────────────────────────────────────────────────────

function OrbView({
  orb,
  sx,
  sy,
  sr,
  onOrbTap,
}: {
  orb: Orb;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
  onOrbTap: (id: string) => void;
}) {
  const cx = sx(orb.x);
  const cy = sy(orb.y);
  const r = sr(orb.radius);
  const color = getOrbColor(orb.type);
  const isStealth = orb.stealth || orb.type === 'shadow' || orb.type === 'phantom';
  const opacity = isStealth ? 0.45 : 1;
  const hpPct = orb.maxHp > 0 ? orb.hp / orb.maxHp : 1;
  const barW = r * 2.2;

  const statusBg = orb.frozen
    ? 'rgba(186,230,253,0.4)'
    : orb.poisoned
    ? 'rgba(132,204,22,0.35)'
    : orb.burning
    ? 'rgba(249,115,22,0.35)'
    : 'transparent';

  return (
    <>
      {/* Shield ring */}
      {orb.shieldHp != null && orb.shieldHp > 0 && (
        <View
          style={{
            position: 'absolute',
            left: cx - r - 5,
            top: cy - r - 5,
            width: (r + 5) * 2,
            height: (r + 5) * 2,
            borderRadius: r + 5,
            backgroundColor: 'rgba(147,197,253,0.3)',
          }}
        />
      )}
      <Pressable
        onPress={() => {
          console.log('[GameCanvas] Orb tapped:', orb.id, orb.type);
          onOrbTap(orb.id);
        }}
        style={{
          position: 'absolute',
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: color + '59',
          borderWidth: isStealth ? 1 : 1.5,
          borderColor: color,
          opacity,
          overflow: 'hidden',
        }}
      >
        {statusBg !== 'transparent' && (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: statusBg,
              borderRadius: r,
            }}
          />
        )}
      </Pressable>
      {/* HP bar (only if damaged) */}
      {orb.hp < orb.maxHp && (
        <>
          <View
            style={{
              position: 'absolute',
              left: cx - barW / 2,
              top: cy + r + 3,
              width: barW,
              height: 3,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 1,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: cx - barW / 2,
              top: cy + r + 3,
              width: barW * Math.max(0, hpPct),
              height: 3,
              backgroundColor: hpColor(hpPct),
              borderRadius: 1,
            }}
          />
        </>
      )}
    </>
  );
}

// ─── Targeting highlight ──────────────────────────────────────────────────────

function TargetingRing({
  orb,
  sx,
  sy,
  sr,
}: {
  orb: Orb;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(orb.x);
  const cy = sy(orb.y);
  const r = sr(orb.radius + 10);

  return (
    <View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        borderWidth: 2,
        borderColor: 'rgba(168,85,247,0.7)',
        backgroundColor: 'rgba(168,85,247,0.15)',
      }}
    />
  );
}

// ─── Projectile ───────────────────────────────────────────────────────────────

function ProjectileView({
  proj,
  sx,
  sy,
  sr,
}: {
  proj: Projectile;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(proj.x);
  const cy = sy(proj.y);
  const r = Math.max(2, sr(proj.radius));

  return (
    <View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: proj.color,
      }}
    />
  );
}

// ─── Effect ───────────────────────────────────────────────────────────────────

function EffectView({
  effect,
  sx,
  sy,
  sr,
}: {
  effect: Effect;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(effect.x);
  const cy = sy(effect.y);
  const alpha = Math.max(0, effect.timer / effect.maxTimer);
  const progress = 1 - alpha;
  const baseR = sr(effect.radius ?? 30);
  const color = effect.color ?? '#F97316';

  let r = baseR;
  let bgColor = color + Math.round(alpha * 0.4 * 255).toString(16).padStart(2, '0');

  if (effect.type === 'explosion' || effect.type === 'station_hit') {
    r = baseR * (0.3 + progress * 0.7);
  } else if (effect.type === 'freeze') {
    r = baseR * (0.5 + progress * 0.5);
    bgColor = `rgba(186,230,253,${alpha * 0.35})`;
  } else if (effect.type === 'lightning') {
    r = baseR * 0.3;
    bgColor = `rgba(253,230,138,${alpha})`;
  } else if (effect.type === 'zone') {
    bgColor = color + Math.round(alpha * 0.3 * 255).toString(16).padStart(2, '0');
  } else {
    r = baseR * 0.4;
    bgColor = color + Math.round(alpha * 0.6 * 255).toString(16).padStart(2, '0');
  }

  return (
    <View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: bgColor,
      }}
    />
  );
}

// ─── Particle ─────────────────────────────────────────────────────────────────

function ParticleView({
  particle,
  sx,
  sy,
  sr,
}: {
  particle: Particle;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const alpha = Math.max(0, particle.alpha);
  if (alpha <= 0) return null;
  const cx = sx(particle.x);
  const cy = sy(particle.y);
  const r = Math.max(1, sr(particle.radius));

  return (
    <View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: particle.color,
        opacity: alpha,
      }}
    />
  );
}

// ─── Floater ──────────────────────────────────────────────────────────────────

function FloaterView({
  floater,
  sx,
  sy,
}: {
  floater: Floater;
  sx: (x: number) => number;
  sy: (y: number) => number;
}) {
  const alpha = Math.max(0, floater.timer / floater.maxTimer);
  if (alpha <= 0) return null;
  const cx = sx(floater.x);
  const cy = sy(floater.y);

  return (
    <Text
      style={{
        position: 'absolute',
        left: cx - 20,
        top: cy - floater.fontSize / 2,
        width: 40,
        textAlign: 'center',
        fontSize: Math.max(8, floater.fontSize * 0.8),
        fontWeight: '800',
        color: floater.color,
        opacity: alpha,
      }}
      pointerEvents="none"
    >
      {floater.text}
    </Text>
  );
}

// ─── Coin pickup ──────────────────────────────────────────────────────────────

function CoinView({
  coin,
  sx,
  sy,
  sr,
}: {
  coin: CoinPickup;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(coin.x);
  const cy = sy(coin.y);
  const r = sr(8);

  return (
    <View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: 'rgba(252,211,77,0.25)',
        borderWidth: 1.5,
        borderColor: '#FCD34D',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: Math.max(6, r * 0.9), color: '#FCD34D', fontWeight: '900' }}>
        $
      </Text>
    </View>
  );
}

// ─── Meteor ───────────────────────────────────────────────────────────────────

function MeteorView({
  meteor,
  sx,
  sy,
  sr,
}: {
  meteor: MeteorState;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const startX = sx(meteor.x);
  const startY = sy(-100);
  const endX = sx(meteor.targetX);
  const endY = sy(meteor.targetY);
  const curX = startX + (endX - startX) * meteor.progress;
  const curY = startY + (endY - startY) * meteor.progress;
  const r = Math.max(4, sr(meteor.radius * 0.15));

  return (
    <View
      style={{
        position: 'absolute',
        left: curX - r,
        top: curY - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: '#F97316',
      }}
    />
  );
}

// ─── Glue ─────────────────────────────────────────────────────────────────────

function GlueView({
  glue,
  sx,
  sy,
  sr,
}: {
  glue: GlueState;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(glue.x);
  const cy = sy(glue.y);
  const r = sr(glue.radius);

  return (
    <View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: 'rgba(120,83,60,0.35)',
      }}
    />
  );
}

// ─── Zone ─────────────────────────────────────────────────────────────────────

function ZoneView({
  zone,
  sx,
  sy,
  sr,
}: {
  zone: ZoneState;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(zone.x);
  const cy = sy(zone.y);
  const r = sr(zone.radius);

  const bgColor =
    zone.type === 'damage'
      ? 'rgba(239,68,68,0.25)'
      : zone.type === 'slow'
      ? 'rgba(96,165,250,0.25)'
      : 'rgba(34,197,94,0.25)';
  const borderColor =
    zone.type === 'damage'
      ? 'rgba(239,68,68,0.6)'
      : zone.type === 'slow'
      ? 'rgba(96,165,250,0.6)'
      : 'rgba(34,197,94,0.6)';

  return (
    <View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: bgColor,
        borderWidth: 1.5,
        borderColor,
      }}
    />
  );
}

// ─── Magnet ───────────────────────────────────────────────────────────────────

function MagnetView({
  magnet,
  sx,
  sy,
  sr,
}: {
  magnet: MagnetState;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(magnet.x);
  const cy = sy(magnet.y);
  const r = sr(magnet.radius);

  return (
    <View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: 'rgba(192,132,252,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(192,132,252,0.4)',
      }}
    />
  );
}

// ─── Aiming overlay ───────────────────────────────────────────────────────────

function AimingView({
  aiming,
  sx,
  sy,
  sr,
}: {
  aiming: { abilityType: string; x: number; y: number };
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
}) {
  const cx = sx(aiming.x);
  const cy = sy(aiming.y);
  const r = sr(70);
  const lineLen = r * 0.6;

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: 'rgba(79,142,247,0.15)',
          borderWidth: 2,
          borderColor: 'rgba(79,142,247,0.6)',
        }}
      />
      {/* Horizontal crosshair */}
      <View
        style={{
          position: 'absolute',
          left: cx - lineLen,
          top: cy - 1,
          width: lineLen * 2,
          height: 2,
          backgroundColor: 'rgba(79,142,247,0.7)',
        }}
      />
      {/* Vertical crosshair */}
      <View
        style={{
          position: 'absolute',
          left: cx - 1,
          top: cy - lineLen,
          width: 2,
          height: lineLen * 2,
          backgroundColor: 'rgba(79,142,247,0.7)',
        }}
      />
    </>
  );
}

// ─── Escalation banner ────────────────────────────────────────────────────────

const ESCALATION_LABELS: Record<string, string> = {
  overtime: 'OVERTIME',
  intensifying: 'INTENSIFYING',
  critical: 'CRITICAL',
  max_pressure: 'MAX PRESSURE',
  tower_bleed: 'TOWER BLEED',
};

const ESCALATION_COLORS: Record<string, string> = {
  overtime: '#F59E0B',
  intensifying: '#F97316',
  critical: '#EF4444',
  max_pressure: '#DC2626',
  tower_bleed: '#7F1D1D',
};

// ─── Main GameCanvas ──────────────────────────────────────────────────────────

export function GameCanvas({ state, width, height, onOrbTap, onFieldTap }: GameCanvasProps) {
  const { sx, sy, sr } = makeScalers(width, height);

  const wallY = sy(WALL_Y);

  const escalationLabel = ESCALATION_LABELS[state.escalationTier] ?? state.escalationTier.toUpperCase();
  const escalationColor = ESCALATION_COLORS[state.escalationTier] ?? '#EF4444';

  const targetedOrbIds = state.targeting
    ? new Set(state.targeting.targets)
    : new Set<string>();

  return (
    <Pressable
      style={{ width, height, overflow: 'hidden' }}
      onPress={(e) => {
        const gameX = (e.nativeEvent.locationX / width) * GAME_WIDTH;
        const gameY = (e.nativeEvent.locationY / height) * GAME_HEIGHT;
        console.log('[GameCanvas] Field tapped at game coords:', gameX.toFixed(1), gameY.toFixed(1));
        onFieldTap(gameX, gameY);
      }}
    >
      {/* ── Background: opponent side (top) ── */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height: wallY,
          backgroundColor: '#FFE4E6',
        }}
      />
      {/* ── Background: player side (bottom) ── */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: wallY,
          width,
          height: height - wallY,
          backgroundColor: '#F8FAFC',
        }}
      />

      {/* ── Freeze overlay ── */}
      {state.player.effects.freeze && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: wallY,
            width,
            height: height - wallY,
            backgroundColor: 'rgba(96,165,250,0.15)',
          }}
        />
      )}

      {/* ── Wall ── */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: wallY - 4,
          width,
          height: 8,
          backgroundColor: '#334155',
        }}
      />

      {/* ── Stations ── */}
      <StationView station={state.player.station} color="#4F8EF7" sx={sx} sy={sy} sr={sr} />
      <StationView station={state.opponent.station} color="#EF4444" sx={sx} sy={sy} sr={sr} />

      {/* ── Side towers ── */}
      {state.player.sideTowers.map((st) => (
        <SideTowerView key={st.id} tower={st} sx={sx} sy={sy} sr={sr} />
      ))}
      {state.opponent.sideTowers.map((st) => (
        <SideTowerView key={st.id} tower={st} sx={sx} sy={sy} sr={sr} />
      ))}

      {/* ── Edit mode overlay ── */}
      {state.editMode && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width,
            height,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        />
      )}

      {/* ── Towers ── */}
      {state.player.towers.map((t) => (
        <TowerView key={t.id} tower={t} sx={sx} sy={sy} sr={sr} />
      ))}
      {state.opponent.towers.map((t) => (
        <TowerView key={t.id} tower={t} sx={sx} sy={sy} sr={sr} />
      ))}

      {/* ── Glues / Zones / Magnets ── */}
      {state.glues.map((g) => (
        <GlueView key={g.id} glue={g} sx={sx} sy={sy} sr={sr} />
      ))}
      {state.zones.map((z) => (
        <ZoneView key={z.id} zone={z} sx={sx} sy={sy} sr={sr} />
      ))}
      {state.magnets.map((m) => (
        <MagnetView key={m.id} magnet={m} sx={sx} sy={sy} sr={sr} />
      ))}

      {/* ── Targeting highlights ── */}
      {state.targeting &&
        state.targeting.targets.map((tid) => {
          const orb = state.orbs.find((o) => o.id === tid);
          if (!orb) return null;
          return <TargetingRing key={tid} orb={orb} sx={sx} sy={sy} sr={sr} />;
        })}

      {/* ── Orbs ── */}
      {state.orbs.map((orb) => (
        <OrbView
          key={orb.id}
          orb={orb}
          sx={sx}
          sy={sy}
          sr={sr}
          onOrbTap={onOrbTap}
        />
      ))}

      {/* ── Coin pickups ── */}
      {state.coinPickups.map((coin) => (
        <CoinView key={coin.id} coin={coin} sx={sx} sy={sy} sr={sr} />
      ))}

      {/* ── Projectiles ── */}
      {state.projectiles.map((proj) => (
        <ProjectileView key={proj.id} proj={proj} sx={sx} sy={sy} sr={sr} />
      ))}

      {/* ── Effects ── */}
      {state.effects.map((effect) => (
        <EffectView key={effect.id} effect={effect} sx={sx} sy={sy} sr={sr} />
      ))}

      {/* ── Particles ── */}
      {state.particles.map((p) => (
        <ParticleView key={p.id} particle={p} sx={sx} sy={sy} sr={sr} />
      ))}

      {/* ── Floaters ── */}
      {state.floaters.map((f) => (
        <FloaterView key={f.id} floater={f} sx={sx} sy={sy} />
      ))}

      {/* ── Meteors ── */}
      {state.meteors.map((m) => (
        <MeteorView key={m.id} meteor={m} sx={sx} sy={sy} sr={sr} />
      ))}

      {/* ── Aiming overlay ── */}
      {state.aiming && (
        <AimingView aiming={state.aiming} sx={sx} sy={sy} sr={sr} />
      )}

      {/* ── Escalation banner ── */}
      {state.escalationTier !== 'none' && (
        <View
          style={{
            position: 'absolute',
            left: width * 0.15,
            top: height * 0.45,
            width: width * 0.7,
            height: 28,
            backgroundColor: escalationColor + '26',
            borderWidth: 1,
            borderColor: escalationColor + '80',
            borderRadius: 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          pointerEvents="none"
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '900',
              color: escalationColor,
              letterSpacing: 1.5,
            }}
          >
            {escalationLabel}
          </Text>
        </View>
      )}

      {/* ── Combo display ── */}
      {state.combo >= 2 && state.comboTimer > 0 && (
        <View
          style={{
            position: 'absolute',
            left: width / 2 - 40,
            top: wallY + (height - wallY) * 0.3,
            width: 80,
            alignItems: 'center',
          }}
          pointerEvents="none"
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '900',
              color: '#FCD34D',
              opacity: Math.min(1, state.comboTimer / 500),
            }}
          >
            {state.combo}x COMBO
          </Text>
        </View>
      )}
    </Pressable>
  );
}
