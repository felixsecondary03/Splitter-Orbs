import React, { useRef, useState, useEffect } from 'react';
import { Platform, Pressable, View, Text } from 'react-native';
import {
  Canvas,
  Picture,
  Skia,
  PaintStyle,
  BlurStyle,
  StrokeCap,
  StrokeJoin,
  TileMode,
  ClipOp,
  useFont,
} from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint, SkPicture, SkFont } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WALL_Y,
  WALL_THICKNESS,
  TOWER_TYPES,
  GRID_SIZE,
  PLAYER_STATION_X,
  PLAYER_STATION_Y,
  OPP_STATION_X,
  OPP_STATION_Y,
} from '@/game/constants';
import { getTowerColor, getTowerRange } from '@/game/engine-helpers';
import { STATION_SKINS, TOWER_SKINS } from '@/game/skins';
import type {
  GameState,
  Orb,
  Tower,
  SideTower,
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

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GameCanvasProps {
  state: GameState;
  width: number;
  height: number;
  onOrbTap: (orbId: string) => void;
  onFieldTap: (x: number, y: number) => void;
  onTowerTap?: (towerId: string) => void;
  onCoinTap?: (coinId: string) => void;
  isAiming?: boolean;
  aimingAbility?: string | null;
  placingTower?: string | null;
  previewPos?: { x: number; y: number } | null;
  editMode?: boolean;
  selectedTower?: string | null;
  playerSkins?: Record<string, string>;
  oppSkins?: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hpColor(pct: number): string {
  if (pct > 0.6) return '#22C55E';
  if (pct > 0.3) return '#F59E0B';
  return '#EF4444';
}

function snapToGrid(gx: number, gy: number): { col: number; row: number; x: number; y: number } {
  const col = Math.round(gx / GRID_SIZE);
  const row = Math.round(gy / GRID_SIZE);
  return { col, row, x: col * GRID_SIZE, y: row * GRID_SIZE };
}

function getTowerStats(type: string, level: number) {
  const range = getTowerRange(type as any, level);
  return { range };
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

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawHealthBar(
  canvas: SkCanvas,
  cx: number,
  y: number,
  w: number,
  hp: number,
  maxHp: number,
  color: string,
  p: SkPaint,
) {
  const pct = maxHp > 0 ? Math.max(0, hp / maxHp) : 0;
  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color('rgba(15,23,42,0.12)'));
  canvas.drawRect(Skia.XYWHRect(cx - w / 2, y, w, 6), p);
  if (pct > 0) {
    p.setColor(Skia.Color(color));
    canvas.drawRect(Skia.XYWHRect(cx - w / 2, y, w * pct, 6), p);
  }
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1);
  p.setColor(Skia.Color('rgba(15,23,42,0.25)'));
  canvas.drawRect(Skia.XYWHRect(cx - w / 2 + 0.5, y + 0.5, w - 1, 5), p);
  p.setStyle(PaintStyle.Fill);
}

function drawLightning(
  canvas: SkCanvas,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  p: SkPaint,
) {
  const path = Skia.Path.Make();
  path.moveTo(x1, y1);
  const segments = 6;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const mx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 20;
    const my = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 20;
    path.lineTo(mx, my);
  }
  path.lineTo(x2, y2);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(2);
  p.setColor(Skia.Color('rgba(253,230,138,0.9)'));
  canvas.drawPath(path, p);
  p.setStyle(PaintStyle.Fill);
}

function drawWall(canvas: SkCanvas, p: SkPaint) {
  const y = WALL_Y - WALL_THICKNESS / 2;
  const h = WALL_THICKNESS;

  // Shadow
  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color('rgba(15,23,42,0.2)'));
  canvas.drawRect(Skia.XYWHRect(0, y + h, GAME_WIDTH, 9), p);

  // Gradient body
  const shader = Skia.Shader.MakeLinearGradient(
    { x: 0, y },
    { x: 0, y: y + h },
    [
      Skia.Color('#a8a29e'),
      Skia.Color('#78716c'),
      Skia.Color('#57534e'),
      Skia.Color('#44403c'),
    ],
    [0, 0.25, 0.75, 1],
    TileMode.Clamp,
  );
  p.setShader(shader);
  canvas.drawRect(Skia.XYWHRect(0, y, GAME_WIDTH, h), p);
  p.setShader(null);

  // Top highlight
  p.setColor(Skia.Color('rgba(255,255,255,0.35)'));
  canvas.drawRect(Skia.XYWHRect(0, y, GAME_WIDTH, 2), p);

  // Bottom shadow
  p.setColor(Skia.Color('rgba(0,0,0,0.4)'));
  canvas.drawRect(Skia.XYWHRect(0, y + h - 2, GAME_WIDTH, 2), p);

  // Mortar lines
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1.5);
  p.setColor(Skia.Color('rgba(15,23,42,0.5)'));
  const segW = 50;
  const midPath = Skia.Path.Make();
  midPath.moveTo(0, y + h / 2);
  midPath.lineTo(GAME_WIDTH, y + h / 2);
  canvas.drawPath(midPath, p);

  for (let x = 0; x <= GAME_WIDTH; x += segW) {
    const vPath = Skia.Path.Make();
    vPath.moveTo(x, y);
    vPath.lineTo(x, y + h / 2);
    canvas.drawPath(vPath, p);
  }
  for (let x = -segW / 2; x <= GAME_WIDTH; x += segW) {
    const vPath2 = Skia.Path.Make();
    vPath2.moveTo(x + segW / 2, y + h / 2);
    vPath2.lineTo(x + segW / 2, y + h);
    canvas.drawPath(vPath2, p);
  }

  // Green base
  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color('rgba(34,197,94,0.2)'));
  canvas.drawRect(Skia.XYWHRect(0, y + h - 3, GAME_WIDTH, 3), p);
}

function drawStation(
  canvas: SkCanvas,
  pos: { x: number; y: number },
  hp: number,
  maxHp: number,
  color: string,
  shielded: boolean,
  flash: number,
  side: 'top' | 'bottom',
  skinId: string | undefined,
  p: SkPaint,
) {
  const flip = side === 'top';
  const x = pos.x;
  const y = pos.y;
  const dir = flip ? 1 : -1;

  const skin = STATION_SKINS[skinId || 'default'] || STATION_SKINS['default'];
  const body = skin.body;
  const trim = skin.trim;

  // Shadow ellipse
  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color('rgba(15,23,42,0.22)'));
  const shadowPath = Skia.Path.Make();
  shadowPath.addOval(Skia.XYWHRect(x - 34, y + (flip ? -28 : 30) - 7, 68, 14));
  canvas.drawPath(shadowPath, p);

  // Body gradient
  const bodyShader = Skia.Shader.MakeLinearGradient(
    { x: x - 28, y },
    { x: x + 28, y },
    [Skia.Color(body[0]), Skia.Color(body[1]), Skia.Color(body[2])],
    [0, 0.5, 1],
    TileMode.Clamp,
  );
  p.setShader(bodyShader);
  canvas.drawRect(Skia.XYWHRect(x - 26, y - 18, 52, 36), p);
  p.setShader(null);

  // Top highlight
  p.setColor(Skia.Color('rgba(255,255,255,0.25)'));
  canvas.drawRect(Skia.XYWHRect(x - 26, y - 18, 52, 3), p);

  // Bottom shadow
  p.setColor(Skia.Color('rgba(15,23,42,0.3)'));
  canvas.drawRect(Skia.XYWHRect(x - 26, y + 15, 52, 3), p);

  // Stone lines
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1);
  p.setColor(Skia.Color('rgba(15,23,42,0.25)'));
  const stonePath = Skia.Path.Make();
  stonePath.moveTo(x - 26, y);
  stonePath.lineTo(x + 26, y);
  stonePath.moveTo(x - 10, y - 18);
  stonePath.lineTo(x - 10, y);
  stonePath.moveTo(x + 10, y - 18);
  stonePath.lineTo(x + 10, y);
  stonePath.moveTo(x - 10, y);
  stonePath.lineTo(x - 10, y + 18);
  stonePath.moveTo(x + 10, y);
  stonePath.lineTo(x + 10, y + 18);
  canvas.drawPath(stonePath, p);

  // Battlements
  const battY = y + dir * 20;
  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color(trim));
  for (const dx of [-16, 0, 16]) {
    canvas.drawRect(Skia.XYWHRect(x + dx - 5, battY - 4, 10, 8), p);
  }

  // Flag pole
  const poleX = x + 22;
  const poleTop = y + dir * 34;
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(2);
  p.setColor(Skia.Color('#475569'));
  const polePath = Skia.Path.Make();
  polePath.moveTo(poleX, y);
  polePath.lineTo(poleX, poleTop);
  canvas.drawPath(polePath, p);

  // Flag
  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color(color));
  const flagPath = Skia.Path.Make();
  flagPath.moveTo(poleX, poleTop);
  flagPath.lineTo(poleX + 14, poleTop + dir * 4);
  flagPath.lineTo(poleX, poleTop + dir * 9);
  flagPath.close();
  canvas.drawPath(flagPath, p);

  // Glowing orb center
  p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 6, true));
  p.setColor(Skia.Color(color));
  const orbPath = Skia.Path.Make();
  orbPath.addCircle(x, y, 9);
  canvas.drawPath(orbPath, p);
  p.setMaskFilter(null);

  p.setColor(Skia.Color(color));
  canvas.drawCircle(x, y, 9, p);

  // Orb highlight
  p.setColor(Skia.Color('rgba(255,255,255,0.55)'));
  canvas.drawCircle(x - 3, y - 3, 3, p);

  // Flash overlay
  if (flash > 0) {
    p.setColor(Skia.Color(`rgba(244,63,94,${Math.min(0.6, flash).toFixed(3)})`));
    canvas.drawRect(Skia.XYWHRect(x - 26, y - 18, 52, 36), p);
  }

  // Shield dome
  if (shielded) {
    p.setColor(Skia.Color('rgba(96,165,250,0.2)'));
    canvas.drawCircle(x, y, 44, p);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('rgba(96,165,250,0.6)'));
    canvas.drawCircle(x, y, 44, p);
    p.setStyle(PaintStyle.Fill);
  }

  // HP bar
  const barY = flip ? y - 34 : y + 34;
  drawHealthBar(canvas, x, barY, 60, hp, maxHp, color, p);
}

