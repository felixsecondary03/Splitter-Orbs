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
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

interface LeaderboardPlayer {
  rank: number;
  name: string;
  trophies: number;
  leagueTrophies: number;
  isMe?: boolean;
}

const LEADERBOARD_DATA: LeaderboardPlayer[] = [
  { rank: 1,  name: 'OrbMaster_X',   trophies: 4820, leagueTrophies: 4820 },
  { rank: 2,  name: 'FrostQueen',     trophies: 4650, leagueTrophies: 4650 },
  { rank: 3,  name: 'BlasterKing',    trophies: 4410, leagueTrophies: 4410 },
  { rank: 4,  name: 'ShadowOrb99',    trophies: 4200, leagueTrophies: 4200 },
  { rank: 5,  name: 'TowerLord',      trophies: 3980, leagueTrophies: 3980 },
  { rank: 6,  name: 'CryoStrike',     trophies: 3750, leagueTrophies: 3750 },
  { rank: 7,  name: 'VenomBurst',     trophies: 3500, leagueTrophies: 3500 },
  { rank: 8,  name: 'ArcFlash',       trophies: 3200, leagueTrophies: 3200 },
  { rank: 9,  name: 'MortarKing',     trophies: 2900, leagueTrophies: 2900 },
  { rank: 10, name: 'PyreFist',       trophies: 2700, leagueTrophies: 2700 },
  { rank: 11, name: 'IceBreaker',     trophies: 2500, leagueTrophies: 2500 },
  { rank: 12, name: 'ZapQueen',       trophies: 2300, leagueTrophies: 2300 },
  { rank: 13, name: 'NovaSurge',      trophies: 2100, leagueTrophies: 2100 },
  { rank: 14, name: 'GlacierPeak',    trophies: 1950, leagueTrophies: 1950 },
  { rank: 15, name: 'TeslaStorm',     trophies: 1800, leagueTrophies: 1800 },
  { rank: 16, name: 'SeekrBot',       trophies: 1650, leagueTrophies: 1650 },
  { rank: 17, name: 'FlakCannon',     trophies: 1500, leagueTrophies: 1500 },
  { rank: 18, name: 'HarpoonHero',    trophies: 1350, leagueTrophies: 1350 },
  { rank: 19, name: 'TwinBlaster',    trophies: 1200, leagueTrophies: 1200 },
  { rank: 20, name: 'MagnetMage',     trophies: 1050, leagueTrophies: 1050 },
];

interface Friend {
  name: string;
  trophies: number;
  status: 'online' | 'in-match' | 'offline';
}

const FRIENDS_DATA: Friend[] = [
  { name: 'FrostQueen',  trophies: 4650, status: 'online' },
  { name: 'CryoStrike',  trophies: 3750, status: 'in-match' },
  { name: 'ArcFlash',    trophies: 3200, status: 'offline' },
  { name: 'TowerLord',   trophies: 3980, status: 'online' },
];

interface InboxItem {
  id: string;
  type: 'friend_request' | 'game_invite' | 'system';
  from?: string;
  message: string;
  time: string;
}

const INBOX_DATA: InboxItem[] = [
  { id: '1', type: 'friend_request', from: 'NovaSurge',   message: 'wants to be your friend', time: '2m ago' },
  { id: '2', type: 'game_invite',    from: 'TowerLord',   message: 'invited you to a match',   time: '15m ago' },
  { id: '3', type: 'system',                              message: 'Achievement unlocked: First Victory! +100 coins', time: '1h ago' },
  { id: '4', type: 'system',                              message: 'You reached Rookie league! Keep climbing.', time: '3h ago' },
];

const RANK_COLORS = [COLORS.gold, COLORS.silver, COLORS.bronze];

const STATUS_COLORS: Record<string, string> = {
  online: COLORS.success,
  'in-match': COLORS.warning,
  offline: COLORS.textTertiary,
};

const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  'in-match': 'In Match',
  offline: 'Offline',
};

