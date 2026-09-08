import React, { useMemo } from 'react';
import {
  Canvas,
  Circle,
  Rect,
  Path,
  Group,
  Text as SkiaText,
  useFont,
  LinearGradient,
  vec,
  RoundedRect,
  Line,
  Oval,
  Paint,
  Skia,
  BlurMask,
  DashPathEffect,
} from '@shopify/react-native-skia';
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
  PLAYER_STATION_X,
  PLAYER_STATION_Y,
  OPP_STATION_X,
  OPP_STATION_Y,
} from '@/game/constants';
import { getOrbColor, getTowerColor } from '@/game/engine-helpers';

interface GameCanvasProps {
  state: GameState;
  width: number;
  height: number;
  onOrbTap: (orbId: string) => void;
  onFieldTap: (x: number, y: number) => void;
}

export function GameCanvas({ state, width, height }: GameCanvasProps) {
  const scaleX = width / GAME_WIDTH;
  const scaleY = height / GAME_HEIGHT;

  const sx = (x: number) => x * scaleX;
  const sy = (y: number) => y * scaleY;
  const sr = (r: number) => r * Math.min(scaleX, scaleY);

  const wallY = sy(WALL_Y);
  const timer = state.time;

  // Shake offset
  const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 4 : 0;
  const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 4 : 0;

  return (
    <Canvas style={{ width, height }}>
      <Group transform={[{ translateX: shakeX }, { translateY: shakeY }]}>

        {/* ── Layer 1: Field background ── */}
        {/* Opponent side (top) — rose-50 */}
        <Rect x={0} y={0} width={width} height={wallY}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, wallY)}
            colors={['#FFF1F2', '#FFE4E6']}
          />
        </Rect>
        {/* Player side (bottom) — white */}
        <Rect x={0} y={wallY} width={width} height={height - wallY}>
          <LinearGradient
            start={vec(0, wallY)}
            end={vec(0, height)}
            colors={['#FFFFFF', '#F8FAFC']}
          />
        </Rect>

        {/* Grid lines */}
        <GridLines width={width} height={height} scaleX={scaleX} scaleY={scaleY} />

        {/* ── Layer 2: Freeze overlay ── */}
        {state.player.effects.freeze && (
          <Rect
            x={0}
            y={wallY}
            width={width}
            height={height - wallY}
            color="rgba(96,165,250,0.15)"
          />
        )}

        {/* ── Layer 3: Wall ── */}
        <WallLayer wallY={wallY} width={width} scaleX={scaleX} />

        {/* ── Layer 4: Stations ── */}
        <StationShape
          station={state.player.station}
          sx={sx}
          sy={sy}
          sr={sr}
          color="#4F8EF7"
        />
        <StationShape
          station={state.opponent.station}
          sx={sx}
          sy={sy}
          sr={sr}
          color="#EF4444"
        />

        {/* ── Layer 5: Side towers ── */}
        {state.player.sideTowers.map(st => (
          <SideTowerShape key={st.id} tower={st} sx={sx} sy={sy} sr={sr} />
        ))}
        {state.opponent.sideTowers.map(st => (
          <SideTowerShape key={st.id} tower={st} sx={sx} sy={sy} sr={sr} />
        ))}

        {/* ── Layer 6: Edit mode overlay ── */}
        {state.editMode && (
          <Rect x={0} y={0} width={width} height={height} color="rgba(0,0,0,0.4)" />
        )}

        {/* ── Layer 7: Towers ── */}
        {state.player.towers.map(t => (
          <TowerShape key={t.id} tower={t} sx={sx} sy={sy} sr={sr} />
        ))}
        {state.opponent.towers.map(t => (
          <TowerShape key={t.id} tower={t} sx={sx} sy={sy} sr={sr} />
        ))}

        {/* ── Layer 8: Targeting highlights ── */}
        {state.targeting && state.targeting.targets.map(tid => {
          const orb = state.orbs.find(o => o.id === tid);
          if (!orb) return null;
          const pulse = 0.5 + 0.5 * Math.sin(timer * 0.008);
          return (
            <Circle
              key={tid}
              cx={sx(orb.x)}
              cy={sy(orb.y)}
              r={sr(orb.radius + 8 + pulse * 4)}
              color={`rgba(168,85,247,${0.4 + pulse * 0.3})`}
            />
          );
        })}

        {/* ── Layer 9: Orbs ── */}
        {state.orbs.map(orb => (
          <OrbShape key={orb.id} orb={orb} sx={sx} sy={sy} sr={sr} timer={timer} />
        ))}

        {/* ── Layer 10: Coin pickups ── */}
        {state.coinPickups.map(coin => (
          <CoinShape key={coin.id} coin={coin} sx={sx} sy={sy} sr={sr} timer={timer} />
        ))}

        {/* ── Layer 11: Projectiles ── */}
        {state.projectiles.map(proj => (
          <ProjectileShape key={proj.id} proj={proj} sx={sx} sy={sy} sr={sr} />
        ))}

        {/* ── Layer 12: Effects ── */}
        {state.effects.map(effect => (
          <EffectShape key={effect.id} effect={effect} sx={sx} sy={sy} sr={sr} />
        ))}

        {/* ── Layer 13: Particles ── */}
        {state.particles.map(p => {
          const alpha = Math.max(0, p.alpha);
          if (alpha <= 0) return null;
          const col = hexToRgba(p.color, alpha);
          return (
            <Circle key={p.id} cx={sx(p.x)} cy={sy(p.y)} r={Math.max(1, sr(p.radius))} color={col} />
          );
        })}

        {/* ── Layer 14: Floaters ── */}
        {state.floaters.map(f => {
          const alpha = Math.max(0, f.timer / f.maxTimer);
          if (alpha <= 0) return null;
          const col = hexToRgba(f.color, alpha);
          return (
            <FloaterText key={f.id} floater={f} sx={sx} sy={sy} color={col} />
          );
        })}

        {/* ── Layer 15: Meteors ── */}
        {state.meteors.map(m => (
          <MeteorShape key={m.id} meteor={m} sx={sx} sy={sy} sr={sr} />
        ))}

        {/* ── Layer 16: Glues / Zones / Magnets ── */}
        {state.glues.map(g => (
          <Circle
            key={g.id}
            cx={sx(g.x)}
            cy={sy(g.y)}
            r={sr(g.radius)}
            color="rgba(120,83,60,0.35)"
          />
        ))}
        {state.zones.map(z => {
          const zoneColor = z.type === 'damage'
            ? 'rgba(239,68,68,0.25)'
            : z.type === 'slow'
            ? 'rgba(96,165,250,0.25)'
            : 'rgba(34,197,94,0.25)';
          const borderColor = z.type === 'damage'
            ? 'rgba(239,68,68,0.6)'
            : z.type === 'slow'
            ? 'rgba(96,165,250,0.6)'
            : 'rgba(34,197,94,0.6)';
          return (
            <Group key={z.id}>
              <Circle cx={sx(z.x)} cy={sy(z.y)} r={sr(z.radius)} color={zoneColor} />
              <Circle cx={sx(z.x)} cy={sy(z.y)} r={sr(z.radius)} color="transparent" style="stroke" strokeWidth={1.5}>
                <Paint color={borderColor} />
              </Circle>
            </Group>
          );
        })}
        {state.magnets.map(m => {
          const pulse = 0.5 + 0.5 * Math.sin(timer * 0.006);
          return (
            <Circle
              key={m.id}
              cx={sx(m.x)}
              cy={sy(m.y)}
              r={sr(m.radius)}
              color={`rgba(192,132,252,${0.15 + pulse * 0.1})`}
            />
          );
        })}

        {/* ── Layer 17: Aiming crosshair ── */}
        {state.aiming && (
          <AimingOverlay aiming={state.aiming} sx={sx} sy={sy} sr={sr} timer={timer} />
        )}

        {/* ── Layer 18: Escalation banner ── */}
        {state.escalationTier !== 'none' && (
          <EscalationBanner tier={state.escalationTier} width={width} height={height} timer={timer} />
        )}

        {/* ── Combo display ── */}
        {state.combo >= 2 && (
          <ComboDisplay combo={state.combo} comboTimer={state.comboTimer} width={width} wallY={wallY} height={height} />
        )}

      </Group>
    </Canvas>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GridLines({ width, height, scaleX, scaleY }: { width: number; height: number; scaleX: number; scaleY: number }) {
  const lines: React.ReactNode[] = [];
  const step = 60;
  const color = 'rgba(148,163,184,0.12)';

  for (let gx = step; gx < GAME_WIDTH; gx += step) {
    const px = gx * scaleX;
    lines.push(<Line key={`vl${gx}`} p1={vec(px, 0)} p2={vec(px, height)} color={color} strokeWidth={1} />);
  }
  for (let gy = step; gy < GAME_HEIGHT; gy += step) {
    const py = gy * scaleY;
    lines.push(<Line key={`hl${gy}`} p1={vec(0, py)} p2={vec(width, py)} color={color} strokeWidth={1} />);
  }
  return <>{lines}</>;
}

