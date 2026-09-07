import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shield, Search, Ban, Coins, Settings, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {icon}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function AdminInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [banUserId, setBanUserId] = useState('');
  const [banDuration, setBanDuration] = useState<'7d' | 'permanent'>('7d');
  const [banReason, setBanReason] = useState('');
  const [grantUserId, setGrantUserId] = useState('');
  const [grantCoins, setGrantCoins] = useState('');
  const [grantGems, setGrantGems] = useState('');
  const [grantShards, setGrantShards] = useState('');
  const [minVersion, setMinVersion] = useState('1.0.0');
  const [latestVersion, setLatestVersion] = useState('1.0.0');

  // Guard: only admins
  if (!user || user.role !== 'admin') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, alignItems: 'center', justifyContent: 'center' }]}>
        <Shield size={48} color={COLORS.danger} strokeWidth={1.5} />
        <Text style={styles.accessDenied}>Access Denied</Text>
        <Text style={styles.accessDeniedSub}>Admin privileges required</Text>
      </View>
    );
  }

  const handleSearch = () => {
    console.log('[Admin] User search', { query: searchQuery });
  };

  const handleBan = () => {
    console.log('[Admin] Ban user', { userId: banUserId, duration: banDuration, reason: banReason });
  };

  const handleGrantCurrency = () => {
    console.log('[Admin] Grant currency', {
      userId: grantUserId,
      coins: grantCoins,
      gems: grantGems,
      shards: grantShards,
    });
  };

  const handleUpdateVersions = () => {
    console.log('[Admin] Update versions', { minVersion, latestVersion });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <AnimatedPressable onPress={() => { console.log('[Admin] Back pressed'); router.back(); }}>
          <View style={styles.backBtn}>
            <ChevronLeft size={22} color={COLORS.textSecondary} strokeWidth={2} />
          </View>
        </AnimatedPressable>
        <View style={styles.headerTitleWrap}>
          <Shield size={20} color={COLORS.warning} strokeWidth={2} />
          <Text style={styles.screenTitle}>Admin Panel</Text>
        </View>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* User Search */}
      <SectionCard title="User Search" icon={<Search size={18} color={COLORS.primary} strokeWidth={2} />}>
        <AdminInput
          label="Search by username or ID"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="e.g. OrbMaster99 or user_id"
        />
        <AnimatedPressable style={styles.actionBtn} onPress={handleSearch}>
          <Search size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.actionBtnText}>Search</Text>
        </AnimatedPressable>
      </SectionCard>

      {/* Ban User */}
      <SectionCard title="Ban User" icon={<Ban size={18} color={COLORS.danger} strokeWidth={2} />}>
        <AdminInput
          label="User ID"
          value={banUserId}
          onChangeText={setBanUserId}
          placeholder="user_id"
        />
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Duration</Text>
          <View style={styles.segmentRow}>
            {(['7d', 'permanent'] as const).map((opt) => {
              const isActive = banDuration === opt;
              const optLabel = opt === '7d' ? '7 Days' : 'Permanent';
              return (
                <AnimatedPressable
                  key={opt}
                  style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                  onPress={() => { console.log('[Admin] Ban duration selected', { duration: opt }); setBanDuration(opt); }}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{optLabel}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
        <AdminInput
          label="Reason"
          value={banReason}
          onChangeText={setBanReason}
          placeholder="Reason for ban..."
          multiline
        />
        <AnimatedPressable style={[styles.actionBtn, styles.dangerBtn]} onPress={handleBan}>
          <Ban size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.actionBtnText}>Ban User</Text>
        </AnimatedPressable>
      </SectionCard>

      {/* Grant Currency */}
      <SectionCard title="Grant Currency" icon={<Coins size={18} color={COLORS.coin} strokeWidth={2} />}>
        <AdminInput
          label="User ID"
          value={grantUserId}
          onChangeText={setGrantUserId}
          placeholder="user_id"
        />
        <View style={styles.currencyRow}>
          <View style={styles.currencyField}>
            <Text style={styles.fieldLabel}>🪙 Coins</Text>
            <TextInput
              style={styles.input}
              value={grantCoins}
              onChangeText={setGrantCoins}
              placeholder="0"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.currencyField}>
            <Text style={styles.fieldLabel}>💎 Gems</Text>
            <TextInput
              style={styles.input}
              value={grantGems}
              onChangeText={setGrantGems}
              placeholder="0"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.currencyField}>
            <Text style={styles.fieldLabel}>🔮 Shards</Text>
            <TextInput
              style={styles.input}
              value={grantShards}
              onChangeText={setGrantShards}
              placeholder="0"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="numeric"
            />
          </View>
        </View>
        <AnimatedPressable style={[styles.actionBtn, styles.successBtn]} onPress={handleGrantCurrency}>
          <Coins size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.actionBtnText}>Grant Currency</Text>
        </AnimatedPressable>
      </SectionCard>

      {/* Version Management */}
      <SectionCard title="Version Management" icon={<Settings size={18} color={COLORS.textSecondary} strokeWidth={2} />}>
        <AdminInput
          label="Minimum Required Version"
          value={minVersion}
          onChangeText={setMinVersion}
          placeholder="1.0.0"
        />
        <AdminInput
          label="Latest Version"
          value={latestVersion}
          onChangeText={setLatestVersion}
          placeholder="1.0.0"
        />
        <AnimatedPressable style={styles.actionBtn} onPress={handleUpdateVersions}>
          <Settings size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.actionBtnText}>Update Versions</Text>
        </AnimatedPressable>
      </SectionCard>
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
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  adminBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warning,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.primary,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  currencyField: {
    flex: 1,
    gap: 6,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  dangerBtn: {
    backgroundColor: COLORS.danger,
  },
  successBtn: {
    backgroundColor: COLORS.success,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  accessDenied: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16,
  },
  accessDeniedSub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});