function drawSideTower(
  canvas: SkCanvas,
  st: SideTower,
  color: string,
  side: 'top' | 'bottom',
  p: SkPaint,
) {
  const x = st.x;
  const y = st.y;
  const half = 11;
  const towerColor = st.frozen ? '#BAE6FD' : color;

  // Body
  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color('rgba(71,85,105,0.9)'));
  canvas.drawRect(Skia.XYWHRect(x - half, y - half, half * 2, half * 2), p);

  // Border
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1.5);
  p.setColor(Skia.Color(towerColor));
  canvas.drawRect(Skia.XYWHRect(x - half, y - half, half * 2, half * 2), p);

  // Battlements
  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color('rgba(71,85,105,0.9)'));
  const battDir = side === 'top' ? 1 : -1;
  for (const i of [-1, 0, 1]) {
    canvas.drawRect(
      Skia.XYWHRect(x + i * half * 0.6 - half * 0.18, y + battDir * half - 3, half * 0.36, 4),
      p,
    );
  }

  // HP bar
  const barY = side === 'top' ? y + half + 4 : y - half - 7;
  drawHealthBar(canvas, x, barY, half * 2.4, st.hp, st.maxHp, towerColor, p);
}

function drawTowerBody(
  canvas: SkCanvas,
  x: number,
  y: number,
  half: number,
  level: number,
  skinId: string | undefined,
  p: SkPaint,
) {
  const skin = TOWER_SKINS[skinId || 'default'] || TOWER_SKINS['default'];
  const body = skin.body;

  const bodyShader = Skia.Shader.MakeLinearGradient(
    { x: x - half, y: y - half },
    { x: x + half, y: y + half },
    [Skia.Color(body[0]), Skia.Color(body[1]), Skia.Color(body[2])],
    [0, 0.5, 1],
    TileMode.Clamp,
  );
  p.setStyle(PaintStyle.Fill);
  p.setShader(bodyShader);
  canvas.drawRect(Skia.XYWHRect(x - half, y - half, half * 2, half * 2), p);
  p.setShader(null);

  // Highlight
  p.setColor(Skia.Color('rgba(255,255,255,0.15)'));
  canvas.drawRect(Skia.XYWHRect(x - half, y - half, half * 2, 3), p);

  // Level pips
  const pipCount = Math.min(level, 6);
  const pipR = 2.5;
  const pipSpacing = 6;
  const pipsStartX = x - ((pipCount - 1) * pipSpacing) / 2;
  const pipY = y + half + 6;
  for (let i = 0; i < pipCount; i++) {
    p.setColor(Skia.Color(i < 5 ? '#FCD34D' : '#F59E0B'));
    canvas.drawCircle(pipsStartX + i * pipSpacing, pipY, pipR, p);
  }
}

function drawTowerTop(
  canvas: SkCanvas,
  type: string,
  x: number,
  y: number,
  half: number,
  color: string,
  p: SkPaint,
) {
  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color(color));

  switch (type) {
    case 'basic': {
      const path = Skia.Path.Make();
      path.moveTo(x - half * 0.4, y - half * 0.1);
      path.lineTo(x, y - half * 1.1);
      path.lineTo(x + half * 0.4, y - half * 0.1);
      path.close();
      canvas.drawPath(path, p);
      break;
    }
    case 'sniper': {
      canvas.drawRect(Skia.XYWHRect(x - half * 0.12, y - half * 1.5, half * 0.24, half * 1.4), p);
      break;
    }
    case 'machinegun': {
      for (let i = -1; i <= 1; i++) {
        canvas.drawRect(
          Skia.XYWHRect(x + i * half * 0.35 - half * 0.08, y - half * 0.9, half * 0.16, half * 0.8),
          p,
        );
      }
      break;
    }
    case 'twin': {
      canvas.drawRect(Skia.XYWHRect(x - half * 0.35, y - half * 1.0, half * 0.22, half * 0.9), p);
      canvas.drawRect(Skia.XYWHRect(x + half * 0.13, y - half * 1.0, half * 0.22, half * 0.9), p);
      break;
    }
    case 'bomb': {
      canvas.drawCircle(x, y - half * 0.7, half * 0.45, p);
      canvas.drawRect(Skia.XYWHRect(x - half * 0.06, y - half * 1.2, half * 0.12, half * 0.2), p);
      break;
    }
    case 'bouncer': {
      canvas.drawCircle(x, y - half * 0.8, half * 0.4, p);
      break;
    }
    case 'glacier': {
      // 6-pointed star
      const starPath = Skia.Path.Make();
      const cx2 = x;
      const cy2 = y - half * 0.6;
      const outerR = half * 0.55;
      const innerR = half * 0.25;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI / 6) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx2 + r * Math.cos(angle);
        const py = cy2 + r * Math.sin(angle);
        if (i === 0) starPath.moveTo(px, py);
        else starPath.lineTo(px, py);
      }
      starPath.close();
      canvas.drawPath(starPath, p);
      break;
    }
    case 'arc': {
      const arcPath = Skia.Path.Make();
      arcPath.moveTo(x + half * 0.2, y - half * 1.1);
      arcPath.lineTo(x - half * 0.05, y - half * 0.55);
      arcPath.lineTo(x + half * 0.15, y - half * 0.55);
      arcPath.lineTo(x - half * 0.2, y - half * 0.0);
      arcPath.lineTo(x + half * 0.05, y - half * 0.55);
      arcPath.lineTo(x - half * 0.15, y - half * 0.55);
      arcPath.close();
      canvas.drawPath(arcPath, p);
      break;
    }
    case 'pyre': {
      for (let i = -1; i <= 1; i++) {
        const fx = x + i * half * 0.35;
        const firePath = Skia.Path.Make();
        firePath.moveTo(fx, y - half * 0.1);
        firePath.cubicTo(fx - half * 0.2, y - half * 0.5, fx - half * 0.15, y - half * 0.9, fx, y - half * 1.1);
        firePath.cubicTo(fx + half * 0.15, y - half * 0.9, fx + half * 0.2, y - half * 0.5, fx, y - half * 0.1);
        canvas.drawPath(firePath, p);
      }
      break;
    }
    case 'venom': {
      const venomPath = Skia.Path.Make();
      venomPath.moveTo(x - half * 0.35, y - half * 0.9);
      venomPath.lineTo(x - half * 0.15, y - half * 0.1);
      venomPath.lineTo(x + half * 0.05, y - half * 0.9);
      venomPath.moveTo(x - half * 0.05, y - half * 0.9);
      venomPath.lineTo(x + half * 0.15, y - half * 0.1);
      venomPath.lineTo(x + half * 0.35, y - half * 0.9);
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(2);
      canvas.drawPath(venomPath, p);
      p.setStyle(PaintStyle.Fill);
      break;
    }
    case 'siege': {
      canvas.drawRect(Skia.XYWHRect(x - half * 0.45, y - half * 1.0, half * 0.9, half * 0.9), p);
      break;
    }
    case 'orb_mortar':
    case 'lava_mortar': {
      canvas.drawRect(Skia.XYWHRect(x - half * 0.4, y - half * 0.7, half * 0.8, half * 0.6), p);
      break;
    }
    case 'repulsor': {
      const repPath = Skia.Path.Make();
      repPath.moveTo(x - half * 0.1, y - half * 0.8);
      repPath.lineTo(x - half * 0.5, y - half * 0.4);
      repPath.lineTo(x - half * 0.3, y - half * 0.4);
      repPath.lineTo(x - half * 0.3, y - half * 0.1);
      repPath.lineTo(x - half * 0.1, y - half * 0.1);
      repPath.close();
      repPath.moveTo(x + half * 0.1, y - half * 0.8);
      repPath.lineTo(x + half * 0.5, y - half * 0.4);
      repPath.lineTo(x + half * 0.3, y - half * 0.4);
      repPath.lineTo(x + half * 0.3, y - half * 0.1);
      repPath.lineTo(x + half * 0.1, y - half * 0.1);
      repPath.close();
      canvas.drawPath(repPath, p);
      break;
    }
    case 'cryo': {
      canvas.drawRect(Skia.XYWHRect(x - half * 0.5, y - half * 0.8, half, half * 0.7), p);
      canvas.drawRect(Skia.XYWHRect(x - half * 0.6, y - half * 0.85, half * 0.15, half * 0.8), p);
      canvas.drawRect(Skia.XYWHRect(x + half * 0.45, y - half * 0.85, half * 0.15, half * 0.8), p);
      break;
    }
    case 'seeker': {
      canvas.drawCircle(x, y - half * 0.6, half * 0.45, p);
      canvas.drawRect(Skia.XYWHRect(x - half * 0.5, y - half * 0.63, half, half * 0.06), p);
      canvas.drawRect(Skia.XYWHRect(x - half * 0.03, y - half * 1.1, half * 0.06, half), p);
      break;
    }
    case 'prism': {
      const prismPath = Skia.Path.Make();
      prismPath.moveTo(x, y - half * 1.1);
      prismPath.lineTo(x + half * 0.5, y - half * 0.6);
      prismPath.lineTo(x, y - half * 0.1);
      prismPath.lineTo(x - half * 0.5, y - half * 0.6);
      prismPath.close();
      canvas.drawPath(prismPath, p);
      break;
    }
    case 'flak': {
      const flakPath = Skia.Path.Make();
      flakPath.moveTo(x - half * 0.2, y - half * 0.9);
      flakPath.lineTo(x - half * 0.5, y - half * 0.1);
      flakPath.lineTo(x + half * 0.5, y - half * 0.1);
      flakPath.lineTo(x + half * 0.2, y - half * 0.9);
      flakPath.close();
      canvas.drawPath(flakPath, p);
      break;
    }
    case 'harpoon': {
      const harpPath = Skia.Path.Make();
      harpPath.moveTo(x, y - half * 1.2);
      harpPath.lineTo(x + half * 0.2, y - half * 0.6);
      harpPath.lineTo(x, y - half * 0.1);
      harpPath.lineTo(x - half * 0.2, y - half * 0.6);
      harpPath.close();
      canvas.drawPath(harpPath, p);
      break;
    }
    case 'boomerang':
    case 'rebound': {
      const boomPath = Skia.Path.Make();
      boomPath.moveTo(x - half * 0.6, y - half * 0.2);
      boomPath.cubicTo(x - half * 0.5, y - half * 1.1, x + half * 0.5, y - half * 1.1, x + half * 0.6, y - half * 0.2);
      boomPath.cubicTo(x + half * 0.4, y - half * 0.8, x - half * 0.4, y - half * 0.8, x - half * 0.6, y - half * 0.2);
      boomPath.close();
      canvas.drawPath(boomPath, p);
      break;
    }
    case 'tesla': {
      const teslaPath = Skia.Path.Make();
      teslaPath.moveTo(x, y - half * 0.1);
      teslaPath.lineTo(x - half * 0.15, y - half * 0.5);
      teslaPath.lineTo(x + half * 0.15, y - half * 0.5);
      teslaPath.lineTo(x, y - half * 0.9);
      canvas.drawPath(teslaPath, p);
      canvas.drawCircle(x, y - half * 1.1, half * 0.2, p);
      break;
    }
    case 'detonator': {
      canvas.drawRect(Skia.XYWHRect(x - half * 0.5, y - half * 0.7, half, half * 0.2), p);
      canvas.drawRect(Skia.XYWHRect(x - half * 0.1, y - half * 0.9, half * 0.2, half * 0.8), p);
      break;
    }
    case 'magnet': {
      const magPath = Skia.Path.Make();
      magPath.moveTo(x - half * 0.45, y - half * 0.1);
      magPath.lineTo(x - half * 0.45, y - half * 0.75);
      magPath.cubicTo(x - half * 0.45, y - half * 1.15, x + half * 0.45, y - half * 1.15, x + half * 0.45, y - half * 0.75);
      magPath.lineTo(x + half * 0.45, y - half * 0.1);
      magPath.lineTo(x + half * 0.25, y - half * 0.1);
      magPath.lineTo(x + half * 0.25, y - half * 0.75);
      magPath.cubicTo(x + half * 0.25, y - half * 0.95, x - half * 0.25, y - half * 0.95, x - half * 0.25, y - half * 0.75);
      magPath.lineTo(x - half * 0.25, y - half * 0.1);
      magPath.close();
      canvas.drawPath(magPath, p);
      break;
    }
    case 'capacitor': {
      canvas.drawRect(Skia.XYWHRect(x - half * 0.5, y - half * 0.55, half, half * 0.15), p);
      canvas.drawRect(Skia.XYWHRect(x - half * 0.5, y - half * 0.85, half, half * 0.15), p);
      canvas.drawRect(Skia.XYWHRect(x - half * 0.06, y - half * 1.0, half * 0.12, half * 0.5), p);
      break;
    }
    case 'overcharger': {
      canvas.drawCircle(x, y - half * 0.65, half * 0.5, p);
      const boltPath = Skia.Path.Make();
      boltPath.moveTo(x + half * 0.15, y - half * 1.05);
      boltPath.lineTo(x - half * 0.05, y - half * 0.65);
      boltPath.lineTo(x + half * 0.1, y - half * 0.65);
      boltPath.lineTo(x - half * 0.15, y - half * 0.25);
      boltPath.lineTo(x + half * 0.05, y - half * 0.65);
      boltPath.lineTo(x - half * 0.1, y - half * 0.65);
      boltPath.close();
      p.setColor(Skia.Color('rgba(255,255,255,0.9)'));
      canvas.drawPath(boltPath, p);
      break;
    }
    case 'mine_layer': {
      canvas.drawCircle(x, y - half * 0.65, half * 0.35, p);
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const ix = x + Math.cos(angle) * half * 0.35;
        const iy = (y - half * 0.65) + Math.sin(angle) * half * 0.35;
        const ox = x + Math.cos(angle) * half * 0.55;
        const oy = (y - half * 0.65) + Math.sin(angle) * half * 0.55;
        const spikePath = Skia.Path.Make();
        spikePath.moveTo(ix, iy);
        spikePath.lineTo(ox, oy);
        p.setStyle(PaintStyle.Stroke);
        p.setStrokeWidth(2);
        canvas.drawPath(spikePath, p);
        p.setStyle(PaintStyle.Fill);
      }
      break;
    }
    default:
      break;
  }
}

