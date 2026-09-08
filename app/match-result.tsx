import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Trophy, Clock, Zap, Target, Home, RotateCcw, Star, TrendingUp } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { LEAGUES, getLeague } from '@/game/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MatchOutcome = 'WIN' | 'LOSS' | 'DRAW';

const OUTCOME_CONFIG: Record<MatchOutcome, { color: string; bg: string; label: string; subLabel: string }> = {
  WIN: { color: COLORS.success, bg: 'rgba(34,197,94,0.12)', label: 'VICTORY!', subLabel: 'Outstanding performance!' },
  LOSS: { color: COLORS.danger, bg: 'rgba(239,68,68,0.12)', label: 'DEFEAT', subLabel: 'Better luck next time.' },
  DRAW: { color: COLORS.warning, bg: 'rgba(245,158,11,0.12)', label: 'DRAW', subLabel: 'A hard-fought battle.' },
};

const CONFETTI_COLORS = ['#4F8EF7', '#A855F7', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#FCD34D'];

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  startX: number;
}

function Confetti({ active }: { active: boolean }) {
  const pieces = useRef<ConfettiPiece[]>(
    Array.from({ length: 30 }, (_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 8,
      startX: Math.random() * SCREEN_WIDTH,
    }))
  ).current;

  useEffect(() => {
    if (!active) return;
    const animations = pieces.map((piece, i) => {
      piece.x.setValue(0);
      piece.y.setValue(0);
      piece.rotate.setValue(0);
      piece.opacity.setValue(0);

      const delay = i * 60;
      const duration = 1200 + Math.random() * 800;
      const driftX = (Math.random() - 0.5) * 120;

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(piece.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(piece.y, { toValue: 400 + Math.random() * 200, duration, useNativeDriver: true }),
          Animated.timing(piece.x, { toValue: driftX, duration, useNativeDriver: true }),
          Animated.timing(piece.rotate, { toValue: 720 + Math.random() * 360, duration, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(duration * 0.7),
            Animated.timing(piece.opacity, { toValue: 0, duration: duration * 0.3, useNativeDriver: true }),
          ]),
        ]),
      ]);
    });

    Animated.stagger(0, animations).start();
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {pieces.map((piece, i) => {
        const rotate = piece.rotate.interpolate({ inputRange: [0, 720], outputRange: ['0deg', '720deg'] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 80,
              left: piece.startX,
              width: piece.size,
              height: piece.size,
              borderRadius: 2,
              backgroundColor: piece.color,
              transform: [{ translateX: piece.x }, { translateY: piece.y }, { rotate }],
              opacity: piece.opacity,
            }}
          />
        );
      })}
    </View>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  index: number;
}

