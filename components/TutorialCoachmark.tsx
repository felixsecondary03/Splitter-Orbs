import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';

interface TutorialCoachmarkProps {
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
  onSkip?: () => void;
  progress?: { label: string; pct: number };
  skippable?: boolean;
  position?: 'top' | 'bottom' | 'center';
}

export function TutorialCoachmark({
  title,
  body,
  cta,
  onCta,
  onSkip,
  progress,
  skippable = true,
  position = 'bottom',
}: TutorialCoachmarkProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const justifyContent =
    position === 'top' ? 'flex-start' :
    position === 'center' ? 'center' :
    'flex-end';

  const progressBarWidth = `${Math.round((progress?.pct ?? 0) * 100)}%` as `${number}%`;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents="box-none">
      <View style={[styles.positionWrapper, { justifyContent }]} pointerEvents="box-none">
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {progress && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>{progress.label}</Text>
                <Text style={styles.progressPct}>{Math.round(progress.pct * 100)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressBarWidth }]} />
              </View>
            </View>
          )}

          <View style={styles.actions}>
            {skippable && onSkip && (
              <Pressable onPress={() => {
                console.log('[Tutorial] Skip pressed');
                onSkip();
              }} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            )}
            {cta && onCta && (
              <Pressable onPress={() => {
                console.log('[Tutorial] CTA pressed', { cta });
                onCta();
              }} style={styles.ctaBtn}>
                <Text style={styles.ctaText}>{cta}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.6)',
    zIndex: 200,
  },
  positionWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  card: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  progressSection: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  ctaBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