function WallLayer({ wallY, width, scaleX }: { wallY: number; width: number; scaleX: number }) {
  const wallH = 12;
  const brickW = 40 * scaleX;
  const bricks: React.ReactNode[] = [];
  let offset = 0;
  let col = 0;
  while (offset < width) {
    const bw = Math.min(brickW, width - offset);
    bricks.push(
      <Rect
        key={`b${col}`}
        x={offset + 1}
        y={wallY - wallH / 2 + 1}
        width={bw - 2}
        height={wallH - 2}
        color={col % 2 === 0 ? '#334155' : '#3D4F63'}
      />
    );
    offset += brickW;
    col++;
  }

  return (
    <>
      {/* Shadow above */}
      <Rect x={0} y={wallY - wallH / 2 - 3} width={width} height={3} color="rgba(51,65,85,0.15)" />
      {/* Wall body — slate-700 */}
      <Rect x={0} y={wallY - wallH / 2} width={width} height={wallH} color="#334155" />
      {/* Bricks */}
      {bricks}
      {/* Top edge highlight */}
      <Rect x={0} y={wallY - wallH / 2} width={width} height={2} color="#475569" />
      {/* Shadow below */}
      <Rect x={0} y={wallY + wallH / 2} width={width} height={3} color="rgba(51,65,85,0.15)" />
    </>
  );
}

