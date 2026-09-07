import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Trophy,
  Zap,
  Bot,
  TrendingUp,
  X,
  Swords,
  Target,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { LeagueBadge } from '@/components/LeagueBadge';
import { CrateButton } from '@/components/CrateButton';
import { MatchHistoryItem } from '@/components/MatchHistoryItem';
import { useProfile } from '@/contexts/ProfileContext';
import { getLeague, LEAGUES } from '@/game/constants';
import { getDailyMissions } from '@/game/missions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: index * 65, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay: index * 65, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

const LEAGUE_COLORS: Record<string, string> = {
  Beginner: COLORS.leagueBeginner,
  Rookie: COLORS.leagueRookie,
  Cadet: COLORS.leagueCadet,
  Veteran: COLORS.leagueVeteran,
  Champion: COLORS.leagueChampion,
  Master: COLORS.leagueMaster,
  Legend: COLORS.leagueLegend,
};

const MOCK_MATCHES = [
  { opponentName: 'ShadowOrb99', result: 'win' as const, trophyChange: 30, coinsEarned: 120, timeAgo: '5m ago', mode: 'ranked' },
  { opponentName: 'BlasterKing', result: 'loss' as const, trophyChange: -20, coinsEarned: 40, timeAgo: '1h ago', mode: 'ranked' },
  { opponentName: 'FrostQueen', result: 'win' as const, trophyChange: 30, coinsEarned: 110, timeAgo: '3h ago', mode: 'casual' },
  { opponentName: 'VenomBurst', result: 'win' as const, trophyChange: 28, coinsEarned: 100, timeAgo: '5h ago', mode: 'ranked' },
  { opponentName: 'CryoStrike', result: 'loss' as const, trophyChange: -22, coinsEarned: 35, timeAgo: 'Yesterday', mode: 'casual' },
];

const MOCK_OPPONENTS = [
  { name: 'ArcFlash', trophies: 3200, league: 'Champion' },
  { name: 'TowerLord', trophies: 3980, league: 'Master' },
  { name: 'PyreFist', trophies: 2700, league: 'Champion' },
];

type MatchmakingState = 'idle' | 'searching' | 'found';