function drawFantasyTower(
  canvas: SkCanvas,
  t: Tower & { isPlayer?: boolean },
  side: 'top' | 'bottom',
  editMode: boolean,
  selectedTower: string | null,
  skinId: string | undefined,
  p: SkPaint,
) {
  const x = t.x;
  const y = t.y;
  const half = 14;
  const color = getTowerColor(t.type);
  const statusColor = t.frozen ? '#BAE6FD' : t.poisoned ? '#84CC16' : t.overclocked ? '#FCD34D' : color;
  const isSuper = t.level >= 6;
  const isSelected = selectedTower === t.id;

  // L6 aura
  if (isSuper) {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(3);
    p.setColor(Skia.Color('rgba(251,191,36,0.4)'));
    canvas.drawCircle(x, y, half * 1.6, p);
    p.setStyle(PaintStyle.Fill);
  }

  // Overclock ring
  if (t.overclocked) {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('rgba(252,211,77,0.5)'));
    canvas.drawCircle(x, y, half * 1.4, p);
    p.setStyle(PaintStyle.Fill);
  }

  // Edit mode highlight
  if (editMode && t.isPlayer) {
    p.setColor(Skia.Color('rgba(59,130,246,0.15)'));
    canvas.drawCircle(x, y, half * 1.5, p);
  }

  // Body
  drawTowerBody(canvas, x, y, half, t.level, skinId, p);

  // Border
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1.5);
  p.setColor(Skia.Color(statusColor + 'AA'));
  canvas.drawRect(Skia.XYWHRect(x - half, y - half, half * 2, half * 2), p);
  p.setStyle(PaintStyle.Fill);

  // Battlements
  p.setColor(Skia.Color('rgba(71,85,105,0.95)'));
  const battDir = side === 'top' ? 1 : -1;
  for (const i of [-1, 0, 1]) {
    canvas.drawRect(
      Skia.XYWHRect(x + i * half * 0.55 - half * 0.16, y + battDir * half - 3.5, half * 0.32, 4.5),
      p,
    );
  }

  // Tower top decoration
  p.setColor(Skia.Color(statusColor + 'DD'));
  drawTowerTop(canvas, t.type, x, y, half, statusColor + 'DD', p);

  // Frost overlay
  if (t.frozen) {
    p.setColor(Skia.Color('rgba(186,230,253,0.3)'));
    canvas.drawRect(Skia.XYWHRect(x - half, y - half, half * 2, half * 2), p);
  }

  // Poison overlay
  if (t.poisoned) {
    p.setColor(Skia.Color('rgba(132,204,22,0.25)'));
    canvas.drawRect(Skia.XYWHRect(x - half, y - half, half * 2, half * 2), p);
  }

  // HP bar (only if damaged)
  if (t.hp < t.maxHp) {
    const barW = half * 2.2;
    const barY = y - half - 8;
    drawHealthBar(canvas, x, barY, barW, t.hp, t.maxHp, hpColor(t.hp / t.maxHp), p);
  }

  // Selected range ring
  if (isSelected) {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('rgba(59,130,246,0.5)'));
    canvas.drawCircle(x, y, getTowerStats(t.type, t.level).range, p);
    p.setStyle(PaintStyle.Fill);
  }
}

