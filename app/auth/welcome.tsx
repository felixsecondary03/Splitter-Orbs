import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

function AppleLogo({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </Svg>
  );
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107" />
      <Path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00" />
      <Path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50" />
      <Path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2" />
    </Svg>
  );
}

function OrbLogo({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <RadialGradient id="orbGrad" cx="40%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#7BB8FF" />
          <Stop offset="60%" stopColor="#4F8EF7" />
          <Stop offset="100%" stopColor="#2563EB" />
        </RadialGradient>
      </Defs>
      <Circle cx="40" cy="40" r="36" fill="url(#orbGrad)" />
      <Circle cx="28" cy="28" r="8" fill="rgba(255,255,255,0.25)" />
      <Circle cx="52" cy="50" r="5" fill="rgba(255,255,255,0.12)" />
    </Svg>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithGoogle, signInWithApple } = useAuth();

  const fadeAnimRef = useRef(new Animated.Value(0));
  const slideAnimRef = useRef(new Animated.Value(30));
  const fadeAnim = fadeAnimRef.current;
  const slideAnim = slideAnimRef.current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApple = async () => {
    console.log('[Welcome] Continue with Apple pressed');
    try {
      await signInWithApple();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign in failed';
      Alert.alert('Sign in failed', msg);
    }
  };

  const handleGoogle = async () => {
    console.log('[Welcome] Continue with Google pressed');
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign in failed';
      Alert.alert('Sign in failed', msg);
    }
  };

  const handleEmail = () => {
    console.log('[Welcome] Sign in with Email pressed');
    router.push('/auth/login');
  };

  const handleRegister = () => {
    console.log('[Welcome] Create Account pressed');
    router.push('/auth/register');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      {/* Background orbs */}
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <OrbLogo size={96} />
        <Text style={styles.appTitle}>Splitter Orbs</Text>
        <Text style={styles.appSubtitle}>Real-time 1v1 tower defense</Text>
        <Text style={styles.appTagline}>Destroy orbs. Build towers. Dominate.</Text>
      </Animated.View>

      <Animated.View style={[styles.authSection, { opacity: fadeAnim }]}>
        {/* Apple first */}
        <AnimatedPressable style={styles.appleBtn} onPress={handleApple}>
          <AppleLogo size={20} color="#fff" />
          <Text style={styles.appleBtnText}>Continue with Apple</Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.googleBtn} onPress={handleGoogle}>
          <GoogleLogo size={20} />
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </AnimatedPressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <AnimatedPressable style={styles.emailBtn} onPress={handleEmail}>
          <Text style={styles.emailBtnText}>Sign in with Email</Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.registerBtn} onPress={handleRegister}>
          <Text style={styles.registerBtnText}>Create Account</Text>
        </AnimatedPressable>

        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/eula-screen')}>
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>
            Privacy Policy
          </Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  bgOrb1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(79,142,247,0.08)',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: 100,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(168,85,247,0.06)',
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -1,
    marginTop: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  appTagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '400',
    textAlign: 'center',
  },
  authSection: {
    gap: 12,
  },
  appleBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  appleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  googleBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  emailBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emailBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  registerBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  registerBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});
