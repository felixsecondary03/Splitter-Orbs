import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/utils/supabase';
import { useTranslation } from '@/i18n/LanguageContext';

const SECTIONS = [
  { title: "1. Acceptance of Terms", body: "By downloading, installing, accessing, or using Splitter Orbs, you agree to be bound by this End User License Agreement. If you do not agree, do not use the App." },
  { title: "2. License to Use", body: "Subject to your compliance with this EULA, the developer grants you a limited, non-exclusive, non-transferable, revocable license to install and use the App for personal, non-commercial purposes." },
  { title: "3. Your Account", body: "You are responsible for maintaining the security of your account and for all activities that occur under your account." },
  { title: "4. Acceptable Use", body: "You agree not to: (a) cheat, hack, or use unauthorized third-party software; (b) exploit bugs or vulnerabilities; (c) harass or harm other users; (d) use the App for illegal purposes; (e) reverse engineer the App; (f) create multiple accounts to circumvent restrictions." },
  { title: "5. Virtual Items & Currency", body: "The App contains virtual items and currencies (coins, gems, shards) that have no real-world monetary value. Virtual items may be reset or removed at any time without compensation." },
  { title: "6. No Gambling", body: "The App contains randomized reward systems (crates). These are not gambling. You always receive in-game items. Virtual items cannot be exchanged for real money." },
  { title: "7. Intellectual Property", body: "All content in the App is owned by the developer or its licensors. You may not copy, distribute, or modify it without prior written permission." },
  { title: "8. Disclaimer of Warranty", body: "THE APP IS PROVIDED 'AS IS' WITHOUT ANY WARRANTIES OF ANY KIND. THE DEVELOPER DOES NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED OR ERROR-FREE." },
  { title: "9. Limitation of Liability", body: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE DEVELOPER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. THE DEVELOPER'S TOTAL LIABILITY SHALL NOT EXCEED ZERO." },
  { title: "10. Indemnification", body: "You agree to indemnify and hold harmless the developer from claims arising from your violation of this EULA or misuse of the App." },
  { title: "11. Privacy & Data", body: "Your data is processed in accordance with the App's Privacy Policy. By using the App, you consent to the data practices described in the Privacy Policy." },
  { title: "12. Age Requirement", body: "You must meet the minimum age requirement for your region: 13 in most countries, 14 in Spain/Italy/Austria, 15 in France, 16 in Germany/Netherlands/Ireland." },
  { title: "13. Third-Party Services", body: "The App uses third-party services (Supabase, Google). The developer is not responsible for the practices of these third parties." },
  { title: "14. Changes to Terms", body: "The developer may update this EULA at any time. Material changes will require you to accept the updated terms." },
  { title: "15. Governing Law", body: "This EULA is governed by the laws of the Federal Republic of Germany." },
  { title: "16. Contact", body: "For questions about this EULA, contact us at info@splitterorbs.com." },
];

export default function EulaScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

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
        {SECTIONS.map((s, i) => (
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