function drawOrb(canvas: SkCanvas, orb: Orb, now: number, p: SkPaint, font: SkFont | null) {
  const r = orb.radius;
  const orbAny = orb as any;
  const spawnAge = orbAny.spawnAge ?? 1;
  let scale = 1;
  if (spawnAge < 0.3) {
    const prog = spawnAge / 0.3;
    scale = 0.3 + 0.7 * prog + Math.sin(prog * Math.PI) * 0.2;
  }

  // Mine: pulsing danger ring
  if (orbAny.detonateOnClick) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 120);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(3);
    p.setColor(Skia.Color(`rgba(249,115,22,${(0.4 + pulse * 0.4).toFixed(3)})`));
    canvas.drawCircle(orb.x, orb.y, r + 8 + pulse * 4, p);
    p.setStyle(PaintStyle.Fill);
  }

  canvas.save();
  canvas.translate(orb.x, orb.y);
  canvas.scale(scale, scale);

  // Glow
  p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, orbAny.detonateOnClick ? 7 : 5, true));
  p.setColor(Skia.Color(orb.color));
  canvas.drawCircle(0, 0, r, p);
  p.setMaskFilter(null);

  // Body
  p.setColor(Skia.Color(orb.color));
  canvas.drawCircle(0, 0, r, p);

  canvas.restore();

  // Tank armor plates
  if (orb.type === 'tank') {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('rgba(15,23,42,0.4)'));
    canvas.drawCircle(orb.x, orb.y, r - 4, p);
    p.setStyle(PaintStyle.Fill);
    p.setColor(Skia.Color('rgba(15,23,42,0.25)'));
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      canvas.drawCircle(orb.x + Math.cos(a) * (r - 3), orb.y + Math.sin(a) * (r - 3), 2, p);
    }
  }

  // Mine fuse spark
  if (orbAny.detonateOnClick) {
    const spark = 0.5 + 0.5 * Math.sin(now / 80);
    p.setColor(Skia.Color(`rgba(254,240,138,${spark.toFixed(3)})`));
    canvas.drawCircle(orb.x, orb.y - r - 2, 3, p);
  }

  // Glossy highlight
  const hg = Skia.Shader.MakeRadialGradient(
    { x: orb.x - r * 0.35, y: orb.y - r * 0.35 },
    r,
    [Skia.Color('rgba(255,255,255,0.7)'), Skia.Color('rgba(255,255,255,0.15)'), Skia.Color('rgba(255,255,255,0)')],
    [0, 0.4, 1],
    TileMode.Clamp,
  );
  p.setShader(hg);
  canvas.drawCircle(orb.x, orb.y, r, p);
  p.setShader(null);

  // Type-specific decorations
  if (orb.type === 'healer') {
    p.setColor(Skia.Color('rgba(255,255,255,0.9)'));
    canvas.drawRect(Skia.XYWHRect(orb.x - r * 0.08, orb.y - r * 0.55, r * 0.16, r * 0.5), p);
    canvas.drawRect(Skia.XYWHRect(orb.x - r * 0.28, orb.y - r * 0.42, r * 0.56, r * 0.16), p);
  }

  if (orb.type === 'radioactive') {
    const pulse2 = 1.05 + 0.1 * Math.sin(now / 250);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('rgba(132,204,22,0.6)'));
    canvas.drawCircle(orb.x, orb.y, r * pulse2, p);
    p.setStyle(PaintStyle.Fill);
  }

  if (orb.type === 'shadow' || orb.type === 'phantom') {
    p.setColor(Skia.Color('rgba(15,23,42,0.5)'));
    canvas.drawCircle(orb.x - r * 0.2, orb.y, r * 0.6, p);
    p.setColor(Skia.Color('rgba(30,27,75,0.4)'));
    canvas.drawCircle(orb.x + r * 0.2, orb.y, r * 0.6, p);
  }

  if (orb.type === 'ice') {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(1.5);
    p.setColor(Skia.Color('rgba(103,232,249,0.8)'));
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const icePath = Skia.Path.Make();
      icePath.moveTo(orb.x, orb.y);
      icePath.lineTo(orb.x + Math.cos(angle) * r * 0.75, orb.y + Math.sin(angle) * r * 0.75);
      canvas.drawPath(icePath, p);
    }
    p.setStyle(PaintStyle.Fill);
  }

  if (orb.type === 'zap_orb') {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(1.5);
    p.setColor(Skia.Color('rgba(59,130,246,0.9)'));
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
      const bx = orb.x + Math.cos(angle) * r * 0.3;
      const by = orb.y + Math.sin(angle) * r * 0.3;
      const ex = orb.x + Math.cos(angle) * r * 0.9;
      const ey = orb.y + Math.sin(angle) * r * 0.9;
      const mx = (bx + ex) / 2 + Math.cos(angle + Math.PI / 2) * r * 0.2;
      const my = (by + ey) / 2 + Math.sin(angle + Math.PI / 2) * r * 0.2;
      const zapPath = Skia.Path.Make();
      zapPath.moveTo(bx, by);
      zapPath.lineTo(mx, my);
      zapPath.lineTo(ex, ey);
      canvas.drawPath(zapPath, p);
    }
    p.setStyle(PaintStyle.Fill);
  }

  if (orb.type === 'armored') {
    const hexPath = Skia.Path.Make();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = orb.x + r * 0.75 * Math.cos(angle);
      const py = orb.y + r * 0.75 * Math.sin(angle);
      if (i === 0) hexPath.moveTo(px, py);
      else hexPath.lineTo(px, py);
    }
    hexPath.close();
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(1.5);
    p.setColor(Skia.Color('rgba(100,116,139,0.7)'));
    canvas.drawPath(hexPath, p);
    p.setStyle(PaintStyle.Fill);
  }

  if (orb.type === 'berserker') {
    const hpPct = orb.maxHp > 0 ? orb.hp / orb.maxHp : 1;
    const crackIntensity = 1 - hpPct;
    const crackCount = Math.floor(2 + crackIntensity * 4);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(1.5);
    for (let i = 0; i < crackCount; i++) {
      const angle = (Math.PI * 2 / crackCount) * i + i * 0.3;
      const crackAlpha = 0.4 + crackIntensity * 0.5;
      p.setColor(Skia.Color(`rgba(220,38,38,${crackAlpha.toFixed(3)})`));
      const crackPath = Skia.Path.Make();
      crackPath.moveTo(orb.x, orb.y);
      crackPath.lineTo(orb.x + Math.cos(angle) * r * 0.5, orb.y + Math.sin(angle) * r * 0.5);
      crackPath.lineTo(orb.x + Math.cos(angle + 0.3) * r * 0.85, orb.y + Math.sin(angle + 0.3) * r * 0.85);
      canvas.drawPath(crackPath, p);
    }
    p.setStyle(PaintStyle.Fill);
  }

  if (orb.type === 'leech') {
    const leechPulse = 1.05 + 0.1 * Math.sin(now / 300);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('rgba(190,18,60,0.6)'));
    canvas.drawCircle(orb.x, orb.y, r * leechPulse, p);
    p.setStyle(PaintStyle.Fill);
  }

  if (orb.type === 'summoner') {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(1.5);
    p.setColor(Skia.Color('rgba(124,58,237,0.4)'));
    canvas.drawCircle(orb.x, orb.y, r * (0.7 + 0.15 * Math.sin(now / 400)), p);
    p.setStrokeWidth(1);
    p.setColor(Skia.Color('rgba(124,58,237,0.3)'));
    canvas.drawCircle(orb.x, orb.y, r * (0.45 + 0.1 * Math.sin(now / 300 + 1)), p);
    p.setStyle(PaintStyle.Fill);
  }

  if (orb.type === 'growth') {
    const growthPulse = 1.08 + 0.12 * Math.sin(now / 350);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('rgba(22,163,74,0.5)'));
    canvas.drawCircle(orb.x, orb.y, r * growthPulse, p);
    p.setStyle(PaintStyle.Fill);
  }

  if (orb.type === 'splitter' || orb.type === 'carrier') {
    p.setColor(Skia.Color('rgba(255,255,255,0.35)'));
    for (const i of [-1, 0, 1]) {
      canvas.drawCircle(
        orb.x + i * r * 0.35,
        orb.y + (i === 0 ? -r * 0.25 : r * 0.15),
        r * 0.2,
        p,
      );
    }
  }

  if (orb.type === 'swarmer') {
    p.setColor(Skia.Color('rgba(168,85,247,0.8)'));
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i + now / 600;
      canvas.drawCircle(
        orb.x + Math.cos(angle) * r * 0.65,
        orb.y + Math.sin(angle) * r * 0.65,
        r * 0.18,
        p,
      );
    }
  }

  if (orb.type === 'bomb') {
    p.setColor(Skia.Color('#FCD34D'));
    canvas.drawCircle(orb.x, orb.y - r * 0.85, r * 0.12, p);
  }

  // Shield bubble
  if (orb.shieldHp != null && orb.shieldHp > 0) {
    p.setColor(Skia.Color('rgba(147,197,253,0.25)'));
    canvas.drawCircle(orb.x, orb.y, r + 6, p);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(1.5);
    p.setColor(Skia.Color('rgba(147,197,253,0.6)'));
    canvas.drawCircle(orb.x, orb.y, r + 6, p);
    p.setStyle(PaintStyle.Fill);
  }

  // Status overlays
  if (orb.frozen) {
    p.setColor(Skia.Color('rgba(186,230,253,0.4)'));
    canvas.drawCircle(orb.x, orb.y, r, p);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(1.5);
    p.setColor(Skia.Color('rgba(147,197,253,0.8)'));
    canvas.drawCircle(orb.x, orb.y, r, p);
    p.setStyle(PaintStyle.Fill);
  } else if (orb.poisoned) {
    p.setColor(Skia.Color('rgba(132,204,22,0.35)'));
    canvas.drawCircle(orb.x, orb.y, r, p);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(1.5);
    p.setColor(Skia.Color('rgba(132,204,22,0.7)'));
    canvas.drawCircle(orb.x, orb.y, r, p);
    p.setStyle(PaintStyle.Fill);
  } else if (orb.burning) {
    p.setColor(Skia.Color('rgba(249,115,22,0.35)'));
    canvas.drawCircle(orb.x, orb.y, r, p);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(1.5);
    p.setColor(Skia.Color('rgba(249,115,22,0.7)'));
    canvas.drawCircle(orb.x, orb.y, r, p);
    p.setStyle(PaintStyle.Fill);
  }

  // HP text
  if (font && orb.hp > 0) {
    const safeFont = font as SkFont;
    const hpText = String(Math.ceil(orb.hp));
    const fontSize = Math.max(13, Math.round(r * 0.95));
    const fontScale = fontSize / 16;

    // Stroke
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(3);
    p.setColor(Skia.Color('rgba(15,23,42,0.55)'));
    canvas.save();
    canvas.translate(orb.x, orb.y);
    canvas.scale(fontScale, fontScale);
    const textWidth = safeFont.measureText(hpText).width;
    canvas.drawText(hpText, -textWidth / 2, fontSize / 2 / fontScale, p, safeFont);
    canvas.restore();

    // Fill
    p.setStyle(PaintStyle.Fill);
    p.setColor(Skia.Color('#ffffff'));
    canvas.save();
    canvas.translate(orb.x, orb.y);
    canvas.scale(fontScale, fontScale);
    canvas.drawText(hpText, -textWidth / 2, fontSize / 2 / fontScale, p, safeFont);
    canvas.restore();
  }
}

