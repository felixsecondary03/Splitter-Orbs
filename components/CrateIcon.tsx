import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Ellipse, Rect, Path, Circle } from 'react-native-svg';

type CrateTone = 'wood' | 'gold' | 'crystal' | 'silver' | 'legendary' | 'emerald';

const TONES: Record<CrateTone, { wood: string[]; lid: string[]; metal: string[]; lock: string; lockDark: string }> = {
  wood:      { wood: ['#b45309', '#78350f'], lid: ['#d97706', '#92400e'], metal: ['#94a3b8', '#475569'], lock: '#fbbf24', lockDark: '#78350f' },
  gold:      { wood: ['#ca8a04', '#713f12'], lid: ['#eab308', '#a16207'], metal: ['#fcd34d', '#b45309'], lock: '#fef3c7', lockDark: '#92400e' },
  crystal:   { wood: ['#7c3aed', '#4c1d95'], lid: ['#a78bfa', '#6d28d9'], metal: ['#c4b5fd', '#5b21b6'], lock: '#fbbf24', lockDark: '#4c1d95' },
  silver:    { wood: ['#94a3b8', '#475569'], lid: ['#cbd5e1', '#64748b'], metal: ['#e2e8f0', '#94a3b8'], lock: '#f1f5f9', lockDark: '#475569' },
  legendary: { wood: ['#9f1239', '#7f1d1d'], lid: ['#f43f5e', '#be123c'], metal: ['#fda4af', '#9f1239'], lock: '#fde68a', lockDark: '#7f1d1d' },
  emerald:   { wood: ['#047857', '#064e3b'], lid: ['#10b981', '#047857'], metal: ['#6ee7b7', '#047857'], lock: '#d1fae5', lockDark: '#064e3b' },
};

interface CrateIconProps {
  size?: number;
  tone?: CrateTone;
}

export function CrateIcon({ size = 64, tone = 'wood' }: CrateIconProps) {
  const t = TONES[tone] || TONES.wood;
  const wId = `w-${tone}`;
  const lId = `l-${tone}`;
  const mId = `m-${tone}`;

  return (
    <Svg viewBox="0 0 80 80" width={size} height={size}>
      <Defs>
        <LinearGradient id={wId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.wood[0]} />
          <Stop offset="1" stopColor={t.wood[1]} />
        </LinearGradient>
        <LinearGradient id={lId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.lid[0]} />
          <Stop offset="1" stopColor={t.lid[1]} />
        </LinearGradient>
        <LinearGradient id={mId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.metal[0]} />
          <Stop offset="1" stopColor={t.metal[1]} />
        </LinearGradient>
      </Defs>
      {/* Shadow */}
      <Ellipse cx="40" cy="73" rx="28" ry="4" fill="rgba(0,0,0,0.18)" />
      {/* Body */}
      <Rect x="12" y="38" width="56" height="32" rx="4" fill={`url(#${wId})`} />
      <Rect x="12" y="44" width="56" height="1" fill="rgba(0,0,0,0.18)" />
      <Rect x="12" y="56" width="56" height="1" fill="rgba(0,0,0,0.18)" />
      {/* Lid */}
      <Path d="M12 40 Q40 20 68 40 L68 46 L12 46 Z" fill={`url(#${lId})`} />
      <Path d="M16 40 Q40 24 64 40" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none" />
      {/* Metal bands */}
      <Rect x="10" y="37" width="60" height="4" rx="1" fill={`url(#${mId})`} />
      <Rect x="10" y="52" width="60" height="3" rx="1" fill={`url(#${mId})`} />
      {/* Vertical straps */}
      <Rect x="24" y="38" width="4" height="32" fill={`url(#${mId})`} />
      <Rect x="52" y="38" width="4" height="32" fill={`url(#${mId})`} />
      {/* Lock */}
      <Rect x="34" y="44" width="12" height="14" rx="2" fill={t.lock} />
      <Rect x="34" y="44" width="12" height="3" fill="rgba(0,0,0,0.15)" />
      <Circle cx="40" cy="51" r="2" fill={t.lockDark} />
      {/* Rivets */}
      <Circle cx="14" cy="39" r="1.5" fill="#e2e8f0" />
      <Circle cx="66" cy="39" r="1.5" fill="#e2e8f0" />
      <Circle cx="14" cy="53" r="1.5" fill="#e2e8f0" />
      <Circle cx="66" cy="53" r="1.5" fill="#e2e8f0" />
    </Svg>
  );
}

export default CrateIcon;
