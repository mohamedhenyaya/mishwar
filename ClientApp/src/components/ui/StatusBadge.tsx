import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface Props {
  label: string;
  tone?: 'success' | 'neutral' | 'accent' | 'danger';
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<NonNullable<Props['tone']>, { bg: string; fg: string; dot: string }> = {
  success: { bg: colors.successMuted, fg: colors.success, dot: colors.success },
  neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary, dot: colors.textTertiary },
  accent: { bg: colors.accentMuted, fg: colors.accent, dot: colors.accent },
  danger: { bg: colors.dangerMuted, fg: colors.danger, dot: colors.danger },
};

export default function StatusBadge({ label, tone = 'neutral', dot = true, style }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface }, shadows.sm, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: t.dot }]} />}
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm - 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { ...typography.caption, fontWeight: '700' },
});
