import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/utils/supabase';
import { useTranslation } from '@/i18n/LanguageContext';

export default function EulaScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  const sections = [
    { title: t('eulaContent.s1t'), body: t('eulaContent.s1b') },
    { title: t('eulaContent.s2t'), body: t('eulaContent.s2b') },
    { title: t('eulaContent.s3t'), body: t('eulaContent.s3b') },
    { title: t('eulaContent.s4t'), body: t('eulaContent.s4b') },
    { title: t('eulaContent.s5t'), body: t('eulaContent.s5b') },
    { title: t('eulaContent.s6t'), body: t('eulaContent.s6b') },
    { title: t('eulaContent.s7t'), body: t('eulaContent.s7b') },
    { title: t('eulaContent.s8t'), body: t('eulaContent.s8b') },
    { title: t('eulaContent.s9t'), body: t('eulaContent.s9b') },
    { title: t('eulaContent.s10t'), body: t('eulaContent.s10b') },
    { title: t('eulaContent.s11t'), body: t('eulaContent.s11b') },
    { title: t('eulaContent.s12t'), body: t('eulaContent.s12b') },
    { title: t('eulaContent.s13t'), body: t('eulaContent.s13b') },
    { title: t('eulaContent.s14t'), body: t('eulaContent.s14b') },
    { title: t('eulaContent.s15t'), body: t('eulaContent.s15b') },
    { title: t('eulaContent.s16t'), body: t('eulaContent.s16b') },
  ];

  const handleDownloadData = async () => {
    console.log('[EULA] Download My Data pressed');
    setDownloading(true);
    try {
      const { data } = await supabase.functions.invoke('export-user-data', {});
      console.log('[EULA] export-user-data response', data);
      Alert.alert('Data Export', 'Your data has been prepared. In the full app, this would download a JSON file.');
    } catch (e) {
      console.warn('[EULA] export-user-data error', e);
      Alert.alert('Error', 'Could not export data.');
    }
    setDownloading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { console.log('[EULA] Back pressed'); router.back(); }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>{t('eula.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('eula.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <TouchableOpacity
          onPress={handleDownloadData}
          disabled={downloading}
          style={styles.downloadBtn}
        >
          {downloading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="download" size={18} color="#fff" />
          }
          <Text style={styles.downloadBtnText}>
            {downloading ? t('eula.downloading') : t('eula.downloadData')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  content: { padding: 20, paddingBottom: 60 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  sectionBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, marginTop: 8 },
  downloadBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
