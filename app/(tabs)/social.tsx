import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  TextInput,
  Modal,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Trophy,
  Users,
  UserPlus,
  Search,
  Crown,
  Mail,
  Check,
  X,
  Swords,
  Bell,
  Star,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { LeagueBadge } from '@/components/LeagueBadge';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SocialTab = 'leaderboard' | 'friends' | 'inbox';

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 55, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 55, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

interface LeaderboardPlayer {
  id: string;
  rank: number;
  name: string;
  trophies: number;
  wins: number;
  losses: number;
  isMe?: boolean;
}

interface FriendRow {
  id: string;
  name: string;
  trophies: number;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  senderName: string;
}

interface InboxItem {
  id: string;
  type: 'friend_request' | 'game_invite' | 'system';
  from?: string;
  message: string;
  time: string;
}

const RANK_COLORS = [COLORS.gold, COLORS.silver, COLORS.bronze];

const STATIC_INBOX: InboxItem[] = [
  { id: 'sys1', type: 'system', message: 'Achievement unlocked: First Victory! +100 coins', time: '1h ago' },
  { id: 'sys2', type: 'system', message: 'You reached Rookie league! Keep climbing.', time: '3h ago' },
];

function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={[skeletonStyles.row, { opacity }]}>
      <View style={skeletonStyles.rank} />
      <View style={skeletonStyles.avatar} />
      <View style={skeletonStyles.info}>
        <View style={skeletonStyles.nameLine} />
        <View style={skeletonStyles.subLine} />
      </View>
      <View style={skeletonStyles.trophy} />
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  row: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rank: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.surfaceSecondary },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceSecondary },
  info: { flex: 1, gap: 6 },
  nameLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.surfaceSecondary, width: '60%' },
  subLine: { height: 10, borderRadius: 5, backgroundColor: COLORS.surfaceSecondary, width: '40%' },
  trophy: { width: 48, height: 14, borderRadius: 6, backgroundColor: COLORS.surfaceSecondary },
});

function PodiumCard({ player, rank }: { player: LeaderboardPlayer; rank: 1 | 2 | 3 }) {
  const rankColor = RANK_COLORS[rank - 1];
  const heights = { 1: 90, 2: 70, 3: 60 };
  const podiumHeight = heights[rank];
  const trophyDisplay = player.trophies.toLocaleString();

  return (
    <View style={[podiumStyles.card, { borderColor: `${rankColor}44` }]}>
      {rank === 1 && <Crown size={18} color={rankColor} strokeWidth={2} style={podiumStyles.crown} />}
      <View style={[podiumStyles.avatar, { borderColor: rankColor }]}>
        <Text style={podiumStyles.avatarText}>{player.name.charAt(0)}</Text>
      </View>
      <Text style={podiumStyles.name} numberOfLines={1}>{player.name}</Text>
      <View style={podiumStyles.trophyRow}>
        <Trophy size={11} color={COLORS.gold} strokeWidth={2} />
        <Text style={podiumStyles.trophies}>{trophyDisplay}</Text>
      </View>
      <LeagueBadge trophies={player.trophies} size="sm" />
      <View style={[podiumStyles.podiumBase, { height: podiumHeight, backgroundColor: `${rankColor}22`, borderColor: `${rankColor}44` }]}>
        <Text style={[podiumStyles.rankNum, { color: rankColor }]}>#{rank}</Text>
      </View>
    </View>
  );
}

const podiumStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  crown: {
    marginBottom: -4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  trophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trophies: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    fontFamily: 'SpaceMono',
  },
  podiumBase: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  rankNum: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
});

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SocialTab>('leaderboard');

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  // Friends state
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  // Incoming requests state
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);

  // Search modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string; trophies: number }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingFriend, setAddingFriend] = useState<string | null>(null);

  // Inbox
  const [inbox] = useState<InboxItem[]>(STATIC_INBOX);

  const inboxCount = incomingRequests.length;

  // ── Leaderboard fetch ──────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    console.log('[Social] Fetching leaderboard');
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const { data, error } = await supabase
        .from('player_profiles')
        .select('id, display_name, trophies, wins, losses')
        .order('trophies', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('[Social] Leaderboard fetch error', error.message);
        setLeaderboardError(error.message);
        return;
      }

      const rows: LeaderboardPlayer[] = (data ?? []).map((row, i) => ({
        id: row.id,
        rank: i + 1,
        name: row.display_name ?? 'Unknown',
        trophies: row.trophies ?? 0,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        isMe: row.id === user?.id,
      }));

      setLeaderboard(rows);

      const meIndex = rows.findIndex((r) => r.isMe);
      setMyRank(meIndex >= 0 ? meIndex + 1 : null);
      console.log('[Social] Leaderboard loaded', { count: rows.length, myRank: meIndex + 1 });
    } catch (e) {
      console.warn('[Social] Leaderboard unexpected error', e);
      setLeaderboardError('Leaderboard coming soon');
    } finally {
      setLeaderboardLoading(false);
    }
  }, [user?.id]);

  // ── Friends fetch ──────────────────────────────────────────────────────────
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    console.log('[Social] Fetching friends list');
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        supabase
          .from('friendships')
          .select('friend_id, friend:player_profiles!friend_id(id, display_name, trophies)')
          .eq('user_id', user.id),
        supabase
          .from('friend_requests')
          .select('id, sender_id, sender:player_profiles!sender_id(id, display_name)')
          .eq('receiver_id', user.id)
          .eq('status', 'pending'),
      ]);

      if (friendsRes.error) {
        console.warn('[Social] Friends fetch error', friendsRes.error.message);
        setFriendsError(friendsRes.error.message);
      } else {
        const rows: FriendRow[] = (friendsRes.data ?? []).map((row: any) => ({
          id: row.friend?.id ?? row.friend_id,
          name: row.friend?.display_name ?? 'Unknown',
          trophies: row.friend?.trophies ?? 0,
        }));
        setFriends(rows);
        console.log('[Social] Friends loaded', { count: rows.length });
      }

      if (!requestsRes.error) {
        const reqs: FriendRequest[] = (requestsRes.data ?? []).map((row: any) => ({
          id: row.id,
          sender_id: row.sender_id,
          senderName: row.sender?.display_name ?? 'Unknown',
        }));
        setIncomingRequests(reqs);
        console.log('[Social] Incoming requests loaded', { count: reqs.length });
      }
    } catch (e) {
      console.warn('[Social] Friends unexpected error', e);
      setFriendsError('Friends feature coming soon');
    } finally {
      setFriendsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'leaderboard') fetchLeaderboard();
    if (activeTab === 'friends' || activeTab === 'inbox') fetchFriends();
  }, [activeTab, fetchLeaderboard, fetchFriends]);

  // ── Search ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      console.log('[Social] Searching for player', { query: searchQuery });
      setSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from('player_profiles')
          .select('id, display_name, trophies')
          .ilike('display_name', `%${searchQuery}%`)
          .neq('id', user?.id ?? '')
          .limit(10);

        if (error) {
          console.warn('[Social] Search error', error.message);
          setSearchResults([]);
        } else {
          const filtered = (data ?? []).filter(
            (r) => !friends.find((f) => f.id === r.id)
          );
          setSearchResults(filtered);
          console.log('[Social] Search results', { count: filtered.length });
        }
      } catch (e) {
        console.warn('[Social] Search unexpected error', e);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, user?.id, friends]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTabChange = useCallback((tab: SocialTab) => {
    console.log('[Social] Tab changed', { tab });
    setActiveTab(tab);
  }, []);

  const handleOpenSearch = useCallback(() => {
    console.log('[Social] Add Friend modal opened');
    setShowSearchModal(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    console.log('[Social] Add Friend modal closed');
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const handleAddFriend = useCallback(async (targetId: string, targetName: string) => {
    if (!user) return;
    console.log('[Social] Add friend pressed', { targetId, targetName });
    setAddingFriend(targetId);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: user.id, receiver_id: targetId, status: 'pending' });

      if (error) {
        console.warn('[Social] Add friend error', error.message);
        Alert.alert('Error', error.message);
      } else {
        console.log('[Social] Friend request sent', { targetName });
        Alert.alert('Request sent', `Friend request sent to ${targetName}`);
        handleCloseSearch();
      }
    } catch (e) {
      console.warn('[Social] Add friend unexpected error', e);
    } finally {
      setAddingFriend(null);
    }
  }, [user, handleCloseSearch]);

  const handleAcceptRequest = useCallback(async (req: FriendRequest) => {
    if (!user) return;
    console.log('[Social] Accepting friend request', { requestId: req.id, from: req.senderName });
    try {
      const [updateRes, insertRes] = await Promise.all([
        supabase
          .from('friend_requests')
          .update({ status: 'accepted' })
          .eq('id', req.id),
        supabase
          .from('friendships')
          .insert([
            { user_id: user.id, friend_id: req.sender_id },
            { user_id: req.sender_id, friend_id: user.id },
          ]),
      ]);

      if (updateRes.error) console.warn('[Social] Accept request update error', updateRes.error.message);
      if (insertRes.error) console.warn('[Social] Accept request insert error', insertRes.error.message);

      setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
      await fetchFriends();
      console.log('[Social] Friend request accepted', { from: req.senderName });
    } catch (e) {
      console.warn('[Social] Accept request unexpected error', e);
    }
  }, [user, fetchFriends]);

  const handleDeclineRequest = useCallback(async (req: FriendRequest) => {
    console.log('[Social] Declining friend request', { requestId: req.id, from: req.senderName });
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', req.id);

      if (error) console.warn('[Social] Decline request error', error.message);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
      console.log('[Social] Friend request declined', { from: req.senderName });
    } catch (e) {
      console.warn('[Social] Decline request unexpected error', e);
    }
  }, []);

  const handleInviteToMatch = useCallback((name: string) => {
    console.log('[Social] Invite to match pressed', { name });
  }, []);

  const myTrophies = profile.trophies;
  const displayRank = myRank ?? '—';

  // Leaderboard display helpers
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const podiumPlaceholder = (rank: 1 | 2 | 3): LeaderboardPlayer => ({
    id: `placeholder-${rank}`,
    rank,
    name: '---',
    trophies: 0,
    wins: 0,
    losses: 0,
  });

  const p1 = top3[0] ?? podiumPlaceholder(1);
  const p2 = top3[1] ?? podiumPlaceholder(2);
  const p3 = top3[2] ?? podiumPlaceholder(3);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Users size={22} color={COLORS.primary} strokeWidth={2} />
        <Text style={styles.screenTitle}>Social</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <AnimatedPressable
          style={[styles.tabBtn, activeTab === 'leaderboard' && styles.tabBtnActive]}
          onPress={() => handleTabChange('leaderboard')}
        >
          <Trophy size={15} color={activeTab === 'leaderboard' ? COLORS.gold : COLORS.textSecondary} strokeWidth={2} />
          <Text style={[styles.tabLabel, activeTab === 'leaderboard' && { color: COLORS.gold }]}>Leaderboard</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.tabBtn, activeTab === 'friends' && styles.tabBtnActive]}
          onPress={() => handleTabChange('friends')}
        >
          <Users size={15} color={activeTab === 'friends' ? COLORS.primary : COLORS.textSecondary} strokeWidth={2} />
          <Text style={[styles.tabLabel, activeTab === 'friends' && { color: COLORS.primary }]}>Friends</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.tabBtn, activeTab === 'inbox' && styles.tabBtnActive]}
          onPress={() => handleTabChange('inbox')}
        >
          <View style={styles.tabWithBadge}>
            <Bell size={15} color={activeTab === 'inbox' ? COLORS.accent : COLORS.textSecondary} strokeWidth={2} />
            {inboxCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{inboxCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'inbox' && { color: COLORS.accent }]}>Inbox</Text>
        </AnimatedPressable>
      </View>

      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && (
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {leaderboardError ? (
            <AnimatedListItem index={0}>
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Trophy size={32} color={COLORS.textTertiary} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>Leaderboard coming soon</Text>
                <Text style={styles.emptySub}>Rankings will appear here once matches are played</Text>
              </View>
            </AnimatedListItem>
          ) : leaderboardLoading ? (
            <>
              {Array.from({ length: 8 }, (_, i) => i).map((i) => (
                <SkeletonRow key={i} />
              ))}
            </>
          ) : leaderboard.length === 0 ? (
            <AnimatedListItem index={0}>
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Trophy size={32} color={COLORS.textTertiary} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>No rankings yet</Text>
                <Text style={styles.emptySub}>Play matches to appear on the leaderboard</Text>
              </View>
            </AnimatedListItem>
          ) : (
            <>
              {/* Podium */}
              <AnimatedListItem index={0}>
                <View style={styles.podiumRow}>
                  <PodiumCard player={p2} rank={2} />
                  <PodiumCard player={p1} rank={1} />
                  <PodiumCard player={p3} rank={3} />
                </View>
              </AnimatedListItem>

              {/* My rank highlight */}
              <AnimatedListItem index={1}>
                <View style={[styles.myRankCard, myRank !== null && { borderColor: `${COLORS.primary}55` }]}>
                  <View style={styles.myRankLeft}>
                    <Text style={styles.myRankLabel}>YOUR RANK</Text>
                    <Text style={styles.myRankNum}>#{displayRank}</Text>
                  </View>
                  <View style={styles.myRankRight}>
                    <View style={styles.myRankTrophyRow}>
                      <Trophy size={14} color={COLORS.gold} strokeWidth={2} />
                      <Text style={styles.myRankTrophies}>{myTrophies.toLocaleString()}</Text>
                    </View>
                    <LeagueBadge trophies={myTrophies} size="sm" />
                  </View>
                </View>
              </AnimatedListItem>

              {/* Ranks 4+ */}
              {rest.map((player, i) => {
                const trophyDisplay = player.trophies.toLocaleString();
                const isMe = player.isMe;
                return (
                  <AnimatedListItem key={player.id} index={2 + i}>
                    <View style={[styles.leaderRow, isMe && styles.leaderRowMe]}>
                      <View style={styles.rankWrap}>
                        <Text style={styles.rankText}>{player.rank}</Text>
                      </View>
                      <View style={styles.leaderAvatar}>
                        <Text style={styles.leaderAvatarText}>{player.name.charAt(0)}</Text>
                      </View>
                      <View style={styles.leaderInfo}>
                        <Text style={[styles.leaderName, isMe && { color: COLORS.primary }]} numberOfLines={1}>
                          {player.name}
                          {isMe ? ' (You)' : ''}
                        </Text>
                        <LeagueBadge trophies={player.trophies} size="sm" />
                      </View>
                      <View style={styles.leaderTrophyWrap}>
                        <Trophy size={13} color={COLORS.gold} strokeWidth={2} />
                        <Text style={styles.leaderTrophies}>{trophyDisplay}</Text>
                      </View>
                    </View>
                  </AnimatedListItem>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* Friends tab */}
      {activeTab === 'friends' && (
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedListItem index={0}>
            <AnimatedPressable style={styles.addFriendBtn} onPress={handleOpenSearch}>
              <UserPlus size={18} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.addFriendBtnText}>Add Friend</Text>
            </AnimatedPressable>
          </AnimatedListItem>

          {friendsError ? (
            <AnimatedListItem index={1}>
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Users size={32} color={COLORS.textTertiary} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>Friends feature coming soon</Text>
                <Text style={styles.emptySub}>Social features will be available shortly</Text>
              </View>
            </AnimatedListItem>
          ) : friendsLoading ? (
            <AnimatedListItem index={1}>
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            </AnimatedListItem>
          ) : friends.length === 0 ? (
            <AnimatedListItem index={1}>
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Users size={32} color={COLORS.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>No friends yet</Text>
                <Text style={styles.emptySub}>Search by username to add friends and challenge them to matches</Text>
              </View>
            </AnimatedListItem>
          ) : (
            <>
              <AnimatedListItem index={1}>
                <Text style={styles.sectionLabel}>FRIENDS ({friends.length})</Text>
              </AnimatedListItem>
              {friends.map((friend, i) => {
                const trophyDisplay = friend.trophies.toLocaleString();
                return (
                  <AnimatedListItem key={friend.id} index={2 + i}>
                    <View style={styles.friendRow}>
                      <View style={styles.friendAvatarWrap}>
                        <View style={styles.friendAvatar}>
                          <Text style={styles.friendAvatarText}>{friend.name.charAt(0)}</Text>
                        </View>
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{friend.name}</Text>
                      </View>
                      <View style={styles.friendRight}>
                        <View style={styles.friendTrophyRow}>
                          <Trophy size={12} color={COLORS.gold} strokeWidth={2} />
                          <Text style={styles.friendTrophies}>{trophyDisplay}</Text>
                        </View>
                        <AnimatedPressable
                          style={styles.inviteBtn}
                          onPress={() => handleInviteToMatch(friend.name)}
                        >
                          <Swords size={12} color={COLORS.primary} strokeWidth={2} />
                          <Text style={styles.inviteBtnText}>Invite</Text>
                        </AnimatedPressable>
                      </View>
                    </View>
                  </AnimatedListItem>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* Inbox tab */}
      {activeTab === 'inbox' && (
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {incomingRequests.length === 0 && inbox.length === 0 ? (
            <AnimatedListItem index={0}>
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Mail size={32} color={COLORS.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptySub}>Friend requests, game invites, and notifications will appear here</Text>
              </View>
            </AnimatedListItem>
          ) : (
            <>
              {incomingRequests.map((req, i) => (
                <AnimatedListItem key={req.id} index={i}>
                  <View style={styles.inboxCard}>
                    <View style={[styles.inboxIconWrap, { backgroundColor: COLORS.primaryMuted }]}>
                      <UserPlus size={18} color={COLORS.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.inboxInfo}>
                      <Text style={styles.inboxFrom}>{req.senderName}</Text>
                      <Text style={styles.inboxMsg}>wants to be your friend</Text>
                    </View>
                    <View style={styles.inboxActions}>
                      <AnimatedPressable
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptRequest(req)}
                      >
                        <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                      </AnimatedPressable>
                      <AnimatedPressable
                        style={styles.declineBtn}
                        onPress={() => handleDeclineRequest(req)}
                      >
                        <X size={16} color={COLORS.danger} strokeWidth={2.5} />
                      </AnimatedPressable>
                    </View>
                  </View>
                </AnimatedListItem>
              ))}
              {inbox.map((item, i) => (
                <AnimatedListItem key={item.id} index={incomingRequests.length + i}>
                  <View style={styles.systemCard}>
                    <View style={[styles.inboxIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                      <Star size={18} color={COLORS.gold} strokeWidth={2} />
                    </View>
                    <View style={styles.inboxInfo}>
                      <Text style={styles.systemMsg}>{item.message}</Text>
                      <Text style={styles.inboxTime}>{item.time}</Text>
                    </View>
                  </View>
                </AnimatedListItem>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Add Friend Modal */}
      <Modal visible={showSearchModal} transparent animationType="slide">
        <View style={searchStyles.overlay}>
          <View style={searchStyles.sheet}>
            <View style={searchStyles.handle} />
            <View style={searchStyles.header}>
              <Text style={searchStyles.title}>Add Friend</Text>
              <AnimatedPressable style={searchStyles.closeBtn} onPress={handleCloseSearch}>
                <X size={20} color={COLORS.textSecondary} strokeWidth={2} />
              </AnimatedPressable>
            </View>
            <View style={searchStyles.inputWrap}>
              <Search size={16} color={COLORS.textTertiary} strokeWidth={2} />
              <TextInput
                style={searchStyles.input}
                placeholder="Search by username..."
                placeholderTextColor={COLORS.textTertiary}
                value={searchQuery}
                onChangeText={(text) => {
                  console.log('[Social] Friend search query changed', { query: text });
                  setSearchQuery(text);
                }}
                autoCapitalize="none"
                autoFocus
              />
              {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>
            {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
              <View style={searchStyles.noResults}>
                <Text style={searchStyles.noResultsText}>No players found for "{searchQuery}"</Text>
              </View>
            )}
            {searchResults.map((result) => (
              <View key={result.id} style={searchStyles.resultRow}>
                <View style={searchStyles.resultAvatar}>
                  <Text style={searchStyles.resultAvatarText}>{result.display_name.charAt(0)}</Text>
                </View>
                <View style={searchStyles.resultInfo}>
                  <Text style={searchStyles.resultName}>{result.display_name}</Text>
                  <View style={searchStyles.resultMeta}>
                    <Trophy size={12} color={COLORS.gold} strokeWidth={2} />
                    <Text style={searchStyles.resultTrophies}>{result.trophies.toLocaleString()}</Text>
                    <LeagueBadge trophies={result.trophies} size="sm" />
                  </View>
                </View>
                <AnimatedPressable
                  style={[searchStyles.addBtn, addingFriend === result.id && { opacity: 0.6 }]}
                  onPress={() => handleAddFriend(result.id, result.display_name)}
                  disabled={addingFriend === result.id}
                >
                  {addingFriend === result.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <UserPlus size={16} color="#fff" strokeWidth={2} />
                      <Text style={searchStyles.addBtnText}>Add</Text>
                    </>
                  )}
                </AnimatedPressable>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const searchStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
    minHeight: 280,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textTertiary,
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    padding: 12,
  },
  resultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  resultAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultInfo: {
    flex: 1,
    gap: 5,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resultTrophies: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    fontFamily: 'SpaceMono',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 70,
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabWithBadge: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  podiumRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  myRankCard: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
  },
  myRankLeft: {
    gap: 2,
  },
  myRankLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  myRankNum: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'SpaceMono',
  },
  myRankRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  myRankTrophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  myRankTrophies: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.gold,
    fontFamily: 'SpaceMono',
    fontVariant: ['tabular-nums'],
  },
  leaderRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  leaderRowMe: {
    borderColor: `${COLORS.primary}55`,
    backgroundColor: COLORS.primaryMuted,
  },
  rankWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    fontFamily: 'SpaceMono',
  },
  leaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  leaderInfo: {
    flex: 1,
    gap: 4,
  },
  leaderName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  leaderTrophyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderTrophies: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
    fontFamily: 'SpaceMono',
    fontVariant: ['tabular-nums'],
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
  },
  addFriendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  friendRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  friendAvatarWrap: {
    position: 'relative',
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  friendInfo: {
    flex: 1,
    gap: 3,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  friendRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  friendTrophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  friendTrophies: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
    fontFamily: 'SpaceMono',
    fontVariant: ['tabular-nums'],
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
  },
  inviteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  inboxCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  systemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
  },
  inboxIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inboxInfo: {
    flex: 1,
    gap: 3,
  },
  inboxFrom: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  inboxMsg: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  systemMsg: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    lineHeight: 18,
  },
  inboxTime: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '500',
    marginTop: 2,
  },
  inboxActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.dangerMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.danger}33`,
  },
});