function drawCoinPickup(canvas: SkCanvas, c: CoinPickup, now: number, p: SkPaint) {
  const r = 8;
  const glowR = r * (1 + 0.1 * Math.sin(now / 300 + c.x));

  // Glow
  p.setColor(Skia.Color('rgba(252,211,77,0.15)'));
  canvas.drawCircle(c.x, c.y, glowR * 1.5, p);

  // Body gradient
  const coinShader = Skia.Shader.MakeRadialGradient(
    { x: c.x - r * 0.2, y: c.y - r * 0.2 },
    r,
    [Skia.Color('#FDE68A'), Skia.Color('#F59E0B')],
    [0, 1],
    TileMode.Clamp,
  );
  p.setShader(coinShader);
  canvas.drawCircle(c.x, c.y, r, p);
  p.setShader(null);

  // Highlight
  const hlShader = Skia.Shader.MakeRadialGradient(
    { x: c.x - r * 0.2, y: c.y - r * 0.25 },
    r * 0.35,
    [Skia.Color('rgba(255,255,255,0.6)'), Skia.Color('rgba(255,255,255,0)')],
    [0, 1],
    TileMode.Clamp,
  );
  p.setShader(hlShader);
  canvas.drawCircle(c.x - r * 0.2, c.y - r * 0.25, r * 0.35, p);
  p.setShader(null);
}

function drawProjectile(canvas: SkCanvas, proj: Projectile, p: SkPaint) {
  const r = Math.max(2, proj.radius);
  const trailR = Math.max(1, r * 0.6);

  // Trail
  for (let i = 0; i < proj.trail.length; i++) {
    const trailAlpha = (i / Math.max(1, proj.trail.length)) * 0.4;
    p.setColor(Skia.Color(proj.color));
    p.setAlphaf(trailAlpha);
    canvas.drawCircle(proj.trail[i].x, proj.trail[i].y, trailR, p);
  }
  p.setAlphaf(1);

  // Body
  const projShader = Skia.Shader.MakeRadialGradient(
    { x: proj.x, y: proj.y },
    r,
    [Skia.Color(proj.color), Skia.Color(proj.color + '88')],
    [0, 1],
    TileMode.Clamp,
  );
  p.setShader(projShader);
  canvas.drawCircle(proj.x, proj.y, r, p);
  p.setShader(null);
}

function drawParticle(canvas: SkCanvas, particle: Particle, p: SkPaint) {
  if (particle.alpha <= 0) return;
  p.setColor(Skia.Color(particle.color));
  p.setAlphaf(Math.max(0, particle.alpha));
  canvas.drawCircle(particle.x, particle.y, Math.max(1, particle.radius), p);
  p.setAlphaf(1);
}

function drawEffect(canvas: SkCanvas, e: Effect, now: number, p: SkPaint, font: SkFont | null) {
  const alpha = Math.max(0, e.timer / e.maxTimer);
  const progress = 1 - alpha;
  const baseR = e.radius ?? 30;
  const effectColor = e.color ?? '#F97316';

  if (e.type === 'explosion' || e.type === 'station_hit') {
    const r = baseR * (0.3 + progress * 0.7);
    p.setColor(Skia.Color(effectColor));
    p.setAlphaf(alpha * 0.5);
    canvas.drawCircle(e.x, e.y, r, p);
    p.setAlphaf(1);

    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color(effectColor));
    p.setAlphaf(alpha * 0.8);
    canvas.drawCircle(e.x, e.y, r, p);
    p.setAlphaf(1);
    p.setStyle(PaintStyle.Fill);

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const rayPath = Skia.Path.Make();
      rayPath.moveTo(e.x + Math.cos(angle) * r * 0.5, e.y + Math.sin(angle) * r * 0.5);
      rayPath.lineTo(e.x + Math.cos(angle) * r * 1.2, e.y + Math.sin(angle) * r * 1.2);
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(1.5);
      p.setColor(Skia.Color(effectColor));
      p.setAlphaf(alpha * 0.7);
      canvas.drawPath(rayPath, p);
      p.setAlphaf(1);
      p.setStyle(PaintStyle.Fill);
    }
    return;
  }

  if (e.type === 'freeze') {
    const r = baseR * (0.5 + progress * 0.5);
    p.setColor(Skia.Color('rgba(186,230,253,1)'));
    p.setAlphaf(alpha * 0.25);
    canvas.drawCircle(e.x, e.y, r, p);
    p.setAlphaf(1);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('rgba(147,197,253,1)'));
    p.setAlphaf(alpha * 0.7);
    canvas.drawCircle(e.x, e.y, r, p);
    p.setAlphaf(1);
    p.setStyle(PaintStyle.Fill);
    return;
  }

  if (e.type === 'lightning' || e.type === 'zap') {
    p.setColor(Skia.Color('rgba(253,230,138,1)'));
    p.setAlphaf(alpha);
    canvas.drawCircle(e.x, e.y, baseR * 0.35, p);
    p.setAlphaf(1);
    return;
  }

  if (e.type === 'zone') {
    p.setColor(Skia.Color(effectColor));
    p.setAlphaf(alpha * 0.35);
    canvas.drawCircle(e.x, e.y, baseR * (0.5 + progress * 0.5), p);
    p.setAlphaf(1);
    return;
  }

  if (e.type === 'pop') {
    const r = baseR * (0.3 + progress * 0.7);
    p.setColor(Skia.Color(effectColor));
    p.setAlphaf(alpha * 0.6);
    canvas.drawCircle(e.x, e.y, r, p);
    p.setAlphaf(1);
    return;
  }

  if (e.type === 'portal') {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(3);
    p.setColor(Skia.Color('#8b5cf6'));
    p.setAlphaf(alpha);
    canvas.drawCircle(e.x, e.y, baseR * (0.5 + progress * 0.5), p);
    p.setAlphaf(1);
    p.setStyle(PaintStyle.Fill);
    return;
  }

  if (e.type === 'repair' || e.type === 'heal_pulse') {
    p.setColor(Skia.Color('#10b981'));
    p.setAlphaf(alpha * 0.5);
    canvas.drawCircle(e.x, e.y, baseR * (0.5 + progress * 0.5), p);
    p.setAlphaf(1);
    return;
  }

  if (e.type === 'lightning_chain') {
    const data = e.data as any;
    if (data?.x2 != null && data?.y2 != null) {
      drawLightning(canvas, e.x, e.y, data.x2, data.y2, p);
    }
    return;
  }

  if (e.type === 'ash') {
    p.setColor(Skia.Color('rgba(120,113,108,1)'));
    p.setAlphaf(alpha * 0.6);
    canvas.drawCircle(e.x, e.y, baseR * 0.3, p);
    p.setAlphaf(1);
    return;
  }

  if (e.type === 'burner_beam') {
    const data = e.data as any;
    if (data?.x2 != null && data?.y2 != null) {
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(4);
      p.setColor(Skia.Color('#f97316'));
      p.setAlphaf(alpha * 0.8);
      const beamPath = Skia.Path.Make();
      beamPath.moveTo(e.x, e.y);
      beamPath.lineTo(data.x2, data.y2);
      canvas.drawPath(beamPath, p);
      p.setAlphaf(1);
      p.setStyle(PaintStyle.Fill);
    }
    return;
  }

  if (e.type === 'meteor_aim') {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(1);
    p.setColor(Skia.Color('rgba(239,68,68,0.3)'));
    canvas.drawCircle(e.x, e.y, baseR, p);
    p.setStyle(PaintStyle.Fill);
    return;
  }

  if (e.type === 'glue_drop') {
    p.setColor(Skia.Color('rgba(101,163,13,0.6)'));
    p.setAlphaf(alpha);
    canvas.drawCircle(e.x, e.y, baseR * 0.4, p);
    p.setAlphaf(1);
    return;
  }

  if (e.type === 'poison_cloud') {
    p.setColor(Skia.Color('rgba(132,204,22,0.4)'));
    p.setAlphaf(alpha);
    canvas.drawCircle(e.x, e.y, baseR * (0.5 + progress * 0.5), p);
    p.setAlphaf(1);
    return;
  }

  if (e.type === 'mortar_muzzle') {
    p.setColor(Skia.Color('#f59e0b'));
    p.setAlphaf(alpha * 0.8);
    canvas.drawCircle(e.x, e.y, baseR * 0.4, p);
    p.setAlphaf(1);
    return;
  }

  if (e.type === 'mortar_impact') {
    const r = baseR * (0.3 + progress * 0.7);
    p.setColor(Skia.Color('#f97316'));
    p.setAlphaf(alpha * 0.6);
    canvas.drawCircle(e.x, e.y, r, p);
    p.setAlphaf(1);
    return;
  }

  if (e.type === 'prism_beam') {
    const data = e.data as any;
    if (data?.x2 != null && data?.y2 != null) {
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(3);
      p.setColor(Skia.Color('#a855f7'));
      p.setAlphaf(alpha * 0.9);
      const prismPath = Skia.Path.Make();
      prismPath.moveTo(e.x, e.y);
      prismPath.lineTo(data.x2, data.y2);
      canvas.drawPath(prismPath, p);
      p.setAlphaf(1);
      p.setStyle(PaintStyle.Fill);
    }
    return;
  }

  if (e.type === 'zap_arrival') {
    p.setColor(Skia.Color('rgba(253,230,138,1)'));
    p.setAlphaf(alpha * 0.8);
    canvas.drawCircle(e.x, e.y, baseR * 0.5, p);
    p.setAlphaf(1);
    return;
  }

  if (e.type === 'tesla_pulse') {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('#7c3aed'));
    p.setAlphaf(alpha * 0.7);
    canvas.drawCircle(e.x, e.y, baseR * (0.5 + progress * 0.5), p);
    p.setAlphaf(1);
    p.setStyle(PaintStyle.Fill);
    return;
  }

  if (e.type === 'detonator_pulse') {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('#dc2626'));
    p.setAlphaf(alpha * 0.7);
    canvas.drawCircle(e.x, e.y, baseR * (0.5 + progress * 0.5), p);
    p.setAlphaf(1);
    p.setStyle(PaintStyle.Fill);
    return;
  }

  if (e.type === 'harpoon_shot') {
    const data = e.data as any;
    if (data?.x2 != null && data?.y2 != null) {
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(2);
      p.setColor(Skia.Color('#0891b2'));
      p.setAlphaf(alpha);
      const harpPath = Skia.Path.Make();
      harpPath.moveTo(e.x, e.y);
      harpPath.lineTo(data.x2, data.y2);
      canvas.drawPath(harpPath, p);
      p.setAlphaf(1);
      p.setStyle(PaintStyle.Fill);
    }
    return;
  }

  if (e.type === 'shield_bubble_pulse') {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('#38bdf8'));
    p.setAlphaf(alpha * 0.6);
    canvas.drawCircle(e.x, e.y, baseR * (0.5 + progress * 0.5), p);
    p.setAlphaf(1);
    p.setStyle(PaintStyle.Fill);
    return;
  }

  if (e.type === 'capacitor_beam') {
    const data = e.data as any;
    if (data?.x2 != null && data?.y2 != null) {
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(5);
      p.setColor(Skia.Color('#fbbf24'));
      p.setAlphaf(alpha * 0.9);
      const capPath = Skia.Path.Make();
      capPath.moveTo(e.x, e.y);
      capPath.lineTo(data.x2, data.y2);
      canvas.drawPath(capPath, p);
      p.setAlphaf(1);
      p.setStyle(PaintStyle.Fill);
    }
    return;
  }

  if (e.type === 'overcharger_pulse') {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('#22d3ee'));
    p.setAlphaf(alpha * 0.7);
    canvas.drawCircle(e.x, e.y, baseR * (0.5 + progress * 0.5), p);
    p.setAlphaf(1);
    p.setStyle(PaintStyle.Fill);
    return;
  }

  if (e.type === 'reveal_flash') {
    p.setColor(Skia.Color('#ffffff'));
    p.setAlphaf(alpha * 0.5);
    canvas.drawCircle(e.x, e.y, baseR * (0.5 + progress * 0.5), p);
    p.setAlphaf(1);
    return;
  }

  // Default fallback
  p.setColor(Skia.Color(effectColor));
  p.setAlphaf(alpha * 0.6);
  canvas.drawCircle(e.x, e.y, baseR * 0.4, p);
  p.setAlphaf(1);
}

