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

const LANG_MIN_AGE: Record<string, number> = {
  de: 16, nl: 16, ie: 16,
  fr: 15,
  es: 14, it: 14,
  // all others: 13
};

const getMinAge = (lang: string): number => LANG_MIN_AGE[lang] ?? 13;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshProfile } = useProfile();

  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState('en');
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnder16, setIsUnder16] = useState(false);

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

    setIsSubmitting(true);

    const birthDateStr = birthDate.toISOString().split('T')[0];
    const under16 = checkIsUnder16();

    try {
      const { error: fnError } = await supabase.functions.invoke('accept-eula', {
        body: {
          version: CURRENT_EULA_VERSION,
          display_name: trimmed,
          birth_date: birthDateStr,
          age_verified: true,
          is_under_16: under16,
          language,
        },
      });

      if (fnError) {
        throw new Error('Could not complete setup. Please check your connection and try again.');
      }

      await refreshProfile();
      router.replace('/(tabs)/(home)' as never);
    } catch (e: any) {
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
    if (step === 1) {
      setIsUnder16(checkIsUnder16());
    }
    animateStep(1);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 0) {
      router.replace('/auth/welcome' as never);
      return;
    }
    animateStep(-1);
    setStep((s) => s - 1);
  };

  const handleLanguageSelect = (code: string) => {
    setLanguage(code);
  };

  const handleEulaToggle = () => {
    setEulaAccepted((v) => !v);
  };

  const canProceed = () => {
    if (step === 1) return !isMinor();
    if (step === 2) return eulaAccepted;
    if (step === 3) return displayName.trim().length >= 2 && !isSubmitting;
    return true;
  };

  const getAge = () => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const minAge = getMinAge(language);
  const isMinor = () => getAge() < minAge;
  const checkIsUnder16 = () => getAge() < 16;

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
            <Text style={styles.stepSub}>You must be at least {minAge} years old to play</Text>
            <View style={styles.datePickerWrap}>
              <DateTimePicker
                value={birthDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (date) {
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
                  You must be at least {minAge} years old to create an account in your region.
                </Text>
              </View>
            )}
            {!isMinor() && checkIsUnder16() && (
              <View style={[styles.warningCard, { backgroundColor: '#FFFBEB', borderColor: 'rgba(245,158,11,0.3)' }]}>
                <Text style={[styles.warningText, { color: '#D97706' }]}>
                  You must be at least 16 to create an account in the EU, or have parental consent.
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
            <AnimatedPressable
              style={styles.eulaLinkBtn}
              onPress={() => {
                router.push('/eula-screen' as never);
              }}
            >
              <FileText size={18} color={COLORS.primary} strokeWidth={1.5} />
              <Text style={styles.eulaLinkText}>Read full EULA</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.checkRow} onPress={handleEulaToggle}>
              <View style={[styles.checkbox, eulaAccepted && styles.checkboxActive]}>
                {eulaAccepted && <Check size={14} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={styles.checkLabel}>I have read and accept the full EULA and Privacy Policy.</Text>
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
  eulaLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  eulaLinkText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
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
