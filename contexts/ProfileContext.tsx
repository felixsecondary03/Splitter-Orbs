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
  last_free_crate?: string | null;
  banned?: boolean;
  ban_until?: string | null;
  ban_reason?: string | null;
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
};

interface ProfileContextType {
  profile: PlayerProfile;
  setProfile: (p: PlayerProfile) => void;
  updateProfile: (partial: Partial<PlayerProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

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

  // Safety net: load profile on mount if a session already exists.
  // onAuthStateChange fires INITIAL_SESSION asynchronously; this ensures
  // the profile loads even if the listener is registered after the event fires.
  useEffect(() => {
    console.log('[Profile] Mount-time session check');
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        console.log('[Profile] Session found on mount, loading profile');
        refreshProfile().finally(() => {
          setIsLoading(false);
        });
      } else {
        console.log('[Profile] No session on mount, guest mode');
        setIsLoading(false);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Profile] onAuthStateChange event=', event, 'hasUser=', !!session?.user);
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
      .update(partial)
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
  const ctx = React.use(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
