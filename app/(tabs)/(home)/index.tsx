import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Trophy,
  Users,
  Settings,
  CheckCircle,
  XCircle,
  BarChart2,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { LeagueBadge } from '@/components/LeagueBadge';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { getLeague, LEAGUES } from '@/game/constants';

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacityRef = useRef(new Animated.Value(0));
  const translateYRef = useRef(new Animated.Value(16));
  const opacity = opacityRef.current;
  const translateY = translateYRef.current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: index * 65, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay: index * 65, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

type ActiveSession = {
  sessionId: string;
  opponentName: string;
  role: string;
  seed: string;
  mode: string;
};

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  color: string;
  bg: string;
}

function StatCard({ icon, label, value, color, bg }: StatCardProps) {
  return (
    <View style={[statCardStyles.card, { backgroundColor: bg }]}>
      <Text style={statCardStyles.icon}>{icon}</Text>
      <Text style={[statCardStyles.value, { color }]}>{value}</Text>
      <Text style={statCardStyles.label}>{label}</Text>
    </View>
  );
}

const statCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    minHeight: 80,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useProfile();
  const { user } = useAuth();

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  // Tutorial redirect: if not done, send to tutorial game
  const tutorialCheckedRef = useRef(false);
  useEffect(() => {
    if (tutorialCheckedRef.current) return;
    if (!profile.onboarded) return;
    if (!profile.tutorial_done) {
      tutorialCheckedRef.current = true;
      console.log('[Home] tutorial_done=false, redirecting to tutorial');
      router.replace('/game?mode=tutorial' as any);
    }
  }, [profile.onboarded, profile.tutorial_done, router]);

  // Logo tap counter for admin access
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const league = getLeague(profile.trophies);
  const leagueIndex = LEAGUES.findIndex((l) => l.name === league.name);
  const nextLeague = leagueIndex < LEAGUES.length - 1 ? LEAGUES[leagueIndex + 1] : null;

  const trophyDisplay = profile.trophies.toLocaleString();
  const coinsDisplay = profile.coins.toLocaleString();
  const gemsDisplay = profile.gems.toLocaleString();

  const progressPct = nextLeague
    ? Math.min(1, (profile.trophies - league.min) / (nextLeague.min - league.min))
    : 1;
  const progressBarWidth = `${Math.round(progressPct * 100)}%` as `${number}%`;

  const totalGames = profile.wins + profile.losses;
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;
  const winRateDisplay = `${winRate}%`;
  const winsDisplay = profile.wins.toLocaleString();
  const lossesDisplay = profile.losses.toLocaleString();

  // Check for active session on mount
  useEffect(() => {
    if (!user) return;
    console.log('[Home] Checking for active session');
    supabase.functions.invoke('get-active-session', {}).then(({ data, error }) => {
      if (error) {
        console.warn('[Home] get-active-session error', error.message);
        return;
      }
      if (data?.session) {
        console.log('[Home] Active session found', data.session);
        setActiveSession({
          sessionId: data.session.id,
          opponentName: data.session.opponent_name ?? 'Opponent',
          role: data.session.role ?? 'a',
          seed: String(data.session.seed ?? Date.now()),
          mode: data.session.mode ?? 'casual',
        });
      }
    });
  }, [user]);

  const handleLogoTap = useCallback(() => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    logoTapTimer.current = setTimeout(() => {
      logoTapCount.current = 0;
    }, 1500);
    if (logoTapCount.current >= 5) {
      logoTapCount.current = 0;
      console.log('[Home] Admin access triggered via logo tap');
      router.push('/admin');
    }
  }, [router]);

  const handlePlayNow = useCallback(() => {
    console.log('[Home] PLAY NOW button pressed — navigating to /setup');
    router.push('/setup');
  }, [router]);

  const handleRejoin = useCallback(() => {
    if (!activeSession) return;
    console.log('[Home] Rejoin match pressed', activeSession);
    router.push({
      pathname: '/game',
      params: {
        sessionId: activeSession.sessionId,
        role: activeSession.role,
        seed: activeSession.seed,
        mode: activeSession.mode,
        opponentName: activeSession.opponentName,
      },
    });
  }, [activeSession, router]);

  const handleSocialPress = useCallback(() => {
    console.log('[Home] Social button pressed');
    router.push('/(tabs)/social' as never);
  }, [router]);

  const handleSettingsPress = useCallback(() => {
    console.log('[Home] Settings button pressed');
    router.push('/(tabs)/settings' as never);
  }, [router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <AnimatedListItem index={0}>
        <View style={styles.header}>
          {/* Logo + player info */}
          <View style={styles.headerLeft}>
            <Pressable onPress={handleLogoTap} hitSlop={12}>
              <Text style={styles.logoEmoji}>⚡</Text>
            </Pressable>
            <View style={styles.playerDetails}>
              <Text style={styles.playerName} numberOfLines={1}>{profile.display_name}</Text>
              <LeagueBadge trophies={profile.trophies} size="sm" />
            </View>
          </View>
          {/* Top-right buttons */}
          <View style={styles.headerRight}>
            <Pressable style={styles.iconBtn} onPress={handleSocialPress}>
              <Users size={18} color="#64748b" strokeWidth={2} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={handleSettingsPress}>
              <Settings size={18} color="#64748b" strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </AnimatedListItem>

      {/* Currency row */}
      <AnimatedListItem index={1}>
        <View style={styles.currencyRow}>
          <View style={styles.currencyChip}>
            <Trophy size={13} color={COLORS.gold} strokeWidth={2} />
            <Text style={styles.currencyValue}>{trophyDisplay}</Text>
          </View>
          <View style={styles.currencyChip}>
            <Text style={styles.currencyEmoji}>💎</Text>
            <Text style={[styles.currencyValue, { color: COLORS.gem }]}>{gemsDisplay}</Text>
          </View>
          <View style={styles.currencyChip}>
            <Text style={styles.currencyEmoji}>🪙</Text>
            <Text style={[styles.currencyValue, { color: COLORS.coin }]}>{coinsDisplay}</Text>
          </View>
        </View>
      </AnimatedListItem>

      {/* Active session rejoin banner */}
      {activeSession && (
        <AnimatedListItem index={2}>
          <View style={styles.rejoinBanner}>
            <View style={styles.rejoinInfo}>
              <Text style={styles.rejoinTitle}>🎮 Rejoin Match</Text>
              <Text style={styles.rejoinSub}>
                vs
              </Text>
              <Text style={styles.rejoinOpponent}>{activeSession.opponentName}</Text>
            </View>
            <AnimatedPressable style={styles.rejoinBtn} onPress={handleRejoin}>
              <Text style={styles.rejoinBtnText}>Rejoin</Text>
            </AnimatedPressable>
          </View>
        </AnimatedListItem>
      )}

      {/* League progress card */}
      <AnimatedListItem index={3}>
        <View style={[styles.leagueCard, { borderColor: `${league.color}33` }]}>
          <View style={styles.leagueCardTop}>
            <View style={styles.leagueLeft}>
              <Text style={[styles.leagueName, { color: league.color }]}>{league.name}</Text>
              <Text style={styles.leagueSub}>League</Text>
            </View>
            <View style={styles.leagueRight}>
              <View style={styles.trophyRow}>
                <Trophy size={16} color={COLORS.gold} strokeWidth={2} />
                <Text style={styles.trophyBig}>{trophyDisplay}</Text>
              </View>
              <Text style={styles.peakText}>Peak: {(profile.peak_trophies ?? 0).toLocaleString()}</Text>
            </View>
          </View>
          {nextLeague && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>
                  {profile.trophies.toLocaleString()} / {nextLeague.min.toLocaleString()} to {nextLeague.name}
                </Text>
                <Text style={[styles.progressPct, { color: league.color }]}>
                  {Math.round(progressPct * 100)}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: progressBarWidth, backgroundColor: league.color },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </AnimatedListItem>

      {/* PLAY NOW button */}
      <AnimatedListItem index={4}>
        <AnimatedPressable style={styles.playNowBtn} onPress={handlePlayNow}>
          <Text style={styles.playNowText}>⚡ PLAY NOW</Text>
        </AnimatedPressable>
      </AnimatedListItem>

      {/* Stats grid */}
      <AnimatedListItem index={5}>
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard icon="🏆" label="Trophies" value={trophyDisplay} color="#f59e0b" bg="#fffbeb" />
            <StatCard icon="📊" label="Win Rate" value={winRateDisplay} color="#3b82f6" bg="#eff6ff" />
          </View>
          <View style={styles.statsRow}>
            <StatCard icon="✅" label="Wins" value={winsDisplay} color="#10b981" bg="#f0fdf4" />
            <StatCard icon="❌" label="Losses" value={lossesDisplay} color="#f43f5e" bg="#fff1f2" />
          </View>
        </View>
      </AnimatedListItem>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  logoEmoji: {
    fontSize: 28,
  },
  playerDetails: {
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  currencyEmoji: {
    fontSize: 12,
  },
  currencyValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  rejoinBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fcd34d',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rejoinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  rejoinTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  rejoinSub: {
    fontSize: 13,
    color: '#78350f',
    fontWeight: '500',
  },
  rejoinOpponent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350f',
  },
  rejoinBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rejoinBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leagueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  leagueCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leagueLeft: {
    gap: 2,
  },
  leagueName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  leagueSub: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  leagueRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  trophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trophyBig: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.gold,
    fontVariant: ['tabular-nums'],
  },
  peakText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  progressSection: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  playNowBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  playNowText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statsGrid: {
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
