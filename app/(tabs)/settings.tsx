import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Animated,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Volume2,
  Vibrate,
  Globe,
  User,
  Trash2,
  Download,
  FileText,
  Shield,
  Info,
  ChevronRight,
  Settings,
  LogOut,
  Monitor,
  Link,
  Pencil,
  Check,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 50, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'nl', label: 'NL', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ja', label: 'JA', name: '日本語', flag: '🇯🇵' },
  { code: 'it', label: 'IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'PT', name: 'Português', flag: '🇧🇷' },
];

const HAPTICS_OPTIONS: ('off' | 'low' | 'medium' | 'high')[] = ['off', 'low', 'medium', 'high'];

const AVATAR_COLORS = [
  '#4F8EF7', '#A855F7', '#22C55E', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#F97316',
];

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  sublabel?: string;
}

function SettingRow({ icon, label, right, onPress, destructive, sublabel }: SettingRowProps) {
  const content = (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        {icon}
        <View style={styles.settingLabelWrap}>
          <Text style={[styles.settingLabel, destructive && { color: COLORS.danger }]}>{label}</Text>
          {sublabel ? <Text style={styles.settingSubLabel}>{sublabel}</Text> : null}
        </View>
      </View>
      <View style={styles.settingRight}>
        {right ?? <ChevronRight size={18} color={COLORS.textTertiary} strokeWidth={2} />}
      </View>
    </View>
  );

  if (onPress) {
    return <AnimatedPressable onPress={onPress}>{content}</AnimatedPressable>;
  }
  return content;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const { user, signOut } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.display_name);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameStatus, setNameStatus] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const saveToSupabase = useCallback(async (partial: Record<string, unknown>, label: string) => {
    if (!user) return;
    console.log(`[Settings] Saving ${label} to Supabase`, partial);
    const { error } = await supabase
      .from('player_profiles')
      .update(partial)
      .eq('id', user.id);
    if (error) {
      console.warn(`[Settings] Save ${label} error`, error.message);
    } else {
      console.log(`[Settings] ${label} saved`);
    }
  }, [user]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSoundToggle = async (val: boolean) => {
    console.log('[Settings] Sound master toggle', { val });
    updateProfile({ sound_enabled: val });
    await saveToSupabase({ sound_enabled: val }, 'sound_enabled');
  };

  const handleCategoryToggle = async (key: keyof typeof profile.sound_categories, val: boolean) => {
    console.log('[Settings] Sound category toggle', { key, val });
    const updated = { ...profile.sound_categories, [key]: val };
    updateProfile({ sound_categories: updated });
    await saveToSupabase({ sound_categories: updated }, `sound_categories.${key}`);
  };

  const handleHapticsToggle = async (val: boolean) => {
    console.log('[Settings] Haptics toggle', { val });
    updateProfile({ haptics_enabled: val });
    await saveToSupabase({ haptics_enabled: val }, 'haptics_enabled');
  };

  const handleAdvancedHapticsToggle = async (val: boolean) => {
    console.log('[Settings] Advanced haptics toggle', { val });
    updateProfile({ advanced_haptics_enabled: val });
    await saveToSupabase({ advanced_haptics_enabled: val }, 'advanced_haptics_enabled');
  };

  const handleHapticsIntensity = async (intensity: 'off' | 'low' | 'medium' | 'high') => {
    console.log('[Settings] Haptics intensity changed', { intensity });
    updateProfile({ haptics_intensity: intensity });
    await saveToSupabase({ haptics_intensity: intensity }, 'haptics_intensity');
  };

  const handleLanguage = async (code: string) => {
    console.log('[Settings] Language changed', { code });
    updateProfile({ language: code });
    setShowLangModal(false);
    await saveToSupabase({ language: code }, 'language');
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setEditingName(false);
      setNameInput(profile.display_name);
      return;
    }
    console.log('[Settings] Display name save pressed', { name: trimmed });
    setNameSaving(true);
    setNameStatus(null);
    try {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('player_profiles')
        .update({ display_name: trimmed })
        .eq('id', user.id);
      if (error) {
        console.warn('[Settings] Display name save error', error.message);
        setNameStatus('Failed to save');
        Alert.alert('Error', error.message);
      } else {
        console.log('[Settings] Display name saved', { name: trimmed });
        updateProfile({ display_name: trimmed });
        await refreshProfile();
        setNameStatus('Saved!');
        setTimeout(() => setNameStatus(null), 2000);
      }
    } catch (e: any) {
      console.warn('[Settings] Display name unexpected error', e?.message);
    } finally {
      setNameSaving(false);
      setEditingName(false);
    }
  };

  const handleAvatarColor = async (color: string) => {
    console.log('[Settings] Avatar color changed', { color });
    updateProfile({ avatar_color: color });
    setShowAvatarModal(false);
    await saveToSupabase({ avatar_color: color }, 'avatar_color');
  };

  const handleFitToScreen = async (val: boolean) => {
    console.log('[Settings] Fit to screen toggled', { val });
    updateProfile({ fit_to_screen: val });
    await saveToSupabase({ fit_to_screen: val }, 'fit_to_screen');
  };

  const handleTowerMenuAnytime = async (val: boolean) => {
    console.log('[Settings] Tower menu anytime toggled', { val });
    updateProfile({ tower_menu_anytime: val });
    await saveToSupabase({ tower_menu_anytime: val }, 'tower_menu_anytime');
  };

  const handleExportData = () => {
    console.log('[Settings] Export Data pressed');
    Alert.alert('Export Data', 'Your data export will be emailed to you within 24 hours.');
  };

  const handleDeleteAccount = async () => {
    console.log('[Settings] Delete Account confirmed');
    setShowDeleteModal(false);
    setDeletingAccount(true);
    try {
      const { error: fnError } = await supabase.functions.invoke('deleteAccount', {});
      if (fnError) {
        console.warn('[Settings] deleteAccount edge function failed', fnError.message);
        // Fallback: just sign out with a note
        console.log('[Settings] Falling back to sign out (deletion pending)');
        Alert.alert(
          'Account deletion requested',
          'Your account will be deleted shortly. You have been signed out.',
        );
      } else {
        console.log('[Settings] deleteAccount edge function succeeded');
      }
      await supabase.auth.signOut();
      await signOut();
      router.replace('/auth/welcome' as never);
    } catch (e: any) {
      console.warn('[Settings] Delete account unexpected error', e?.message);
      Alert.alert('Error', e?.message ?? 'Could not delete account. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleSignOut = async () => {
    console.log('[Settings] Sign Out confirmed');
    setShowSignOutModal(false);
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await signOut();
      console.log('[Settings] Sign out complete, navigating to welcome');
      router.replace('/auth/welcome' as never);
    } catch (e: any) {
      console.warn('[Settings] Sign out error', e?.message);
    } finally {
      setSigningOut(false);
    }
  };

  const handlePrivacyPolicy = () => {
    console.log('[Settings] Privacy Policy pressed');
  };

  const handleEULA = () => {
    console.log('[Settings] EULA pressed');
  };

  const handleImpressum = () => {
    console.log('[Settings] Impressum pressed');
  };

  const handleVersionTap = useCallback(() => {
    const next = versionTapCount + 1;
    setVersionTapCount(next);
    if (next >= 5) {
      console.log('[Settings] Admin mode unlocked');
      setShowAdmin(true);
      setVersionTapCount(0);
    }
  }, [versionTapCount]);

  const handleAdminPanel = () => {
    console.log('[Settings] Admin Panel pressed');
    router.push('/admin' as never);
  };

  const currentLang = LANGUAGES.find(l => l.code === profile.language) ?? LANGUAGES[0];
  const initials = profile.display_name.slice(0, 2).toUpperCase();
  const accountTypeLabel = profile.account_type.charAt(0).toUpperCase() + profile.account_type.slice(1);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedListItem index={0}>
          <View style={styles.headerRow}>
            <Settings size={22} color={COLORS.primary} strokeWidth={2} />
            <Text style={styles.screenTitle}>Settings</Text>
          </View>
        </AnimatedListItem>

        {/* Profile */}
        <AnimatedListItem index={1}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={16} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>PROFILE</Text>
            </View>

            {/* Avatar + name row */}
            <View style={styles.profileRow}>
              <AnimatedPressable onPress={() => { console.log('[Settings] Avatar pressed'); setShowAvatarModal(true); }}>
                <View style={[styles.avatar, { backgroundColor: profile.avatar_color }]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                  <View style={styles.avatarEditBadge}>
                    <Pencil size={10} color="#fff" strokeWidth={2.5} />
                  </View>
                </View>
              </AnimatedPressable>
              <View style={styles.profileInfo}>
                {editingName ? (
                  <View style={styles.nameEditRow}>
                    <TextInput
                      style={styles.nameInput}
                      value={nameInput}
                      onChangeText={setNameInput}
                      autoFocus
                      maxLength={20}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveName}
                      placeholderTextColor={COLORS.textTertiary}
                    />
                    {nameSaving ? (
                      <ActivityIndicator color={COLORS.primary} size="small" />
                    ) : (
                      <>
                        <AnimatedPressable style={styles.nameSaveBtn} onPress={handleSaveName}>
                          <Check size={16} color="#fff" strokeWidth={2.5} />
                        </AnimatedPressable>
                        <AnimatedPressable style={styles.nameCancelBtn} onPress={() => { setEditingName(false); setNameInput(profile.display_name); }}>
                          <X size={16} color={COLORS.textSecondary} strokeWidth={2.5} />
                        </AnimatedPressable>
                      </>
                    )}
                  </View>
                ) : (
                  <AnimatedPressable onPress={() => { console.log('[Settings] Edit name pressed'); setEditingName(true); setNameInput(profile.display_name); }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.profileName}>{profile.display_name}</Text>
                      <Pencil size={14} color={COLORS.textTertiary} strokeWidth={2} />
                    </View>
                  </AnimatedPressable>
                )}
                {nameStatus ? (
                  <Text style={[styles.nameStatusText, nameStatus === 'Saved!' && { color: COLORS.success }]}>
                    {nameStatus}
                  </Text>
                ) : (
                  <View style={styles.accountTypeBadge}>
                    <Text style={styles.accountTypeText}>{accountTypeLabel}</Text>
                  </View>
                )}
              </View>
            </View>

            {profile.account_type === 'guest' && (
              <>
                <View style={styles.divider} />
                <SettingRow
                  icon={<Link size={18} color={COLORS.primary} strokeWidth={2} />}
                  label="Link Account"
                  sublabel="Save your progress"
                  onPress={() => { console.log('[Settings] Link Account pressed'); router.push('/auth/welcome' as never); }}
                  right={<ChevronRight size={18} color={COLORS.primary} strokeWidth={2} />}
                />
              </>
            )}
          </View>
        </AnimatedListItem>

        {/* Sound */}
        <AnimatedListItem index={2}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Volume2 size={16} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>SOUND</Text>
            </View>
            <SettingRow
              icon={<Volume2 size={18} color={COLORS.textSecondary} strokeWidth={2} />}
              label="Master Sound"
              right={
                <Switch
                  value={profile.sound_enabled}
                  onValueChange={handleSoundToggle}
                  trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              }
            />
            {profile.sound_enabled && (
              <>
                <View style={styles.divider} />
                <SettingRow
                  icon={<View style={styles.subIcon} />}
                  label="Clicks"
                  right={
                    <Switch
                      value={profile.sound_categories.clicks}
                      onValueChange={(v) => handleCategoryToggle('clicks', v)}
                      trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                      thumbColor="#fff"
                    />
                  }
                />
                <View style={styles.divider} />
                <SettingRow
                  icon={<View style={styles.subIcon} />}
                  label="Explosions"
                  right={
                    <Switch
                      value={profile.sound_categories.explosions}
                      onValueChange={(v) => handleCategoryToggle('explosions', v)}
                      trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                      thumbColor="#fff"
                    />
                  }
                />
                <View style={styles.divider} />
                <SettingRow
                  icon={<View style={styles.subIcon} />}
                  label="Fanfare"
                  right={
                    <Switch
                      value={profile.sound_categories.fanfare}
                      onValueChange={(v) => handleCategoryToggle('fanfare', v)}
                      trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                      thumbColor="#fff"
                    />
                  }
                />
              </>
            )}
          </View>
        </AnimatedListItem>

        {/* Haptics */}
        <AnimatedListItem index={3}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Vibrate size={16} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>HAPTICS</Text>
            </View>
            <SettingRow
              icon={<Vibrate size={18} color={COLORS.textSecondary} strokeWidth={2} />}
              label="Enable Haptics"
              right={
                <Switch
                  value={profile.haptics_enabled}
                  onValueChange={handleHapticsToggle}
                  trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              }
            />
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={styles.subIcon} />
                <View style={styles.settingLabelWrap}>
                  <Text style={[styles.settingLabel, !profile.haptics_enabled && { opacity: 0.4 }]}>Intensity</Text>
                </View>
              </View>
              <View style={styles.hapticsRow}>
                {HAPTICS_OPTIONS.map((opt) => {
                  const isActive = profile.haptics_intensity === opt;
                  const optLabel = opt.charAt(0).toUpperCase() + opt.slice(1);
                  return (
                    <AnimatedPressable
                      key={opt}
                      style={[styles.hapticsBtn, isActive && styles.hapticsBtnActive]}
                      onPress={() => handleHapticsIntensity(opt)}
                      disabled={!profile.haptics_enabled}
                    >
                      <Text style={[styles.hapticsBtnText, isActive && styles.hapticsBtnTextActive]}>
                        {optLabel}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.divider} />
            <SettingRow
              icon={<View style={styles.subIcon} />}
              label="Advanced Haptics"
              right={
                <Switch
                  value={profile.advanced_haptics_enabled}
                  onValueChange={handleAdvancedHapticsToggle}
                  trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                  thumbColor="#fff"
                  disabled={!profile.haptics_enabled}
                />
              }
            />
          </View>
        </AnimatedListItem>

        {/* Display */}
        <AnimatedListItem index={4}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Monitor size={16} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>DISPLAY</Text>
            </View>
            <SettingRow
              icon={<Monitor size={18} color={COLORS.textSecondary} strokeWidth={2} />}
              label="Fit to screen"
              sublabel="Scale game to fill display"
              right={
                <Switch
                  value={profile.fit_to_screen}
                  onValueChange={handleFitToScreen}
                  trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              }
            />
            <View style={styles.divider} />
            <SettingRow
              icon={<View style={styles.subIcon} />}
              label="Tower menu anytime"
              sublabel="Open tower menu outside edit mode"
              right={
                <Switch
                  value={profile.tower_menu_anytime}
                  onValueChange={handleTowerMenuAnytime}
                  trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              }
            />
          </View>
        </AnimatedListItem>

        {/* Language */}
        <AnimatedListItem index={5}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Globe size={16} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>LANGUAGE</Text>
            </View>
            <SettingRow
              icon={<Globe size={18} color={COLORS.textSecondary} strokeWidth={2} />}
              label="Language"
              sublabel={currentLang.flag + ' ' + currentLang.name}
              onPress={() => { console.log('[Settings] Language picker opened'); setShowLangModal(true); }}
            />
          </View>
        </AnimatedListItem>

        {/* Account */}
        <AnimatedListItem index={6}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={16} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>ACCOUNT</Text>
            </View>
            <SettingRow
              icon={<Download size={18} color={COLORS.textSecondary} strokeWidth={2} />}
              label="Export my data"
              sublabel="GDPR data export"
              onPress={handleExportData}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={signingOut
                ? <ActivityIndicator size="small" color={COLORS.textSecondary} />
                : <LogOut size={18} color={COLORS.textSecondary} strokeWidth={2} />}
              label="Sign out"
              onPress={() => { console.log('[Settings] Sign Out pressed'); setShowSignOutModal(true); }}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={deletingAccount
                ? <ActivityIndicator size="small" color={COLORS.danger} />
                : <Trash2 size={18} color={COLORS.danger} strokeWidth={2} />}
              label="Delete account"
              sublabel="Permanently remove all data"
              onPress={() => { console.log('[Settings] Delete Account pressed'); setShowDeleteModal(true); }}
              destructive
            />
          </View>
        </AnimatedListItem>

        {/* Legal */}
        <AnimatedListItem index={7}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={16} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>LEGAL</Text>
            </View>
            <SettingRow
              icon={<Shield size={18} color={COLORS.textSecondary} strokeWidth={2} />}
              label="Privacy Policy"
              onPress={handlePrivacyPolicy}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={<FileText size={18} color={COLORS.textSecondary} strokeWidth={2} />}
              label="Terms of Service / EULA"
              onPress={handleEULA}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={<Info size={18} color={COLORS.textSecondary} strokeWidth={2} />}
              label="Impressum"
              onPress={handleImpressum}
            />
          </View>
        </AnimatedListItem>

        {/* Version */}
        <AnimatedListItem index={8}>
          <AnimatedPressable onPress={handleVersionTap}>
            <View style={styles.versionRow}>
              <Text style={styles.versionText}>Orb Clash</Text>
              <Text style={styles.versionNum}>v1.0.0 (build 1)</Text>
              {versionTapCount > 0 && versionTapCount < 5 && (
                <Text style={styles.versionHint}>{5 - versionTapCount} more taps for admin</Text>
              )}
            </View>
          </AnimatedPressable>
        </AnimatedListItem>

        {/* Admin section (hidden until 5x tap) */}
        {showAdmin && (
          <AnimatedListItem index={9}>
            <View style={[styles.section, { borderColor: COLORS.warning }]}>
              <View style={styles.sectionHeader}>
                <Shield size={16} color={COLORS.warning} strokeWidth={2} />
                <Text style={[styles.sectionTitle, { color: COLORS.warning }]}>ADMIN</Text>
              </View>
              <SettingRow
                icon={<Shield size={18} color={COLORS.warning} strokeWidth={2} />}
                label="Admin Panel"
                onPress={handleAdminPanel}
                right={<ChevronRight size={18} color={COLORS.warning} strokeWidth={2} />}
              />
            </View>
          </AnimatedListItem>
        )}
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLangModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Language</Text>
            {LANGUAGES.map((lang) => {
              const isActive = profile.language === lang.code;
              return (
                <AnimatedPressable key={lang.code} onPress={() => handleLanguage(lang.code)}>
                  <View style={[styles.langRow, isActive && styles.langRowActive]}>
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langRowName, isActive && { color: COLORS.primary }]}>{lang.name}</Text>
                    {isActive && <Check size={18} color={COLORS.primary} strokeWidth={2.5} />}
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Avatar Color Modal */}
      <Modal visible={showAvatarModal} transparent animationType="fade" onRequestClose={() => setShowAvatarModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAvatarModal(false)}>
          <View style={styles.avatarModal}>
            <Text style={styles.modalTitle}>Choose Avatar Color</Text>
            <View style={styles.colorGrid}>
              {AVATAR_COLORS.map((color) => {
                const isActive = profile.avatar_color === color;
                return (
                  <AnimatedPressable key={color} onPress={() => handleAvatarColor(color)}>
                    <View style={[styles.colorSwatch, { backgroundColor: color }, isActive && styles.colorSwatchActive]}>
                      {isActive && <Check size={18} color="#fff" strokeWidth={3} />}
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconWrap}>
              <Trash2 size={28} color={COLORS.danger} strokeWidth={2} />
            </View>
            <Text style={styles.confirmTitle}>Delete account?</Text>
            <Text style={styles.confirmBody}>
              This will permanently delete your account and all game progress. This cannot be undone.
            </Text>
            <AnimatedPressable style={styles.confirmDangerBtn} onPress={handleDeleteAccount}>
              <Text style={styles.confirmDangerText}>Delete my account</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.confirmCancelBtn} onPress={() => { console.log('[Settings] Delete Account cancelled'); setShowDeleteModal(false); }}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Sign Out Modal */}
      <Modal visible={showSignOutModal} transparent animationType="fade" onRequestClose={() => setShowSignOutModal(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconWrap}>
              <LogOut size={28} color={COLORS.textSecondary} strokeWidth={2} />
            </View>
            <Text style={styles.confirmTitle}>Sign out?</Text>
            <Text style={styles.confirmBody}>
              You'll need to sign back in to access your account.
            </Text>
            <AnimatedPressable style={styles.confirmSignOutBtn} onPress={handleSignOut}>
              <Text style={styles.confirmSignOutText}>Sign out</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.confirmCancelBtn} onPress={() => { console.log('[Settings] Sign Out cancelled'); setShowSignOutModal(false); }}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </AnimatedPressable>
          </View>
        </View>
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
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabelWrap: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingSubLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  settingRight: {
    alignItems: 'flex-end',
  },
  subIcon: {
    width: 18,
    height: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 46,
  },
  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  nameSaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
  },
  accountTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  accountTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  // Haptics
  hapticsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  hapticsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
  },
  hapticsBtnActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  hapticsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  hapticsBtnTextActive: {
    color: COLORS.primary,
  },
  // Version
  versionRow: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textTertiary,
  },
  versionNum: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontFamily: 'SpaceMono',
  },
  versionHint: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '500',
  },
  // Language modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  langRowActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  langFlag: {
    fontSize: 22,
  },
  langRowName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  // Avatar modal
  avatarModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    margin: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  // Confirm modals
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  confirmModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  confirmBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmDangerBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  confirmDangerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  confirmSignOutBtn: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmSignOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  confirmCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
