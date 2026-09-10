import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Animated,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Globe, Calendar, FileText, User, Check, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { CURRENT_EULA_VERSION } from '@/game/constants';

const TOTAL_STEPS = 4;

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'nl', label: 'NL', name: 'Nederlands' },
  { code: 'ja', label: 'JA', name: '日本語' },
  { code: 'it', label: 'IT', name: 'Italiano' },
  { code: 'pt', label: 'PT', name: 'Português' },
];

const EULA_TEXT = `ORBS CLASH — END USER LICENSE AGREEMENT

Version ${CURRENT_EULA_VERSION}

1. ACCEPTANCE
By using Orb Clash, you agree to these terms. If you do not agree, do not use the app.

2. LICENSE
We grant you a limited, non-exclusive, non-transferable license to use the app for personal, non-commercial purposes.

3. PROHIBITED CONDUCT
You may not: (a) cheat, hack, or exploit bugs; (b) harass other players; (c) use automated bots or scripts; (d) reverse-engineer the app.

4. IN-APP PURCHASES
All purchases are final. Refunds are subject to platform policies (Apple App Store / Google Play).

5. PRIVACY
We collect minimal data necessary to operate the game. See our Privacy Policy for details.

6. TERMINATION
We may suspend or terminate your account for violations of these terms.

7. DISCLAIMER
The app is provided "as is" without warranties of any kind.

8. GOVERNING LAW
These terms are governed by the laws of Germany.

9. CONTACT
For support: support@orbclash.game`;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshProfile } = useProfile();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState('en');
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slideAnimRef = useRef(new Animated.Value(0));
  const slideAnim = slideAnimRef.current;

  const animateStep = (direction: 1 | -1) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20 * direction, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleComplete = async () => {
    const trimmed = displayName.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameError('Display name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 20) {
      setNameError('Display name must be 20 characters or less');
      return;
    }

    console.log('[Onboarding] Completing onboarding', { language, displayName: trimmed });
    setIsSubmitting(true);

    try {
      // Try edge function first
      const { error: fnError } = await supabase.functions.invoke('acceptEula', {
        body: { version: CURRENT_EULA_VERSION, display_name: trimmed },
      });

      if (fnError) {
        console.warn('[Onboarding] acceptEula edge function failed, falling back', fnError.message);
        // Fallback: direct table update
        if (!user) throw new Error('Not authenticated');
        const { error: updateError } = await supabase
          .from('player_profiles')
          .update({
            onboarded: true,
            eula_accepted_version: CURRENT_EULA_VERSION,
            display_name: trimmed,
            language,
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('[Onboarding] Fallback update failed', updateError.message);
          throw updateError;
        }
      } else {
        // Also save language via direct update since edge function may not handle it
        if (user) {
          await supabase
            .from('player_profiles')
            .update({ language })
            .eq('id', user.id);
        }
      }

      console.log('[Onboarding] Onboarding complete, refreshing profile');
      await refreshProfile();
      router.replace('/(tabs)/(home)' as never);
    } catch (e: any) {
      console.error('[Onboarding] Completion error', e?.message ?? e);
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 3) {
      handleComplete();
      return;
    }
    console.log('[Onboarding] Next pressed', { step });
    animateStep(1);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 0) {
      console.log('[Onboarding] Back pressed on step 0, navigating to welcome');
      router.replace('/auth/welcome' as never);
      return;
    }
    console.log('[Onboarding] Back pressed', { step });
    animateStep(-1);
    setStep((s) => s - 1);
  };

  const handleLanguageSelect = (code: string) => {
    console.log('[Onboarding] Language selected', { code });
    setLanguage(code);
  };

  const handleEulaToggle = () => {
    console.log('[Onboarding] EULA checkbox toggled', { accepted: !eulaAccepted });
    setEulaAccepted((v) => !v);
  };

  const canProceed = () => {
    if (step === 2) return eulaAccepted;
    if (step === 3) return displayName.trim().length >= 2 && !isSubmitting;
    return true;
  };

  const isMinor = () => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    return age < 13 || (age === 13 && m < 0);
  };

  const nextBtnLabel = step === TOTAL_STEPS - 1 ? 'Start playing' : 'Next';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i).map((i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= step && styles.progressDotActive,
              i < step && styles.progressDotDone,
            ]}
          />
        ))}
      </View>

      <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
        {step === 0 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepInner}>
            <View style={styles.stepIcon}>
              <Globe size={32} color={COLORS.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.stepTitle}>Choose your language</Text>
            <Text style={styles.stepSub}>Select the language you'd like to play in</Text>
            <View style={styles.langGrid}>
              {LANGUAGES.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <AnimatedPressable
                    key={lang.code}
                    style={[styles.langBtn, isActive && styles.langBtnActive]}
                    onPress={() => handleLanguageSelect(lang.code)}
                  >
                    <Text style={[styles.langCode, isActive && styles.langCodeActive]}>{lang.label}</Text>
                    <Text style={[styles.langName, isActive && styles.langNameActive]}>{lang.name}</Text>
                    {isActive && (
                      <View style={styles.langCheck}>
                        <Check size={12} color={COLORS.primary} strokeWidth={3} />
                      </View>
                    )}
                  </AnimatedPressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {step === 1 && (
          <View style={styles.stepInner}>
            <View style={styles.stepIcon}>
              <Calendar size={32} color={COLORS.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.stepTitle}>Age verification</Text>
            <Text style={styles.stepSub}>You must be at least 13 years old to play</Text>
            <View style={styles.datePickerWrap}>
              <DateTimePicker
                value={birthDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (date) {
                    console.log('[Onboarding] Birth date changed', { date });
                    setBirthDate(date);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                themeVariant="dark"
                style={styles.datePicker}
              />
            </View>
            {isMinor() && (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  You must be at least 13 years old to create an account.
                </Text>
              </View>
            )}
          </View>
        )}

        {step === 2 && (
          <View style={[styles.stepInner, { flex: 1 }]}>
            <View style={styles.stepIcon}>
              <FileText size={32} color={COLORS.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.stepTitle}>Terms & EULA</Text>
            <Text style={styles.stepSub}>Please read and accept our terms</Text>
            <ScrollView
              style={styles.eulaScroll}
              contentContainerStyle={styles.eulaContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.eulaText}>{EULA_TEXT}</Text>
            </ScrollView>
            <AnimatedPressable style={styles.checkRow} onPress={handleEulaToggle}>
              <View style={[styles.checkbox, eulaAccepted && styles.checkboxActive]}>
                {eulaAccepted && <Check size={14} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={styles.checkLabel}>I have read and accept the EULA</Text>
            </AnimatedPressable>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepInner}>
            <View style={styles.stepIcon}>
              <User size={32} color={COLORS.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.stepTitle}>Choose your name</Text>
            <Text style={styles.stepSub}>This is how other players will see you</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={[styles.nameInput, nameError ? { borderColor: COLORS.danger } : {}]}
                placeholder="e.g. OrbMaster99"
                placeholderTextColor={COLORS.textTertiary}
                value={displayName}
                onChangeText={(v) => {
                  setDisplayName(v);
                  if (nameError && v.trim().length >= 2) setNameError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={handleNext}
                autoFocus
              />
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
              <Text style={styles.charCount}>{displayName.length}/20</Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navRow}>
        <AnimatedPressable style={styles.backBtn} onPress={handleBack}>
          <ChevronLeft size={20} color={COLORS.textSecondary} strokeWidth={2} />
          <Text style={styles.backText}>Back</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={[styles.nextBtn, !canProceed() && { opacity: 0.4 }]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.nextText}>{nextBtnLabel}</Text>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceSecondary,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  progressDotDone: {
    backgroundColor: COLORS.primaryMuted,
    width: 8,
  },
  stepContent: {
    flex: 1,
  },
  stepInner: {
    gap: 20,
    paddingBottom: 16,
  },
  stepIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  stepSub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  langBtn: {
    width: '44%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    position: 'relative',
  },
  langBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  langCode: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  langCodeActive: {
    color: COLORS.primary,
  },
  langName: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  langNameActive: {
    color: COLORS.primary,
  },
  langCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  datePickerWrap: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  datePicker: {
    height: 200,
  },
  warningCard: {
    backgroundColor: COLORS.dangerMuted,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  warningText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '500',
    textAlign: 'center',
  },
  eulaScroll: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 280,
  },
  eulaContent: {
    padding: 16,
  },
  eulaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontFamily: 'SpaceMono',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  nameInput: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'right',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 4,
    minWidth: 80,
  },
  backText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