function StatCard({ icon, label, value, index }: StatCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: 400 + index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: 400 + index * 80, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.statCard, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function MatchResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    outcome?: string;
    winner?: string;
    trophyChange?: string;
    coinsEarned?: string;
    duration?: string;
    damageDealt?: string;
    orbsDestroyed?: string;
    towersPlaced?: string;
    abilitiesUsed?: string;
    mode?: string;
    playerHp?: string;
    opponentHp?: string;
  }>();

  // Derive outcome from winner param if outcome not provided
  const rawOutcome = params.outcome ?? (params.winner === 'player' ? 'WIN' : params.winner === 'draw' ? 'DRAW' : 'LOSS');
  const outcome = (rawOutcome.toUpperCase() as MatchOutcome) in OUTCOME_CONFIG
    ? (rawOutcome.toUpperCase() as MatchOutcome)
    : 'WIN';

  const trophyChange = params.trophyChange ?? (outcome === 'WIN' ? '+30' : outcome === 'LOSS' ? '-20' : '+0');
  const coinsEarned = params.coinsEarned ?? '85';
  const duration = params.duration ?? '3:42';
  const damageDealt = params.damageDealt ?? '1,240';
  const orbsDestroyed = params.orbsDestroyed ?? '47';
  const towersPlaced = params.towersPlaced ?? '8';
  const abilitiesUsed = params.abilitiesUsed ?? '5';
  const mode = params.mode ?? 'casual';

  const config = OUTCOME_CONFIG[outcome];
  const trophyIsPositive = trophyChange.startsWith('+') && trophyChange !== '+0';
  const trophyColor = trophyIsPositive ? COLORS.success : outcome === 'DRAW' ? COLORS.warning : COLORS.danger;

  // Trophy counter animation
  const [displayedTrophyChange, setDisplayedTrophyChange] = useState('0');
  const trophyNum = parseInt(trophyChange.replace('+', ''), 10);
  const isPositive = trophyChange.startsWith('+');

  // League progress
  const baseTrophies = 350; // mock current trophies
  const newTrophies = baseTrophies + trophyNum;
  const currentLeague = getLeague(baseTrophies);
  const newLeague = getLeague(newTrophies);
  const leagueChanged = newLeague.name !== currentLeague.name && trophyIsPositive;

  // Next league threshold
  const currentLeagueIdx = LEAGUES.findIndex(l => l.name === newLeague.name);
  const nextLeague = currentLeagueIdx < LEAGUES.length - 1 ? LEAGUES[currentLeagueIdx + 1] : null;
  const progressInLeague = nextLeague
    ? Math.min(1, (newTrophies - newLeague.minTrophies) / (nextLeague.minTrophies - newLeague.minTrophies))
    : 1;

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const coinsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 120 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Trophy counter
    let frame = 0;
    const totalFrames = 40;
    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const current = Math.round(trophyNum * progress);
      setDisplayedTrophyChange((isPositive ? '+' : '') + current);
      if (frame >= totalFrames) clearInterval(interval);
    }, 30);

    // Progress bar
    setTimeout(() => {
      Animated.timing(progressAnim, { toValue: progressInLeague, duration: 800, useNativeDriver: false }).start();
    }, 600);

    return () => clearInterval(interval);
  }, []);

  const handlePlayAgain = () => {
    console.log('[MatchResult] Play Again pressed', { mode });
    router.replace('/(tabs)/play');
  };

  const handleHome = () => {
    console.log('[MatchResult] Home pressed');
    router.replace('/(tabs)/(home)');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Confetti active={outcome === 'WIN'} />

      {/* Background glow */}
      <View style={[styles.bgGlow, { backgroundColor: config.bg }]} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Outcome header */}
        <Animated.View style={[styles.outcomeSection, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <Text style={[styles.outcomeLabel, { color: config.color }]}>{config.label}</Text>
          <Text style={styles.outcomeSub}>{config.subLabel}</Text>
          <View style={[styles.trophyChip, { backgroundColor: trophyIsPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }]}>
            <Trophy size={18} color={trophyColor} strokeWidth={2} />
            <Text style={[styles.trophyChange, { color: trophyColor }]}>{displayedTrophyChange}</Text>
            <Text style={styles.trophyLabel}>trophies</Text>
          </View>
        </Animated.View>

        {/* League promotion banner */}
        {leagueChanged && (
          <Animated.View style={[styles.promotionBanner, { opacity: opacityAnim }]}>
            <Star size={18} color={COLORS.gold} strokeWidth={2} />
            <Text style={styles.promotionText}>PROMOTED TO {newLeague.name.toUpperCase()}!</Text>
            <Star size={18} color={COLORS.gold} strokeWidth={2} />
          </Animated.View>
        )}

        {/* League progress */}
        <Animated.View style={[styles.leagueCard, { opacity: opacityAnim }]}>
          <View style={styles.leagueHeader}>
            <TrendingUp size={16} color={COLORS.textSecondary} strokeWidth={2} />
            <Text style={styles.leagueTitle}>{newLeague.name}</Text>
            <Text style={styles.leagueTrophies}>{newTrophies} 🏆</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          {nextLeague && (
            <Text style={styles.progressLabel}>
              {nextLeague.minTrophies - newTrophies} trophies to {nextLeague.name}
            </Text>
          )}
        </Animated.View>

        {/* Coins earned */}
        <Animated.View style={[styles.coinsCard, { opacity: opacityAnim }]}>
          <Text style={styles.coinsEmoji}>🪙</Text>
          <View>
            <Text style={styles.coinsValue}>{coinsEarned}</Text>
            <Text style={styles.coinsLabel}>Coins earned</Text>
          </View>
        </Animated.View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            index={0}
            icon={<Clock size={20} color={COLORS.primary} strokeWidth={2} />}
            label="Duration"
            value={duration}
          />
          <StatCard
            index={1}
            icon={<Zap size={20} color={COLORS.warning} strokeWidth={2} />}
            label="Damage"
            value={damageDealt}
          />
          <StatCard
            index={2}
            icon={<Target size={20} color={COLORS.accent} strokeWidth={2} />}
            label="Orbs"
            value={orbsDestroyed}
          />
          <StatCard
            index={3}
            icon={<Trophy size={20} color={COLORS.gold} strokeWidth={2} />}
            label="Towers"
            value={towersPlaced}
          />
          <StatCard
            index={4}
            icon={<Star size={20} color={COLORS.success} strokeWidth={2} />}
            label="Abilities"
            value={abilitiesUsed}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <AnimatedPressable style={styles.homeBtn} onPress={handleHome}>
            <Home size={20} color={COLORS.textSecondary} strokeWidth={2} />
            <Text style={styles.homeBtnText}>Home</Text>
          </AnimatedPressable>

          <AnimatedPressable style={styles.playAgainBtn} onPress={handlePlayAgain}>
            <RotateCcw size={20} color="#fff" strokeWidth={2} />
            <Text style={styles.playAgainText}>Play again</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  bgGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    opacity: 0.6,
  },
  outcomeSection: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  outcomeLabel: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    fontFamily: 'SpaceMono',
  },
  outcomeSub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  trophyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 4,
  },
  trophyChange: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  trophyLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  promotionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  promotionText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  leagueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leagueTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  leagueTrophies: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gold,
    fontFamily: 'SpaceMono',
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  coinsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.2)',
  },
  coinsEmoji: {
    fontSize: 36,
  },
  coinsValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.coin,
    fontFamily: 'SpaceMono',
  },
  coinsLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'SpaceMono',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  homeBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  playAgainBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  playAgainText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
