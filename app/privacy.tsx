import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { useTranslation } from '@/i18n/LanguageContext';

const SECTIONS = [
  { title: "1. Introduction", body: "This Privacy Policy explains how Splitter Orbs (\"we\", \"the app\") collects, uses, and protects your personal data. By using the app, you agree to the practices described here. We process data in accordance with the EU General Data Protection Regulation (GDPR/DSGVO)." },
  { title: "2. Data Controller", body: "The data controller responsible for your personal data is the app developer. For any privacy-related questions, you can reach us at info@splitterorbs.com." },
  { title: "3. Data We Collect", body: "Account & Profile Data: display name, game progress (trophies, wins, losses, league), in-game currency (coins, gems, shards), card collection levels, unlocked skins, settings (language, sound, haptics), login streak data.\n\nSocial Data: friends list, match history, game invitations.\n\nAuthentication Data: If you connect Google, your Google account ID and email are used for authentication only." },
  { title: "4. Legal Basis for Processing", body: "Contract (Art. 6(1)(b) GDPR): Processing your game progress is necessary to provide the game service.\n\nLegitimate Interest (Art. 6(1)(f) GDPR): Security measures to protect account integrity.\n\nConsent (Art. 6(1)(a) GDPR): Connecting your Google account is optional and based on your explicit consent." },
  { title: "5. Data Retention", body: "Your game data is stored for as long as your account is active. If you use the \"Delete Account\" function in Settings, all game progress, match history and social connections are permanently erased." },
  { title: "6. Third-Party Services", body: "Supabase: Our backend infrastructure provider. They host our database and authentication.\n\nGoogle: Used for optional OAuth authentication. Google's privacy policy applies to their services.\n\nWe do not sell your data to third parties. We do not use advertising SDKs." },
  { title: "7. Your Rights", body: "Under GDPR/DSGVO, you have the right to: Access, Rectification, Erasure, Portability, Objection, and Withdraw consent. To exercise these rights, use the \"Delete Account\" button in Settings or contact us at info@splitterorbs.com." },
  { title: "8. Children's Privacy", body: "The minimum age varies by region: 13 in most countries, 14 in Spain/Italy/Austria, 15 in France, 16 in Germany/Netherlands/Ireland. We do not knowingly collect data from children below the applicable age limit." },
  { title: "9. Changes to This Policy", body: "We may update this Privacy Policy from time to time. Any changes will be posted within the app." },
  { title: "10. Imprint", body: "Felix Werner, c/o COCENTER, Koppoldstr. 1, 86551 Aichach. Email: info@splitterorbs.com" },
  { title: "11. Geographic Restriction", body: "This app is available only in: Germany, Netherlands, France, Spain, Italy, United Kingdom, Portugal, Japan, Switzerland, Austria, Poland, Sweden, Ireland, Denmark, Finland, Norway, and Romania." },
];

export default function PrivacyScreen() {
  const router = useRouter();
  const { t } = useTranslation();

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
        {SECTIONS.map((s, i) => (
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
