import { useProfile } from '@/contexts/ProfileContext';

type SoundType =
  | 'click'
  | 'coin'
  | 'place'
  | 'ability'
  | 'victory'
  | 'defeat'
  | 'match_found'
  | 'explosion';

const CATEGORY_MAP: Partial<Record<SoundType, 'clicks' | 'explosions' | 'fanfare'>> = {
  click: 'clicks',
  explosion: 'explosions',
  victory: 'fanfare',
  defeat: 'fanfare',
  match_found: 'fanfare',
};

export function useSound() {
  const { profile } = useProfile();

  const play = (soundType: SoundType) => {
    if (!profile.sound_enabled) return;

    const category = CATEGORY_MAP[soundType];
    if (category && !profile.sound_categories[category]) return;

    // TODO: implement with expo-audio when available
    console.log('[Sound] Playing sound', { soundType, category });
  };

  return { play };
}
