import React from 'react';
import { Platform, Pressable, View, Text } from 'react-native';
import {
  Canvas,
  Circle,
  Rect,
  Line,
  Text as SkiaText,
  useFont,
  LinearGradient,
  vec,
  Group,
  Paint,
  Skia,
  RoundedRect,
  Path,
  Fill,
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

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function alphaHex(alpha: number): string {
  return Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
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

// ─── GameCanvasInner ──────────────────────────────────────────────────────────

export function GameCanvasInner({
  state,
  width,
  height,
  onOrbTap,
  onFieldTap,
}: GameCanvasProps) {
  const scaleX = width / GAME_WIDTH;
  const scaleY = height / GAME_HEIGHT;
  const sx = (x: number) => x * scaleX;
  const sy = (y: number) => y * scaleY;
  const sr = (r: number) => r * Math.min(scaleX, scaleY);

  const wallY = sy(WALL_Y);

  const escalationLabel =
    ESCALATION_LABELS[state.escalationTier] ??
    state.escalationTier.toUpperCase();
  const escalationColor =
    ESCALATION_COLORS[state.escalationTier] ?? '#EF4444';

  // Build a tap gesture that dispatches to orb or field
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      const tapX = e.x;
      const tapY = e.y;
      const gameX = (tapX / width) * GAME_WIDTH;
      const gameY = (tapY / height) * GAME_HEIGHT;

      // Check if any orb was tapped
      let tappedOrb: Orb | null = null;
      for (const orb of state.orbs) {
        const ox = sx(orb.x);
        const oy = sy(orb.y);
        const r = sr(orb.radius) + 6; // slight hit-area expansion
        const dx = tapX - ox;
        const dy = tapY - oy;
        if (dx * dx + dy * dy <= r * r) {
          tappedOrb = orb;
          break;
        }
      }

      if (tappedOrb) {
        console.log('[GameCanvas] Orb tapped (Skia):', tappedOrb.id, tappedOrb.type);
        onOrbTap(tappedOrb.id);
      } else {
        console.log('[GameCanvas] Field tapped (Skia) at game coords:', gameX.toFixed(1), gameY.toFixed(1));
        onFieldTap(gameX, gameY);
      }
    });

  const canvasContent = (
    <Canvas style={{ width, height }}>
      {/* ── Background gradient ── */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={['#0A0E1A', '#111827']}
        />
      </Rect>

      {/* ── Opponent side tint ── */}
      <Rect x={0} y={0} width={width} height={wallY} color="rgba(239,68,68,0.06)" />

      {/* ── Player side tint ── */}
      <Rect x={0} y={wallY} width={width} height={height - wallY} color="rgba(79,142,247,0.04)" />

      {/* ── Freeze overlay ── */}
      {state.player.effects.freeze && (
        <Rect
          x={0}
          y={wallY}
          width={width}
          height={height - wallY}
          color="rgba(96,165,250,0.15)"
        />
      )}

      {/* ── Rage overlay ── */}
      {state.player.effects.rage && (
        <Rect
          x={0}
          y={wallY}
          width={width}
          height={height - wallY}
          color="rgba(239,68,68,0.08)"
        />
      )}

      {/* ── Shield overlay ── */}
      {state.player.effects.shield && (
        <Rect
          x={0}
          y={wallY}
          width={width}
          height={height - wallY}
          color="rgba(99,102,241,0.08)"
        />
      )}

      {/* ── Glues ── */}
      {state.glues.map((g: GlueState) => (
        <Circle
          key={g.id}
          cx={sx(g.x)}
          cy={sy(g.y)}
          r={sr(g.radius)}
          color="rgba(120,83,60,0.35)"
        />
      ))}

      {/* ── Zones ── */}
      {state.zones.map((z: ZoneState) => {
        const zoneColor =
          z.type === 'damage'
            ? 'rgba(239,68,68,0.25)'
            : z.type === 'slow'
            ? 'rgba(96,165,250,0.25)'
            : 'rgba(34,197,94,0.25)';
        const zoneBorder =
          z.type === 'damage'
            ? 'rgba(239,68,68,0.6)'
            : z.type === 'slow'
            ? 'rgba(96,165,250,0.6)'
            : 'rgba(34,197,94,0.6)';
        return (
          <Group key={z.id}>
            <Circle cx={sx(z.x)} cy={sy(z.y)} r={sr(z.radius)} color={zoneColor} />
            <Circle cx={sx(z.x)} cy={sy(z.y)} r={sr(z.radius)} color="transparent">
              <Paint color={zoneBorder} style="stroke" strokeWidth={1.5} />
            </Circle>
          </Group>
        );
      })}

      {/* ── Magnets ── */}
      {state.magnets.map((m: MagnetState) => (
        <Group key={m.id}>
          <Circle
            cx={sx(m.x)}
            cy={sy(m.y)}
            r={sr(m.radius)}
            color="rgba(192,132,252,0.2)"
          />
          <Circle cx={sx(m.x)} cy={sy(m.y)} r={sr(m.radius)} color="transparent">
            <Paint color="rgba(192,132,252,0.4)" style="stroke" strokeWidth={1} />
          </Circle>
        </Group>
      ))}

      {/* ── Wall glow ── */}
      <Rect x={0} y={wallY - 6} width={width} height={12} color="rgba(51,65,85,0.4)" />
      {/* ── Wall line ── */}
      <Line
        p1={vec(0, wallY)}
        p2={vec(width, wallY)}
        color="#475569"
        strokeWidth={2}
      />

      {/* ── Stations ── */}
      {[
        { station: state.player.station, color: '#4F8EF7' },
        { station: state.opponent.station, color: '#EF4444' },
      ].map(({ station, color }: { station: Station; color: string }) => {
        const cx = sx(station.x);
        const cy = sy(station.y);
        const r = sr(35);
        const hpPct =
          station.maxHp > 0 ? Math.max(0, station.hp / station.maxHp) : 0;
        const barW = r * 2.2;
        const barH = sr(5);
        const barX = cx - barW / 2;
        const barY = cy + r + sr(6);
        const hpBarColor = hpColor(hpPct);
        const stationKey = `station-${color}`;
        return (
          <Group key={stationKey}>
            {/* Shield ring */}
            {station.shieldHp != null && station.shieldHp > 0 && (
              <Group>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={r + sr(8)}
                  color="rgba(96,165,250,0.2)"
                />
                <Circle cx={cx} cy={cy} r={r + sr(8)} color="transparent">
                  <Paint
                    color="rgba(96,165,250,0.5)"
                    style="stroke"
                    strokeWidth={1.5}
                  />
                </Circle>
              </Group>
            )}
            {/* Body */}
            <Circle cx={cx} cy={cy} r={r} color={color + '22'} />
            <Circle cx={cx} cy={cy} r={r} color="transparent">
              <Paint color={color} style="stroke" strokeWidth={2} />
            </Circle>
            {/* HP bar bg */}
            <RoundedRect
              x={barX}
              y={barY}
              width={barW}
              height={barH}
              r={2}
              color="rgba(255,255,255,0.1)"
            />
            {/* HP bar fill */}
            {hpPct > 0 && (
              <RoundedRect
                x={barX}
                y={barY}
                width={barW * hpPct}
                height={barH}
                r={2}
                color={hpBarColor}
              />
            )}
          </Group>
        );
      })}

      {/* ── Side towers ── */}
      {[...state.player.sideTowers, ...state.opponent.sideTowers].map(
        (tower: SideTower) => {
          const cx = sx(tower.x);
          const cy = sy(tower.y);
          const half = sr(10);
          const hpPct =
            tower.maxHp > 0 ? Math.max(0, tower.hp / tower.maxHp) : 0;
          const towerColor = tower.frozen ? '#BAE6FD' : '#6B7280';
          const barW = half * 2;
          const barH = sr(3);
          const barX = cx - half;
          const barY = cy - half - sr(6);
          const hpBarColor = hpColor(hpPct);
          return (
            <Group key={tower.id}>
              <Rect
                x={cx - half}
                y={cy - half}
                width={half * 2}
                height={half * 2}
                color={towerColor}
              />
              <Rect
                x={cx - half}
                y={cy - half}
                width={half * 2}
                height={half * 2}
                color="transparent"
              >
                <Paint
                  color="rgba(255,255,255,0.2)"
                  style="stroke"
                  strokeWidth={1}
                />
              </Rect>
              {/* HP bar bg */}
              <RoundedRect
                x={barX}
                y={barY}
                width={barW}
                height={barH}
                r={1}
                color="rgba(255,255,255,0.1)"
              />
              {hpPct > 0 && (
                <RoundedRect
                  x={barX}
                  y={barY}
                  width={barW * hpPct}
                  height={barH}
                  r={1}
                  color={hpBarColor}
                />
              )}
            </Group>
          );
        }
      )}

      {/* ── Edit mode overlay ── */}
      {state.editMode && (
        <Rect x={0} y={0} width={width} height={height} color="rgba(0,0,0,0.4)" />
      )}

      {/* ── Towers ── */}
      {[...state.player.towers, ...state.opponent.towers].map((tower: Tower) => {
        const cx = sx(tower.x);
        const cy = sy(tower.y);
        const half = sr(14);
        const color = getTowerColor(tower.type);
        const hpPct =
          tower.maxHp > 0 ? Math.max(0, tower.hp / tower.maxHp) : 0;
        const tintColor = tower.frozen
          ? '#BAE6FD'
          : tower.poisoned
          ? '#84CC16'
          : tower.overclocked
          ? '#FCD34D'
          : color;
        const barW = half * 2;
        const barH = sr(3);
        const barX = cx - half;
        const barY = cy - half - sr(7);
        const hpBarColor = hpColor(hpPct);
        // Level pips
        const pipCount = Math.min(tower.level, 5);
        const pipR = sr(2.5);
        const pipSpacing = sr(6);
        const pipsStartX = cx - ((pipCount - 1) * pipSpacing) / 2;
        const pipY = cy + half + sr(5);
        return (
          <Group key={tower.id}>
            {/* Body */}
            <RoundedRect
              x={cx - half}
              y={cy - half}
              width={half * 2}
              height={half * 2}
              r={sr(4)}
              color={tintColor + '33'}
            />
            <RoundedRect
              x={cx - half}
              y={cy - half}
              width={half * 2}
              height={half * 2}
              r={sr(4)}
              color="transparent"
            >
              <Paint color={tintColor} style="stroke" strokeWidth={1.5} />
            </RoundedRect>
            {/* HP bar bg */}
            <RoundedRect
              x={barX}
              y={barY}
              width={barW}
              height={barH}
              r={1}
              color="rgba(255,255,255,0.1)"
            />
            {hpPct > 0 && (
              <RoundedRect
                x={barX}
                y={barY}
                width={barW * hpPct}
                height={barH}
                r={1}
                color={hpBarColor}
              />
            )}
            {/* Level pips */}
            {Array.from({ length: pipCount }, (_, i) => i).map((i) => (
              <Circle
                key={i}
                cx={pipsStartX + i * pipSpacing}
                cy={pipY}
                r={pipR}
                color={tintColor}
              />
            ))}
          </Group>
        );
      })}

      {/* ── Targeting highlights ── */}
      {state.targeting &&
        state.targeting.targets.map((tid: string) => {
          const orb = state.orbs.find((o: Orb) => o.id === tid);
          if (!orb) return null;
          const cx = sx(orb.x);
          const cy = sy(orb.y);
          const r = sr(orb.radius + 10);
          return (
            <Group key={`target-${tid}`}>
              <Circle cx={cx} cy={cy} r={r} color="rgba(168,85,247,0.15)" />
              <Circle cx={cx} cy={cy} r={r} color="transparent">
                <Paint
                  color="rgba(168,85,247,0.7)"
                  style="stroke"
                  strokeWidth={2}
                />
              </Circle>
            </Group>
          );
        })}

      {/* ── Orbs ── */}
      {state.orbs.map((orb: Orb) => {
        const cx = sx(orb.x);
        const cy = sy(orb.y);
        const r = sr(orb.radius);
        const color = getOrbColor(orb.type);
        const isStealth =
          orb.stealth || orb.type === 'shadow' || orb.type === 'phantom';
        const orbOpacity = isStealth ? 0.45 : 1;
        const hpPct = orb.maxHp > 0 ? orb.hp / orb.maxHp : 1;
        const barW = r * 2.2;
        const barH = sr(3);
        const barX = cx - barW / 2;
        const barY = cy + r + sr(3);
        const hpBarColor = hpColor(hpPct);

        const statusColor = orb.frozen
          ? 'rgba(186,230,253,0.4)'
          : orb.poisoned
          ? 'rgba(132,204,22,0.35)'
          : orb.burning
          ? 'rgba(249,115,22,0.35)'
          : null;

        return (
          <Group key={orb.id} opacity={orbOpacity}>
            {/* Shield ring */}
            {orb.shieldHp != null && orb.shieldHp > 0 && (
              <Circle
                cx={cx}
                cy={cy}
                r={r + sr(5)}
                color="rgba(147,197,253,0.3)"
              />
            )}
            {/* Body fill */}
            <Circle cx={cx} cy={cy} r={r} color={color + '59'} />
            {/* Status overlay */}
            {statusColor && (
              <Circle cx={cx} cy={cy} r={r} color={statusColor} />
            )}
            {/* Border */}
            <Circle cx={cx} cy={cy} r={r} color="transparent">
              <Paint
                color={color}
                style="stroke"
                strokeWidth={isStealth ? 1 : 1.5}
              />
            </Circle>
            {/* HP bar (only if damaged) */}
            {orb.hp < orb.maxHp && (
              <Group>
                <RoundedRect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barH}
                  r={1}
                  color="rgba(0,0,0,0.5)"
                />
                {hpPct > 0 && (
                  <RoundedRect
                    x={barX}
                    y={barY}
                    width={barW * Math.max(0, hpPct)}
                    height={barH}
                    r={1}
                    color={hpBarColor}
                  />
                )}
              </Group>
            )}
          </Group>
        );
      })}

      {/* ── Coin pickups ── */}
      {state.coinPickups.map((coin: CoinPickup) => {
        const cx = sx(coin.x);
        const cy = sy(coin.y);
        const r = sr(8);
        return (
          <Group key={coin.id}>
            <Circle cx={cx} cy={cy} r={r} color="rgba(252,211,77,0.25)" />
            <Circle cx={cx} cy={cy} r={r} color="transparent">
              <Paint color="#FCD34D" style="stroke" strokeWidth={1.5} />
            </Circle>
          </Group>
        );
      })}

      {/* ── Projectiles ── */}
      {state.projectiles.map((proj: Projectile) => {
        const cx = sx(proj.x);
        const cy = sy(proj.y);
        const r = Math.max(2, sr(proj.radius));
        return <Circle key={proj.id} cx={cx} cy={cy} r={r} color={proj.color} />;
      })}

      {/* ── Effects ── */}
      {state.effects.map((effect: Effect) => {
        const cx = sx(effect.x);
        const cy = sy(effect.y);
        const alpha = Math.max(0, effect.timer / effect.maxTimer);
        const progress = 1 - alpha;
        const baseR = sr(effect.radius ?? 30);
        const effectColor = effect.color ?? '#F97316';

        let r = baseR;
        let bgColor: string;

        if (effect.type === 'explosion' || effect.type === 'station_hit') {
          r = baseR * (0.3 + progress * 0.7);
          bgColor = effectColor + alphaHex(alpha * 0.4);
        } else if (effect.type === 'freeze') {
          r = baseR * (0.5 + progress * 0.5);
          bgColor = `rgba(186,230,253,${(alpha * 0.35).toFixed(3)})`;
        } else if (effect.type === 'lightning') {
          r = baseR * 0.3;
          bgColor = `rgba(253,230,138,${alpha.toFixed(3)})`;
        } else if (effect.type === 'zone') {
          bgColor = effectColor + alphaHex(alpha * 0.3);
        } else {
          r = baseR * 0.4;
          bgColor = effectColor + alphaHex(alpha * 0.6);
        }

        return <Circle key={effect.id} cx={cx} cy={cy} r={r} color={bgColor} />;
      })}

      {/* ── Particles ── */}
      {state.particles.map((p: Particle) => {
        const alpha = Math.max(0, p.alpha);
        if (alpha <= 0) return null;
        const cx = sx(p.x);
        const cy = sy(p.y);
        const r = Math.max(1, sr(p.radius));
        return (
          <Circle key={p.id} cx={cx} cy={cy} r={r} color={p.color} opacity={alpha} />
        );
      })}

      {/* ── Meteors ── */}
      {state.meteors.map((meteor: MeteorState) => {
        const startX = sx(meteor.x);
        const startY = sy(-100);
        const endX = sx(meteor.targetX);
        const endY = sy(meteor.targetY);
        const curX = startX + (endX - startX) * meteor.progress;
        const curY = startY + (endY - startY) * meteor.progress;
        const r = Math.max(4, sr(meteor.radius * 0.15));
        return <Circle key={meteor.id} cx={curX} cy={curY} r={r} color="#F97316" />;
      })}

      {/* ── Aiming overlay ── */}
      {state.aiming && (
        <Group>
          <Circle
            cx={sx(state.aiming.x)}
            cy={sy(state.aiming.y)}
            r={sr(70)}
            color="rgba(79,142,247,0.15)"
          />
          <Circle
            cx={sx(state.aiming.x)}
            cy={sy(state.aiming.y)}
            r={sr(70)}
            color="transparent"
          >
            <Paint color="rgba(79,142,247,0.6)" style="stroke" strokeWidth={2} />
          </Circle>
          {/* Crosshair H */}
          <Line
            p1={vec(sx(state.aiming.x) - sr(42), sy(state.aiming.y))}
            p2={vec(sx(state.aiming.x) + sr(42), sy(state.aiming.y))}
            color="rgba(79,142,247,0.7)"
            strokeWidth={2}
          />
          {/* Crosshair V */}
          <Line
            p1={vec(sx(state.aiming.x), sy(state.aiming.y) - sr(42))}
            p2={vec(sx(state.aiming.x), sy(state.aiming.y) + sr(42))}
            color="rgba(79,142,247,0.7)"
            strokeWidth={2}
          />
        </Group>
      )}

      {/* ── Escalation border ── */}
      {state.escalationTier !== 'none' && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          color="transparent"
        >
          <Paint
            color={escalationColor + '40'}
            style="stroke"
            strokeWidth={4}
          />
        </Rect>
      )}
    </Canvas>
  );

  // Floaters and overlays rendered as RN Views on top of the Canvas
  const comboOpacity = Math.min(1, state.comboTimer / 500);
  const showCombo = state.combo >= 2 && state.comboTimer > 0;
  const showEscalation = state.escalationTier !== 'none';

  const overlays = (
    <>
      {/* Floaters */}
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
      })}

      {/* Escalation banner */}
      {showEscalation && (
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

      {/* Combo display */}
      {showCombo && (
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
              opacity: comboOpacity,
            }}
          >
            {state.combo}
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '900',
              color: '#FCD34D',
              opacity: comboOpacity,
            }}
          >
            x COMBO
          </Text>
        </View>
      )}
    </>
  );

  if (Platform.OS === 'web') {
    // On web, use Pressable for tap handling since GestureDetector may not work
    return (
      <Pressable
        style={{ width, height, overflow: 'hidden' }}
        onPress={(e) => {
          const tapX = e.nativeEvent.locationX;
          const tapY = e.nativeEvent.locationY;
          const gameX = (tapX / width) * GAME_WIDTH;
          const gameY = (tapY / height) * GAME_HEIGHT;

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
            console.log('[GameCanvas] Orb tapped (web):', tappedOrb.id, tappedOrb.type);
            onOrbTap(tappedOrb.id);
          } else {
            console.log('[GameCanvas] Field tapped (web) at game coords:', gameX.toFixed(1), gameY.toFixed(1));
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
}

export default GameCanvasInner;
