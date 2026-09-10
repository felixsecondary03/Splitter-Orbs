import React from 'react';
import { Platform, View, Text } from 'react-native';
import Svg, {
  Defs, LinearGradient, RadialGradient, Stop,
  Ellipse, Polygon, Rect, Line, Circle, Path, G,
} from 'react-native-svg';
import { TOWER_TYPES } from '@/game/constants';
import type { TowerType } from '@/game/constants';

interface TowerIconProps {
  type: TowerType;
  size?: number;
  level?: number;
}

export function TowerIcon({ type, size = 36, level = 1 }: TowerIconProps) {
  const def = TOWER_TYPES[type];
  const c = def?.color || '#64748b';

  // On web, react-native-svg crashes inside Expo Router — use plain View
  if (Platform.OS === 'web') {
    const initials = (def?.name ?? type).slice(0, 2).toUpperCase();
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        backgroundColor: c + '33',
        borderWidth: 1.5,
        borderColor: c,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: size * 0.35, color: c, fontWeight: '700' }}>
          {initials}
        </Text>
      </View>
    );
  }

  const isBouncer = def?.bouncer;
  const top = 30 - (level - 1) * 4;
  const h = (size * 64) / 48;

  // Use unique IDs based on type+level to avoid gradient conflicts
  const stoneId = `stone-${type}-${level}`;
  const glowId = `glow-${type}-${level}`;

  const levelPips = Array.from({ length: level }, (_, i) => i);

  const stoneFill = `url(#${stoneId})`;
  const glowFill = `url(#${glowId})`;

  return (
    <Svg viewBox="0 0 48 64" width={size} height={h}>
      <Defs>
        <LinearGradient id={stoneId} x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="#cbd5e1" />
          <Stop offset="0.5" stopColor="#94a3b8" />
          <Stop offset="1" stopColor="#64748b" />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={c} stopOpacity="0.9" />
          <Stop offset="1" stopColor={c} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Shadow */}
      <Ellipse cx="24" cy="60" rx="16" ry="3" fill="rgba(15,23,42,0.18)" />

      {/* Stone base trapezoid */}
      <Polygon points="8,56 12,34 36,34 40,56" fill={stoneFill} />
      <Rect x="8" y="34" width="4" height="22" fill="rgba(255,255,255,0.25)" />
      <Rect x="36" y="34" width="4" height="22" fill="rgba(15,23,42,0.2)" />
      <Line x1="8" y1="45" x2="40" y2="45" stroke="rgba(15,23,42,0.2)" strokeWidth="1" />

      {/* Crenellations */}
      <Rect x="10" y={top} width="6" height="6" fill="#cbd5e1" />
      <Rect x="21" y={top} width="6" height="6" fill="#cbd5e1" />
      <Rect x="32" y={top} width="6" height="6" fill="#cbd5e1" />
      {level >= 3 && <Rect x="15" y={top - 5} width="4" height="5" fill="#cbd5e1" />}
      {level >= 3 && <Rect x="29" y={top - 5} width="4" height="5" fill="#cbd5e1" />}

      {/* Glow halo */}
      <Circle cx="24" cy="22" r="13" fill={glowFill} opacity="0.7" />

      {/* Crystal per type */}
      <G fill={c}>
        {type === 'machinegun' ? (
          <>
            <Circle cx="17" cy="22" r="3.4" />
            <Circle cx="24" cy="20" r="3.4" />
            <Circle cx="31" cy="22" r="3.4" />
          </>
        ) : type === 'sniper' ? (
          <Polygon points="24,12 30,22 24,32 18,22" />
        ) : type === 'bomb' ? (
          <Circle cx="24" cy="22" r="6" />
        ) : type === 'boomerang' ? (
          <Path d="M16 22 Q24 12 32 22 Q24 20 16 22 Z" />
        ) : type === 'rebound' ? (
          <Path d="M14 28 L24 12 L34 28 L30 27 L24 18 L18 27 Z" />
        ) : isBouncer ? (
          <>
            <Path d="M17 16 a8 8 0 0 1 14 0 v6 h-4 v-6 a4 4 0 0 0 -6 0 v6 h-4 z" />
            <Rect x="15" y="20" width="4" height="3" fill="#f87171" />
            <Rect x="29" y="20" width="4" height="3" fill="#f87171" />
          </>
        ) : type === 'glacier' ? (
          <>
            <Polygon points="18,30 21,14 24,22 27,14 30,30" />
            <Polygon points="14,30 16,20 18,30" />
            <Polygon points="30,30 32,20 34,30" />
          </>
        ) : type === 'arc' ? (
          <>
            <Rect x="23" y="10" width="2" height="14" fill="#475569" />
            <Circle cx="24" cy="11" r="4" />
          </>
        ) : type === 'pyre' ? (
          <>
            <Path d="M17 26 Q16 18 24 10 Q32 18 31 26 Z" />
            <Circle cx="24" cy="22" r="3" fill="#fde68a" />
          </>
        ) : type === 'venom' ? (
          <>
            <Rect x="17" y="16" width="14" height="12" rx="2" />
            <Circle cx="21" cy="22" r="1.5" fill="rgba(255,255,255,0.5)" />
            <Circle cx="27" cy="20" r="1.2" fill="rgba(255,255,255,0.5)" />
          </>
        ) : type === 'siege' ? (
          <>
            <Rect x="10" y="28" width="28" height="4" fill="#78716c" />
            <Line x1="12" y1="28" x2="34" y2="14" stroke="#78716c" strokeWidth="3" />
            <Circle cx="34" cy="14" r="4" fill="#1e293b" />
          </>
        ) : type === 'orb_mortar' ? (
          <>
            <Rect x="10" y="32" width="28" height="4" fill="#57534e" />
            <Line x1="24" y1="32" x2="33" y2="13" stroke="#78716c" strokeWidth="5" strokeLinecap="round" />
            <Circle cx="33" cy="13" r="3.5" fill="#1e293b" />
            <Circle cx="33" cy="13" r="1.8" fill={c} />
          </>
        ) : type === 'lava_mortar' ? (
          <>
            <Rect x="10" y="32" width="28" height="4" fill="#57534e" />
            <Line x1="24" y1="32" x2="33" y2="13" stroke="#78716c" strokeWidth="5" strokeLinecap="round" />
            <Circle cx="33" cy="13" r="4.5" fill={c} />
            <Circle cx="33" cy="13" r="2.5" fill="#fde68a" />
          </>
        ) : type === 'repulsor' ? (
          <>
            <Rect x="14" y="20" width="20" height="8" rx="2" fill="#475569" />
            <Circle cx="24" cy="24" r="5" fill={c} />
            <Circle cx="24" cy="24" r="2.5" fill="#e0e7ff" />
          </>
        ) : type === 'cryo' ? (
          <>
            <Polygon points="20,30 22,14 26,14 28,30" fill={c} />
            <Polygon points="22,14 24,10 26,14" fill="#e0f2fe" />
            <Circle cx="24" cy="22" r="2" fill="rgba(255,255,255,0.6)" />
          </>
        ) : type === 'seeker' ? (
          <>
            <Rect x="16" y="18" width="16" height="10" rx="2" fill="#831843" />
            <Rect x="18" y="14" width="3" height="6" fill={c} />
            <Rect x="27" y="14" width="3" height="6" fill={c} />
            <Circle cx="19.5" cy="14" r="1.5" fill="#fde68a" />
            <Circle cx="28.5" cy="14" r="1.5" fill="#fde68a" />
          </>
        ) : type === 'prism' ? (
          <>
            <Polygon points="24,10 30,22 24,34 18,22" fill={c} opacity="0.85" />
            <Polygon points="24,10 30,22 24,22" fill="rgba(255,255,255,0.5)" />
            <Polygon points="24,10 24,34 18,22" fill="rgba(255,255,255,0.2)" />
          </>
        ) : type === 'flak' ? (
          <>
            <Rect x="14" y="20" width="20" height="6" rx="1" fill="#475569" />
            <Polygon points="16,20 12,14 36,14 32,20" fill={c} />
            <Circle cx="24" cy="14" r="4" fill="#1e293b" />
          </>
        ) : type === 'harpoon' ? (
          <>
            <Line x1="14" y1="22" x2="34" y2="22" stroke="#475569" strokeWidth="3" />
            <Path d="M14 22 Q24 14 34 22" fill="none" stroke={c} strokeWidth="2" />
            <Line x1="24" y1="22" x2="24" y2="8" stroke={c} strokeWidth="2" />
            <Polygon points="24,8 28,12 20,12" fill={c} />
          </>
        ) : type === 'twin' ? (
          <>
            <Circle cx="18" cy="22" r="3.5" fill={c} />
            <Circle cx="30" cy="22" r="3.5" fill={c} />
            <Rect x="16" y="20" width="3" height="10" fill="#475569" />
            <Rect x="29" y="20" width="3" height="10" fill="#475569" />
          </>
        ) : type === 'tesla' ? (
          <>
            <Ellipse cx="24" cy="30" rx="4" ry="2" fill={c} opacity="0.4" />
            <Ellipse cx="24" cy="24" rx="5" ry="2.5" fill="none" stroke={c} strokeWidth="1.5" />
            <Ellipse cx="24" cy="18" rx="4" ry="2" fill="none" stroke={c} strokeWidth="1.5" />
            <Circle cx="24" cy="12" r="3" fill={c} />
          </>
        ) : type === 'detonator' ? (
          <>
            <Rect x="16" y="22" width="16" height="5" rx="1" fill="#475569" />
            <Circle cx="24" cy="16" r="6" fill={c} />
          </>
        ) : type === 'magnet' ? (
          <>
            <Path d="M16 14 a8 8 0 0 1 16 0 v8 h-5 v-8 a3 3 0 0 0 -6 0 v8 h-5 z" fill={c} />
            <Rect x="14" y="20" width="5" height="4" fill="#475569" />
            <Rect x="29" y="20" width="5" height="4" fill="#475569" />
          </>
        ) : type === 'capacitor' ? (
          <>
            <Rect x="18" y="14" width="12" height="16" rx="2" fill="#475569" />
            <Rect x="20" y="10" width="3" height="6" fill={c} />
            <Rect x="25" y="10" width="3" height="6" fill={c} />
          </>
        ) : type === 'overcharger' ? (
          <>
            <Circle cx="24" cy="22" r="6" fill="none" stroke={c} strokeWidth="2" />
            <Circle cx="24" cy="22" r="3" fill={c} />
          </>
        ) : type === 'mine_layer' ? (
          <>
            <Rect x="14" y="24" width="20" height="6" rx="1" fill="#475569" />
            <Circle cx="19" cy="16" r="4" fill={c} />
            <Circle cx="29" cy="16" r="4" fill={c} />
            <Line x1="19" y1="16" x2="19" y2="10" stroke={c} strokeWidth="1.5" />
            <Line x1="29" y1="16" x2="29" y2="10" stroke={c} strokeWidth="1.5" />
          </>
        ) : (
          <Polygon points="24,13 31,22 24,31 17,22" />
        )}
      </G>

      {/* Highlight */}
      <Polygon points="24,15 28,21 24,27 20,21" fill="rgba(255,255,255,0.5)" />

      {/* Level pips */}
      {level > 1 && (
        <G fill="#fbbf24">
          {levelPips.map((_, i) => (
            <Circle key={i} cx={18 + i * 6} cy="52" r="1.8" />
          ))}
        </G>
      )}
    </Svg>
  );
}

export default TowerIcon;