function StationShape({
  station,
  sx,
  sy,
  sr,
  color,
}: {
  station: Station;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
  color: string;
}) {
  const cx = sx(station.x);
  const cy = sy(station.y);
  const r = sr(35);
  const hpPct = station.maxHp > 0 ? Math.max(0, station.hp / station.maxHp) : 0;
  const barColor = hpPct > 0.6 ? '#22C55E' : hpPct > 0.3 ? '#F59E0B' : '#EF4444';
  const barW = r * 2.2;
  const barH = 5;
  const barX = cx - barW / 2;
  const barY = cy + r + 6;

  // Hexagon path
  const hexPath = Skia.Path.Make();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) hexPath.moveTo(px, py);
    else hexPath.lineTo(px, py);
  }
  hexPath.close();

  return (
    <>
      {/* Shield ring */}
      {station.shieldHp && station.shieldHp > 0 && (
        <Circle cx={cx} cy={cy} r={r + 8} color="rgba(96,165,250,0.25)" />
      )}
      {/* Hex fill */}
      <Path path={hexPath} color={`${color}22`} />
      {/* Hex border */}
      <Path path={hexPath} color={color} style="stroke" strokeWidth={2} />
      {/* Inner emblem — simple diamond */}
      <Path
        path={(() => {
          const p = Skia.Path.Make();
          p.moveTo(cx, cy - r * 0.45);
          p.lineTo(cx + r * 0.3, cy);
          p.lineTo(cx, cy + r * 0.45);
          p.lineTo(cx - r * 0.3, cy);
          p.close();
          return p;
        })()}
        color={`${color}88`}
      />
      {/* HP bar */}
      <Rect x={barX} y={barY} width={barW} height={barH} color="rgba(255,255,255,0.08)" />
      <Rect x={barX} y={barY} width={barW * hpPct} height={barH} color={barColor} />
    </>
  );
}

