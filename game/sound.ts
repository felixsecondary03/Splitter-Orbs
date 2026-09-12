// Sound & haptics utility for the game.
// Manages mute state, sound categories, and haptics intensity.
// All state is persisted to localStorage (web) and read back on init.

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

type SoundCategory = 'clicks' | 'explosions' | 'fanfare';
type HapticsIntensity = 'off' | 'low' | 'medium' | 'high';

interface SoundCategories {
  clicks: boolean;
  explosions: boolean;
  fanfare: boolean;
}

interface ProfileLike {
  sound_enabled?: boolean;
  sound_categories?: Partial<SoundCategories>;
  haptics_intensity?: HapticsIntensity;
  haptics_enabled?: boolean;
  advanced_haptics_enabled?: boolean;
}

// ---- Module-level state ----
let muted = false;
let soundCategories: SoundCategories = { clicks: true, explosions: true, fanfare: true };
let hapticsIntensity: HapticsIntensity = 'off';
let advancedHaptics = false;

// ---- Web audio context ----
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function catOn(name: SoundCategory): boolean {
  if (muted) return false;
  return soundCategories[name] !== false;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  slideTo: number | null = null,
  category: SoundCategory = 'clicks',
) {
  if (!catOn(category)) return;
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function noise(duration: number, volume = 0.1, filterFreq = 1000, category: SoundCategory = 'explosions') {
  if (!catOn(category)) return;
  const ctx = getCtx();
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

function scalePattern(pattern: number | number[]): number | number[] {
  const mult = hapticsIntensity === 'high' ? 1.5 : hapticsIntensity === 'low' ? 0.5 : 1;
  if (typeof pattern === 'number') return Math.round(pattern * mult);
  return pattern.map((p) => Math.round(p * mult));
}

async function haptic(pattern: number | number[]) {
  if (hapticsIntensity === 'off') return;
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(scalePattern(pattern) as number | number[]);
      } catch (e) {}
    }
    return;
  }
  // Native haptics via expo-haptics
  try {
    if (hapticsIntensity === 'high') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (hapticsIntensity === 'medium') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (e) {}
}

async function hapticAdvanced(pattern: number | number[]) {
  if (hapticsIntensity === 'off' || !advancedHaptics) return;
  await haptic(pattern);
}

// ---- Public SFX API ----
export const sfx = {
  click: () => { tone(880, 0.06, 'square', 0.08, null, 'clicks'); hapticAdvanced(8); },
  crit: () => { tone(1200, 0.1, 'square', 0.12, 600, 'clicks'); haptic(15); },
  towerFire: () => { tone(440, 0.05, 'sawtooth', 0.06, null, 'clicks'); },
  coin: () => { tone(1318, 0.08, 'sine', 0.1, null, 'clicks'); hapticAdvanced(10); },
  ability: () => { tone(330, 0.15, 'sine', 0.12, 880, 'explosions'); haptic(20); },
  place: () => { tone(220, 0.1, 'triangle', 0.1, 440, 'clicks'); hapticAdvanced(12); },
  upgrade: () => {
    tone(523, 0.08, 'sine', 0.1, null, 'clicks');
    setTimeout(() => tone(784, 0.1, 'sine', 0.1, null, 'clicks'), 60);
    haptic(10);
  },
  levelUp: () => {
    [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'sine', 0.12, null, 'clicks'), i * 60));
    haptic([10, 20, 30]);
  },
  explosion: () => { noise(0.3, 0.12, 600, 'explosions'); haptic(30); },
  victory: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.12, null, 'fanfare'), i * 100));
    haptic([20, 40, 20, 40, 60]);
  },
  defeat: () => {
    [440, 349, 262].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sawtooth', 0.1, null, 'fanfare'), i * 120));
    haptic([40, 60, 80]);
  },
  crateOpen: () => {
    [659, 880, 1047, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'sine', 0.1, null, 'fanfare'), i * 70));
    haptic([15, 30, 15, 30]);
  },
  countdown: () => { tone(660, 0.08, 'sine', 0.08, null, 'fanfare'); },
  matchFound: () => {
    tone(523, 0.1, 'sine', 0.1, null, 'fanfare');
    setTimeout(() => tone(784, 0.15, 'sine', 0.1, null, 'fanfare'), 100);
    haptic([20, 30]);
  },
  disconnect: () => { tone(220, 0.3, 'sawtooth', 0.1, 110, 'fanfare'); haptic([50, 30, 50]); },
};

// ---- Public settings API ----

export function setMuted(val: boolean) {
  muted = !val;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem('so_sound', String(val));
  }
}

export function setSoundCategory(name: SoundCategory, val: boolean) {
  soundCategories[name] = val;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(`so_cat_${name}`, String(val));
  }
}

/** Legacy boolean toggle — maps on→medium, off→off. */
export function setHaptics(val: boolean) {
  hapticsIntensity = val ? 'medium' : 'off';
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem('so_haptics_intensity', hapticsIntensity);
  }
}

export function setHapticsIntensity(level: HapticsIntensity) {
  hapticsIntensity = level || 'off';
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem('so_haptics_intensity', hapticsIntensity);
  }
}

export function setAdvancedHaptics(val: boolean) {
  advancedHaptics = val;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem('so_advanced_haptics', String(val));
  }
}

export function isMuted(): boolean { return muted; }
export function isHapticsOn(): boolean { return hapticsIntensity !== 'off'; }
export function getHapticsIntensity(): HapticsIntensity { return hapticsIntensity; }
export function getSoundCategories(): SoundCategories { return { ...soundCategories }; }

/** Sync all sound/haptics state from a user profile object. */
export function syncFromProfile(me: ProfileLike | null | undefined) {
  if (!me) return;
  if (me.sound_enabled === false) { muted = true; }
  else if (me.sound_enabled === true) { muted = false; }

  if (me.sound_categories && typeof me.sound_categories === 'object') {
    soundCategories = {
      clicks: me.sound_categories.clicks !== false,
      explosions: me.sound_categories.explosions !== false,
      fanfare: me.sound_categories.fanfare !== false,
    };
  }

  if (me.haptics_intensity) {
    hapticsIntensity = me.haptics_intensity;
  } else if (me.haptics_enabled === true) {
    hapticsIntensity = 'medium';
  } else {
    hapticsIntensity = 'off';
  }

  advancedHaptics = me.advanced_haptics_enabled === true;

  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem('so_sound', String(!muted));
    localStorage.setItem('so_cat_clicks', String(soundCategories.clicks));
    localStorage.setItem('so_cat_explosions', String(soundCategories.explosions));
    localStorage.setItem('so_cat_fanfare', String(soundCategories.fanfare));
    localStorage.setItem('so_haptics_intensity', hapticsIntensity);
    localStorage.setItem('so_advanced_haptics', String(advancedHaptics));
  }
}