const SEARCH_RESULTS: Friend[] = [
  { name: 'GlacierPeak', trophies: 1950, status: 'online' },
  { name: 'TeslaStorm',  trophies: 1800, status: 'offline' },
];

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
  const [activeTab, setActiveTab] = useState<SocialTab>('leaderboard');
  const [friendSearch, setFriendSearch] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>(FRIENDS_DATA);
  const [inbox, setInbox] = useState<InboxItem[]>(INBOX_DATA);
  const [searchQuery, setSearchQuery] = useState('');

  const inboxCount = inbox.filter((i) => i.type === 'friend_request' || i.type === 'game_invite').length;

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
  }, []);

  const handleAddFriend = useCallback((name: string) => {
    console.log('[Social] Friend added', { name });
    const found = SEARCH_RESULTS.find((r) => r.name === name);
    if (found && !friends.find((f) => f.name === name)) {
      setFriends((prev) => [...prev, found]);
    }
    setShowSearchModal(false);
    setSearchQuery('');
  }, [friends]);

  const handleInviteToMatch = useCallback((name: string) => {
    console.log('[Social] Invite to match pressed', { name });
  }, []);

  const handleAcceptFriendRequest = useCallback((id: string, from: string) => {
    console.log('[Social] Friend request accepted', { id, from });
    setInbox((prev) => prev.filter((i) => i.id !== id));
    const newFriend: Friend = { name: from, trophies: 1200, status: 'online' };
    setFriends((prev) => [...prev, newFriend]);
  }, []);

  const handleDeclineFriendRequest = useCallback((id: string) => {
    console.log('[Social] Friend request declined', { id });
    setInbox((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleAcceptGameInvite = useCallback((id: string, from: string) => {
    console.log('[Social] Game invite accepted', { id, from });
    setInbox((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleDeclineGameInvite = useCallback((id: string) => {
    console.log('[Social] Game invite declined', { id });
    setInbox((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const filteredSearchResults = searchQuery.length >= 2
    ? SEARCH_RESULTS.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !friends.find((f) => f.name === r.name)
      )
    : [];

  const myRank = 42;
  const myTrophies = profile.trophies;

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
          {/* Podium */}
          <AnimatedListItem index={0}>
            <View style={styles.podiumRow}>
              <PodiumCard player={LEADERBOARD_DATA[1]} rank={2} />
              <PodiumCard player={LEADERBOARD_DATA[0]} rank={1} />
              <PodiumCard player={LEADERBOARD_DATA[2]} rank={3} />
            </View>
          </AnimatedListItem>

          {/* My rank highlight */}
          <AnimatedListItem index={1}>
            <View style={styles.myRankCard}>
              <View style={styles.myRankLeft}>
                <Text style={styles.myRankLabel}>YOUR RANK</Text>
                <Text style={styles.myRankNum}>#{myRank}</Text>
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

          {/* Ranks 4-20 */}
          {LEADERBOARD_DATA.slice(3).map((player, i) => {
            const trophyDisplay = player.trophies.toLocaleString();
            return (
              <AnimatedListItem key={player.rank} index={2 + i}>
                <View style={styles.leaderRow}>
                  <View style={styles.rankWrap}>
                    <Text style={styles.rankText}>{player.rank}</Text>
                  </View>
                  <View style={styles.leaderAvatar}>
                    <Text style={styles.leaderAvatarText}>{player.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.leaderInfo}>
                    <Text style={styles.leaderName} numberOfLines={1}>{player.name}</Text>
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

          {friends.length === 0 ? (
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
                const statusColor = STATUS_COLORS[friend.status] ?? COLORS.textTertiary;
                const statusLabel = STATUS_LABELS[friend.status] ?? friend.status;
                const trophyDisplay = friend.trophies.toLocaleString();
                return (
                  <AnimatedListItem key={friend.name} index={2 + i}>
                    <View style={styles.friendRow}>
                      <View style={styles.friendAvatarWrap}>
                        <View style={styles.friendAvatar}>
                          <Text style={styles.friendAvatarText}>{friend.name.charAt(0)}</Text>
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{friend.name}</Text>
                        <Text style={[styles.friendStatus, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                      <View style={styles.friendRight}>
                        <View style={styles.friendTrophyRow}>
                          <Trophy size={12} color={COLORS.gold} strokeWidth={2} />
                          <Text style={styles.friendTrophies}>{trophyDisplay}</Text>
                        </View>
                        {friend.status === 'online' && (
                          <AnimatedPressable
                            style={styles.inviteBtn}
                            onPress={() => handleInviteToMatch(friend.name)}
                          >
                            <Swords size={12} color={COLORS.primary} strokeWidth={2} />
                            <Text style={styles.inviteBtnText}>Invite</Text>
                          </AnimatedPressable>
                        )}
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
          {inbox.length === 0 ? (
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
            inbox.map((item, i) => (
              <AnimatedListItem key={item.id} index={i}>
                {item.type === 'friend_request' ? (
                  <View style={styles.inboxCard}>
                    <View style={[styles.inboxIconWrap, { backgroundColor: COLORS.primaryMuted }]}>
                      <UserPlus size={18} color={COLORS.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.inboxInfo}>
                      <Text style={styles.inboxFrom}>{item.from}</Text>
                      <Text style={styles.inboxMsg}>{item.message}</Text>
                      <Text style={styles.inboxTime}>{item.time}</Text>
                    </View>
                    <View style={styles.inboxActions}>
                      <AnimatedPressable
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptFriendRequest(item.id, item.from ?? '')}
                      >
                        <Check size={16} color="#0A0E1A" strokeWidth={2.5} />
                      </AnimatedPressable>
                      <AnimatedPressable
                        style={styles.declineBtn}
                        onPress={() => handleDeclineFriendRequest(item.id)}
                      >
                        <X size={16} color={COLORS.danger} strokeWidth={2.5} />
                      </AnimatedPressable>
                    </View>
                  </View>
                ) : item.type === 'game_invite' ? (
                  <View style={styles.inboxCard}>
                    <View style={[styles.inboxIconWrap, { backgroundColor: COLORS.accentMuted }]}>
                      <Swords size={18} color={COLORS.accent} strokeWidth={2} />
                    </View>
                    <View style={styles.inboxInfo}>
                      <Text style={styles.inboxFrom}>{item.from}</Text>
                      <Text style={styles.inboxMsg}>{item.message}</Text>
                      <Text style={styles.inboxTime}>{item.time}</Text>
                    </View>
                    <View style={styles.inboxActions}>
                      <AnimatedPressable
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptGameInvite(item.id, item.from ?? '')}
                      >
                        <Check size={16} color="#0A0E1A" strokeWidth={2.5} />
                      </AnimatedPressable>
                      <AnimatedPressable
                        style={styles.declineBtn}
                        onPress={() => handleDeclineGameInvite(item.id)}
                      >
                        <X size={16} color={COLORS.danger} strokeWidth={2.5} />
                      </AnimatedPressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.systemCard}>
                    <View style={[styles.inboxIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                      <Star size={18} color={COLORS.gold} strokeWidth={2} />
                    </View>
                    <View style={styles.inboxInfo}>
                      <Text style={styles.systemMsg}>{item.message}</Text>
                      <Text style={styles.inboxTime}>{item.time}</Text>
                    </View>
                  </View>
                )}
              </AnimatedListItem>
            ))
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
            </View>
            {searchQuery.length >= 2 && filteredSearchResults.length === 0 && (
              <View style={searchStyles.noResults}>
                <Text style={searchStyles.noResultsText}>No players found for "{searchQuery}"</Text>
              </View>
            )}
            {filteredSearchResults.map((result) => (
              <View key={result.name} style={searchStyles.resultRow}>
                <View style={searchStyles.resultAvatar}>
                  <Text style={searchStyles.resultAvatarText}>{result.name.charAt(0)}</Text>
                </View>
                <View style={searchStyles.resultInfo}>
                  <Text style={searchStyles.resultName}>{result.name}</Text>
                  <View style={searchStyles.resultMeta}>
                    <Trophy size={12} color={COLORS.gold} strokeWidth={2} />
                    <Text style={searchStyles.resultTrophies}>{result.trophies.toLocaleString()}</Text>
                    <LeagueBadge trophies={result.trophies} size="sm" />
                  </View>
                </View>
                <AnimatedPressable
                  style={searchStyles.addBtn}
                  onPress={() => handleAddFriend(result.name)}
                >
                  <UserPlus size={16} color="#fff" strokeWidth={2} />
                  <Text style={searchStyles.addBtnText}>Add</Text>
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
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
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
  friendStatus: {
    fontSize: 12,
    fontWeight: '500',
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
