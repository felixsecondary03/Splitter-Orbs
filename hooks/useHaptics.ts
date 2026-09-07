import * as Haptics from 'expo-haptics';
import { useProfile } from '@/contexts/ProfileContext';

export function useHaptics() {
  const { profile } = useProfile();

  const impact = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!profile.haptics_enabled || profile.haptics_intensity === 'off') return;
    if (process.env.EXPO_OS !== 'ios') return;

    const intensityMap: Record<'low' | 'medium' | 'high', Haptics.ImpactFeedbackStyle> = {
      low: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      high: Haptics.ImpactFeedbackStyle.Heavy,
    };

    const intensity = profile.haptics_intensity as 'low' | 'medium' | 'high';
    const feedbackStyle = intensityMap[intensity] ?? Haptics.ImpactFeedbackStyle.Medium;

    console.log('[Haptics] impact', { style, intensity: profile.haptics_intensity });
    Haptics.impactAsync(feedbackStyle);
  };

  const notification = (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!profile.haptics_enabled || profile.haptics_intensity === 'off') return;
    if (process.env.EXPO_OS !== 'ios') return;

    const typeMap: Record<'success' | 'warning' | 'error', Haptics.NotificationFeedbackType> = {
      success: Haptics.NotificationFeedbackType.Success,
      warning: Haptics.NotificationFeedbackType.Warning,
      error: Haptics.NotificationFeedbackType.Error,
    };

    console.log('[Haptics] notification', { type });
    Haptics.notificationAsync(typeMap[type]);
  };

  const selection = () => {
    if (!profile.haptics_enabled || profile.haptics_intensity === 'off') return;
    if (process.env.EXPO_OS !== 'ios') return;
    console.log('[Haptics] selection');
    Haptics.selectionAsync();
  };

  return { impact, notification, selection };
}
