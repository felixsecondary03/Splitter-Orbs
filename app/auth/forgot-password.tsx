import React, { useState } from 'react';
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
import { Mail, CheckCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [focusedField, setFocusedField] = useState(false);

  const validateEmail = (val: string) => {
    if (!val) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email address';
    return '';
  };

  const handleSend = async () => {
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    console.log('[ForgotPassword] Send Reset Link pressed', { email });
    setIsLoading(true);
    try {
      // TODO: integrate with auth
      await new Promise((r) => setTimeout(r, 1000));
      console.log('[ForgotPassword] Reset link sent successfully');
      setSent(true);
    } catch (e) {
      console.log('[ForgotPassword] Send reset link error', e);
      setEmailError('Could not send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const borderColor = emailError
    ? COLORS.danger
    : focusedField
    ? COLORS.primary
    : COLORS.border;

  if (sent) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.successIcon}>
          <CheckCircle size={48} color={COLORS.success} strokeWidth={1.5} />
        </View>
        <Text style={styles.successTitle}>Check your email</Text>
        <Text style={styles.successText}>
          We sent a password reset link to{'\n'}
          <Text style={styles.successEmail}>{email}</Text>
        </Text>
        <Text style={styles.successHint}>
          Didn't receive it? Check your spam folder or try again.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: COLORS.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrap, { borderColor }]}>
            <Mail size={18} color={COLORS.textTertiary} strokeWidth={2} />
            <TextInput
              style={styles.input}
              placeholder="e.g. player@email.com"
              placeholderTextColor={COLORS.textTertiary}
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(validateEmail(v)); }}
              onBlur={() => { setFocusedField(false); setEmailError(validateEmail(email)); }}
              onFocus={() => setFocusedField(true)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              autoFocus
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>

        <AnimatedPressable
          style={[styles.sendBtn, isLoading && { opacity: 0.7 }]}
          onPress={handleSend}
          disabled={isLoading}
        >
          <Text style={styles.sendBtnText}>{isLoading ? 'Sending...' : 'Send reset link'}</Text>
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
    lineHeight: 22,
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
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    boxShadow: '0 4px 16px rgba(79,142,247,0.3)',
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  successText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  successEmail: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  successHint: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
