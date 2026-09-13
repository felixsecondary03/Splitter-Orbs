import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '@/utils/supabase';

export interface PlayerProfile {
  id: string;
  display_name: string;
  language: string;
  trophies: number;
  peak_trophies: number;
  wins: number;
  losses: number;
  win_streak: number;
  coins: number;
  gems: number;
  shards: number;
  tower_cards: Record<string, { level: number; copies: number; boughtCopies: number }>;
  ability_cards: Record<string, { level: number; copies: number; boughtCopies: number }>;
  orb_cards: Record<string, { level: number; copies: number; boughtCopies: number }>;
  selected_towers: string[];
  selected_abilities: string[];
  selected_orbs: string[];
  unlocked_towers: string[];
  unlocked_abilities: string[];
  hand_level: number;
  side_tower_level: number;
  onboarded: boolean;
  tutorial_done: boolean;
  eula_accepted_version: string | null;
  sound_enabled: boolean;
  sound_categories: { clicks: boolean; explosions: boolean; fanfare: boolean };
  haptics_enabled: boolean;
  haptics_intensity: 'off' | 'low' | 'medium' | 'high';
  advanced_haptics_enabled: boolean;
  fit_to_screen: boolean;
  tower_menu_anytime: boolean;
  account_type: 'guest' | 'email' | 'google' | 'apple';
  avatar_color: string;
  daily_missions?: unknown[];
  last_free_crate?: string | null;
  banned?: boolean;
  ban_until?: string | null;
  ban_reason?: string | null;
  owned_skins: string[];
  equipped_orb_pattern: string;
  equipped_station_skin: string;
  equipped_tower_skin: string;
  equipped_left_tower_skin: string;
  equipped_right_tower_skin: string;
  equipped_station_emblem: string;
  equipped_left_tower_emblem: string;
  equipped_right_tower_emblem: string;
}

export const DEFAULT_PROFILE: PlayerProfile = {
  id: '',
  display_name: 'Player',
  language: 'en',
  trophies: 0,
  peak_trophies: 0,
  wins: 0,
  losses: 0,
  win_streak: 0,
  coins: 500,
  gems: 20,
  shards: 0,
  tower_cards: {},
  ability_cards: {},
  orb_cards: {},
  selected_towers: ['basic', 'machinegun', 'boomerang', 'bomb'],
  selected_abilities: ['zap', 'portal', 'repair'],
  selected_orbs: ['normal', 'fast', 'bomb', 'splitter', 'tank'],
  unlocked_towers: ['basic', 'machinegun'],
  unlocked_abilities: ['zap', 'portal'],
  hand_level: 0,
  side_tower_level: 0,
  onboarded: false,
  tutorial_done: false,
  eula_accepted_version: null,
  sound_enabled: true,
  sound_categories: { clicks: true, explosions: true, fanfare: true },
  haptics_enabled: true,
  haptics_intensity: 'medium',
  advanced_haptics_enabled: false,
  fit_to_screen: true,
  tower_menu_anytime: false,
  account_type: 'guest',
  avatar_color: '#4F8EF7',
  daily_missions: [],
  last_free_crate: null,
  owned_skins: [],
  equipped_orb_pattern: 'default',
  equipped_station_skin: 'default',
  equipped_tower_skin: 'default',
  equipped_left_tower_skin: 'default',
  equipped_right_tower_skin: 'default',
  equipped_station_emblem: 'default',
  equipped_left_tower_emblem: 'default',
  equipped_right_tower_emblem: 'default',
};

interface ProfileContextType {
  profile: PlayerProfile;
  setProfile: (p: PlayerProfile) => void;
  updateProfile: (partial: Partial<PlayerProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

const SAFE_PROFILE_FIELDS = new Set([
  'language', 'sound_enabled', 'sound_categories', 'haptics_enabled',
  'haptics_intensity', 'advanced_haptics_enabled', 'fit_to_screen',
  'tower_menu_anytime', 'avatar_color', 'selected_towers', 'selected_abilities',
  'selected_orbs', 'equipped_orb_pattern', 'equipped_station_skin',
  'equipped_tower_skin', 'equipped_left_tower_skin', 'equipped_right_tower_skin',
  'equipped_station_emblem', 'equipped_left_tower_emblem', 'equipped_right_tower_emblem',
]);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) {
      console.warn('[Profile] Could not load profile', error.message);
      return;
    }
    if (data) {
      setProfile({
        ...DEFAULT_PROFILE,
        ...data,
        tower_cards:        data.tower_cards        ?? DEFAULT_PROFILE.tower_cards,
        orb_cards:          data.orb_cards          ?? DEFAULT_PROFILE.orb_cards,
        ability_cards:      data.ability_cards      ?? DEFAULT_PROFILE.ability_cards,
        selected_towers:    data.selected_towers    ?? DEFAULT_PROFILE.selected_towers,
        selected_orbs:      data.selected_orbs      ?? DEFAULT_PROFILE.selected_orbs,
        selected_abilities: data.selected_abilities ?? DEFAULT_PROFILE.selected_abilities,
        unlocked_towers:    data.unlocked_towers    ?? DEFAULT_PROFILE.unlocked_towers,
        unlocked_abilities: data.unlocked_abilities ?? DEFAULT_PROFILE.unlocked_abilities,
        sound_categories:          data.sound_categories          ?? DEFAULT_PROFILE.sound_categories,
        owned_skins:               data.owned_skins               ?? [],
        equipped_orb_pattern:      data.equipped_orb_pattern      ?? 'default',
        equipped_station_skin:     data.equipped_station_skin     ?? 'default',
        equipped_tower_skin:       data.equipped_tower_skin       ?? 'default',
        equipped_left_tower_skin:  data.equipped_left_tower_skin  ?? 'default',
        equipped_right_tower_skin: data.equipped_right_tower_skin ?? 'default',
        equipped_station_emblem:   data.equipped_station_emblem   ?? 'default',
        equipped_left_tower_emblem:  data.equipped_left_tower_emblem  ?? 'default',
        equipped_right_tower_emblem: data.equipped_right_tower_emblem ?? 'default',
        gems:                      data.gems                      ?? 0,
      });
    }
  }, []);

  // Safety net: load profile on mount if a session already exists.
  // onAuthStateChange fires INITIAL_SESSION asynchronously; this ensures
  // the profile loads even if the listener is registered after the event fires.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        refreshProfile().finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await refreshProfile();
      } else {
        setProfile(DEFAULT_PROFILE);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshProfile]);

  const updateProfile = useCallback(async (partial: Partial<PlayerProfile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Only write safe preference fields to the database
    const safePartial = Object.fromEntries(
      Object.entries(partial).filter(([k]) => SAFE_PROFILE_FIELDS.has(k))
    );
    if (Object.keys(safePartial).length === 0) return;
    const { error } = await supabase
      .from('player_profiles')
      .update(safePartial)
      .eq('id', user.id);
    if (error) {
      console.warn('[Profile] updateProfile error', error.message);
    }
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, updateProfile, refreshProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
