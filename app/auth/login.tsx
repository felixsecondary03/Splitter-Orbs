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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const validateEmail = (val: string) => {
    if (!val) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email address';
    return '';
  };

  const validatePassword = (val: string) => {
    if (!val) return 'Password is required';
    if (val.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleEmailBlur = () => {
    setFocusedField(null);
    setEmailError(validateEmail(email));
  };

  const handlePasswordBlur = () => {
    setFocusedField(null);
    setPasswordError(validatePassword(password));
  };

  const handleSignIn = async () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    console.log('[Login] Sign In button pressed', { email });
    setIsLoading(true);
    try {
      await signIn(email, password);
      console.log('[Login] Sign In success');
      router.replace('/(tabs)/(home)');
    } catch (err) {
      console.log('[Login] Sign In error', err);
      setPasswordError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    console.log('[Login] Forgot Password pressed');
    router.push('/auth/forgot-password');
  };

  const handleTogglePassword = () => {
    console.log('[Login] Toggle password visibility', { showPassword: !showPassword });
    setShowPassword((v) => !v);
  };

  const emailBorderColor = emailError
    ? COLORS.danger
    : focusedField === 'email'
    ? COLORS.primary
    : COLORS.border;

  const passwordBorderColor = passwordError
    ? COLORS.danger
    : focusedField === 'password'
    ? COLORS.primary
    : COLORS.border;

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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your Splitter Orbs account</Text>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrap, { borderColor: emailBorderColor }]}>
            <Mail size={18} color={COLORS.textTertiary} strokeWidth={2} />
            <TextInput
              style={styles.input}
              placeholder="e.g. player@email.com"
              placeholderTextColor={COLORS.textTertiary}
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(validateEmail(v)); }}
              onBlur={handleEmailBlur}
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
          <View style={[styles.inputWrap, { borderColor: passwordBorderColor }]}>
            <Lock size={18} color={COLORS.textTertiary} strokeWidth={2} />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor={COLORS.textTertiary}
              value={password}
              onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(validatePassword(v)); }}
              onBlur={handlePasswordBlur}
              onFocus={() => setFocusedField('password')}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
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

        <AnimatedPressable style={styles.forgotBtn} onPress={handleForgotPassword}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={[styles.signInBtn, isLoading && { opacity: 0.7 }]}
          onPress={handleSignIn}
          disabled={isLoading}
        >
          <Text style={styles.signInText}>{isLoading ? 'Signing in...' : 'Sign in'}</Text>
        </AnimatedPressable>
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  signInBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    boxShadow: '0 4px 16px rgba(79,142,247,0.3)',
  },
  signInText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
