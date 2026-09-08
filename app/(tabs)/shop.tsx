import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Animated,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CrateIcon } from '@/components/CrateIcon';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/utils/supabase';
import { CRATE_TYPES, GEM_EXCHANGE_OPTIONS, GEM_TO_COIN_RATE } from '@/game/constants';

type CrateTone = 'wood' | 'gold' | 'crystal' | 'silver' | 'legendary' | 'emerald';

const CRATE_ORDER = ['wooden', 'silver', 'gold', 'mythical', 'legendary', 'discovery'];

const CRATE_SUBLABELS: Record<string, string> = {
  wooden: 'Free daily crate',
  silver: 'Better odds',
  gold: 'Guaranteed card',
  mythical: 'Epic+ cards',
  legendary: 'Best odds',
  discovery: 'Guaranteed new card',
};

type CrateReward = {
  type: string;
  name?: string;
  rarity?: string;
  amount?: number;
};

function FloatBob({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -6, duration: 1200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View style={{ transform: [{ translateY: anim }] }}>
      {children}
    </Animated.View>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useProfile();

  const [voucherCode, setVoucherCode] = useState('');
  const [voucherResult, setVoucherResult] = useState<{ success: boolean; message: string } | null>(null);
  const [redeemingVoucher, setRedeemingVoucher] = useState(false);
  const [openingCrate, setOpeningCrate] = useState<string | null>(null);
  const [crateRewards, setCrateRewards] = useState<CrateReward[] | null>(null);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [exchangingGems, setExchangingGems] = useState<number | null>(null);

  const coinsDisplay = (profile.coins ?? 0).toLocaleString();
  const gemsDisplay = (profile.gems ?? 0).toLocaleString();
  const shardsDisplay = (profile.shards ?? 0).toLocaleString();

  const lastFreeCrate = profile.last_free_crate ?? null;
  const freeCrateAvailable = !lastFreeCrate || (Date.now() - new Date(lastFreeCrate).getTime() > 24 * 60 * 60 * 1000);

  const handleExchangeGems = useCallback(async (amount: number) => {
    if (exchangingGems !== null) return;
    const cost = amount;
    const coins = amount * GEM_TO_COIN_RATE;
    console.log(`[Shop] Exchange gems pressed: ${cost}💎 → ${coins}🪙`);
    if ((profile.gems ?? 0) < cost) {
      Alert.alert('Not enough gems', `You need ${cost} gems.`);
      return;
    }
    setExchangingGems(amount);
    try {
      const { data, error } = await supabase.functions.invoke('exchange-gems', {
        body: { gems: amount },
      });
      if (error || data?.error) {
        console.warn('[Shop] exchange-gems error', error?.message ?? data?.error);
        Alert.alert('Error', data?.error ?? error?.message ?? 'Something went wrong');
        return;
      }
      console.log('[Shop] Gems exchanged successfully', { amount, coins });
      await refreshProfile();
    } catch (e) {
      console.warn('[Shop] exchange-gems exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setExchangingGems(null);
    }
  }, [exchangingGems, profile.gems, refreshProfile]);

  const handleOpenCrate = useCallback(async (crateId: string) => {
    if (openingCrate !== null) return;
    const crate = CRATE_TYPES[crateId];
    if (!crate) return;

    const isFree = crateId === 'wooden';
    if (isFree && !freeCrateAvailable) {
      Alert.alert('Already claimed', 'Come back tomorrow for your free crate!');
      return;
    }
    if (!isFree && crate.currency === 'coins' && (profile.coins ?? 0) < crate.cost) {
      Alert.alert('Not enough coins', `You need ${crate.cost} coins.`);
      return;
    }
    if (!isFree && crate.currency === 'gems' && (profile.gems ?? 0) < crate.cost) {
      Alert.alert('Not enough gems', `You need ${crate.cost} gems.`);
      return;
    }

    console.log(`[Shop] Open crate pressed: ${crateId}`, { isFree, cost: crate.cost, currency: crate.currency });
    setOpeningCrate(crateId);
    try {
      const { data, error } = await supabase.functions.invoke('open-crate', {
        body: { crateId, claimFree: isFree },
      });
      if (error || data?.error) {
        console.warn('[Shop] open-crate error', error?.message ?? data?.error);
        Alert.alert('Error', data?.error ?? error?.message ?? 'Something went wrong');
        return;
      }
      console.log('[Shop] Crate opened, rewards:', data?.rewards);
      setCrateRewards(data?.rewards ?? []);
      setShowRewardsModal(true);
    } catch (e) {
      console.warn('[Shop] open-crate exception', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setOpeningCrate(null);
    }
  }, [openingCrate, freeCrateAvailable, profile.coins, profile.gems]);

  const handleRedeemVoucher = useCallback(async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;
    console.log(`[Shop] Redeem voucher pressed: ${code}`);
    setRedeemingVoucher(true);
    setVoucherResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('redeem-voucher', {
        body: { code },
      });
      if (error || data?.error) {
        console.warn('[Shop] redeem-voucher error', error?.message ?? data?.error);
        setVoucherResult({ success: false, message: data?.error ?? error?.message ?? 'Invalid code' });
        return;
      }
      console.log('[Shop] Voucher redeemed', data);
      setVoucherResult({ success: true, message: data?.message ?? 'Rewards claimed!' });
      setVoucherCode('');
      await refreshProfile();
    } catch (e) {
      console.warn('[Shop] redeem-voucher exception', e);
      setVoucherResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setRedeemingVoucher(false);
    }
  }, [voucherCode, refreshProfile]);

  const handleDismissRewards = useCallback(async () => {
    console.log('[Shop] Rewards modal dismissed');
    setShowRewardsModal(false);
    setCrateRewards(null);
    await refreshProfile();
  }, [refreshProfile]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Shop</Text>
          <View style={styles.currencyRow}>
            <View style={styles.currencyChip}>
              <Text style={styles.currencyEmoji}>🪙</Text>
              <Text style={[styles.currencyValue, { color: COLORS.coin }]}>{coinsDisplay}</Text>
            </View>
            <View style={styles.currencyChip}>
              <Text style={styles.currencyEmoji}>💎</Text>
              <Text style={[styles.currencyValue, { color: COLORS.gem }]}>{gemsDisplay}</Text>
            </View>
          </View>
        </View>

        {/* Gem exchange card */}
        <View style={styles.exchangeCard}>
          <View style={styles.exchangeHeader}>
            <Text style={styles.exchangeTitle}>Exchange Gems</Text>
            <View style={styles.gemPill}>
              <Text style={styles.gemPillText}>💎 {gemsDisplay}</Text>
            </View>
          </View>
          <Text style={styles.exchangeRate}>1 💎 = {GEM_TO_COIN_RATE} 🪙</Text>
          <View style={styles.exchangeBtns}>
            {GEM_EXCHANGE_OPTIONS.map((amount) => {
              const coins = amount * GEM_TO_COIN_RATE;
              const canAfford = (profile.gems ?? 0) >= amount;
              const isLoading = exchangingGems === amount;
              return (
                <Pressable
                  key={amount}
                  style={[styles.exchangeBtn, canAfford ? styles.exchangeBtnActive : styles.exchangeBtnDisabled]}
                  onPress={() => handleExchangeGems(amount)}
                  disabled={!canAfford || exchangingGems !== null}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={[styles.exchangeBtnText, !canAfford && styles.exchangeBtnTextDisabled]}>
                        💎{amount}
                      </Text>
                      <Text style={[styles.exchangeBtnSub, !canAfford && styles.exchangeBtnTextDisabled]}>
                        → 🪙{coins}
                      </Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Shard balance */}
        <Pressable
          style={styles.shardPill}
          onPress={() => {
            console.log('[Shop] Use in Lab pressed');
            router.push('/(tabs)/collection' as never);
          }}
        >
          <Text style={styles.shardText}>🔮 {shardsDisplay} shards</Text>
          <Text style={styles.shardLink}>Use in Lab →</Text>
        </Pressable>

        {/* Crates section */}
        <Text style={styles.cratesHeading}>Crates</Text>
        {CRATE_ORDER.map((crateId) => {
          const crate = CRATE_TYPES[crateId];
          if (!crate) return null;
          const isFree = crateId === 'wooden';
          const isLoading = openingCrate === crateId;
          const isAvailable = isFree ? freeCrateAvailable : true;
          const canAfford = isFree
            ? freeCrateAvailable
            : crate.currency === 'coins'
            ? (profile.coins ?? 0) >= crate.cost
            : (profile.gems ?? 0) >= crate.cost;

          const btnLabel = isFree
            ? freeCrateAvailable ? 'Free Daily' : 'Claimed'
            : crate.currency === 'coins'
            ? `${crate.cost} 🪙`
            : `${crate.cost} 💎`;

          const skinPct = Math.round(crate.skinChance * 100);
          const itemsLabel = `${crate.itemCount} items`;

          return (
            <View key={crateId} style={styles.crateCard}>
              <FloatBob>
                <CrateIcon size={56} tone={crate.tone as CrateTone} />
              </FloatBob>
              <View style={styles.crateInfo}>
                <Text style={styles.crateName}>{crate.name} Crate</Text>
                <Text style={styles.crateSub}>{CRATE_SUBLABELS[crateId]}</Text>
                <View style={styles.crateBadges}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{itemsLabel}</Text>
                  </View>
                  {skinPct > 0 && (
                    <View style={[styles.badge, styles.badgeSkin]}>
                      <Text style={[styles.badgeText, styles.badgeTextSkin]}>{skinPct}% skin</Text>
                    </View>
                  )}
                  {crate.guaranteedCards > 0 && (
                    <View style={[styles.badge, styles.badgeCard]}>
                      <Text style={[styles.badgeText, styles.badgeTextCard]}>
                        {crate.guaranteedCards} card{crate.guaranteedCards > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                  {crate.gemChance > 0 && (
                    <View style={[styles.badge, styles.badgeGem]}>
                      <Text style={[styles.badgeText, styles.badgeTextGem]}>💎 chance</Text>
                    </View>
                  )}
                </View>
              </View>
              <AnimatedPressable
                style={[
                  styles.crateBtn,
                  canAfford && isAvailable ? styles.crateBtnActive : styles.crateBtnDisabled,
                ]}
                onPress={() => handleOpenCrate(crateId)}
                disabled={!canAfford || !isAvailable || openingCrate !== null}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.crateBtnText, (!canAfford || !isAvailable) && styles.crateBtnTextDisabled]}>
                    {btnLabel}
                  </Text>
                )}
              </AnimatedPressable>
            </View>
          );
        })}

        {/* Voucher section */}
        <View style={styles.voucherCard}>
          <Text style={styles.voucherTitle}>Redeem Voucher</Text>
          <View style={styles.voucherRow}>
            <TextInput
              style={styles.voucherInput}
              placeholder="ENTER CODE"
              placeholderTextColor="#94a3b8"
              value={voucherCode}
              onChangeText={(t) => setVoucherCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <AnimatedPressable
              style={[styles.redeemBtn, !voucherCode.trim() && styles.redeemBtnDisabled]}
              onPress={handleRedeemVoucher}
              disabled={!voucherCode.trim() || redeemingVoucher}
            >
              {redeemingVoucher ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.redeemBtnText}>Redeem</Text>
              )}
            </AnimatedPressable>
          </View>
          {voucherResult && (
            <View style={[styles.voucherFeedback, voucherResult.success ? styles.voucherSuccess : styles.voucherError]}>
              <Text style={[styles.voucherFeedbackText, voucherResult.success ? styles.voucherSuccessText : styles.voucherErrorText]}>
                {voucherResult.message}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Rewards modal */}
      <Modal visible={showRewardsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🎉 Crate Opened!</Text>
            {crateRewards && crateRewards.length > 0 ? (
              crateRewards.map((r, i) => {
                let rewardLabel = '';
                if (r.type === 'coins') {
                  rewardLabel = `🪙 +${r.amount} coins`;
                } else if (r.type === 'gems') {
                  rewardLabel = `💎 +${r.amount} gems`;
                } else if (r.type === 'shards') {
                  rewardLabel = `🔷 +${r.amount} shards`;
                } else if (r.type === 'card') {
                  rewardLabel = r.rarity ? `🃏 ${r.name} (${r.rarity})` : `🃏 ${r.name}`;
                } else if (r.type === 'skin') {
                  rewardLabel = `✨ ${r.name}`;
                } else {
                  rewardLabel = r.name ? `🃏 ${r.name}` : r.type;
                }
                return (
                  <View key={i} style={styles.rewardRow}>
                    <Text style={styles.rewardText}>{rewardLabel}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.rewardText}>Rewards added to your account!</Text>
            )}
            <AnimatedPressable
              style={styles.modalCloseBtn}
              onPress={handleDismissRewards}
            >
              <Text style={styles.modalCloseBtnText}>Awesome!</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
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
    fontVariant: ['tabular-nums'],
  },
  exchangeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  exchangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exchangeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  gemPill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  gemPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  exchangeRate: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  exchangeBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  exchangeBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
    minHeight: 52,
    justifyContent: 'center',
  },
  exchangeBtnActive: {
    backgroundColor: '#f59e0b',
  },
  exchangeBtnDisabled: {
    backgroundColor: '#f1f5f9',
  },
  exchangeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  exchangeBtnSub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  exchangeBtnTextDisabled: {
    color: '#94a3b8',
  },
  shardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  shardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5b21b6',
  },
  shardLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7c3aed',
  },
  cratesHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  crateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  crateInfo: {
    flex: 1,
    gap: 4,
  },
  crateName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  crateSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  crateBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  badgeSkin: {
    backgroundColor: '#fdf4ff',
  },
  badgeTextSkin: {
    color: '#7e22ce',
  },
  badgeCard: {
    backgroundColor: '#f0fdf4',
  },
  badgeTextCard: {
    color: '#15803d',
  },
  badgeGem: {
    backgroundColor: '#ecfeff',
  },
  badgeTextGem: {
    color: '#0e7490',
  },
  crateBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  crateBtnActive: {
    backgroundColor: '#22c55e',
  },
  crateBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  crateBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  crateBtnTextDisabled: {
    color: '#94a3b8',
  },
  voucherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  voucherTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  voucherRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    letterSpacing: 1,
  },
  redeemBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  redeemBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  redeemBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  voucherFeedback: {
    borderRadius: 10,
    padding: 10,
  },
  voucherSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  voucherError: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  voucherFeedbackText: {
    fontSize: 13,
    fontWeight: '600',
  },
  voucherSuccessText: {
    color: '#15803d',
  },
  voucherErrorText: {
    color: '#be123c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '80%',
    gap: 12,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  rewardRow: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalCloseBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