function SideTowerShape({
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
  const barColor = hpPct > 0.6 ? '#22C55E' : hpPct > 0.3 ? '#F59E0B' : '#EF4444';
  const towerColor = tower.frozen ? '#BAE6FD' : '#6B7280';

  return (
    <>
      <Rect x={cx - half} y={cy - half} width={half * 2} height={half * 2} color={towerColor} />
      <Rect x={cx - half} y={cy - half} width={half * 2} height={half * 2} color="transparent" style="stroke" strokeWidth={1}>
        <Paint color="rgba(255,255,255,0.2)" />
      </Rect>
      {/* HP bar */}
      <Rect x={cx - half} y={cy - half - 6} width={half * 2} height={3} color="rgba(255,255,255,0.08)" />
      <Rect x={cx - half} y={cy - half - 6} width={half * 2 * hpPct} height={3} color={barColor} />
    </>
  );
}

function TowerShape({
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
  const baseR = sr(14);
  const color = getTowerColor(tower.type);
  const hpPct = tower.maxHp > 0 ? Math.max(0, tower.hp / tower.maxHp) : 0;
  const barColor = hpPct > 0.6 ? '#22C55E' : hpPct > 0.3 ? '#F59E0B' : '#EF4444';

  const tintColor = tower.frozen
    ? '#BAE6FD'
    : tower.poisoned
    ? '#84CC16'
    : tower.overclocked
    ? '#FCD34D'
    : color;

  const shape = buildTowerPath(tower.type, cx, cy, baseR);

  return (
    <>
      {/* Overclock glow */}
      {tower.overclocked && (
        <Path path={shape} color={`${tintColor}30`}>
          <BlurMask blur={6} style="normal" />
        </Path>
      )}
      {/* Tower body */}
      <Path path={shape} color={`${tintColor}33`} />
      <Path path={shape} color={tintColor} style="stroke" strokeWidth={1.5} />
      {/* Level badge */}
      <Circle cx={cx + baseR - 2} cy={cy - baseR + 2} r={sr(5)} color="#1F2937" />
      <Circle cx={cx + baseR - 2} cy={cy - baseR + 2} r={sr(5)} color={tintColor} style="stroke" strokeWidth={1} />
      {/* HP bar */}
      <Rect x={cx - baseR} y={cy - baseR - 7} width={baseR * 2} height={3} color="rgba(255,255,255,0.08)" />
      <Rect x={cx - baseR} y={cy - baseR - 7} width={baseR * 2 * hpPct} height={3} color={barColor} />
    </>
  );
}

function buildTowerPath(type: string, cx: number, cy: number, r: number) {
  const p = Skia.Path.Make();

  switch (type) {
    case 'blaster': {
      // Circle with cross
      p.addCircle(cx, cy, r);
      break;
    }
    case 'vulcan': {
      // Wide rectangle
      p.addRect(Skia.XYWHRect(cx - r * 1.2, cy - r * 0.7, r * 2.4, r * 1.4));
      break;
    }
    case 'lancer':
    case 'piercer': {
      // Tall thin rectangle
      p.addRect(Skia.XYWHRect(cx - r * 0.4, cy - r * 1.3, r * 0.8, r * 2.6));
      break;
    }
    case 'mortar':
    case 'orb_mortar':
    case 'lava_mortar': {
      // Dome (semicircle approximated as arc)
      p.moveTo(cx - r, cy);
      p.arcToOval(Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2), 180, 180, false);
      p.close();
      break;
    }
    case 'glacier':
    case 'cryo': {
      // Star/snowflake — 6 points
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const bx = cx + r * Math.cos(a);
        const by = cy + r * Math.sin(a);
        const mx = cx + r * 0.35 * Math.cos(a + Math.PI / 6);
        const my = cy + r * 0.35 * Math.sin(a + Math.PI / 6);
        if (i === 0) { p.moveTo(cx, cy); p.lineTo(bx, by); }
        else { p.moveTo(cx, cy); p.lineTo(bx, by); }
        p.moveTo(mx, my);
        p.lineTo(cx + r * Math.cos(a + Math.PI / 3), cy + r * Math.sin(a + Math.PI / 3));
      }
      break;
    }
    case 'arc':
    case 'tesla': {
      // Lightning bolt shape
      p.moveTo(cx + r * 0.3, cy - r);
      p.lineTo(cx - r * 0.1, cy - r * 0.1);
      p.lineTo(cx + r * 0.4, cy - r * 0.1);
      p.lineTo(cx - r * 0.3, cy + r);
      p.lineTo(cx + r * 0.1, cy + r * 0.1);
      p.lineTo(cx - r * 0.4, cy + r * 0.1);
      p.close();
      break;
    }
    case 'pyre':
    case 'detonator': {
      // Triangle
      p.moveTo(cx, cy - r);
      p.lineTo(cx + r * 0.87, cy + r * 0.5);
      p.lineTo(cx - r * 0.87, cy + r * 0.5);
      p.close();
      break;
    }
    case 'venom': {
      // Teardrop
      p.moveTo(cx, cy - r);
      p.cubicTo(cx + r * 0.8, cy - r * 0.5, cx + r * 0.8, cy + r * 0.5, cx, cy + r);
      p.cubicTo(cx - r * 0.8, cy + r * 0.5, cx - r * 0.8, cy - r * 0.5, cx, cy - r);
      p.close();
      break;
    }
    case 'siege': {
      // Large fortress square with notches
      p.addRect(Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2));
      break;
    }
    case 'boomerang': {
      // Curved arc
      p.moveTo(cx - r, cy);
      p.arcToOval(Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2), 180, -180, false);
      p.close();
      break;
    }
    case 'seeker': {
      // Elongated oval
      p.addOval(Skia.XYWHRect(cx - r * 0.5, cy - r, r, r * 2));
      break;
    }
    case 'prism_lance': {
      // Diamond
      p.moveTo(cx, cy - r);
      p.lineTo(cx + r * 0.6, cy);
      p.lineTo(cx, cy + r);
      p.lineTo(cx - r * 0.6, cy);
      p.close();
      break;
    }
    case 'twin': {
      // Two small circles
      p.addCircle(cx - r * 0.5, cy, r * 0.6);
      p.addCircle(cx + r * 0.5, cy, r * 0.6);
      break;
    }
    case 'magnet':
    case 'repulsor': {
      // U-shape (horseshoe)
      p.moveTo(cx - r, cy);
      p.arcToOval(Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2), 180, -180, false);
      p.lineTo(cx + r, cy + r * 0.4);
      p.lineTo(cx + r * 0.6, cy + r * 0.4);
      p.lineTo(cx + r * 0.6, cy);
      p.moveTo(cx - r, cy);
      p.lineTo(cx - r, cy + r * 0.4);
      p.lineTo(cx - r * 0.6, cy + r * 0.4);
      p.lineTo(cx - r * 0.6, cy);
      break;
    }
    default: {
      // Octagon
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i - Math.PI / 8;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) p.moveTo(px, py);
        else p.lineTo(px, py);
      }
      p.close();
    }
  }
  return p;
}