function drawGluePuddle(canvas: SkCanvas, g: GlueState, p: SkPaint) {
  p.setColor(Skia.Color('rgba(120,83,60,0.3)'));
  canvas.drawCircle(g.x, g.y, g.radius, p);
  p.setColor(Skia.Color('rgba(101,163,13,0.15)'));
  canvas.drawCircle(g.x, g.y, g.radius, p);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1.5);
  p.setColor(Skia.Color('rgba(101,163,13,0.5)'));
  canvas.drawCircle(g.x, g.y, g.radius, p);
  p.setStyle(PaintStyle.Fill);
}

function drawMeteor(canvas: SkCanvas, m: MeteorState, p: SkPaint) {
  const startX = m.x;
  const startY = -80;
  const curX = startX + (m.targetX - startX) * m.progress;
  const curY = startY + (m.targetY - startY) * m.progress;
  const r = Math.max(5, m.radius * 0.18);

  // Target ring
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1);
  p.setColor(Skia.Color('rgba(239,68,68,0.2)'));
  canvas.drawCircle(m.targetX, m.targetY, m.radius * 0.5, p);
  p.setStyle(PaintStyle.Fill);

  // Trail
  for (let i = 0; i < 5; i++) {
    const t = [0.85, 0.7, 0.55, 0.4, 0.25][i];
    const tx = startX + (m.targetX - startX) * (m.progress - t * 0.08);
    const ty = startY + (m.targetY - startY) * (m.progress - t * 0.08);
    const trailAlpha = (1 - t) * 0.5;
    p.setColor(Skia.Color('rgba(249,115,22,1)'));
    p.setAlphaf(trailAlpha);
    canvas.drawCircle(tx, ty, r * (0.4 + t * 0.6), p);
    p.setAlphaf(1);
  }

  // Head
  const meteorShader = Skia.Shader.MakeRadialGradient(
    { x: curX, y: curY },
    r,
    [Skia.Color('#FDE68A'), Skia.Color('#DC2626')],
    [0, 1],
    TileMode.Clamp,
  );
  p.setShader(meteorShader);
  canvas.drawCircle(curX, curY, r, p);
  p.setShader(null);
}

function drawMagnet(canvas: SkCanvas, m: MagnetState, p: SkPaint) {
  p.setColor(Skia.Color('rgba(192,132,252,0.12)'));
  canvas.drawCircle(m.x, m.y, m.radius, p);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1.5);
  p.setColor(Skia.Color('rgba(192,132,252,0.5)'));
  canvas.drawCircle(m.x, m.y, m.radius, p);
  p.setStyle(PaintStyle.Fill);
}

function drawZone(canvas: SkCanvas, z: ZoneState, p: SkPaint) {
  const fill =
    z.type === 'damage' ? 'rgba(239,68,68,0.18)' :
    z.type === 'slow' ? 'rgba(96,165,250,0.18)' :
    'rgba(34,197,94,0.18)';
  const border =
    z.type === 'damage' ? 'rgba(239,68,68,0.7)' :
    z.type === 'slow' ? 'rgba(96,165,250,0.7)' :
    'rgba(34,197,94,0.7)';
  p.setColor(Skia.Color(fill));
  canvas.drawCircle(z.x, z.y, z.radius, p);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1.5);
  p.setColor(Skia.Color(border));
  canvas.drawCircle(z.x, z.y, z.radius, p);
  p.setStyle(PaintStyle.Fill);
}

function drawMine(canvas: SkCanvas, m: any, p: SkPaint) {
  const r = m.radius ?? 12;
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 120);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(3);
  p.setColor(Skia.Color(`rgba(249,115,22,${(0.4 + pulse * 0.4).toFixed(3)})`));
  canvas.drawCircle(m.x, m.y, r + 8 + pulse * 4, p);
  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color('#f97316'));
  canvas.drawCircle(m.x, m.y, r, p);
  // Spikes
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    const spikePath = Skia.Path.Make();
    spikePath.moveTo(m.x + Math.cos(angle) * r, m.y + Math.sin(angle) * r);
    spikePath.lineTo(m.x + Math.cos(angle) * (r + 6), m.y + Math.sin(angle) * (r + 6));
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(2);
    p.setColor(Skia.Color('#f97316'));
    canvas.drawPath(spikePath, p);
    p.setStyle(PaintStyle.Fill);
  }
}

function drawShieldDome(canvas: SkCanvas, pos: { x: number; y: number }, p: SkPaint) {
  p.setColor(Skia.Color('rgba(99,102,241,0.1)'));
  canvas.drawCircle(pos.x, pos.y, 80, p);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(2);
  p.setColor(Skia.Color('rgba(99,102,241,0.5)'));
  canvas.drawCircle(pos.x, pos.y, 80, p);
  p.setStyle(PaintStyle.Fill);
}

function drawAimReticle(
  canvas: SkCanvas,
  aiming: { x: number; y: number },
  p: SkPaint,
) {
  p.setColor(Skia.Color('rgba(79,142,247,0.12)'));
  canvas.drawCircle(aiming.x, aiming.y, 70, p);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(2);
  p.setColor(Skia.Color('rgba(79,142,247,0.7)'));
  canvas.drawCircle(aiming.x, aiming.y, 70, p);

  const crossPath = Skia.Path.Make();
  crossPath.moveTo(aiming.x - 44, aiming.y);
  crossPath.lineTo(aiming.x + 44, aiming.y);
  crossPath.moveTo(aiming.x, aiming.y - 44);
  crossPath.lineTo(aiming.x, aiming.y + 44);
  canvas.drawPath(crossPath, p);
  p.setStyle(PaintStyle.Fill);
}

function drawRageVignette(canvas: SkCanvas, p: SkPaint) {
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(12);
  p.setColor(Skia.Color('rgba(239,68,68,0.35)'));
  canvas.drawRect(Skia.XYWHRect(0, 0, GAME_WIDTH, GAME_HEIGHT), p);
  p.setStyle(PaintStyle.Fill);
}

