import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, SafeAreaView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/utils/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import { useTranslation, LANGS_LAUNCH } from '@/i18n/LanguageContext';
import { setMuted, setSoundCategory, setHapticsIntensity as setHapticsIntensityFn, setAdvancedHaptics as setAdvancedHapticsFn, syncFromProfile } from '@/game/sound';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, lang, setLang } = useTranslation();
  const { profile, refreshProfile } = useProfile();

  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);
  const [showNameConfirm, setShowNameConfirm] = useState(false);

  const [soundOn, setSoundOn] = useState(true);
  const [soundCats, setSoundCats] = useState({ clicks: true, explosions: true, fanfare: true });
  const [hapticsIntensity, setHapticsIntensity] = useState<'off' | 'low' | 'medium' | 'high'>('off');
  const [advancedHaptics, setAdvancedHaptics] = useState(false);
  const [towerMenuAnytime, setTowerMenuAnytime] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(true);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportUsername, setReportUsername] = useState('');
  const [reportSearching, setReportSearching] = useState(false);
  const [reportResult, setReportResult] = useState<{ id: string; display_name: string; trophies: number } | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(profile.display_name || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSoundOn(profile.sound_enabled !== false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSoundCats({
        clicks: profile.sound_categories?.clicks !== false,
        explosions: profile.sound_categories?.explosions !== false,
        fanfare: profile.sound_categories?.fanfare !== false,
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHapticsIntensity(profile.haptics_intensity || (profile.haptics_enabled ? 'medium' : 'off'));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdvancedHaptics(profile.advanced_haptics_enabled === true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTowerMenuAnytime(profile.tower_menu_anytime === true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFitToScreen(profile.fit_to_screen !== false);
      syncFromProfile(profile);
    }
  }, [profile]);

  const saveField = async (field: string, value: unknown) => {
    console.log('[Settings] saveField', { field, value });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('player_profiles').update({ [field]: value }).eq('user_id', user.id);
  };

  const requestSaveName = () => {
    console.log('[Settings] requestSaveName pressed', { name });
    if (!name.trim() || name.trim() === profile?.display_name) return;
    setShowNameConfirm(true);
  };

  const saveName = async () => {
    console.log('[Settings] saveName confirmed', { name });
    if (nameBusy || !name.trim()) return;
    setNameBusy(true);
    setNameError(null);
    try {
      const { data, error } = await supabase.functions.invoke('set-display-name', { body: { name: name.trim() } });
      if (error) throw error;
      const r = data;
      if (r?.success) {
        console.log('[Settings] Name saved successfully');
        setSavedName(true);
        setTimeout(() => setSavedName(false), 2000);
        setShowNameConfirm(false);
        refreshProfile();
      } else if (r?.error === 'name_taken') {
        console.log('[Settings] Name taken');
        setNameError(t('settings.nameTaken'));
        setShowNameConfirm(false);
      } else if (r?.error === 'name_inappropriate') {
        console.log('[Settings] Name inappropriate');
        setNameError(t('settings.nameInappropriate'));
        setShowNameConfirm(false);
      } else {
        console.log('[Settings] Name save error', r?.error);
        setNameError(t('settings.nameError'));
        setShowNameConfirm(false);
      }
    } catch (e) {
      console.warn('[Settings] saveName error', e);
      setNameError(t('settings.nameError'));
      setShowNameConfirm(false);
    }
    setNameBusy(false);
  };

  const handleSignOut = () => {
    console.log('[Settings] Sign Out pressed');
    Alert.alert(t('settings.signOut'), t('settings.signOut') + '?', [
      { text: t('settings.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'), style: 'destructive', onPress: async () => {
          console.log('[Settings] Sign Out confirmed');
          await supabase.auth.signOut();
          router.replace('/auth/welcome');
        }
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    console.log('[Settings] Delete Account confirmed');
    setDeleting(true);
    try {
      await supabase.functions.invoke('delete-account', {});
    } catch (e) {
      console.warn('[Settings] delete-account error', e);
    }
    await supabase.auth.signOut();
    router.replace('/auth/welcome');
    setDeleting(false);
  };

  const handleDownloadData = async () => {
    console.log('[Settings] Download Data pressed');
    setDownloading(true);
    try {
      const { data } = await supabase.functions.invoke('export-user-data', {});
      console.log('[Settings] export-user-data response', data);
      Alert.alert(t('settings.downloadDataTitle'), t('settings.downloadDataSuccess'));
    } catch (e) {
      console.warn('[Settings] export-user-data error', e);
      Alert.alert(t('settings.downloadDataErrorTitle'), t('settings.downloadDataError'));
    }
    setDownloading(false);
  };

  const handleReportSearch = async () => {
    console.log('[Settings] Report search', { reportUsername });
    if (!reportUsername.trim()) return;
    setReportSearching(true);
    setReportResult(null);
    setReportError(null);
    try {
      const { data, error } = await supabase
        .from('player_profiles')
        .select('user_id, display_name, trophies')
        .ilike('display_name', reportUsername.trim())
        .limit(1)
        .single();
      if (error || !data) {
        setReportError(t('friends.notFound'));
      } else if (data.user_id === profile?.user_id) {
        setReportError(t('settings.reportSelf'));
      } else {
        setReportResult({ id: data.user_id, display_name: data.display_name, trophies: data.trophies ?? 0 });
      }
    } catch {
      setReportError(t('friends.notFound'));
    }
    setReportSearching(false);
  };

  const handleReportSubmit = async () => {
    if (!reportResult) return;
    console.log('[Settings] Report submit', { target: reportResult.id });
    setReportSubmitting(true);
    try {
      await supabase.functions.invoke('report-user', { body: { reported_user_id: reportResult.id } });
    } catch (e) {
      console.warn('[Settings] report-user error', e);
    }
    setReportSubmitting(false);
    setReportDone(true);
    setTimeout(() => {
      setShowReportModal(false);
      setReportUsername('');
      setReportResult(null);
      setReportError(null);
      setReportDone(false);
    }, 1500);
  };

  const hapticLevels = ['off', 'low', 'medium', 'high'] as const;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => { console.log('[Settings] Back pressed'); router.back(); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
            <Text style={styles.backText}>{t('settings.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{t('settings.title')}</Text>
        </View>

        {/* Profile */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>{t('settings.profile')}</Text>
          </View>
          <Text style={styles.fieldLabel}>{t('settings.displayName')}</Text>
          <View style={styles.nameRow}>
            <TextInput
              value={name}
              onChangeText={v => { setName(v); setNameError(null); }}
              style={[styles.nameInput, nameError ? styles.nameInputError : null]}
              maxLength={20}
            />
            <TouchableOpacity
              onPress={requestSaveName}
              disabled={nameBusy || !name.trim()}
              style={styles.saveBtn}
            >
              {savedName
                ? <Ionicons name="checkmark" size={18} color="#fff" />
                : nameBusy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>{t('settings.save')}</Text>
              }
            </TouchableOpacity>
          </View>
          {nameError && <Text style={styles.nameError}>{nameError}</Text>}
          <TouchableOpacity
            onPress={() => { console.log('[Settings] Friends pressed'); router.push('/social' as any); }}
            style={styles.linkRow}
          >
            <Ionicons name="people" size={20} color={COLORS.primary} />
            <Text style={styles.linkText}>{t('settings.friends')}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Language */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="globe" size={20} color="#10B981" />
            </View>
            <Text style={styles.cardTitle}>{t('settings.language')}</Text>
          </View>
          <Text style={styles.cardDesc}>{t('settings.languageDesc')}</Text>
          <View style={styles.langGrid}>
            {LANGS_LAUNCH.map(l => (
              <TouchableOpacity
                key={l.code}
                onPress={() => { console.log('[Settings] Language selected', { code: l.code }); setLang(l.code); }}
                style={[styles.langBtn, lang === l.code && styles.langBtnActive]}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={styles.langLabel}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sound & Haptics */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FAF5FF' }]}>
              <Ionicons name="volume-high" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.cardTitle}>{t('settings.sound')}</Text>
          </View>
          <Text style={styles.cardDesc}>{t('settings.soundDesc')}</Text>
          <ToggleRow
            label={t('settings.sound')}
            value={soundOn}
            onChange={v => { setSoundOn(v); setMuted(!v); saveField('sound_enabled', v); }}
          />
          {soundOn && (
            <View style={styles.subToggles}>
              <ToggleRow
                label={t('settings.soundClicks')}
                value={soundCats.clicks}
                onChange={v => { setSoundCats(c => ({ ...c, clicks: v })); setSoundCategory('clicks', v); saveField('sound_categories', { ...soundCats, clicks: v }); }}
              />
              <ToggleRow
                label={t('settings.soundExplosions')}
                value={soundCats.explosions}
                onChange={v => { setSoundCats(c => ({ ...c, explosions: v })); setSoundCategory('explosions', v); saveField('sound_categories', { ...soundCats, explosions: v }); }}
              />
              <ToggleRow
                label={t('settings.soundFanfare')}
                value={soundCats.fanfare}
                onChange={v => { setSoundCats(c => ({ ...c, fanfare: v })); setSoundCategory('fanfare', v); saveField('sound_categories', { ...soundCats, fanfare: v }); }}
              />
            </View>
          )}
          <View style={styles.hapticsSection}>
            <Text style={styles.fieldLabel}>{t('settings.hapticsIntensity')}</Text>
            <Text style={styles.cardDesc}>{t('settings.hapticsIntensityDesc')}</Text>
            <View style={styles.hapticsRow}>
              {hapticLevels.map(lvl => {
                const capKey = lvl.charAt(0).toUpperCase() + lvl.slice(1);
                const labelKey = `settings.haptic${capKey}` as any;
                const isActive = hapticsIntensity === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => { console.log('[Settings] Haptics intensity changed', { lvl }); setHapticsIntensity(lvl); setHapticsIntensityFn(lvl); saveField('haptics_intensity', lvl); }}
                    style={[styles.hapticBtn, isActive && styles.hapticBtnActive]}
                  >
                    <Text style={[styles.hapticBtnText, isActive && styles.hapticBtnTextActive]}>
                      {t(labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          {hapticsIntensity !== 'off' && (
            <View style={styles.subToggles}>
              <ToggleRow
                label={t('settings.advancedHaptics')}
                desc={t('settings.advancedHapticsDesc')}
                value={advancedHaptics}
                onChange={v => { setAdvancedHaptics(v); setAdvancedHapticsFn(v); saveField('advanced_haptics_enabled', v); }}
              />
            </View>
          )}
        </View>

        {/* Gameplay */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="construct" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>{t('settings.gameplay')}</Text>
          </View>
          <Text style={styles.cardDesc}>{t('settings.gameplayDesc')}</Text>
          <ToggleRow
            label={t('settings.towerMenuAnytime')}
            desc={t('settings.towerMenuAnytimeDesc')}
            value={towerMenuAnytime}
            onChange={v => { setTowerMenuAnytime(v); saveField('tower_menu_anytime', v); }}
          />
          <ToggleRow
            label={t('settings.fitToScreen')}
            desc={t('settings.fitToScreenDesc')}
            value={fitToScreen}
            onChange={v => { setFitToScreen(v); saveField('fit_to_screen', v); }}
          />
          <TouchableOpacity
            onPress={() => { console.log('[Settings] Replay Tutorial pressed'); router.push({ pathname: '/game', params: { mode: 'tutorial' } }); }}
            style={styles.linkRow}
          >
            <Ionicons name="school" size={20} color={COLORS.primary} />
            <Text style={styles.linkText}>{t('settings.replayTutorial')}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.cardTitle}>{t('settings.account')}</Text>
          </View>
          <Text style={styles.cardDesc}>{t('settings.accountDesc')}</Text>
          <TouchableOpacity
            onPress={() => { console.log('[Settings] Privacy Policy pressed'); router.push('/privacy' as any); }}
            style={styles.linkRow}
          >
            <Ionicons name="document-text" size={20} color={COLORS.textSecondary} />
            <Text style={styles.linkText}>{t('settings.privacyPolicy')}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { console.log('[Settings] EULA pressed'); router.push('/eula-screen' as any); }}
            style={styles.linkRow}
          >
            <Ionicons name="document-text" size={20} color={COLORS.textSecondary} />
            <Text style={styles.linkText}>{t('settings.eula')}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { console.log('[Settings] Impressum pressed'); router.push('/impressum' as any); }}
            style={styles.linkRow}
          >
            <Ionicons name="document-text" size={20} color={COLORS.textSecondary} />
            <Text style={styles.linkText}>{t('settings.impressum')}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDownloadData}
            disabled={downloading}
            style={styles.linkRow}
          >
            <Ionicons name="download" size={20} color={COLORS.textSecondary} />
            <Text style={styles.linkText}>{t('settings.downloadData')}</Text>
            {downloading && <ActivityIndicator size="small" color={COLORS.textTertiary} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowReportModal(true); setReportUsername(''); setReportResult(null); setReportError(null); setReportDone(false); }}
            style={styles.linkRow}
          >
            <Ionicons name="flag" size={20} color={COLORS.textSecondary} />
            <Text style={styles.linkText}>{t('settings.reportUser')}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { console.log('[Settings] Delete Account pressed'); setDeleteConfirmText(''); setShowDeleteDialog(true); }}
            style={[styles.linkRow, styles.dangerRow]}
          >
            <Ionicons name="trash" size={20} color={COLORS.danger} />
            <Text style={[styles.linkText, { color: COLORS.danger }]}>{t('settings.deleteAccount')}</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>{t('settings.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Name change confirm modal */}
      <Modal visible={showNameConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.changeNameTitle')}</Text>
            <Text style={styles.modalBody}>{t('settings.changeNameBody')}</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => { console.log('[Settings] Name change cancelled'); setShowNameConfirm(false); }}
                style={styles.modalBtnSecondary}
              >
                <Text style={styles.modalBtnSecondaryText}>{t('settings.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} disabled={nameBusy} style={styles.modalBtnPrimary}>
                {nameBusy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalBtnPrimaryText}>{t('settings.confirmChange')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirm modal */}
      <Modal visible={showDeleteDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.deleteConfirmTitle')}</Text>
            <Text style={styles.modalBody}>{t('settings.deleteConfirmBody')}</Text>
            <Text style={styles.fieldLabel}>{t('settings.deleteTypeHint')}</Text>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="delete"
              style={[styles.nameInput, { marginBottom: 16 }]}
              autoCapitalize="none"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => { console.log('[Settings] Delete Account cancelled'); setShowDeleteDialog(false); }}
                style={styles.modalBtnSecondary}
              >
                <Text style={styles.modalBtnSecondaryText}>{t('settings.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={deleting || deleteConfirmText.trim().toLowerCase() !== 'delete'}
                style={[styles.modalBtnPrimary, { backgroundColor: COLORS.danger }]}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalBtnPrimaryText}>{t('settings.deleteButton')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report player modal */}
      <Modal visible={showReportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.reportUser')}</Text>
            {reportDone ? (
              <Text style={[styles.modalBody, { color: '#10B981' }]}>{t('settings.reportSent')}</Text>
            ) : (
              <>
                <View style={styles.nameRow}>
                  <TextInput
                    value={reportUsername}
                    onChangeText={v => { setReportUsername(v); setReportResult(null); setReportError(null); }}
                    placeholder={t('friends.usernamePlaceholder')}
                    style={styles.nameInput}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={handleReportSearch}
                    disabled={reportSearching || !reportUsername.trim()}
                    style={styles.saveBtn}
                  >
                    {reportSearching
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.saveBtnText}>{t('friends.search')}</Text>
                    }
                  </TouchableOpacity>
                </View>
                {reportError && <Text style={styles.nameError}>{reportError}</Text>}
                {reportResult && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4 }}>
                    <Ionicons name="person-circle" size={32} color={COLORS.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text }}>{reportResult.display_name}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>🏆 {reportResult.trophies} {t('leaderboard.trophies')}</Text>
                    </View>
                  </View>
                )}
                <View style={[styles.modalBtns, { marginTop: 12 }]}>
                  <TouchableOpacity
                    onPress={() => setShowReportModal(false)}
                    style={styles.modalBtnSecondary}
                  >
                    <Text style={styles.modalBtnSecondaryText}>{t('settings.cancel')}</Text>
                  </TouchableOpacity>
                  {reportResult && (
                    <TouchableOpacity
                      onPress={handleReportSubmit}
                      disabled={reportSubmitting}
                      style={[styles.modalBtnPrimary, { backgroundColor: COLORS.danger }]}
                    >
                      {reportSubmitting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.modalBtnPrimaryText}>{t('settings.reportUser')}</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity onPress={() => { console.log('[Settings] Toggle pressed', { label, newValue: !value }); onChange(!value); }} style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {desc && <Text style={styles.toggleDesc}>{desc}</Text>}
      </View>
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.border },
  backText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  pageTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  card: { backgroundColor: COLORS.surface, borderRadius: 24, borderWidth: 2, borderColor: COLORS.border, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  cardDesc: { fontSize: 11, color: COLORS.textTertiary, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  nameRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  nameInput: { flex: 1, borderWidth: 2, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '700', color: COLORS.text, backgroundColor: COLORS.background },
  nameInputError: { borderColor: COLORS.danger },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.text, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  nameError: { fontSize: 12, fontWeight: '700', color: COLORS.danger, marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  dangerRow: { borderTopColor: '#FEE2E2' },
  linkText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langBtn: { padding: 8, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', minWidth: 64 },
  langBtnActive: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  langFlag: { fontSize: 20, marginBottom: 2 },
  langLabel: { fontSize: 9, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  subToggles: { marginLeft: 24, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: COLORS.border },
  hapticsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  hapticsRow: { flexDirection: 'row', gap: 6 },
  hapticBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center' },
  hapticBtnActive: { backgroundColor: COLORS.primary },
  hapticBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  hapticBtnTextActive: { color: '#fff' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  toggleDesc: { fontSize: 10, color: COLORS.textTertiary, marginTop: 1 },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORS.border, position: 'relative' },
  toggleTrackOn: { backgroundColor: COLORS.primary },
  toggleThumb: { position: 'absolute', top: 2, left: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  toggleThumbOn: { left: 22 },
  signOutBtn: { marginTop: 8, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surface },
  signOutText: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  modalBody: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'center', lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 8 },
  modalBtnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center' },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  modalBtnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.text, alignItems: 'center' },
  modalBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