function MatchmakingModal({
  visible,
  mode,
  onCancel,
  onMatchFound,
}: {
  visible: boolean;
  mode: string;
  onCancel: () => void;
  onMatchFound: (opponent: { name: string; trophies: number; league: string }) => void;
}) {
  const [state, setState] = useState<MatchmakingState>('searching');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opponent = MOCK_OPPONENTS[Math.floor(Math.random() * MOCK_OPPONENTS.length)];

  useEffect(() => {
    if (!visible) {
      setState('searching');
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const timer = setTimeout(() => {
      pulse.stop();
      pulseAnim.setValue(1);
      setState('found');
      setTimeout(() => onMatchFound(opponent), 1500);
    }, 3000);

    return () => {
      clearTimeout(timer);
      pulse.stop();
    };
  }, [visible]);

  const modeLabel = mode === 'ranked' ? 'Ranked Match' : mode === 'casual' ? 'Casual Match' : `vs AI (${mode})`;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={mmStyles.overlay}>
        <View style={mmStyles.card}>
          <Text style={mmStyles.modeLabel}>{modeLabel}</Text>

          {state === 'searching' ? (
            <>
              <Animated.View style={[mmStyles.orbWrap, { transform: [{ scale: pulseAnim }] }]}>
                <View style={mmStyles.orb}>
                  <Zap size={32} color={COLORS.primary} strokeWidth={2} />
                </View>
                <Animated.View style={[mmStyles.orbRing, { transform: [{ scale: pulseAnim }] }]} />
              </Animated.View>
              <Text style={mmStyles.searchingText}>Finding Match...</Text>
              <Text style={mmStyles.searchingSub}>Searching for an opponent</Text>
              <AnimatedPressable style={mmStyles.cancelBtn} onPress={onCancel}>
                <X size={16} color={COLORS.textSecondary} strokeWidth={2} />
                <Text style={mmStyles.cancelText}>Cancel</Text>
              </AnimatedPressable>
            </>
          ) : (
            <>
              <View style={mmStyles.foundIconWrap}>
                <Swords size={36} color={COLORS.success} strokeWidth={2} />
              </View>
              <Text style={mmStyles.foundText}>Match Found!</Text>
              <View style={mmStyles.opponentCard}>
                <View style={mmStyles.opponentAvatar}>
                  <Text style={mmStyles.opponentAvatarText}>{opponent.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={mmStyles.opponentName}>{opponent.name}</Text>
                  <View style={mmStyles.opponentMeta}>
                    <Trophy size={12} color={COLORS.gold} strokeWidth={2} />
                    <Text style={mmStyles.opponentTrophies}>{opponent.trophies.toLocaleString()}</Text>
                    <Text style={mmStyles.opponentLeague}>{opponent.league}</Text>
                  </View>
                </View>
              </View>
              <Text style={mmStyles.loadingText}>Loading arena...</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const mmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    width: SCREEN_WIDTH - 64,
    borderWidth: 1,
    borderColor: COLORS.border,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  orbWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${COLORS.primary}44`,
  },
  orbRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: `${COLORS.primary}22`,
  },
  searchingText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  searchingSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  foundIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.success,
    letterSpacing: -0.3,
  },
  opponentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    width: '100%',
  },
  opponentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  opponentAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  opponentName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  opponentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  opponentTrophies: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    fontFamily: 'SpaceMono',
  },
  opponentLeague: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useProfile();

  const [matchmakingVisible, setMatchmakingVisible] = useState(false);
  const [matchmakingMode, setMatchmakingMode] = useState('casual');
  const [freeCrateClaimed, setFreeCrateClaimed] = useState<string | null>(null);
  const [gemCrateClaimed, setGemCrateClaimed] = useState<string | null>(null);

  const league = getLeague(profile.trophies);
  const leagueColor = LEAGUE_COLORS[league.name] ?? COLORS.primary;
  const leagueIndex = LEAGUES.findIndex((l) => l.name === league.name);
  const nextLeague = leagueIndex < LEAGUES.length - 1 ? LEAGUES[leagueIndex + 1] : null;

  const trophyDisplay = profile.trophies.toLocaleString();
  const coinsDisplay = profile.coins.toLocaleString();
  const gemsDisplay = profile.gems.toLocaleString();
  const peakDisplay = profile.peak_trophies.toLocaleString();

  const progressPct = nextLeague
    ? Math.min(
        1,
        (profile.trophies - league.minTrophies) /
          (nextLeague.minTrophies - league.minTrophies)
      )
    : 1;

  const progressBarWidth = `${Math.round(progressPct * 100)}%` as `${number}%`;

  const totalGames = profile.wins + profile.losses;
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;

  const todaySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const dailyMissions = getDailyMissions(todaySeed);

  const startMatchmaking = useCallback((mode: string) => {
    console.log(`[Home] Matchmaking started mode=${mode}`);
    setMatchmakingMode(mode);
    setMatchmakingVisible(true);
  }, []);

  const cancelMatchmaking = useCallback(() => {
    console.log('[Home] Matchmaking cancelled');
    setMatchmakingVisible(false);
  }, []);

  const handleMatchFound = useCallback(
    (opponent: { name: string; trophies: number; league: string }) => {
      console.log('[Home] Match found, navigating to game', { opponent, mode: matchmakingMode });
      setMatchmakingVisible(false);
      router.push({ pathname: '/game', params: { mode: matchmakingMode, seed: String(Date.now()) } });
    },
    [matchmakingMode, router]
  );

  const handleQuickPlay = useCallback(() => {
    console.log('[Home] Quick Play button pressed');
    startMatchmaking('casual');
  }, [startMatchmaking]);

  const handleRanked = useCallback(() => {
    console.log('[Home] Ranked button pressed');
    startMatchmaking('ranked');
  }, [startMatchmaking]);

  const handleVsAI = useCallback((difficulty: string) => {
    console.log(`[Home] vs AI button pressed difficulty=${difficulty}`);
    router.push({ pathname: '/game', params: { mode: `ai_${difficulty}`, seed: String(Date.now()) } });
  }, [router]);

  const handleClaimFreeCrate = useCallback(() => {
    console.log('[Home] Free crate claimed');
    setFreeCrateClaimed(new Date().toISOString());
  }, []);

  const handleClaimGemCrate = useCallback(() => {
    console.log('[Home] Gem crate claimed');
    setGemCrateClaimed(new Date().toISOString());
  }, []);

  const handleClaimMission = useCallback((missionId: string) => {
    console.log(`[Home] Mission claimed missionId=${missionId}`);
  }, []);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <AnimatedListItem index={0}>
          <View style={styles.header}>
            <View style={styles.playerInfo}>
              <View style={[styles.avatar, { borderColor: leagueColor }]}>
                <Text style={styles.avatarText}>
                  {profile.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.playerDetails}>
                <Text style={styles.playerName} numberOfLines={1}>{profile.display_name}</Text>
                <LeagueBadge trophies={profile.trophies} size="sm" />
              </View>
            </View>
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
          </View>
        </AnimatedListItem>

        {/* League progress card */}
        <AnimatedListItem index={1}>
          <View style={[styles.leagueCard, { borderColor: `${leagueColor}33` }]}>
            <View style={styles.leagueCardTop}>
              <View style={styles.leagueLeft}>
                <Text style={[styles.leagueName, { color: leagueColor }]}>{league.name}</Text>
                <Text style={styles.leagueSub}>League</Text>
              </View>
              <View style={styles.leagueRight}>
                <View style={styles.trophyRow}>
                  <Trophy size={16} color={COLORS.gold} strokeWidth={2} />
                  <Text style={styles.trophyBig}>{trophyDisplay}</Text>
                </View>
                <Text style={styles.peakText}>Peak: {peakDisplay}</Text>
              </View>
            </View>
            {nextLeague && (
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>
                    {profile.trophies.toLocaleString()} / {nextLeague.minTrophies.toLocaleString()} to {nextLeague.name}
                  </Text>
                  <Text style={[styles.progressPct, { color: leagueColor }]}>
                    {Math.round(progressPct * 100)}%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: progressBarWidth, backgroundColor: leagueColor },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </AnimatedListItem>

        {/* Quick play buttons */}
        <AnimatedListItem index={2}>
          <View style={styles.playSection}>
            <AnimatedPressable style={styles.quickPlayBtn} onPress={handleQuickPlay}>
              <Zap size={26} color="#fff" strokeWidth={2.5} />
              <Text style={styles.quickPlayText}>QUICK PLAY</Text>
              <Text style={styles.quickPlaySub}>Casual Match</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.rankedBtn} onPress={handleRanked}>
              <TrendingUp size={22} color={COLORS.gold} strokeWidth={2} />
              <Text style={styles.rankedText}>RANKED</Text>
              <Text style={styles.rankedSub}>Earn trophies</Text>
            </AnimatedPressable>
          </View>
        </AnimatedListItem>

        {/* vs AI row */}
        <AnimatedListItem index={3}>
          <View style={styles.aiRow}>
            <View style={styles.aiLabel}>
              <Bot size={16} color={COLORS.accent} strokeWidth={2} />
              <Text style={styles.aiLabelText}>vs AI</Text>
            </View>
            {(['easy', 'normal', 'hard'] as const).map((diff) => {
              const diffColors: Record<string, string> = {
                easy: COLORS.success,
                normal: COLORS.warning,
                hard: COLORS.danger,
              };
              const diffColor = diffColors[diff];
              return (
                <AnimatedPressable
                  key={diff}
                  style={[styles.aiBtn, { borderColor: `${diffColor}44` }]}
                  onPress={() => handleVsAI(diff)}
                >
                  <Text style={[styles.aiBtnText, { color: diffColor }]}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </AnimatedListItem>

        {/* Daily crates */}
        <AnimatedListItem index={4}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Rewards</Text>
          </View>
          <View style={styles.cratesRow}>
            <CrateButton type="free" lastClaimed={freeCrateClaimed} onClaim={handleClaimFreeCrate} />
            <CrateButton type="gem" lastClaimed={gemCrateClaimed} onClaim={handleClaimGemCrate} />
          </View>
        </AnimatedListItem>

        {/* Daily missions */}
        <AnimatedListItem index={5}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Missions</Text>
            <View style={styles.refreshBadge}>
              <Text style={styles.refreshText}>Resets at midnight</Text>
            </View>
          </View>
        </AnimatedListItem>

        {dailyMissions.map((mission, i) => {
          const mockProgress = Math.floor(Math.random() * mission.target);
          const isComplete = mockProgress >= mission.target;
          const progressFraction = Math.min(1, mockProgress / mission.target);
          const progressWidth = `${Math.round(progressFraction * 100)}%` as `${number}%`;
          return (
            <AnimatedListItem key={mission.id} index={6 + i}>
              <View style={styles.missionCard}>
                <View style={styles.missionLeft}>
                  <Target size={18} color={COLORS.accent} strokeWidth={2} />
                </View>
                <View style={styles.missionInfo}>
                  <Text style={styles.missionDesc}>{mission.description}</Text>
                  <View style={styles.missionProgressTrack}>
                    <View
                      style={[
                        styles.missionProgressFill,
                        {
                          width: progressWidth,
                          backgroundColor: isComplete ? COLORS.success : COLORS.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.missionProgress}>
                    {mockProgress}/{mission.target}
                  </Text>
                </View>
                <View style={styles.missionReward}>
                  <Text style={styles.missionRewardCoins}>+{mission.rewardCoins} 🪙</Text>
                  <Text style={styles.missionRewardGems}>+{mission.rewardGems} 💎</Text>
                  {isComplete && (
                    <AnimatedPressable
                      style={styles.missionClaimBtn}
                      onPress={() => handleClaimMission(mission.id)}
                    >
                      <Text style={styles.missionClaimText}>Claim</Text>
                    </AnimatedPressable>
                  )}
                </View>
              </View>
            </AnimatedListItem>
          );
        })}

        {/* Win/Loss stats */}
        <AnimatedListItem index={9}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{profile.wins.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.danger }]}>{profile.losses.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>{winRate}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.gold }]}>{profile.win_streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </AnimatedListItem>

        {/* Recent matches */}
        <AnimatedListItem index={10}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Matches</Text>
          </View>
        </AnimatedListItem>

        {MOCK_MATCHES.map((match, i) => (
          <AnimatedListItem key={i} index={11 + i}>
            <MatchHistoryItem {...match} />
          </AnimatedListItem>
        ))}
      </ScrollView>

      <MatchmakingModal
        visible={matchmakingVisible}
        mode={matchmakingMode}
        onCancel={cancelMatchmaking}
        onMatchFound={handleMatchFound}
      />
    </>
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
    gap: 8,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.text,
  },
  playerDetails: {
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  leagueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
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
    color: COLORS.textTertiary,
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
    fontFamily: 'SpaceMono',
    fontVariant: ['tabular-nums'],
  },
  peakText: {
    fontSize: 11,
    color: COLORS.textTertiary,
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
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  playSection: {
    flexDirection: 'row',
    gap: 12,
  },
  quickPlayBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 5,
    boxShadow: '0 4px 20px rgba(79,142,247,0.4)',
  },
  quickPlayText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  quickPlaySub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  rankedBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: `${COLORS.gold}33`,
  },
  rankedText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  rankedSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  aiLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  aiBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
  },
  aiBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  refreshBadge: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  refreshText: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  cratesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  missionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  missionLeft: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  missionInfo: {
    flex: 1,
    gap: 5,
  },
  missionDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  missionProgressTrack: {
    height: 4,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  missionProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  missionProgress: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  missionReward: {
    alignItems: 'flex-end',
    gap: 3,
    flexShrink: 0,
  },
  missionRewardCoins: {
    fontSize: 11,
    color: COLORS.coin,
    fontWeight: '700',
  },
  missionRewardGems: {
    fontSize: 11,
    color: COLORS.gem,
    fontWeight: '700',
  },
  missionClaimBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 2,
  },
  missionClaimText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A0E1A',
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.divider,
  },
});