function drawFloater(canvas: SkCanvas, f: Floater, p: SkPaint, font: SkFont | null) {
  if (!font) return;
  const alpha = Math.max(0, f.timer / f.maxTimer);
  if (alpha <= 0) return;
  const fontSize = Math.max(10, f.fontSize);
  const fontScale = fontSize / 16;
  const safeFont = font as SkFont;

  p.setAlphaf(alpha);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(2);
  p.setColor(Skia.Color('rgba(15,23,42,0.6)'));
  canvas.save();
  canvas.translate(f.x, f.y);
  canvas.scale(fontScale, fontScale);
  const tw = safeFont.measureText(f.text).width;
  canvas.drawText(f.text, -tw / 2, 0, p, safeFont);
  canvas.restore();

  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color(f.color));
  p.setAlphaf(alpha);
  canvas.save();
  canvas.translate(f.x, f.y);
  canvas.scale(fontScale, fontScale);
  canvas.drawText(f.text, -tw / 2, 0, p, safeFont);
  canvas.restore();
  p.setAlphaf(1);
}

function drawWaveBanner(
  canvas: SkCanvas,
  wave: number,
  life: number,
  now: number,
  p: SkPaint,
  font: SkFont | null,
) {
  if (!font) return;
  const safeFont = font as SkFont;
  const alpha = Math.min(1, life * 2);
  const text = `WAVE ${wave}`;
  const fontSize = 28;
  const fontScale = fontSize / 16;

  p.setColor(Skia.Color('rgba(15,23,42,0.7)'));
  p.setAlphaf(alpha);
  canvas.drawRect(Skia.XYWHRect(GAME_WIDTH / 2 - 120, GAME_HEIGHT / 2 - 24, 240, 48), p);

  p.setStyle(PaintStyle.Fill);
  p.setColor(Skia.Color('#fbbf24'));
  p.setAlphaf(alpha);
  canvas.save();
  canvas.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
  canvas.scale(fontScale, fontScale);
  const tw = safeFont.measureText(text).width;
  canvas.drawText(text, -tw / 2, 0, p, safeFont);
  canvas.restore();
  p.setAlphaf(1);
}

function drawOvertimeBanner(
  canvas: SkCanvas,
  tier: string,
  p: SkPaint,
  font: SkFont | null,
) {
  if (!font) return;
  const safeFont = font as SkFont;
  const label = ESCALATION_LABELS[tier] ?? tier.toUpperCase();
  const color = ESCALATION_COLORS[tier] ?? '#EF4444';
  const fontSize = 14;
  const fontScale = fontSize / 16;

  p.setColor(Skia.Color(color + '26'));
  canvas.drawRect(Skia.XYWHRect(GAME_WIDTH * 0.15, GAME_HEIGHT * 0.455, GAME_WIDTH * 0.7, 28), p);

  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1);
  p.setColor(Skia.Color(color + '80'));
  canvas.drawRect(Skia.XYWHRect(GAME_WIDTH * 0.15, GAME_HEIGHT * 0.455, GAME_WIDTH * 0.7, 28), p);
  p.setStyle(PaintStyle.Fill);

  p.setColor(Skia.Color(color));
  canvas.save();
  canvas.translate(GAME_WIDTH / 2, GAME_HEIGHT * 0.455 + 20);
  canvas.scale(fontScale, fontScale);
  const tw = safeFont.measureText(label).width;
  canvas.drawText(label, -tw / 2, 0, p, safeFont);
  canvas.restore();
}

// ─── Main drawFrame ───────────────────────────────────────────────────────────

interface DrawUI {
  isAiming?: boolean;
  aimingAbility?: string | null;
  placingTower?: string | null;
  previewPos?: { x: number; y: number } | null;
  editMode?: boolean;
  selectedTower?: string | null;
  playerSkins?: Record<string, string>;
  oppSkins?: Record<string, string>;
}

function drawFrame(
  canvas: SkCanvas,
  s: GameState,
  now: number,
  font: SkFont,
  ui: DrawUI,
) {
  const p = Skia.Paint();
  p.setAntiAlias(true);

  // ── Shake + zoom transform ──
  const zoom = s.hitStop > 0 ? 1 + 0.03 * (s.hitStop / 0.07) : 1;
  const shake = s.shake || 0;
  canvas.save();
  if (zoom !== 1) {
    canvas.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    canvas.scale(zoom, zoom);
    canvas.translate(-GAME_WIDTH / 2, -GAME_HEIGHT / 2);
  }
  if (shake > 0) {
    canvas.translate((Math.random() - 0.5) * shake * 16, (Math.random() - 0.5) * shake * 16);
  }

  // ── 1. Field background ──
  p.setStyle(PaintStyle.Fill);
  const bgShader = Skia.Shader.MakeLinearGradient(
    { x: 0, y: 0 },
    { x: 0, y: GAME_HEIGHT },
    [Skia.Color('#f8fafc'), Skia.Color('#ffffff'), Skia.Color('#f1f5f9')],
    [0, 0.5, 1],
    TileMode.Clamp,
  );
  p.setShader(bgShader);
  canvas.drawRect(Skia.XYWHRect(0, 0, GAME_WIDTH, GAME_HEIGHT), p);
  p.setShader(null);

  // Side tints
  p.setColor(Skia.Color('rgba(244,63,94,0.05)'));
  canvas.drawRect(Skia.XYWHRect(0, 0, GAME_WIDTH, WALL_Y - WALL_THICKNESS / 2), p);
  p.setColor(Skia.Color('rgba(59,130,246,0.05)'));
  canvas.drawRect(Skia.XYWHRect(0, WALL_Y + WALL_THICKNESS / 2, GAME_WIDTH, GAME_HEIGHT - WALL_Y), p);

  // Grid lines
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1);
  p.setColor(Skia.Color('rgba(15,23,42,0.04)'));
  for (let x = 0; x < GAME_WIDTH; x += 60) {
    const gPath = Skia.Path.Make();
    gPath.moveTo(x, 0);
    gPath.lineTo(x, GAME_HEIGHT);
    canvas.drawPath(gPath, p);
  }
  for (let y = 0; y < GAME_HEIGHT; y += 60) {
    const gPath = Skia.Path.Make();
    gPath.moveTo(0, y);
    gPath.lineTo(GAME_WIDTH, y);
    canvas.drawPath(gPath, p);
  }
  p.setStyle(PaintStyle.Fill);

  // Freeze overlay
  if (s.player.effects.freeze) {
    p.setColor(Skia.Color('rgba(103,232,249,0.12)'));
    canvas.drawRect(Skia.XYWHRect(0, WALL_Y, GAME_WIDTH, GAME_HEIGHT - WALL_Y), p);
  }

  // ── 2. Wall ──
  drawWall(canvas, p);

  // ── 3. Stations ──
  const playerSkinId = ui.playerSkins?.station;
  const oppSkinId = ui.oppSkins?.station;

  drawStation(
    canvas,
    { x: PLAYER_STATION_X, y: PLAYER_STATION_Y },
    s.player.station.hp,
    s.player.station.maxHp,
    '#3b82f6',
    !!(s.player.station.shieldHp && s.player.station.shieldHp > 0),
    (s as any).playerFlash ?? 0,
    'bottom',
    playerSkinId,
    p,
  );
  drawStation(
    canvas,
    { x: OPP_STATION_X, y: OPP_STATION_Y },
    s.opponent.station.hp,
    s.opponent.station.maxHp,
    '#f43f5e',
    !!(s.opponent.station.shieldHp && s.opponent.station.shieldHp > 0),
    (s as any).oppFlash ?? 0,
    'top',
    oppSkinId,
    p,
  );

  // ── 4. Side towers ──
  for (const st of s.player.sideTowers) {
    drawSideTower(canvas, st, '#3b82f6', 'bottom', p);
  }
  for (const st of s.opponent.sideTowers) {
    drawSideTower(canvas, st, '#f43f5e', 'top', p);
  }

  // ── 5. Edit mode dim ──
  const isEditMode = ui.editMode ?? s.editMode;
  if (isEditMode) {
    p.setColor(Skia.Color('rgba(15,23,42,0.38)'));
    canvas.drawRect(Skia.XYWHRect(0, 0, GAME_WIDTH, GAME_HEIGHT), p);
  }

  // ── 6. Glue puddles ──
  for (const g of s.glues) {
    drawGluePuddle(canvas, g, p);
  }

  // ── 7. Zones ──
  for (const z of s.zones) {
    drawZone(canvas, z, p);
  }

  // ── 8. Magnets ──
  for (const m of s.magnets) {
    drawMagnet(canvas, m, p);
  }

  // ── 9. Towers (opponent first, then player) ──
  const activeSelectedTower = ui.selectedTower ?? s.player.selectedTower;
  for (const t of s.opponent.towers) {
    const skinId = ui.oppSkins?.tower;
    drawFantasyTower(canvas, { ...t, isPlayer: false }, 'top', isEditMode, activeSelectedTower as string | null, skinId, p);
  }
  for (const t of s.player.towers) {
    const skinId = ui.playerSkins?.tower;
    drawFantasyTower(canvas, { ...t, isPlayer: true }, 'bottom', isEditMode, activeSelectedTower as string | null, skinId, p);
  }

  // ── 10. Targeting highlights ──
  if (s.targeting) {
    for (const tid of s.targeting.targets) {
      const orb = s.orbs.find((o) => o.id === tid);
      if (!orb) continue;
      p.setColor(Skia.Color('rgba(168,85,247,0.12)'));
      canvas.drawCircle(orb.x, orb.y, orb.radius + 12, p);
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(2);
      p.setColor(Skia.Color('rgba(168,85,247,0.8)'));
      canvas.drawCircle(orb.x, orb.y, orb.radius + 12, p);
      p.setStyle(PaintStyle.Fill);
    }
  }

  // ── 11. Orbs ──
  for (const orb of s.orbs) {
    const isStealth = orb.stealth || orb.type === 'shadow' || orb.type === 'phantom';
    if (isStealth) {
      canvas.save();
      p.setAlphaf(0.45);
    }
    drawOrb(canvas, orb, now, p, font);
    if (isStealth) {
      p.setAlphaf(1);
      canvas.restore();
    }
  }

  // ── 12. Coin pickups ──
  for (const c of s.coinPickups) {
    drawCoinPickup(canvas, c, now, p);
  }

  // ── 13. Projectiles ──
  for (const proj of s.projectiles) {
    drawProjectile(canvas, proj, p);
  }

  // ── 14. Meteors ──
  for (const m of s.meteors) {
    drawMeteor(canvas, m, p);
  }

  // ── 15. Effects ──
  for (const e of s.effects) {
    drawEffect(canvas, e, now, p, font);
  }

  // ── 16. Particles ──
  for (const particle of s.particles) {
    drawParticle(canvas, particle, p);
  }

  // ── 17. Floaters ──
  for (const f of s.floaters) {
    drawFloater(canvas, f, p, font);
  }

  // ── 18. Aiming reticle ──
  if (s.aiming) {
    drawAimReticle(canvas, s.aiming, p);
  }

  // ── 19. Tower placement preview ──
  if (ui.placingTower && ui.previewPos) {
    const def = TOWER_TYPES[ui.placingTower as keyof typeof TOWER_TYPES];
    if (def) {
      const { col, row, x: gx, y: gy } = snapToGrid(ui.previewPos.x, ui.previewPos.y);
      const occupied = s.player.towers.some((t) => {
        const tc = snapToGrid(t.x, t.y);
        return tc.col === col && tc.row === row;
      });
      const inBounds = gy > WALL_Y + WALL_THICKNESS && gy < GAME_HEIGHT - 24 && gx > 20 && gx < GAME_WIDTH - 20;
      const ok = !occupied && inBounds;
      p.setColor(Skia.Color(ok ? 'rgba(59,130,246,0.18)' : 'rgba(244,63,94,0.18)'));
      canvas.drawRect(Skia.XYWHRect(gx - GRID_SIZE / 2, gy - GRID_SIZE / 2, GRID_SIZE, GRID_SIZE), p);
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(2);
      p.setColor(Skia.Color((ok ? def.color : '#f43f5e') + '80'));
      canvas.drawCircle(gx, gy, def.range, p);
      p.setStyle(PaintStyle.Fill);
    }
  }

  // ── 20. Shield dome ──
  if (s.player.effects.shield) {
    drawShieldDome(canvas, { x: PLAYER_STATION_X, y: PLAYER_STATION_Y }, p);
  }

  // ── 21. Rage vignette ──
  if (s.player.effects.rage) {
    drawRageVignette(canvas, p);
  }

  canvas.restore(); // end shake/zoom

  // ── 22. Flash overlay (no shake) ──
  const flash = (s as any).flash ?? 0;
  if (flash > 0) {
    p.setColor(Skia.Color('#ffffff'));
    p.setAlphaf(Math.min(0.85, flash));
    canvas.drawRect(Skia.XYWHRect(0, 0, GAME_WIDTH, GAME_HEIGHT), p);
    p.setAlphaf(1);
  }

  // ── 23. Escalation border ──
  if (s.escalationTier !== 'none') {
    const escColor = ESCALATION_COLORS[s.escalationTier] ?? '#EF4444';
    drawOvertimeBanner(canvas, s.escalationTier, p, font);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(6);
    p.setColor(Skia.Color(escColor + '55'));
    canvas.drawRect(Skia.XYWHRect(0, 0, GAME_WIDTH, GAME_HEIGHT), p);
    p.setStyle(PaintStyle.Fill);
  }
}

