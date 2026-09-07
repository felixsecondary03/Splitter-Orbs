import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validateEmail = (val: string) => {
    if (!val) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email address';
    return '';
  };

  const validatePassword = (val: string) => {
    if (!val) return 'Password is required';
    if (val.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  const validateConfirm = (val: string) => {
    if (!val) return 'Please confirm your password';
    if (val !== password) return 'Passwords do not match';
    return '';
  };

  const handleCreate = async () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = validateConfirm(confirmPassword);
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);
    if (eErr || pErr || cErr) return;

    console.log('[Register] Create Account button pressed', { email });
    setIsLoading(true);
    try {
      await signIn(email, password);
      console.log('[Register] Account created successfully');
      router.replace('/onboarding');
    } catch (err) {
      console.log('[Register] Create Account error', err);
      setEmailError('Could not create account. Try a different email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePassword = () => {
    console.log('[Register] Toggle password visibility');
    setShowPassword((v) => !v);
  };

  const handleToggleConfirm = () => {
    console.log('[Register] Toggle confirm password visibility');
    setShowConfirm((v) => !v);
  };

  const getBorderColor = (field: string, error: string) =>
    error ? COLORS.danger : focusedField === field ? COLORS.primary : COLORS.border;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join Orb Clash and start battling</Text>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrap, { borderColor: getBorderColor('email', emailError) }]}>
            <Mail size={18} color={COLORS.textTertiary} strokeWidth={2} />
            <TextInput
              style={styles.input}
              placeholder="e.g. player@email.com"
              placeholderTextColor={COLORS.textTertiary}
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(validateEmail(v)); }}
              onBlur={() => { setFocusedField(null); setEmailError(validateEmail(email)); }}
              onFocus={() => setFocusedField('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputWrap, { borderColor: getBorderColor('password', passwordError) }]}>
            <Lock size={18} color={COLORS.textTertiary} strokeWidth={2} />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={COLORS.textTertiary}
              value={password}
              onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(validatePassword(v)); }}
              onBlur={() => { setFocusedField(null); setPasswordError(validatePassword(password)); }}
              onFocus={() => setFocusedField('password')}
              secureTextEntry={!showPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <AnimatedPressable onPress={handleTogglePassword} style={styles.eyeBtn}>
              {showPassword
                ? <EyeOff size={18} color={COLORS.textTertiary} strokeWidth={2} />
                : <Eye size={18} color={COLORS.textTertiary} strokeWidth={2} />
              }
            </AnimatedPressable>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.inputWrap, { borderColor: getBorderColor('confirm', confirmError) }]}>
            <Lock size={18} color={COLORS.textTertiary} strokeWidth={2} />
            <TextInput
              ref={confirmRef}
              style={styles.input}
              placeholder="Repeat your password"
              placeholderTextColor={COLORS.textTertiary}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); if (confirmError) setConfirmError(validateConfirm(v)); }}
              onBlur={() => { setFocusedField(null); setConfirmError(validateConfirm(confirmPassword)); }}
              onFocus={() => setFocusedField('confirm')}
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <AnimatedPressable onPress={handleToggleConfirm} style={styles.eyeBtn}>
              {showConfirm
                ? <EyeOff size={18} color={COLORS.textTertiary} strokeWidth={2} />
                : <Eye size={18} color={COLORS.textTertiary} strokeWidth={2} />
              }
            </AnimatedPressable>
          </View>
          {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
        </View>

        <AnimatedPressable
          style={[styles.createBtn, isLoading && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={isLoading}
        >
          <Text style={styles.createBtnText}>{isLoading ? 'Creating account...' : 'Create account'}</Text>
        </AnimatedPressable>

        <Text style={styles.termsText}>
          By creating an account you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    boxShadow: '0 4px 16px rgba(79,142,247,0.3)',
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});
