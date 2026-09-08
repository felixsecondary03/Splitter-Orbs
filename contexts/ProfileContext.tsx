import React, { createContext, useState, useEffect, useCallback } from 'react';
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
  selected_towers: ['blaster', 'vulcan', 'mortar', 'glacier'],
  selected_abilities: ['meteor', 'freeze', 'rage'],
  selected_orbs: ['normal', 'fast', 'splitter', 'tank', 'sprint'],
  unlocked_towers: ['blaster', 'vulcan'],
  unlocked_abilities: ['meteor', 'freeze'],
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
};

interface ProfileContextType {
  profile: PlayerProfile;
  setProfile: (p: PlayerProfile) => void;
  updateProfile: (partial: Partial<PlayerProfile>) => void;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    console.log('[Profile] Refreshing profile for user', user.id);
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
      console.log('[Profile] Profile loaded', { display_name: data.display_name, trophies: data.trophies });
      setProfile({ ...DEFAULT_PROFILE, ...data });
    }
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
    console.log('[Profile] updateProfile called', Object.keys(partial));
    setProfile((prev) => ({ ...prev, ...partial }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('player_profiles')
      .upsert({ id: user.id, ...partial });
    if (error) {
      console.warn('[Profile] updateProfile upsert error', error.message);
    }
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, updateProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = React.use(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
