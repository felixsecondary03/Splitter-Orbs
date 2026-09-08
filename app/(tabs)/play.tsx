import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Swords, Trophy, Lock, Bot, ChevronRight, Zap, X, Copy, Hash } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useProfile } from '@/contexts/ProfileContext';
import { getLeague } from '@/game/constants';

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 70, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

const AI_DIFFICULTIES = [
  { label: 'Easy', mode: 'ai_easy' as const, color: COLORS.success, desc: 'Relaxed pace, forgiving AI' },
  { label: 'Normal', mode: 'ai_normal' as const, color: COLORS.warning, desc: 'Balanced challenge' },
  { label: 'Hard', mode: 'ai_hard' as const, color: COLORS.danger, desc: 'Fast & aggressive AI' },
];

function PulsingOrb() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.pulsingOrb, { transform: [{ scale }], opacity }]} />
  );
}

export default function PlayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useProfile();

  const [matchmakingMode, setMatchmakingMode] = useState<'casual' | 'ranked' | null>(null);
  const [matchFound, setMatchFound] = useState(false);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [privateMode, setPrivateMode] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const matchmakingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const league = getLeague(profile.trophies);

  const startMatchmaking = useCallback((mode: 'casual' | 'ranked') => {
    console.log('[Play] Matchmaking started', { mode, trophies: profile.trophies });
    setMatchmakingMode(mode);
    setMatchFound(false);
    matchmakingTimer.current = setTimeout(() => {
      console.log('[Play] Match found!', { mode });
      setMatchFound(true);
      setTimeout(() => {
        setMatchmakingMode(null);
        setMatchFound(false);
        router.push({
          pathname: '/game',
          params: { mode, opponentName: 'OrbMaster99', opponentTrophies: String(profile.trophies + 15) },
        });
      }, 1500);
    }, 3000);
  }, [profile.trophies, router]);

  const cancelMatchmaking = useCallback(() => {
    console.log('[Play] Matchmaking cancelled');
    if (matchmakingTimer.current) clearTimeout(matchmakingTimer.current);
    setMatchmakingMode(null);
    setMatchFound(false);
  }, []);

  const handleCasual = () => {
    console.log('[Play] Casual Match pressed');
    startMatchmaking('casual');
  };

  const handleRanked = () => {
    console.log('[Play] Ranked Match pressed');
    startMatchmaking('ranked');
  };

  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('[Play] Create Room pressed', { code });
    setGeneratedCode(code);
    setPrivateMode('create');
    setShowPrivateModal(true);
  };

  const handleJoinRoom = () => {
    console.log('[Play] Join Room pressed');
    setPrivateMode('join');
    setJoinCode('');
    setShowPrivateModal(true);
  };

  const handleJoinSubmit = () => {
    console.log('[Play] Join Room submitted', { code: joinCode });
    setShowPrivateModal(false);
    router.push({
      pathname: '/game',
      params: { mode: 'private', opponentName: 'Friend' },
    });
  };

  const handleAI = (mode: 'ai_easy' | 'ai_normal' | 'ai_hard') => {
    console.log('[Play] vs AI pressed', { mode });
    router.push({ pathname: '/game', params: { mode } });
  };

  const trophyRange = 150;
  const leagueName = league.name;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedListItem index={0}>
          <Text style={styles.screenTitle}>Play</Text>
          <Text style={styles.screenSub}>Choose your battle mode</Text>
        </AnimatedListItem>

        <AnimatedListItem index={1}>
          <Text style={styles.sectionLabel}>ONLINE</Text>
        </AnimatedListItem>

        {/* Casual */}
        <AnimatedListItem index={2}>
          <AnimatedPressable style={[styles.modeCard, { borderColor: `${COLORS.primary}22` }]} onPress={handleCasual}>
            <View style={[styles.modeIconWrap, { backgroundColor: `${COLORS.primary}18` }]}>
              <Zap size={22} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View style={styles.modeInfo}>
              <View style={styles.modeTitleRow}>
                <Text style={styles.modeTitle}>Quick Play</Text>
                <View style={[styles.modeBadge, { backgroundColor: `${COLORS.primary}22` }]}>
                  <Text style={[styles.modeBadgeText, { color: COLORS.primary }]}>CASUAL</Text>
                </View>
              </View>
              <Text style={styles.modeSub}>No trophies at stake. Just for fun.</Text>
            </View>
            <View style={[styles.playBtn, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.playBtnText}>PLAY</Text>
            </View>
          </AnimatedPressable>
        </AnimatedListItem>

        {/* Ranked */}
        <AnimatedListItem index={3}>
          <AnimatedPressable style={[styles.modeCard, { borderColor: `${COLORS.gold}22` }]} onPress={handleRanked}>
            <View style={[styles.modeIconWrap, { backgroundColor: `${COLORS.gold}18` }]}>
              <Trophy size={22} color={COLORS.gold} strokeWidth={2} />
            </View>
            <View style={styles.modeInfo}>
              <View style={styles.modeTitleRow}>
                <Text style={styles.modeTitle}>Ranked Match</Text>
                <View style={[styles.modeBadge, { backgroundColor: `${COLORS.gold}22` }]}>
                  <Text style={[styles.modeBadgeText, { color: COLORS.gold }]}>RANKED</Text>
                </View>
              </View>
              <Text style={styles.modeSub}>Compete for trophies and climb the leagues.</Text>
              <View style={styles.rankRow}>
                <Trophy size={12} color={COLORS.gold} strokeWidth={2} />
                <Text style={styles.rankText}>{profile.trophies} trophies</Text>
                <Text style={styles.rankSep}>·</Text>
                <Text style={styles.rankText}>{leagueName}</Text>
              </View>
            </View>
            <View style={[styles.playBtn, { backgroundColor: COLORS.gold }]}>
              <Text style={[styles.playBtnText, { color: '#000' }]}>PLAY</Text>
            </View>
          </AnimatedPressable>
        </AnimatedListItem>

        {/* Private */}
        <AnimatedListItem index={4}>
          <View style={[styles.modeCard, { borderColor: `${COLORS.accent}22` }]}>
            <View style={[styles.modeIconWrap, { backgroundColor: `${COLORS.accent}18` }]}>
              <Lock size={22} color={COLORS.accent} strokeWidth={2} />
            </View>
            <View style={styles.modeInfo}>
              <Text style={styles.modeTitle}>Private Match</Text>
              <Text style={styles.modeSub}>Play with a friend.</Text>
              <View style={styles.privateButtons}>
                <AnimatedPressable style={[styles.privateBtn, { backgroundColor: `${COLORS.accent}18`, borderColor: `${COLORS.accent}44` }]} onPress={handleCreateRoom}>
                  <Text style={[styles.privateBtnText, { color: COLORS.accent }]}>CREATE ROOM</Text>
                </AnimatedPressable>
                <AnimatedPressable style={[styles.privateBtn, { backgroundColor: COLORS.surfaceSecondary, borderColor: COLORS.border }]} onPress={handleJoinRoom}>
                  <Text style={[styles.privateBtnText, { color: COLORS.textSecondary }]}>JOIN ROOM</Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </AnimatedListItem>

        <AnimatedListItem index={5}>
          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>VS AI</Text>
        </AnimatedListItem>

        <AnimatedListItem index={6}>
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Bot size={20} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.aiTitle}>Practice vs AI</Text>
            </View>
            <Text style={styles.aiDesc}>Earn up to 20 daily wins. Matches must last at least 1 minute.</Text>
            <View style={styles.difficultyRow}>
              {AI_DIFFICULTIES.map((d) => (
                <AnimatedPressable
                  key={d.label}
                  style={[styles.diffBtn, { borderColor: `${d.color}44` }]}
                  onPress={() => handleAI(d.mode)}
                >
                  <Text style={[styles.diffLabel, { color: d.color }]}>{d.label}</Text>
                  <Text style={styles.diffDesc}>{d.desc}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        </AnimatedListItem>

        <AnimatedListItem index={7}>
          <View style={styles.infoCard}>
            <Swords size={18} color={COLORS.textSecondary} strokeWidth={2} />
            <Text style={styles.infoText}>
              Matches are real-time 1v1. Your orb loadout and tower selection matter — build your deck in Collection.
            </Text>
          </View>
        </AnimatedListItem>
      </ScrollView>

      {/* Matchmaking Modal */}
      <Modal visible={matchmakingMode !== null} transparent animationType="fade" onRequestClose={cancelMatchmaking}>
        <View style={styles.matchmakingBackdrop}>
          <View style={styles.matchmakingCard}>
            {matchFound ? (
              <>
                <Text style={styles.matchFoundEmoji}>⚔️</Text>
                <Text style={styles.matchFoundTitle}>Match Found!</Text>
                <Text style={styles.matchFoundSub}>OrbMaster99</Text>
                <View style={styles.matchFoundTrophies}>
                  <Trophy size={14} color={COLORS.gold} strokeWidth={2} />
                  <Text style={styles.matchFoundTrophyText}>{profile.trophies + 15} trophies</Text>
                </View>
              </>
            ) : (
              <>
                <PulsingOrb />
                <Text style={styles.matchmakingTitle}>Finding opponent...</Text>
                <Text style={styles.matchmakingMode}>
                  {matchmakingMode === 'ranked' ? '🏆 Ranked' : '⚡ Casual'}
                </Text>
                <View style={styles.trophyRangeRow}>
                  <Trophy size={14} color={COLORS.gold} strokeWidth={2} />
                  <Text style={styles.trophyRangeText}>
                    Searching ±{trophyRange} trophies
                  </Text>
                </View>
                <AnimatedPressable style={styles.cancelMatchBtn} onPress={cancelMatchmaking}>
                  <X size={16} color={COLORS.textSecondary} strokeWidth={2} />
                  <Text style={styles.cancelMatchText}>Cancel</Text>
                </AnimatedPressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Private Room Modal */}
      <Modal visible={showPrivateModal} transparent animationType="slide" onRequestClose={() => setShowPrivateModal(false)}>
        <Pressable style={styles.privateBackdrop} onPress={() => setShowPrivateModal(false)}>
          <View style={styles.privateSheet}>
            <View style={styles.modalHandle} />
            {privateMode === 'create' ? (
              <>
                <Text style={styles.privateTitle}>Room Created</Text>
                <Text style={styles.privateSub}>Share this code with your friend</Text>
                <View style={styles.roomCodeBox}>
                  <Hash size={20} color={COLORS.accent} strokeWidth={2} />
                  <Text style={styles.roomCodeText}>{generatedCode}</Text>
                  <AnimatedPressable onPress={() => { console.log('[Play] Room code copied', { code: generatedCode }); }}>
                    <Copy size={18} color={COLORS.textSecondary} strokeWidth={2} />
                  </AnimatedPressable>
                </View>
                <Text style={styles.privateWaiting}>Waiting for opponent to join...</Text>
                <AnimatedPressable style={styles.privateCancelBtn} onPress={() => { console.log('[Play] Private room cancelled'); setShowPrivateModal(false); }}>
                  <Text style={styles.privateCancelText}>Cancel</Text>
                </AnimatedPressable>
              </>
            ) : (
              <>
                <Text style={styles.privateTitle}>Join a Room</Text>
                <Text style={styles.privateSub}>Enter the room code from your friend</Text>
                <View style={styles.joinInputWrap}>
                  <Hash size={20} color={COLORS.textTertiary} strokeWidth={2} />
                  <TextInput
                    style={styles.joinInput}
                    value={joinCode}
                    onChangeText={(v) => setJoinCode(v.toUpperCase())}
                    placeholder="XXXXXX"
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={6}
                    autoFocus
                  />
                </View>
                <AnimatedPressable
                  style={[styles.joinSubmitBtn, joinCode.length < 6 && { opacity: 0.4 }]}
                  onPress={handleJoinSubmit}
                  disabled={joinCode.length < 6}
                >
                  <Text style={styles.joinSubmitText}>Join Room</Text>
                </AnimatedPressable>
                <AnimatedPressable style={styles.privateCancelBtn} onPress={() => { console.log('[Play] Join room cancelled'); setShowPrivateModal(false); }}>
                  <Text style={styles.privateCancelText}>Cancel</Text>
                </AnimatedPressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
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
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  screenSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    marginTop: 4,
  },
  modeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  modeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeInfo: {
    flex: 1,
    gap: 4,
  },
  modeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modeSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rankText: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: '600',
  },
  rankSep: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  playBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  privateButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  privateBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  privateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  aiCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  aiDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diffBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  diffLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  diffDesc: {
    fontSize: 10,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 14,
  },
  infoCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  // Matchmaking modal
  matchmakingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  matchmakingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 36,
    width: '100%',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  pulsingOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
  },
  matchmakingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  matchmakingMode: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  trophyRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trophyRangeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cancelMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    marginTop: 4,
  },
  cancelMatchText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  matchFoundEmoji: {
    fontSize: 56,
  },
  matchFoundTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.success,
    letterSpacing: -0.5,
  },
  matchFoundSub: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  matchFoundTrophies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchFoundTrophyText: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: '600',
  },
  // Private modal
  privateBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  privateSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 48,
    gap: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 4,
  },
  privateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  privateSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  roomCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: `${COLORS.accent}44`,
    width: '100%',
  },
  roomCodeText: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.accent,
    fontFamily: 'SpaceMono',
    letterSpacing: 4,
  },
  privateWaiting: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  privateCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  privateCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  joinInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    width: '100%',
  },
  joinInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'SpaceMono',
    letterSpacing: 4,
  },
  joinSubmitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  joinSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