function OrbShape({
  orb,
  sx,
  sy,
  sr,
  timer,
}: {
  orb: Orb;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
  timer: number;
}) {
  const cx = sx(orb.x);
  const cy = sy(orb.y);
  const r = sr(orb.radius);
  const color = getOrbColor(orb.type);

  const isStealth = orb.stealth || orb.type === 'shadow' || orb.type === 'phantom';
  const alpha = isStealth ? 0.45 : 1;
  const fillColor = hexToRgba(color, alpha * 0.35);
  const strokeColor = hexToRgba(color, alpha);

  // Status tints
  const tintColor = orb.frozen
    ? 'rgba(186,230,253,0.4)'
    : orb.poisoned
    ? 'rgba(132,204,22,0.35)'
    : orb.burning
    ? 'rgba(249,115,22,0.35)'
    : null;

  // Growth pulse
  const growthScale = orb.growthTimer ? 1 + 0.15 * Math.sin(timer * 0.01) : 1;
  const displayR = r * growthScale;

  // Berserker glow (low HP)
  const hpPct = orb.maxHp > 0 ? orb.hp / orb.maxHp : 1;
  const isBerserker = orb.type === 'berserker' && hpPct < 0.4;

  return (
    <>
      {/* Berserker glow */}
      {isBerserker && (
        <Circle cx={cx} cy={cy} r={displayR + 5} color="rgba(252,129,129,0.3)">
          <BlurMask blur={4} style="normal" />
        </Circle>
      )}
      {/* Shield ring */}
      {orb.shieldHp && orb.shieldHp > 0 && (
        <Circle cx={cx} cy={cy} r={displayR + 5} color="rgba(147,197,253,0.35)" />
      )}
      {/* Armored metallic border */}
      {orb.type === 'armored' && (
        <Circle cx={cx} cy={cy} r={displayR + 2} color="rgba(120,113,108,0.5)" />
      )}
      {/* Main orb fill */}
      <Circle cx={cx} cy={cy} r={displayR} color={fillColor} />
      {/* Status tint */}
      {tintColor && <Circle cx={cx} cy={cy} r={displayR} color={tintColor} />}
      {/* Orb stroke */}
      <Circle cx={cx} cy={cy} r={displayR} color={strokeColor} style="stroke" strokeWidth={isStealth ? 1 : 1.5} />
      {/* HP bar (only if damaged) */}
      {orb.hp < orb.maxHp && (
        <OrbHpBar cx={cx} cy={cy} r={displayR} hp={orb.hp} maxHp={orb.maxHp} />
      )}
    </>
  );
}

