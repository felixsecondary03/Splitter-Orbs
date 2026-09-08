import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { useTranslation } from '@/i18n/LanguageContext';

export default function ImpressumScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const heading = t('impressum.heading');
  const name = t('impressum.name');
  const careOf = t('impressum.careOf');
  const street = t('impressum.street');
  const city = t('impressum.city');
  const emailLabel = t('impressum.emailLabel');
  const backLabel = t('impressum.back');
  const titleLabel = t('impressum.title');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { console.log('[Impressum] Back pressed'); router.back(); }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>{backLabel}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{titleLabel}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.line}>{careOf}</Text>
        <Text style={styles.line}>{street}</Text>
        <Text style={styles.lineSpaced}>{city}</Text>
        <Text style={styles.email}>{emailLabel}</Text>
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
  heading: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 16 },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  line: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 2 },
  lineSpaced: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  email: { fontSize: 14, color: COLORS.primary },
});
