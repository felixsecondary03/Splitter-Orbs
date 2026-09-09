import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { useTranslation } from '@/i18n/LanguageContext';

export default function PrivacyScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const sections = [
    { title: t('privacyContent.s1t'), body: t('privacyContent.s1b') },
    { title: t('privacyContent.s2t'), body: t('privacyContent.s2b') },
    { title: t('privacyContent.s3t'), body: t('privacyContent.s3b') },
    { title: t('privacyContent.s4t'), body: t('privacyContent.s4b') },
    { title: t('privacyContent.s5t'), body: t('privacyContent.s5b') },
    { title: t('privacyContent.s6t'), body: t('privacyContent.s6b') },
    { title: t('privacyContent.s7t'), body: t('privacyContent.s7b') },
    { title: t('privacyContent.s8t'), body: t('privacyContent.s8b') },
    { title: t('privacyContent.s9t'), body: t('privacyContent.s9b') },
    { title: t('privacyContent.s10t'), body: t('privacyContent.s10b') },
    { title: t('privacyContent.s11t'), body: t('privacyContent.s11b') },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { console.log('[Privacy] Back pressed'); router.back(); }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>{t('privacy.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('privacy.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
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
});