function OrbHpBar({ cx, cy, r, hp, maxHp }: { cx: number; cy: number; r: number; hp: number; maxHp: number }) {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const barW = r * 2.2;
  const barH = 3;
  const barX = cx - barW / 2;
  const barY = cy + r + 3;
  const barColor = pct > 0.6 ? '#22C55E' : pct > 0.3 ? '#F59E0B' : '#EF4444';

  return (
    <>
      <Rect x={barX} y={barY} width={barW} height={barH} color="rgba(0,0,0,0.5)" />
      <Rect x={barX} y={barY} width={barW * pct} height={barH} color={barColor} />
    </>
  );
}

function CoinShape({
  coin,
  sx,
  sy,
  sr,
  timer,
}: {
  coin: CoinPickup;
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
  timer: number;
}) {
  const cx = sx(coin.x);
  const cy = sy(coin.y);
  const pulse = 0.85 + 0.15 * Math.sin(timer * 0.007 + coin.x);
  const r = sr(8) * pulse;

  return (
    <>
      <Circle cx={cx} cy={cy} r={r} color="rgba(252,211,77,0.25)" />
      <Circle cx={cx} cy={cy} r={r} color="#FCD34D" style="stroke" strokeWidth={1.5} />
    </>
  );
}

function ProjectileShape({
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

  // Trail
  const trailElements: React.ReactNode[] = proj.trail.map((pt, i) => {
    const trailAlpha = (i / proj.trail.length) * 0.5;
    const trailR = Math.max(1, r * (i / proj.trail.length) * 0.7);
    const trailColor = hexToRgba(proj.color, trailAlpha);
    return (
      <Circle key={i} cx={sx(pt.x)} cy={sy(pt.y)} r={trailR} color={trailColor} />
    );
  });

  // Special projectile types
  if (proj.type === 'beam' || proj.type === 'prism_lance') {
    return (
      <>
        {trailElements}
        <Circle cx={cx} cy={cy} r={r} color={proj.color} />
      </>
    );
  }

  if (proj.type === 'missile' || proj.type === 'seeker') {
    return (
      <>
        {trailElements}
        <Oval x={cx - r * 0.6} y={cy - r * 1.4} width={r * 1.2} height={r * 2.8} color={proj.color} />
      </>
    );
  }

  return (
    <>
      {trailElements}
      <Circle cx={cx} cy={cy} r={r} color={proj.color} />
    </>
  );
}

function EffectShape({
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
  const progress = 1 - effect.timer / effect.maxTimer;
  const alpha = Math.max(0, effect.timer / effect.maxTimer);
  const baseR = sr(effect.radius ?? 30);
  const color = effect.color ?? '#F97316';

  switch (effect.type) {
    case 'explosion':
    case 'station_hit': {
      const r = baseR * (0.3 + progress * 0.7);
      return (
        <>
          <Circle cx={cx} cy={cy} r={r} color={hexToRgba(color, alpha * 0.4)}>
            <BlurMask blur={8} style="normal" />
          </Circle>
          <Circle cx={cx} cy={cy} r={r * 0.6} color={hexToRgba('#FFFFFF', alpha * 0.3)} />
        </>
      );
    }
    case 'freeze': {
      const r = baseR * (0.5 + progress * 0.5);
      return (
        <Circle cx={cx} cy={cy} r={r} color={hexToRgba('#BAE6FD', alpha * 0.35)} />
      );
    }
    case 'lightning': {
      return (
        <Circle cx={cx} cy={cy} r={baseR * 0.3} color={hexToRgba('#FDE68A', alpha)} />
      );
    }
    case 'portal': {
      const r = baseR * (0.4 + progress * 0.6);
      return (
        <Circle cx={cx} cy={cy} r={r} color="transparent" style="stroke" strokeWidth={3}>
          <Paint color={hexToRgba('#A855F7', alpha)} />
        </Circle>
      );
    }
    case 'zone': {
      return (
        <Circle cx={cx} cy={cy} r={baseR} color={hexToRgba(color, alpha * 0.3)} />
      );
    }
    default: {
      return (
        <Circle cx={cx} cy={cy} r={baseR * 0.4} color={hexToRgba(color, alpha * 0.6)} />
      );
    }
  }
}

function FloaterText({
  floater,
  sx,
  sy,
  color,
}: {
  floater: Floater;
  sx: (x: number) => number;
  sy: (y: number) => number;
  color: string;
}) {
  // SkiaText requires a font — we use a simple circle as fallback indicator
  // since loading fonts in Skia requires useFont hook at component level
  const cx = sx(floater.x);
  const cy = sy(floater.y);
  const r = Math.max(2, floater.fontSize * 0.3);

  return (
    <Circle cx={cx} cy={cy} r={r} color={color} />
  );
}

function MeteorShape({
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
  const r = sr(meteor.radius * 0.15);

  return (
    <>
      {/* Fire trail */}
      <Line
        p1={vec(curX, curY)}
        p2={vec(curX - (endX - startX) * 0.15, curY - (endY - startY) * 0.15)}
        color="rgba(249,115,22,0.5)"
        strokeWidth={r * 1.5}
      />
      {/* Meteor body */}
      <Circle cx={curX} cy={curY} r={r} color="#F97316">
        <BlurMask blur={3} style="normal" />
      </Circle>
      <Circle cx={curX} cy={curY} r={r * 0.6} color="#FCD34D" />
    </>
  );
}

function AimingOverlay({
  aiming,
  sx,
  sy,
  sr,
  timer,
}: {
  aiming: { abilityType: string; x: number; y: number };
  sx: (x: number) => number;
  sy: (y: number) => number;
  sr: (r: number) => number;
  timer: number;
}) {
  const cx = sx(aiming.x);
  const cy = sy(aiming.y);
  const pulse = 0.7 + 0.3 * Math.sin(timer * 0.01);
  const r = sr(70) * pulse;

  return (
    <>
      <Circle cx={cx} cy={cy} r={r} color="rgba(79,142,247,0.15)" />
      <Circle cx={cx} cy={cy} r={r} color="transparent" style="stroke" strokeWidth={2}>
        <Paint color={`rgba(79,142,247,${0.6 * pulse})`} />
      </Circle>
      {/* Crosshair */}
      <Line p1={vec(cx - r * 0.6, cy)} p2={vec(cx + r * 0.6, cy)} color="rgba(79,142,247,0.7)" strokeWidth={1} />
      <Line p1={vec(cx, cy - r * 0.6)} p2={vec(cx, cy + r * 0.6)} color="rgba(79,142,247,0.7)" strokeWidth={1} />
    </>
  );
}

function EscalationBanner({
  tier,
  width,
  height,
  timer,
}: {
  tier: string;
  width: number;
  height: number;
  timer: number;
}) {
  const labels: Record<string, string> = {
    overtime: 'OVERTIME',
    intensifying: 'INTENSIFYING',
    critical: 'CRITICAL',
    max_pressure: 'MAX PRESSURE',
    tower_bleed: 'TOWER BLEED',
  };
  const colors: Record<string, string> = {
    overtime: '#F59E0B',
    intensifying: '#F97316',
    critical: '#EF4444',
    max_pressure: '#DC2626',
    tower_bleed: '#7F1D1D',
  };

  const label = labels[tier] ?? tier.toUpperCase();
  const color = colors[tier] ?? '#EF4444';
  const pulse = 0.6 + 0.4 * Math.sin(timer * 0.004);

  return (
    <>
      <Rect
        x={width * 0.15}
        y={height * 0.45}
        width={width * 0.7}
        height={28}
        color={hexToRgba(color, 0.15 * pulse)}
      />
      <Rect
        x={width * 0.15}
        y={height * 0.45}
        width={width * 0.7}
        height={28}
        color="transparent"
        style="stroke"
        strokeWidth={1}
      >
        <Paint color={hexToRgba(color, 0.5 * pulse)} />
      </Rect>
    </>
  );
}

function ComboDisplay({
  combo,
  comboTimer,
  width,
  wallY,
  height,
}: {
  combo: number;
  comboTimer: number;
  width: number;
  wallY: number;
  height: number;
}) {
  const alpha = Math.min(1, comboTimer / 500);
  if (alpha <= 0) return null;

  const cx = width / 2;
  const cy = wallY + (height - wallY) * 0.35;
  const r = 12 + combo * 1.5;

  return (
    <Circle cx={cx} cy={cy} r={r} color={hexToRgba('#FCD34D', alpha * 0.4)} />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    // Already rgba — just return as-is (alpha override not applied for simplicity)
    return hex;
  }
  const clean = hex.replace('#', '');
  const len = clean.length;
  let r = 0, g = 0, b = 0;
  if (len === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (len >= 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}
