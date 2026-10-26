import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import IconButton from './IconButton';
import { colors, spacing, typography } from '../../theme';

interface Props {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  bordered?: boolean;
  transparent?: boolean;
}

export default function ScreenHeader({ title, onBack, right, bordered, transparent }: Props) {
  return (
    <View
      style={[
        styles.row,
        bordered && styles.bordered,
        { backgroundColor: transparent ? 'transparent' : colors.bg },
      ]}
    >
      {onBack ? (
        <IconButton name="chevron-back" onPress={onBack} size="md" />
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bordered: { borderBottomWidth: 1, borderBottomColor: colors.border },
  spacer: { width: 40 },
  title: { ...typography.h3, color: colors.text, flex: 1, textAlign: 'center' },
});
