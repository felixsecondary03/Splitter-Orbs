import React, { useRef, useEffect, useMemo } from 'react';
import { Platform, Pressable, View, Text } from 'react-native';
import {
  Canvas,
  Circle,
  Rect,
  Line,
  useFont,
  LinearGradient,
  RadialGradient,
  vec,
  Group,
  Paint,
  RoundedRect,
  Path,
  Fill,
  Skia,
  Text as SkiaText,
} from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { GAME_WIDTH, GAME_HEIGHT, WALL_Y } from '@/game/constants';
import { getOrbColor, getTowerColor } from '@/game/engine-helpers';
import type {
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

export interface GameCanvasProps {
  state: GameState;
  width: number;
  height: number;
  onOrbTap: (orbId: string) => void;
  onFieldTap: (x: number, y: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hpColor(pct: number): string {
  if (pct > 0.6) return '#22C55E';
  if (pct > 0.3) return '#F59E0B';
  return '#EF4444';
}

function alphaHex(alpha: number): string {
  return Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
}

function lightenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darkenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, parseInt(h.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(h.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(h.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

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

// ─── Orb type decorations ─────────────────────────────────────────────────────

function makeHexPath(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  }
  path.close();
  return path;
}

function makeStarPath(cx: number, cy: number, outerR: number, innerR: number, points: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  }
  path.close();
  return path;
}

// ─── Tower silhouette paths ───────────────────────────────────────────────────

function makeTowerTopPath(type: string, cx: number, cy: number, half: number): ReturnType<typeof Skia.Path.Make> | null {
  const path = Skia.Path.Make();
  const h = half;

  switch (type) {
    case 'basic': {
      // Single spike
      path.moveTo(cx - h * 0.4, cy - h * 0.1);
      path.lineTo(cx, cy - h * 1.1);
      path.lineTo(cx + h * 0.4, cy - h * 0.1);
      path.close();
      return path;
    }
    case 'sniper': {
      // Long thin barrel
      path.addRect(Skia.XYWHRect(cx - h * 0.12, cy - h * 1.5, h * 0.24, h * 1.4));
      return path;
    }
    case 'machinegun': {
      // 3 thin barrels
      for (let i = -1; i <= 1; i++) {
        path.addRect(Skia.XYWHRect(cx + i * h * 0.35 - h * 0.08, cy - h * 0.9, h * 0.16, h * 0.8));
      }
      return path;
    }
    case 'twin': {
      // 2 parallel barrels
      path.addRect(Skia.XYWHRect(cx - h * 0.35, cy - h * 1.0, h * 0.22, h * 0.9));
      path.addRect(Skia.XYWHRect(cx + h * 0.13, cy - h * 1.0, h * 0.22, h * 0.9));
      return path;
    }
    case 'bomb': {
      // Round bomb with fuse
      path.addCircle(cx, cy - h * 0.7, h * 0.45);
      path.addRect(Skia.XYWHRect(cx - h * 0.06, cy - h * 1.2, h * 0.12, h * 0.2));
      return path;
    }
    case 'bouncer': {
      // Ball above tower
      path.addCircle(cx, cy - h * 0.8, h * 0.4);
      return path;
    }
    case 'glacier': {
      // Ice crystal star
      const star = makeStarPath(cx, cy - h * 0.6, h * 0.55, h * 0.25, 6);
      return star;
    }
    case 'arc': {
      // Lightning bolt
      path.moveTo(cx + h * 0.2, cy - h * 1.1);
      path.lineTo(cx - h * 0.05, cy - h * 0.55);
      path.lineTo(cx + h * 0.15, cy - h * 0.55);
      path.lineTo(cx - h * 0.2, cy - h * 0.0);
      path.lineTo(cx + h * 0.05, cy - h * 0.55);
      path.lineTo(cx - h * 0.15, cy - h * 0.55);
      path.close();
      return path;
    }
    case 'pyre': {
      // Flame — 3 teardrop shapes
      for (let i = -1; i <= 1; i++) {
        const fx = cx + i * h * 0.35;
        path.moveTo(fx, cy - h * 0.1);
        path.cubicTo(fx - h * 0.2, cy - h * 0.5, fx - h * 0.15, cy - h * 0.9, fx, cy - h * 1.1);
        path.cubicTo(fx + h * 0.15, cy - h * 0.9, fx + h * 0.2, cy - h * 0.5, fx, cy - h * 0.1);
      }
      return path;
    }
    case 'venom': {
      // Two downward fangs
      path.moveTo(cx - h * 0.35, cy - h * 0.9);
      path.lineTo(cx - h * 0.15, cy - h * 0.1);
      path.lineTo(cx + h * 0.05, cy - h * 0.9);
      path.moveTo(cx - h * 0.05, cy - h * 0.9);
      path.lineTo(cx + h * 0.15, cy - h * 0.1);
      path.lineTo(cx + h * 0.35, cy - h * 0.9);
      return path;
    }
    case 'siege': {
      // Wide cannon barrel
      path.addRect(Skia.XYWHRect(cx - h * 0.45, cy - h * 1.0, h * 0.9, h * 0.9));
      return path;
    }
    case 'orb_mortar':
    case 'lava_mortar': {
      // Short wide mortar tube
      path.addRect(Skia.XYWHRect(cx - h * 0.4, cy - h * 0.7, h * 0.8, h * 0.6));
      return path;
    }
    case 'repulsor': {
      // Two outward arrows
      path.moveTo(cx - h * 0.1, cy - h * 0.8);
      path.lineTo(cx - h * 0.5, cy - h * 0.4);
      path.lineTo(cx - h * 0.3, cy - h * 0.4);
      path.lineTo(cx - h * 0.3, cy - h * 0.1);
      path.lineTo(cx - h * 0.1, cy - h * 0.1);
      path.close();
      path.moveTo(cx + h * 0.1, cy - h * 0.8);
      path.lineTo(cx + h * 0.5, cy - h * 0.4);
      path.lineTo(cx + h * 0.3, cy - h * 0.4);
      path.lineTo(cx + h * 0.3, cy - h * 0.1);
      path.lineTo(cx + h * 0.1, cy - h * 0.1);
      path.close();
      return path;
    }
    case 'cryo': {
      // Rectangular beam emitter
      path.addRect(Skia.XYWHRect(cx - h * 0.5, cy - h * 0.8, h, h * 0.7));
      path.addRect(Skia.XYWHRect(cx - h * 0.6, cy - h * 0.85, h * 0.15, h * 0.8));
      path.addRect(Skia.XYWHRect(cx + h * 0.45, cy - h * 0.85, h * 0.15, h * 0.8));
      return path;
    }
    case 'seeker': {
      // Targeting reticle — circle with crosshairs
      path.addCircle(cx, cy - h * 0.6, h * 0.45);
      path.addRect(Skia.XYWHRect(cx - h * 0.5, cy - h * 0.63, h, h * 0.06));
      path.addRect(Skia.XYWHRect(cx - h * 0.03, cy - h * 1.1, h * 0.06, h));
      return path;
    }
    case 'prism': {
      // Diamond/rhombus
      path.moveTo(cx, cy - h * 1.1);
      path.lineTo(cx + h * 0.5, cy - h * 0.6);
      path.lineTo(cx, cy - h * 0.1);
      path.lineTo(cx - h * 0.5, cy - h * 0.6);
      path.close();
      return path;
    }
    case 'flak': {
      // Wide flared barrel
      path.moveTo(cx - h * 0.2, cy - h * 0.9);
      path.lineTo(cx - h * 0.5, cy - h * 0.1);
      path.lineTo(cx + h * 0.5, cy - h * 0.1);
      path.lineTo(cx + h * 0.2, cy - h * 0.9);
      path.close();
      return path;
    }
    case 'harpoon': {
      // Elongated diamond
      path.moveTo(cx, cy - h * 1.2);
      path.lineTo(cx + h * 0.2, cy - h * 0.6);
      path.lineTo(cx, cy - h * 0.1);
      path.lineTo(cx - h * 0.2, cy - h * 0.6);
      path.close();
      return path;
    }
    case 'boomerang':
    case 'rebound': {
      // Curved boomerang arc
      path.moveTo(cx - h * 0.6, cy - h * 0.2);
      path.cubicTo(cx - h * 0.5, cy - h * 1.1, cx + h * 0.5, cy - h * 1.1, cx + h * 0.6, cy - h * 0.2);
      path.cubicTo(cx + h * 0.4, cy - h * 0.8, cx - h * 0.4, cy - h * 0.8, cx - h * 0.6, cy - h * 0.2);
      path.close();
      return path;
    }
    case 'tesla': {
      // Tesla coil — spiral-like shape
      path.moveTo(cx, cy - h * 0.1);
      path.lineTo(cx - h * 0.15, cy - h * 0.5);
      path.lineTo(cx + h * 0.15, cy - h * 0.5);
      path.lineTo(cx, cy - h * 0.9);
      path.lineTo(cx - h * 0.1, cy - h * 0.9);
      path.lineTo(cx + h * 0.1, cy - h * 0.9);
      path.addCircle(cx, cy - h * 1.1, h * 0.2);
      return path;
    }
    case 'detonator': {
      // T-shape plunger
      path.addRect(Skia.XYWHRect(cx - h * 0.5, cy - h * 0.7, h, h * 0.2));
      path.addRect(Skia.XYWHRect(cx - h * 0.1, cy - h * 0.9, h * 0.2, h * 0.8));
      return path;
    }
    case 'magnet': {
      // Horseshoe U-shape using cubic bezier
      path.moveTo(cx - h * 0.45, cy - h * 0.1);
      path.lineTo(cx - h * 0.45, cy - h * 0.75);
      path.cubicTo(cx - h * 0.45, cy - h * 1.15, cx + h * 0.45, cy - h * 1.15, cx + h * 0.45, cy - h * 0.75);
      path.lineTo(cx + h * 0.45, cy - h * 0.1);
      path.lineTo(cx + h * 0.25, cy - h * 0.1);
      path.lineTo(cx + h * 0.25, cy - h * 0.75);
      path.cubicTo(cx + h * 0.25, cy - h * 0.95, cx - h * 0.25, cy - h * 0.95, cx - h * 0.25, cy - h * 0.75);
      path.lineTo(cx - h * 0.25, cy - h * 0.1);
      path.close();
      return path;
    }
    case 'capacitor': {
      // Two parallel plates
      path.addRect(Skia.XYWHRect(cx - h * 0.5, cy - h * 0.55, h, h * 0.15));
      path.addRect(Skia.XYWHRect(cx - h * 0.5, cy - h * 0.85, h, h * 0.15));
      path.addRect(Skia.XYWHRect(cx - h * 0.06, cy - h * 1.0, h * 0.12, h * 0.5));
      return path;
    }
    case 'overcharger': {
      // Lightning bolt in circle
      path.addCircle(cx, cy - h * 0.65, h * 0.5);
      path.moveTo(cx + h * 0.15, cy - h * 1.05);
      path.lineTo(cx - h * 0.05, cy - h * 0.65);
      path.lineTo(cx + h * 0.1, cy - h * 0.65);
      path.lineTo(cx - h * 0.15, cy - h * 0.25);
      path.lineTo(cx + h * 0.05, cy - h * 0.65);
      path.lineTo(cx - h * 0.1, cy - h * 0.65);
      path.close();
      return path;
    }
    case 'mine_layer': {
      // Mine shape — circle with spikes
      path.addCircle(cx, cy - h * 0.65, h * 0.35);
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const ix = cx + Math.cos(angle) * h * 0.35;
        const iy = (cy - h * 0.65) + Math.sin(angle) * h * 0.35;
        const ox = cx + Math.cos(angle) * h * 0.55;
        const oy = (cy - h * 0.65) + Math.sin(angle) * h * 0.55;
        path.moveTo(ix, iy);
        path.lineTo(ox, oy);
      }
      return path;
    }
    default:
      return null;
  }
}

// ─── GameCanvasInner ──────────────────────────────────────────────────────────

export const GameCanvasInner = React.memo(function GameCanvasInner({
  state,
  width,
  height,
  onOrbTap,
  onFieldTap,
}: GameCanvasProps) {
  // ── Hooks must be called unconditionally ──────────────────────────────────
  // Font for HP numbers
  const font = useFont(require('../assets/fonts/SpaceMono-Bold.ttf'), 12);

  // Track orb spawn times
  const spawnTimes = useRef<Map<string, number>>(new Map());

  // Shake offsets ref
  const shakeRef = useRef({ x: 0, y: 0 });

  // Grid lines memo (depends on width/height)
  const scaleXMemo = width / GAME_WIDTH;
  const scaleYMemo = height / GAME_HEIGHT;
  const srMemo = (r: number) => r * Math.min(scaleXMemo, scaleYMemo);
  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const step = srMemo(60);
    for (let x = step; x < width; x += step) {
      lines.push({ x1: x, y1: 0, x2: x, y2: height });
    }
    for (let y = step; y < height; y += step) {
      lines.push({ x1: 0, y1: y, x2: width, y2: y });
    }
    return lines;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  if (!state) return null;

  const scaleX = width / GAME_WIDTH;
  const scaleY = height / GAME_HEIGHT;
  const sx = (x: number) => x * scaleX;
  const sy = (y: number) => y * scaleY;
  const sr = (r: number) => r * Math.min(scaleX, scaleY);

  const wallY = sy(WALL_Y);

  const now = Date.now();

  // Register new orbs
  for (const orb of state.orbs) {
    if (!spawnTimes.current.has(orb.id)) {
      spawnTimes.current.set(orb.id, now);
    }
  }
  // Prune dead orbs
  if (spawnTimes.current.size > state.orbs.length + 50) {
    const liveIds = new Set(state.orbs.map((o) => o.id));
    for (const id of spawnTimes.current.keys()) {
      if (!liveIds.has(id)) spawnTimes.current.delete(id);
    }
  }

  // Shake offsets — only update when shake > 0
  if (state.shake > 0) {
    shakeRef.current = {
      x: (Math.random() - 0.5) * state.shake * 2,
      y: (Math.random() - 0.5) * state.shake * 2,
    };
  } else {
    shakeRef.current = { x: 0, y: 0 };
  }
  const shakeX = shakeRef.current.x;
  const shakeY = shakeRef.current.y;
  const zoom = state.hitStop > 0 ? 1 + state.hitStop * 0.002 : 1;

  const escalationLabel =
    ESCALATION_LABELS[state.escalationTier] ??
    state.escalationTier.toUpperCase();
  const escalationColor =
    ESCALATION_COLORS[state.escalationTier] ?? '#EF4444';

  // Build tap gesture
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      const tapX = e.x;
      const tapY = e.y;
      const gameX = (tapX / width) * GAME_WIDTH;
      const gameY = (tapY / height) * GAME_HEIGHT;

      console.log('[GameCanvas] tap at canvas', tapX.toFixed(1), tapY.toFixed(1), '→ game', gameX.toFixed(1), gameY.toFixed(1));

      let tappedOrb: Orb | null = null;
      for (const orb of state.orbs) {
        const ox = sx(orb.x);
        const oy = sy(orb.y);
        const r = sr(orb.radius) + 6;
        const dx = tapX - ox;
        const dy = tapY - oy;
        if (dx * dx + dy * dy <= r * r) {
          tappedOrb = orb;
          break;
        }
      }

      if (tappedOrb) {
        console.log('[GameCanvas] tapped orb', tappedOrb.id, tappedOrb.type);
        onOrbTap(tappedOrb.id);
      } else {
        console.log('[GameCanvas] tapped field at game coords', gameX.toFixed(1), gameY.toFixed(1));
        onFieldTap(gameX, gameY);
      }
    });

  const canvasContent = (
    <Canvas style={{ width, height }}>
      <Group transform={[{ translateX: shakeX }, { translateY: shakeY }, { scale: zoom }]}>

        {/* ── 1. Background gradient ── */}
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={['#0A0E1A', '#111827']}
          />
        </Rect>

        {/* ── 2. Grid lines ── */}
        {gridLines.map((l, i) => (
          <Line
            key={i}
            p1={vec(l.x1, l.y1)}
            p2={vec(l.x2, l.y2)}
            color="rgba(255,255,255,0.03)"
            strokeWidth={1}
          />
        ))}

        {/* ── 3. Opponent side tint ── */}
        <Rect x={0} y={0} width={width} height={wallY} color="rgba(239,68,68,0.06)" />

        {/* ── 4. Player side tint ── */}
        <Rect x={0} y={wallY} width={width} height={height - wallY} color="rgba(79,142,247,0.04)" />

        {/* ── 5. Freeze overlay ── */}
        {state.player.effects.freeze && (
          <Rect x={0} y={wallY} width={width} height={height - wallY} color="rgba(96,165,250,0.18)" />
        )}

        {/* ── 6. Rage vignette ── */}
        {state.player.effects.rage && (
          <>
            <Rect x={0} y={wallY} width={width} height={height - wallY} color="rgba(239,68,68,0.08)" />
            <Rect x={0} y={0} width={width} height={height} color="transparent">
              <Paint color="rgba(239,68,68,0.35)" style="stroke" strokeWidth={12} />
            </Rect>
          </>
        )}

        {/* ── 7. Shield overlay ── */}
        {state.player.effects.shield && (
          <Rect x={0} y={wallY} width={width} height={height - wallY} color="rgba(99,102,241,0.1)" />
        )}

        {/* ── 8. Glue puddles (fill) ── */}
        {state.glues.map((g: GlueState) => (
          <Group key={g.id}>
            <Circle cx={sx(g.x)} cy={sy(g.y)} r={sr(g.radius)} color="rgba(120,83,60,0.3)" />
            <Circle cx={sx(g.x)} cy={sy(g.y)} r={sr(g.radius)} color="rgba(101,163,13,0.15)" />
          </Group>
        ))}

        {/* ── 9. Zones ── */}
        {state.zones.map((z: ZoneState) => {
          const zFill =
            z.type === 'damage' ? 'rgba(239,68,68,0.18)' :
            z.type === 'slow'   ? 'rgba(96,165,250,0.18)' :
                                  'rgba(34,197,94,0.18)';
          return (
            <Circle key={z.id} cx={sx(z.x)} cy={sy(z.y)} r={sr(z.radius)} color={zFill} />
          );
        })}

        {/* ── 10. Magnets ── */}
        {state.magnets.map((m: MagnetState) => (
          <Group key={m.id}>
            <Circle cx={sx(m.x)} cy={sy(m.y)} r={sr(m.radius)} color="rgba(192,132,252,0.12)" />
            <Circle cx={sx(m.x)} cy={sy(m.y)} r={sr(m.radius)} color="transparent">
              <Paint color="rgba(192,132,252,0.5)" style="stroke" strokeWidth={1.5} />
            </Circle>
          </Group>
        ))}

        {/* ── 11. Wall glow + line ── */}
        <Rect x={0} y={wallY - sr(8)} width={width} height={sr(16)} color="rgba(51,65,85,0.5)" />
        <Rect x={0} y={wallY - sr(3)} width={width} height={sr(6)}>
          <LinearGradient
            start={vec(0, wallY - sr(3))}
            end={vec(0, wallY + sr(3))}
            colors={['rgba(148,163,184,0.6)', 'rgba(71,85,105,0.4)']}
          />
        </Rect>
        <Line p1={vec(0, wallY)} p2={vec(width, wallY)} color="#475569" strokeWidth={2} />

        {/* ── 12. Stations ── */}
        {([
          { station: state.player.station, color: '#4F8EF7' },
          { station: state.opponent.station, color: '#EF4444' },
        ] as { station: Station; color: string }[]).map(({ station, color }) => {
          const cx = sx(station.x);
          const cy = sy(station.y);
          const r = sr(35);
          const hpPct = station.maxHp > 0 ? Math.max(0, station.hp / station.maxHp) : 0;
          const barW = r * 2.4;
          const barH = sr(5);
          const barX = cx - barW / 2;
          const barY = cy + r + sr(7);
          const hpBarColor = hpColor(hpPct);
          const stationKey = `station-${color}`;
          const lightColor = lightenColor(color, 60);
          return (
            <Group key={stationKey}>
              {/* Outer glow */}
              <Circle cx={cx} cy={cy} r={r + sr(10)} color={color + '18'} />
              {/* Shield ring */}
              {station.shieldHp != null && station.shieldHp > 0 && (
                <Group>
                  <Circle cx={cx} cy={cy} r={r + sr(9)} color="rgba(96,165,250,0.2)" />
                  <Circle cx={cx} cy={cy} r={r + sr(9)} color="transparent">
                    <Paint color="rgba(96,165,250,0.6)" style="stroke" strokeWidth={2} />
                  </Circle>
                </Group>
              )}
              {/* Body with radial gradient */}
              <Circle cx={cx} cy={cy} r={r} color={color + '33'}>
                <RadialGradient c={vec(cx, cy)} r={r} colors={[color + '55', color + '11']} />
              </Circle>
              {/* Border */}
              <Circle cx={cx} cy={cy} r={r} color="transparent">
                <Paint color={color} style="stroke" strokeWidth={2.5} />
              </Circle>
              {/* Inner highlight */}
              <Circle cx={cx - r * 0.2} cy={cy - r * 0.25} r={r * 0.35} color="transparent">
                <RadialGradient
                  c={vec(cx - r * 0.2, cy - r * 0.25)}
                  r={r * 0.35}
                  colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
                />
              </Circle>
              {/* HP bar bg */}
              <RoundedRect x={barX} y={barY} width={barW} height={barH} r={2} color="rgba(0,0,0,0.5)" />
              {hpPct > 0 && (
                <RoundedRect x={barX} y={barY} width={barW * hpPct} height={barH} r={2} color={hpBarColor} />
              )}
            </Group>
          );
        })}

        {/* ── 13. Side towers ── */}
        {[...state.player.sideTowers, ...state.opponent.sideTowers].map((tower: SideTower) => {
          const cx = sx(tower.x);
          const cy = sy(tower.y);
          const half = sr(11);
          const hpPct = tower.maxHp > 0 ? Math.max(0, tower.hp / tower.maxHp) : 0;
          const towerColor = tower.frozen ? '#BAE6FD' : '#94A3B8';
          const barW = half * 2.4;
          const barH = sr(3);
          const barX = cx - barW / 2;
          const barY = cy - half - sr(7);
          const hpBarColor = hpColor(hpPct);
          return (
            <Group key={tower.id}>
              {/* Stone body */}
              <RoundedRect x={cx - half} y={cy - half} width={half * 2} height={half * 2} r={sr(2)} color="rgba(71,85,105,0.9)" />
              <RoundedRect x={cx - half} y={cy - half} width={half * 2} height={half * 2} r={sr(2)} color="transparent">
                <Paint color={towerColor} style="stroke" strokeWidth={1.5} />
              </RoundedRect>
              {/* Crenellations */}
              {[-1, 0, 1].map((i) => (
                <Rect
                  key={i}
                  x={cx + i * half * 0.6 - half * 0.18}
                  y={cy - half - sr(3)}
                  width={half * 0.36}
                  height={sr(4)}
                  color="rgba(71,85,105,0.9)"
                />
              ))}
              {/* HP bar */}
              <RoundedRect x={barX} y={barY} width={barW} height={barH} r={1} color="rgba(0,0,0,0.5)" />
              {hpPct > 0 && (
                <RoundedRect x={barX} y={barY} width={barW * hpPct} height={barH} r={1} color={hpBarColor} />
              )}
            </Group>
          );
        })}

        {/* ── 14. Edit mode dim ── */}
        {state.editMode && (
          <Rect x={0} y={0} width={width} height={height} color="rgba(0,0,0,0.4)" />
        )}

        {/* ── 15. Towers ── */}
        {[...state.player.towers, ...state.opponent.towers].map((tower: Tower) => {
          const cx = sx(tower.x);
          const cy = sy(tower.y);
          const half = sr(14);
          const color = getTowerColor(tower.type);
          const hpPct = tower.maxHp > 0 ? Math.max(0, tower.hp / tower.maxHp) : 0;
          const statusColor = tower.frozen ? '#BAE6FD' : tower.poisoned ? '#84CC16' : tower.overclocked ? '#FCD34D' : color;
          const barW = half * 2.2;
          const barH = sr(3);
          const barX = cx - barW / 2;
          const barY = cy - half - sr(8);
          const hpBarColor = hpColor(hpPct);
          const pipCount = Math.min(tower.level, 6);
          const pipR = sr(2.5);
          const pipSpacing = sr(6);
          const pipsStartX = cx - ((pipCount - 1) * pipSpacing) / 2;
          const pipY = cy + half + sr(6);
          const topPath = makeTowerTopPath(tower.type, cx, cy, half);
          const isSuper = tower.level >= 6;

          return (
            <Group key={tower.id}>
              {/* Super perk aura */}
              {isSuper && (
                <Circle cx={cx} cy={cy} r={half * 1.6} color="transparent">
                  <Paint color="rgba(251,191,36,0.4)" style="stroke" strokeWidth={3} />
                </Circle>
              )}
              {/* Overclock aura */}
              {tower.overclocked && (
                <Circle cx={cx} cy={cy} r={half * 1.4} color="transparent">
                  <Paint color="rgba(252,211,77,0.5)" style="stroke" strokeWidth={2} />
                </Circle>
              )}
              {/* Stone trapezoid body */}
              <RoundedRect
                x={cx - half}
                y={cy - half}
                width={half * 2}
                height={half * 2}
                r={sr(3)}
                color="rgba(71,85,105,0.92)"
              />
              <RoundedRect
                x={cx - half}
                y={cy - half}
                width={half * 2}
                height={half * 2}
                r={sr(3)}
                color="transparent"
              >
                <Paint color={statusColor + 'AA'} style="stroke" strokeWidth={1.5} />
              </RoundedRect>
              {/* Crenellations */}
              {[-1, 0, 1].map((i) => (
                <Rect
                  key={i}
                  x={cx + i * half * 0.55 - half * 0.16}
                  y={cy - half - sr(3.5)}
                  width={half * 0.32}
                  height={sr(4.5)}
                  color="rgba(71,85,105,0.95)"
                />
              ))}
              {/* Tower top silhouette */}
              {topPath && (
                <Path path={topPath} color={statusColor + 'DD'} />
              )}
              {/* Frozen overlay */}
              {tower.frozen && (
                <RoundedRect x={cx - half} y={cy - half} width={half * 2} height={half * 2} r={sr(3)} color="rgba(186,230,253,0.3)" />
              )}
              {/* Poisoned overlay */}
              {tower.poisoned && (
                <RoundedRect x={cx - half} y={cy - half} width={half * 2} height={half * 2} r={sr(3)} color="rgba(132,204,22,0.25)" />
              )}
              {/* HP bar */}
              {hpPct < 1 && (
                <Group>
                  <RoundedRect x={barX} y={barY} width={barW} height={barH} r={1} color="rgba(0,0,0,0.5)" />
                  {hpPct > 0 && (
                    <RoundedRect x={barX} y={barY} width={barW * hpPct} height={barH} r={1} color={hpBarColor} />
                  )}
                </Group>
              )}
              {/* Level pips */}
              {Array.from({ length: pipCount }, (_, i) => i).map((i) => (
                <Circle
                  key={i}
                  cx={pipsStartX + i * pipSpacing}
                  cy={pipY}
                  r={pipR}
                  color={i < 5 ? '#FCD34D' : '#F59E0B'}
                />
              ))}
            </Group>
          );
        })}

        {/* ── 16. Targeting highlights ── */}
        {state.targeting &&
          state.targeting.targets.map((tid: string) => {
            const orb = state.orbs.find((o: Orb) => o.id === tid);
            if (!orb) return null;
            const cx = sx(orb.x);
            const cy = sy(orb.y);
            const r = sr(orb.radius + 12);
            return (
              <Group key={`target-${tid}`}>
                <Circle cx={cx} cy={cy} r={r} color="rgba(168,85,247,0.12)" />
                <Circle cx={cx} cy={cy} r={r} color="transparent">
                  <Paint color="rgba(168,85,247,0.8)" style="stroke" strokeWidth={2} />
                </Circle>
              </Group>
            );
          })}

        {/* ── 17. ORBS ── */}
        {state.orbs.map((orb: Orb) => {
          const cx = sx(orb.x);
          const cy = sy(orb.y);
          const r = sr(orb.radius);
          const color = getOrbColor(orb.type);
          const isStealth = orb.stealth || orb.type === 'shadow' || orb.type === 'phantom';
          const orbOpacity = isStealth ? 0.45 : 1;
          const hpPct = orb.maxHp > 0 ? Math.max(0, orb.hp / orb.maxHp) : 1;
          const barW = r * 2.4;
          const barH = sr(3);
          const barX = cx - barW / 2;
          const barY = cy + r + sr(4);
          const hpBarColor = hpColor(hpPct);

          // Spawn scale animation
          const spawnTime = spawnTimes.current.get(orb.id) ?? now;
          const age = now - spawnTime;
          const spawnT = Math.min(age / 300, 1);
          const spawnScale = 0.3 + 0.7 * Math.sin(spawnT * Math.PI / 2);

          // Type-specific decoration
          const lightC = lightenColor(color, 55);
          const darkC = darkenColor(color, 40);

          // HP text
          const hpText = String(Math.ceil(orb.hp));
          const fontSize = Math.max(10, Math.round(r * 0.85));

          return (
            <Group
              key={orb.id}
              opacity={orbOpacity}
              transform={[
                { translateX: cx },
                { translateY: cy },
                { scale: spawnScale },
                { translateX: -cx },
                { translateY: -cy },
              ]}
            >
              {/* Shield bubble aura */}
              {orb.shieldHp != null && orb.shieldHp > 0 && (
                <Group>
                  <Circle cx={cx} cy={cy} r={r + sr(6)} color="rgba(147,197,253,0.25)" />
                  <Circle cx={cx} cy={cy} r={r + sr(6)} color="transparent">
                    <Paint color="rgba(147,197,253,0.6)" style="stroke" strokeWidth={1.5} />
                  </Circle>
                </Group>
              )}

              {/* Orb body with radial gradient */}
              <Circle cx={cx} cy={cy} r={r} color={lightC}>
                <RadialGradient
                  c={vec(cx, cy)}
                  r={r}
                  colors={[lightC + 'E6', darkC + 'B3']}
                />
              </Circle>

              {/* Status overlays */}
              {orb.frozen && (
                <Circle cx={cx} cy={cy} r={r} color="rgba(186,230,253,0.4)">
                  <Paint color="rgba(147,197,253,0.8)" style="stroke" strokeWidth={1.5} />
                </Circle>
              )}
              {orb.poisoned && !orb.frozen && (
                <Circle cx={cx} cy={cy} r={r} color="rgba(132,204,22,0.35)">
                  <Paint color="rgba(132,204,22,0.7)" style="stroke" strokeWidth={1.5} />
                </Circle>
              )}
              {orb.burning && !orb.frozen && !orb.poisoned && (
                <Circle cx={cx} cy={cy} r={r} color="rgba(249,115,22,0.35)">
                  <Paint color="rgba(249,115,22,0.7)" style="stroke" strokeWidth={1.5} />
                </Circle>
              )}

              {/* Type-specific decorations */}
              {orb.type === 'mine' && (
                <Circle cx={cx} cy={cy} r={r * (1.1 + 0.15 * Math.sin(now / 200))} color="transparent">
                  <Paint color="rgba(239,68,68,0.8)" style="stroke" strokeWidth={1.5} />
                </Circle>
              )}
              {orb.type === 'healer' && (
                <Group>
                  <Rect x={cx - r * 0.08} y={cy - r * 0.55} width={r * 0.16} height={r * 0.5} color="rgba(255,255,255,0.9)" />
                  <Rect x={cx - r * 0.28} y={cy - r * 0.42} width={r * 0.56} height={r * 0.16} color="rgba(255,255,255,0.9)" />
                </Group>
              )}
              {orb.type === 'radioactive' && (
                <Circle cx={cx} cy={cy} r={r * (1.05 + 0.1 * Math.sin(now / 250))} color="transparent">
                  <Paint color="rgba(132,204,22,0.6)" style="stroke" strokeWidth={2} />
                </Circle>
              )}
              {(orb.type === 'shadow' || orb.type === 'phantom') && (
                <Group>
                  <Circle cx={cx - r * 0.2} cy={cy} r={r * 0.6} color="rgba(15,23,42,0.5)" />
                  <Circle cx={cx + r * 0.2} cy={cy} r={r * 0.6} color="rgba(30,27,75,0.4)" />
                </Group>
              )}
              {orb.type === 'ice' && (
                <Group>
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const angle = (Math.PI / 3) * i;
                    return (
                      <Line
                        key={i}
                        p1={vec(cx, cy)}
                        p2={vec(cx + Math.cos(angle) * r * 0.75, cy + Math.sin(angle) * r * 0.75)}
                        color="rgba(103,232,249,0.8)"
                        strokeWidth={1.5}
                      />
                    );
                  })}
                </Group>
              )}
              {orb.type === 'zap_orb' && (
                <Group>
                  {[0, 1, 2].map((i) => {
                    const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
                    const boltPath = Skia.Path.Make();
                    const bx = cx + Math.cos(angle) * r * 0.3;
                    const by = cy + Math.sin(angle) * r * 0.3;
                    const ex = cx + Math.cos(angle) * r * 0.9;
                    const ey = cy + Math.sin(angle) * r * 0.9;
                    const mx = (bx + ex) / 2 + Math.cos(angle + Math.PI / 2) * r * 0.2;
                    const my = (by + ey) / 2 + Math.sin(angle + Math.PI / 2) * r * 0.2;
                    boltPath.moveTo(bx, by);
                    boltPath.lineTo(mx, my);
                    boltPath.lineTo(ex, ey);
                    return <Path key={i} path={boltPath} color="rgba(59,130,246,0.9)" style="stroke" strokeWidth={1.5} />;
                  })}
                </Group>
              )}
              {orb.type === 'armored' && (
                <Path path={makeHexPath(cx, cy, r * 0.75)} color="transparent">
                  <Paint color="rgba(100,116,139,0.7)" style="stroke" strokeWidth={1.5} />
                </Path>
              )}
              {orb.type === 'berserker' && (() => {
                const crackIntensity = 1 - hpPct;
                const crackCount = Math.floor(2 + crackIntensity * 4);
                return (
                  <Group>
                    {Array.from({ length: crackCount }, (_, i) => {
                      const angle = (Math.PI * 2 / crackCount) * i + i * 0.3;
                      const crackPath = Skia.Path.Make();
                      crackPath.moveTo(cx, cy);
                      crackPath.lineTo(
                        cx + Math.cos(angle) * r * 0.5,
                        cy + Math.sin(angle) * r * 0.5
                      );
                      crackPath.lineTo(
                        cx + Math.cos(angle + 0.3) * r * 0.85,
                        cy + Math.sin(angle + 0.3) * r * 0.85
                      );
                      return (
                        <Path
                          key={i}
                          path={crackPath}
                          color={`rgba(220,38,38,${(0.4 + crackIntensity * 0.5).toFixed(2)})`}
                          style="stroke"
                          strokeWidth={1.5}
                        />
                      );
                    })}
                  </Group>
                );
              })()}
              {orb.type === 'leech' && (
                <Circle cx={cx} cy={cy} r={r * (1.05 + 0.1 * Math.sin(now / 300))} color="transparent">
                  <Paint color="rgba(190,18,60,0.6)" style="stroke" strokeWidth={2} />
                </Circle>
              )}
              {orb.type === 'summoner' && (
                <Group>
                  <Circle cx={cx} cy={cy} r={r * (0.7 + 0.15 * Math.sin(now / 400))} color="transparent">
                    <Paint color="rgba(124,58,237,0.4)" style="stroke" strokeWidth={1.5} />
                  </Circle>
                  <Circle cx={cx} cy={cy} r={r * (0.45 + 0.1 * Math.sin(now / 300 + 1))} color="transparent">
                    <Paint color="rgba(124,58,237,0.3)" style="stroke" strokeWidth={1} />
                  </Circle>
                </Group>
              )}
              {orb.type === 'growth' && (
                <Circle cx={cx} cy={cy} r={r * (1.08 + 0.12 * Math.sin(now / 350))} color="transparent">
                  <Paint color="rgba(22,163,74,0.5)" style="stroke" strokeWidth={2} />
                </Circle>
              )}
              {(orb.type === 'splitter' || orb.type === 'carrier') && (
                <Group>
                  {[-1, 0, 1].map((i) => (
                    <Circle
                      key={i}
                      cx={cx + i * r * 0.35}
                      cy={cy + (i === 0 ? -r * 0.25 : r * 0.15)}
                      r={r * 0.2}
                      color="rgba(255,255,255,0.35)"
                    />
                  ))}
                </Group>
              )}
              {orb.type === 'swarmer' && (
                <Group>
                  {[0, 1, 2].map((i) => {
                    const angle = (Math.PI * 2 / 3) * i + now / 600;
                    return (
                      <Circle
                        key={i}
                        cx={cx + Math.cos(angle) * r * 0.65}
                        cy={cy + Math.sin(angle) * r * 0.65}
                        r={r * 0.18}
                        color="rgba(168,85,247,0.8)"
                      />
                    );
                  })}
                </Group>
              )}
              {orb.type === 'tank' && (
                <Group>
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const angle = (Math.PI / 3) * i;
                    const px = cx + Math.cos(angle) * r * 0.82;
                    const py = cy + Math.sin(angle) * r * 0.82;
                    return (
                      <Rect
                        key={i}
                        x={px - r * 0.12}
                        y={py - r * 0.22}
                        width={r * 0.24}
                        height={r * 0.44}
                        color="rgba(55,65,81,0.85)"
                      />
                    );
                  })}
                </Group>
              )}
              {orb.type === 'bomb' && (
                <Group>
                  <Circle cx={cx} cy={cy - r * 0.85} r={r * 0.12} color="#FCD34D" />
                </Group>
              )}

              {/* Gloss highlight */}
              <Circle
                cx={cx - r * 0.25}
                cy={cy - r * 0.3}
                r={r * 0.45}
                color="transparent"
              >
                <RadialGradient
                  c={vec(cx - r * 0.25, cy - r * 0.3)}
                  r={r * 0.45}
                  colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
                />
              </Circle>

              {/* HP text */}
              {font && orb.hp > 0 && (
                <SkiaText
                  x={cx - (hpText.length * fontSize * 0.32)}
                  y={cy + fontSize * 0.38}
                  text={hpText}
                  font={font}
                  color="#FFFFFF"
                />
              )}

              {/* HP bar (only if damaged) */}
              {orb.hp < orb.maxHp && (
                <Group>
                  <RoundedRect x={barX} y={barY} width={barW} height={barH} r={1} color="rgba(0,0,0,0.5)" />
                  {hpPct > 0 && (
                    <RoundedRect x={barX} y={barY} width={barW * hpPct} height={barH} r={1} color={hpBarColor} />
                  )}
                </Group>
              )}
            </Group>
          );
        })}

        {/* ── 18. Coin pickups ── */}
        {state.coinPickups.map((coin: CoinPickup) => {
          const cx = sx(coin.x);
          const cy = sy(coin.y);
          const r = sr(8);
          const glowR = r * (1 + 0.1 * Math.sin(now / 300 + coin.x));
          return (
            <Group key={coin.id}>
              {/* Outer glow */}
              <Circle cx={cx} cy={cy} r={glowR * 1.5} color="rgba(252,211,77,0.15)" />
              {/* Main body */}
              <Circle cx={cx} cy={cy} r={r} color="#FCD34D">
                <RadialGradient c={vec(cx - r * 0.2, cy - r * 0.2)} r={r} colors={['#FDE68A', '#F59E0B']} />
              </Circle>
              {/* Gloss */}
              <Circle cx={cx - r * 0.2} cy={cy - r * 0.25} r={r * 0.35} color="transparent">
                <RadialGradient
                  c={vec(cx - r * 0.2, cy - r * 0.25)}
                  r={r * 0.35}
                  colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
                />
              </Circle>
            </Group>
          );
        })}

        {/* ── 19. Projectiles with trails ── */}
        {state.projectiles.map((proj: Projectile) => {
          const cx = sx(proj.x);
          const cy = sy(proj.y);
          const r = Math.max(2, sr(proj.radius));
          const trailR = Math.max(1, r * 0.6);
          return (
            <Group key={proj.id}>
              {/* Trail */}
              {proj.trail.map((pt, i) => {
                const trailAlpha = (i / Math.max(1, proj.trail.length)) * 0.4;
                return (
                  <Circle
                    key={i}
                    cx={sx(pt.x)}
                    cy={sy(pt.y)}
                    r={trailR}
                    color={proj.color}
                    opacity={trailAlpha}
                  />
                );
              })}
              {/* Main projectile */}
              <Circle cx={cx} cy={cy} r={r} color={proj.color}>
                <RadialGradient c={vec(cx, cy)} r={r} colors={[proj.color + 'FF', proj.color + '88']} />
              </Circle>
            </Group>
          );
        })}

        {/* ── 20. Glue puddle borders ── */}
        {state.glues.map((g: GlueState) => (
          <Circle key={`gb-${g.id}`} cx={sx(g.x)} cy={sy(g.y)} r={sr(g.radius)} color="transparent">
            <Paint color="rgba(101,163,13,0.5)" style="stroke" strokeWidth={1.5} />
          </Circle>
        ))}

        {/* ── 21. Zone borders ── */}
        {state.zones.map((z: ZoneState) => {
          const zBorder =
            z.type === 'damage' ? 'rgba(239,68,68,0.7)' :
            z.type === 'slow'   ? 'rgba(96,165,250,0.7)' :
                                  'rgba(34,197,94,0.7)';
          return (
            <Circle key={`zb-${z.id}`} cx={sx(z.x)} cy={sy(z.y)} r={sr(z.radius)} color="transparent">
              <Paint color={zBorder} style="stroke" strokeWidth={1.5} />
            </Circle>
          );
        })}

        {/* ── 22. Meteors ── */}
        {state.meteors.map((meteor: MeteorState) => {
          const startX = sx(meteor.x);
          const startY = sy(-80);
          const endX = sx(meteor.targetX);
          const endY = sy(meteor.targetY);
          const curX = startX + (endX - startX) * meteor.progress;
          const curY = startY + (endY - startY) * meteor.progress;
          const r = Math.max(5, sr(meteor.radius * 0.18));
          return (
            <Group key={meteor.id}>
              {/* Impact ring at target */}
              <Circle cx={endX} cy={endY} r={sr(meteor.radius * 0.5)} color="transparent">
                <Paint color="rgba(239,68,68,0.2)" style="stroke" strokeWidth={1} />
              </Circle>
              {/* Fire trail */}
              {[0.85, 0.7, 0.55, 0.4, 0.25].map((t, i) => {
                const tx = startX + (endX - startX) * (meteor.progress - t * 0.08);
                const ty = startY + (endY - startY) * (meteor.progress - t * 0.08);
                const trailAlpha = (1 - t) * 0.5;
                return (
                  <Circle
                    key={i}
                    cx={tx}
                    cy={ty}
                    r={r * (0.4 + t * 0.6)}
                    color={`rgba(249,115,22,${trailAlpha.toFixed(2)})`}
                  />
                );
              })}
              {/* Main fireball */}
              <Circle cx={curX} cy={curY} r={r} color="#F97316">
                <RadialGradient c={vec(curX, curY)} r={r} colors={['#FDE68A', '#DC2626']} />
              </Circle>
            </Group>
          );
        })}

        {/* ── 23. Effects ── */}
        {state.effects.map((effect: Effect) => {
          const cx = sx(effect.x);
          const cy = sy(effect.y);
          const alpha = Math.max(0, effect.timer / effect.maxTimer);
          const progress = 1 - alpha;
          const baseR = sr(effect.radius ?? 30);
          const effectColor = effect.color ?? '#F97316';

          if (effect.type === 'explosion' || effect.type === 'station_hit') {
            const r = baseR * (0.3 + progress * 0.7);
            return (
              <Group key={effect.id}>
                <Circle cx={cx} cy={cy} r={r} color={effectColor + alphaHex(alpha * 0.5)} />
                <Circle cx={cx} cy={cy} r={r} color="transparent">
                  <Paint color={effectColor + alphaHex(alpha * 0.8)} style="stroke" strokeWidth={2} />
                </Circle>
                {/* Particle rays */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                  const angle = (Math.PI * 2 / 8) * i;
                  const rayPath = Skia.Path.Make();
                  rayPath.moveTo(cx + Math.cos(angle) * r * 0.5, cy + Math.sin(angle) * r * 0.5);
                  rayPath.lineTo(cx + Math.cos(angle) * r * 1.2, cy + Math.sin(angle) * r * 1.2);
                  return (
                    <Path
                      key={i}
                      path={rayPath}
                      color={effectColor + alphaHex(alpha * 0.7)}
                      style="stroke"
                      strokeWidth={1.5}
                    />
                  );
                })}
              </Group>
            );
          }

          if (effect.type === 'freeze') {
            const r = baseR * (0.5 + progress * 0.5);
            return (
              <Group key={effect.id}>
                <Circle cx={cx} cy={cy} r={r} color={`rgba(186,230,253,${(alpha * 0.25).toFixed(3)})`} />
                <Circle cx={cx} cy={cy} r={r} color="transparent">
                  <Paint color={`rgba(147,197,253,${(alpha * 0.7).toFixed(3)})`} style="stroke" strokeWidth={2} />
                </Circle>
              </Group>
            );
          }

          if (effect.type === 'lightning') {
            return (
              <Circle
                key={effect.id}
                cx={cx}
                cy={cy}
                r={baseR * 0.35}
                color={`rgba(253,230,138,${alpha.toFixed(3)})`}
              />
            );
          }

          if (effect.type === 'zone') {
            return (
              <Circle
                key={effect.id}
                cx={cx}
                cy={cy}
                r={baseR * (0.5 + progress * 0.5)}
                color={effectColor + alphaHex(alpha * 0.35)}
              />
            );
          }

          return (
            <Circle
              key={effect.id}
              cx={cx}
              cy={cy}
              r={baseR * 0.4}
              color={effectColor + alphaHex(alpha * 0.6)}
            />
          );
        })}

        {/* ── 24. Particles ── */}
        {state.particles.map((p: Particle) => {
          const alpha = Math.max(0, p.alpha);
          if (alpha <= 0) return null;
          return (
            <Circle
              key={p.id}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={Math.max(1, sr(p.radius))}
              color={p.color}
              opacity={alpha}
            />
          );
        })}

        {/* ── 26. Aiming overlay ── */}
        {state.aiming && (
          <Group>
            <Circle cx={sx(state.aiming.x)} cy={sy(state.aiming.y)} r={sr(70)} color="rgba(79,142,247,0.12)" />
            <Circle cx={sx(state.aiming.x)} cy={sy(state.aiming.y)} r={sr(70)} color="transparent">
              <Paint color="rgba(79,142,247,0.7)" style="stroke" strokeWidth={2} />
            </Circle>
            <Line
              p1={vec(sx(state.aiming.x) - sr(44), sy(state.aiming.y))}
              p2={vec(sx(state.aiming.x) + sr(44), sy(state.aiming.y))}
              color="rgba(79,142,247,0.7)"
              strokeWidth={2}
            />
            <Line
              p1={vec(sx(state.aiming.x), sy(state.aiming.y) - sr(44))}
              p2={vec(sx(state.aiming.x), sy(state.aiming.y) + sr(44))}
              color="rgba(79,142,247,0.7)"
              strokeWidth={2}
            />
          </Group>
        )}

        {/* ── 27. Escalation border ── */}
        {state.escalationTier !== 'none' && (
          <Rect x={0} y={0} width={width} height={height} color="transparent">
            <Paint color={escalationColor + '55'} style="stroke" strokeWidth={6} />
          </Rect>
        )}

      </Group>
    </Canvas>
  );

  // ── RN overlays (floaters, combo, escalation banner) ──────────────────────
  const comboOpacity = Math.min(1, state.comboTimer / 500);
  const showCombo = state.combo >= 2 && state.comboTimer > 0;
  const showEscalation = state.escalationTier !== 'none';

  const overlays = (
    <>
      {/* 25. Floaters */}
      {state.floaters.map((floater: Floater) => {
        const alpha = Math.max(0, floater.timer / floater.maxTimer);
        if (alpha <= 0) return null;
        const cx = sx(floater.x);
        const cy = sy(floater.y);
        return (
          <Text
            key={floater.id}
            style={{
              position: 'absolute',
              left: cx - 24,
              top: cy - floater.fontSize / 2,
              width: 48,
              textAlign: 'center',
              fontSize: Math.max(8, floater.fontSize * 0.8),
              fontWeight: '800',
              color: floater.color,
              opacity: alpha,
              pointerEvents: 'none',
            }}
          >
            {floater.text}
          </Text>
        );
      })}

      {/* 29. Escalation banner */}
      {showEscalation && (
        <View
          style={{
            position: 'absolute',
            left: width * 0.15,
            top: height * 0.455,
            width: width * 0.7,
            height: 28,
            backgroundColor: escalationColor + '26',
            borderWidth: 1,
            borderColor: escalationColor + '80',
            borderRadius: 6,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
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

      {/* 28. Combo display */}
      {showCombo && (
        <View
          style={{
            position: 'absolute',
            left: width / 2 - 44,
            top: wallY + (height - wallY) * 0.28,
            width: 88,
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: '900',
              color: '#FCD34D',
              opacity: comboOpacity,
            }}
          >
            {state.combo}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '900',
              color: '#FCD34D',
              opacity: comboOpacity,
              letterSpacing: 1,
            }}
          >
            x COMBO
          </Text>
        </View>
      )}
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <Pressable
        style={{ width, height, overflow: 'hidden' }}
        onPress={(e) => {
          const tapX = e.nativeEvent.locationX;
          const tapY = e.nativeEvent.locationY;
          const gameX = (tapX / width) * GAME_WIDTH;
          const gameY = (tapY / height) * GAME_HEIGHT;

          console.log('[GameCanvas] web tap at canvas', tapX.toFixed(1), tapY.toFixed(1), '→ game', gameX.toFixed(1), gameY.toFixed(1));

          let tappedOrb: Orb | null = null;
          for (const orb of state.orbs) {
            const ox = sx(orb.x);
            const oy = sy(orb.y);
            const r = sr(orb.radius) + 6;
            const dx = tapX - ox;
            const dy = tapY - oy;
            if (dx * dx + dy * dy <= r * r) {
              tappedOrb = orb;
              break;
            }
          }

          if (tappedOrb) {
            console.log('[GameCanvas] web tapped orb', tappedOrb.id, tappedOrb.type);
            onOrbTap(tappedOrb.id);
          } else {
            console.log('[GameCanvas] web tapped field at game coords', gameX.toFixed(1), gameY.toFixed(1));
            onFieldTap(gameX, gameY);
          }
        }}
      >
        {canvasContent}
        {overlays}
      </Pressable>
    );
  }

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={{ width, height, overflow: 'hidden' }}>
        {canvasContent}
        {overlays}
      </View>
    </GestureDetector>
  );
});

export default GameCanvasInner;