// ─── GameCanvasInner ──────────────────────────────────────────────────────────

export const GameCanvasInner = React.memo(function GameCanvasInner({
  state,
  width,
  height,
  onOrbTap,
  onFieldTap,
  onTowerTap,
  onCoinTap,
  isAiming,
  aimingAbility,
  placingTower,
  previewPos,
  editMode: editModeProp,
  selectedTower: selectedTowerProp,
  playerSkins,
  oppSkins,
}: GameCanvasProps) {
  const boldFont = useFont(require('../assets/fonts/SpaceMono-Bold.ttf'), 16);
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const scaleX = GAME_WIDTH / width;
  const scaleY = GAME_HEIGHT / height;

  // Stable refs for UI options (avoid re-creating RAF loop on every render)
  const uiRef = useRef<DrawUI>({});
  uiRef.current = {
    isAiming,
    aimingAbility,
    placingTower,
    previewPos,
    editMode: editModeProp,
    selectedTower: selectedTowerProp,
    playerSkins,
    oppSkins,
  };

  useEffect(() => {
    if (!boldFont) return;
    let rafId: number;
    const render = () => {
      const s = stateRef.current;
      if (!s) {
        rafId = requestAnimationFrame(render);
        return;
      }
      const recorder = Skia.PictureRecorder();
      const c = recorder.beginRecording(Skia.XYWHRect(0, 0, GAME_WIDTH, GAME_HEIGHT));
      const now = Date.now();
      drawFrame(c, s, now, boldFont, uiRef.current);
      const pic = recorder.finishRecordingAsPicture();
      setPicture(pic);
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [boldFont]);

  // ── Tap gesture ──────────────────────────────────────────────────────────────
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      const tapX = e.x;
      const tapY = e.y;
      const gameX = tapX * scaleX;
      const gameY = tapY * scaleY;
      const s = stateRef.current;
      if (!s) return;

      console.log('[GameCanvas] tap at canvas', tapX.toFixed(1), tapY.toFixed(1), '→ game', gameX.toFixed(1), gameY.toFixed(1));

      // Check coin pickups first
      for (const coin of s.coinPickups) {
        if (Math.hypot(coin.x - gameX, coin.y - gameY) < 28) {
          console.log('[GameCanvas] tapped coin', coin.id);
          onCoinTap?.(coin.id);
          return;
        }
      }

      // Check towers (player only)
      for (const tower of s.player.towers) {
        if (Math.hypot(tower.x - gameX, tower.y - gameY) < 24) {
          console.log('[GameCanvas] tapped tower', tower.id, tower.type);
          onTowerTap?.(tower.id);
          return;
        }
      }

      // Check orbs
      for (const orb of s.orbs) {
        if (orb.hp > 0 && Math.hypot(orb.x - gameX, orb.y - gameY) < orb.radius + 8) {
          console.log('[GameCanvas] tapped orb', orb.id, orb.type);
          onOrbTap(orb.id);
          return;
        }
      }

      console.log('[GameCanvas] tapped field at game coords', gameX.toFixed(1), gameY.toFixed(1));
      onFieldTap(gameX, gameY);
    });

  // ── Canvas content ───────────────────────────────────────────────────────────
  const canvasContent = (
    <Canvas style={{ width, height }}>
      {picture && <Picture picture={picture} />}
    </Canvas>
  );

  // ── RN overlays (floaters, combo, escalation) ────────────────────────────────
  const wallY = (WALL_Y / GAME_HEIGHT) * height;
  const comboOpacity = Math.min(1, state.comboTimer / 500);
  const showCombo = state.combo >= 2 && state.comboTimer > 0;
  const showEscalation = state.escalationTier !== 'none';
  const escalationLabel = ESCALATION_LABELS[state.escalationTier] ?? state.escalationTier.toUpperCase();
  const escalationColor = ESCALATION_COLORS[state.escalationTier] ?? '#EF4444';

  const overlays = (
    <>
      {/* Floaters */}
      {state.floaters.map((floater: Floater) => {
        const alpha = Math.max(0, floater.timer / floater.maxTimer);
        if (alpha <= 0) return null;
        const fx = (floater.x / GAME_WIDTH) * width;
        const fy = (floater.y / GAME_HEIGHT) * height;
        return (
          <Text
            key={floater.id}
            style={{
              position: 'absolute',
              left: fx - 24,
              top: fy - floater.fontSize / 2,
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

      {/* Escalation banner */}
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
          <Text style={{ fontSize: 11, fontWeight: '900', color: escalationColor, letterSpacing: 1.5 }}>
            {escalationLabel}
          </Text>
        </View>
      )}

      {/* Combo display */}
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
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#FCD34D', opacity: comboOpacity }}>
            {state.combo}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#FCD34D', opacity: comboOpacity, letterSpacing: 1 }}>
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
          const gameX = tapX * scaleX;
          const gameY = tapY * scaleY;
          const s = stateRef.current;
          if (!s) return;

          console.log('[GameCanvas] web tap at canvas', tapX.toFixed(1), tapY.toFixed(1), '→ game', gameX.toFixed(1), gameY.toFixed(1));

          for (const coin of s.coinPickups) {
            if (Math.hypot(coin.x - gameX, coin.y - gameY) < 28) {
              console.log('[GameCanvas] web tapped coin', coin.id);
              onCoinTap?.(coin.id);
              return;
            }
          }
          for (const tower of s.player.towers) {
            if (Math.hypot(tower.x - gameX, tower.y - gameY) < 24) {
              console.log('[GameCanvas] web tapped tower', tower.id, tower.type);
              onTowerTap?.(tower.id);
              return;
            }
          }
          for (const orb of s.orbs) {
            if (orb.hp > 0 && Math.hypot(orb.x - gameX, orb.y - gameY) < orb.radius + 8) {
              console.log('[GameCanvas] web tapped orb', orb.id, orb.type);
              onOrbTap(orb.id);
              return;
            }
          }
          console.log('[GameCanvas] web tapped field at game coords', gameX.toFixed(1), gameY.toFixed(1));
          onFieldTap(gameX, gameY);
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
