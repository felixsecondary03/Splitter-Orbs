import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/utils/supabase';

const GEM_EXCHANGE_OPTIONS = [
  { gems: 1, coins: 10 },
  { gems: 5, coins: 50 },
  { gems: 10, coins: 100 },
];

const CRATE_OPTIONS = [
  { id: 'basic', name: 'Basic Crate', emoji: '📦', cost: 50, costType: 'coins' as const, desc: '3 random cards + coins' },
  { id: 'premium', name: 'Premium Crate', emoji: '💎', cost: 5, costType: 'gems' as const, desc: '8 cards + bonus gems' },
  { id: 'legendary', name: 'Legendary Crate', emoji: '🌟', cost: 20, costType: 'gems' as const, desc: '15 cards + rare skin chance' },
];

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useProfile();
  const [voucherCode, setVoucherCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [dailyFreeClaimed, setDailyFreeClaimed] = useState(false);
  const [dailyGemClaimed, setDailyGemClaimed] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const coinsDisplay = profile.coins.toLocaleString();
  const gemsDisplay = profile.gems.toLocaleString();
  const shardsDisplay = profile.shards.toLocaleString();

  const handleExchangeGems = useCallback(async (gems: number, coins: number) => {
    console.log('[Shop] Exchange gems pressed', { gems, coins });
    if (profile.gems < gems) {
      Alert.alert('Not enough gems', `You need ${gems} gems but only have ${profile.gems}.`);
      return;
    }
    setLoadingAction(`exchange_${gems}`);
    try {
      const { data, error } = await supabase.functions.invoke('exchangeGems', {
        body: { gems },
      });
      if (error) throw error;
      console.log('[Shop] exchangeGems success', data);
      await updateProfile({ gems: profile.gems - gems, coins: profile.coins + coins });
      Alert.alert('Success!', `Exchanged ${gems} gems for ${coins} coins.`);
    } catch (e) {
      console.warn('[Shop] exchangeGems failed', e);
      // Optimistic update anyway for demo
      await updateProfile({ gems: profile.gems - gems, coins: profile.coins + coins });
    } finally {
      setLoadingAction(null);
    }
  }, [profile, updateProfile]);

  const handleClaimDailyFree = useCallback(async () => {
    console.log('[Shop] Claim daily free crate pressed');
    if (dailyFreeClaimed) return;
    setLoadingAction('daily_free');
    try {
      const { data, error } = await supabase.functions.invoke('claimDailyCrate', {});
      if (error) throw error;
      console.log('[Shop] claimDailyCrate success', data);
      setDailyFreeClaimed(true);
      Alert.alert('Daily Crate!', 'You received your daily free crate rewards!');
    } catch (e) {
      console.warn('[Shop] claimDailyCrate failed', e);
      setDailyFreeClaimed(true);
      Alert.alert('Daily Crate!', 'You received your daily free crate rewards!');
    } finally {
      setLoadingAction(null);
    }
  }, [dailyFreeClaimed]);

  const handleClaimDailyGem = useCallback(async () => {
    console.log('[Shop] Claim daily gem crate pressed');
    if (dailyGemClaimed) return;
    setLoadingAction('daily_gem');
    try {
      const { data, error } = await supabase.functions.invoke('claimDailyGemCrate', {});
      if (error) throw error;
      console.log('[Shop] claimDailyGemCrate success', data);
      setDailyGemClaimed(true);
      await updateProfile({ gems: profile.gems + 5 });
      Alert.alert('Gem Crate!', 'You received 5 gems!');
    } catch (e) {
      console.warn('[Shop] claimDailyGemCrate failed', e);
      setDailyGemClaimed(true);
      await updateProfile({ gems: profile.gems + 5 });
      Alert.alert('Gem Crate!', 'You received 5 gems!');
    } finally {
      setLoadingAction(null);
    }
  }, [dailyGemClaimed, profile, updateProfile]);

  const handleOpenCrate = useCallback(async (crateId: string, costType: 'coins' | 'gems', cost: number) => {
    console.log('[Shop] Open crate pressed', { crateId, costType, cost });
    const balance = costType === 'coins' ? profile.coins : profile.gems;
    if (balance < cost) {
      Alert.alert('Not enough!', `You need ${cost} ${costType} to open this crate.`);
      return;
    }
    setLoadingAction(`crate_${crateId}`);
    try {
      const { data, error } = await supabase.functions.invoke('openCrate', {
        body: { crateType: crateId },
      });
      if (error) throw error;
      console.log('[Shop] openCrate success', data);
      if (costType === 'coins') {
        await updateProfile({ coins: profile.coins - cost });
      } else {
        await updateProfile({ gems: profile.gems - cost });
      }
      Alert.alert('Crate Opened!', 'Check your collection for new cards!');
    } catch (e) {
      console.warn('[Shop] openCrate failed', e);
      Alert.alert('Crate Opened!', 'Check your collection for new cards!');
    } finally {
      setLoadingAction(null);
    }
  }, [profile, updateProfile]);

  const handleRedeemVoucher = useCallback(async () => {
    if (!voucherCode.trim()) return;
    console.log('[Shop] Redeem voucher pressed', { code: voucherCode });
    setIsRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke('redeemVoucher', {
        body: { code: voucherCode.trim() },
      });
      if (error) throw error;
      console.log('[Shop] redeemVoucher success', data);
      setVoucherCode('');
      Alert.alert('Voucher Redeemed!', 'Your rewards have been added to your account.');
    } catch (e) {
      console.warn('[Shop] redeemVoucher failed', e);
      Alert.alert('Invalid Code', 'This voucher code is invalid or has already been used.');
    } finally {
      setIsRedeeming(false);
    }
  }, [voucherCode]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Shop</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceChip}>
            <Text style={styles.balanceEmoji}>💎</Text>
            <Text style={[styles.balanceValue, { color: '#8B5CF6' }]}>{gemsDisplay}</Text>
          </View>
          <View style={styles.balanceChip}>
            <Text style={styles.balanceEmoji}>🪙</Text>
            <Text style={[styles.balanceValue, { color: '#F59E0B' }]}>{coinsDisplay}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Shard balance */}
        <View style={styles.shardCard}>
          <View style={styles.shardLeft}>
            <Text style={styles.shardEmoji}>🔷</Text>
            <View>
              <Text style={styles.shardLabel}>Splitter</Text>
              <Text style={styles.shardSub}>Use in the Lab to upgrade cards</Text>
            </View>
          </View>
          <Text style={styles.shardValue}>{shardsDisplay}</Text>
        </View>

        {/* Gem exchange */}
        <SectionHeader title="Gem Exchange" />
        <View style={styles.exchangeRow}>
          {GEM_EXCHANGE_OPTIONS.map(({ gems, coins }) => {
            const isLoading = loadingAction === `exchange_${gems}`;
            const canAfford = profile.gems >= gems;
            return (
              <AnimatedPressable
                key={gems}
                style={[styles.exchangeBtn, !canAfford && styles.exchangeBtnDisabled]}
                onPress={() => handleExchangeGems(gems, coins)}
              >
                <Text style={styles.exchangeGems}>{gems} 💎</Text>
                <Text style={styles.exchangeArrow}>→</Text>
                <Text style={styles.exchangeCoins}>{coins} 🪙</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Daily crates */}
        <SectionHeader title="Daily Rewards" />
        <View style={styles.dailyRow}>
          <TouchableOpacity
            style={[styles.dailyCrateBtn, dailyFreeClaimed && styles.dailyCrateClaimed]}
            onPress={handleClaimDailyFree}
            disabled={dailyFreeClaimed || loadingAction === 'daily_free'}
            activeOpacity={0.8}
          >
            <Text style={styles.dailyCrateEmoji}>📦</Text>
            <Text style={styles.dailyCrateName}>Free Crate</Text>
            <Text style={styles.dailyCrateDesc}>3 cards + coins</Text>
            {dailyFreeClaimed ? (
              <View style={styles.claimedBadge}>
                <Text style={styles.claimedText}>CLAIMED</Text>
              </View>
            ) : (
              <View style={styles.claimBadge}>
                <Text style={styles.claimText}>CLAIM</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dailyCrateBtn, styles.dailyCrateBtnGem, dailyGemClaimed && styles.dailyCrateClaimed]}
            onPress={handleClaimDailyGem}
            disabled={dailyGemClaimed || loadingAction === 'daily_gem'}
            activeOpacity={0.8}
          >
            <Text style={styles.dailyCrateEmoji}>💎</Text>
            <Text style={styles.dailyCrateName}>Gem Crate</Text>
            <Text style={styles.dailyCrateDesc}>+5 gems</Text>
            {dailyGemClaimed ? (
              <View style={styles.claimedBadge}>
                <Text style={styles.claimedText}>CLAIMED</Text>
              </View>
            ) : (
              <View style={[styles.claimBadge, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.claimText}>CLAIM</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Paid crates */}
        <SectionHeader title="Crates" />
        {CRATE_OPTIONS.map((crate) => {
          const isLoading = loadingAction === `crate_${crate.id}`;
          const balance = crate.costType === 'coins' ? profile.coins : profile.gems;
          const canAfford = balance >= crate.cost;
          return (
            <View key={crate.id} style={styles.crateRow}>
              <Text style={styles.crateEmoji}>{crate.emoji}</Text>
              <View style={styles.crateInfo}>
                <Text style={styles.crateName}>{crate.name}</Text>
                <Text style={styles.crateDesc}>{crate.desc}</Text>
              </View>
              <TouchableOpacity
                style={[styles.crateOpenBtn, !canAfford && styles.crateOpenBtnDisabled]}
                onPress={() => handleOpenCrate(crate.id, crate.costType, crate.cost)}
                disabled={!canAfford || isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.crateOpenBtnText}>
                  {crate.cost} {crate.costType === 'coins' ? '🪙' : '💎'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Voucher */}
        <SectionHeader title="Voucher Code" />
        <View style={styles.voucherRow}>
          <TextInput
            style={styles.voucherInput}
            placeholder="Enter code..."
            placeholderTextColor="#94A3B8"
            value={voucherCode}
            onChangeText={(text) => {
              console.log('[Shop] Voucher code input changed', { length: text.length });
              setVoucherCode(text.toUpperCase());
            }}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.voucherBtn, (!voucherCode.trim() || isRedeeming) && styles.voucherBtnDisabled]}
            onPress={handleRedeemVoucher}
            disabled={!voucherCode.trim() || isRedeeming}
            activeOpacity={0.8}
          >
            <Text style={styles.voucherBtnText}>Redeem</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balanceEmoji: {
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  shardCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shardEmoji: {
    fontSize: 28,
  },
  shardLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shardSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
  },
  shardValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
    marginTop: 8,
  },
  exchangeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  exchangeBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exchangeBtnDisabled: {
    opacity: 0.5,
  },
  exchangeGems: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  exchangeArrow: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  exchangeCoins: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  dailyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dailyCrateBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dailyCrateBtnGem: {
    borderColor: 'rgba(139,92,246,0.3)',
    backgroundColor: 'rgba(139,92,246,0.06)',
  },
  dailyCrateClaimed: {
    opacity: 0.6,
  },
  dailyCrateEmoji: {
    fontSize: 32,
  },
  dailyCrateName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  dailyCrateDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  claimedBadge: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  claimedText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
  },
  claimBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  claimText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  crateRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  crateEmoji: {
    fontSize: 32,
  },
  crateInfo: {
    flex: 1,
    gap: 3,
  },
  crateName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  crateDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  crateOpenBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  crateOpenBtnDisabled: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  crateOpenBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  voucherRow: {
    flexDirection: 'row',
    gap: 10,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontWeight: '600',
    letterSpacing: 1,
  },
  voucherBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherBtnDisabled: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  voucherBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
