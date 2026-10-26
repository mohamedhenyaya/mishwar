import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows } from '../../theme';

type Variant = 'surface' | 'muted' | 'dark' | 'transparent';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const DIMENSIONS: Record<Size, number> = { sm: 34, md: 40, lg: 48 };
const ICON_SIZES: Record<Size, number> = { sm: 16, md: 19, lg: 22 };

export default function IconButton({
  name,
  onPress,
  variant = 'surface',
  size = 'md',
  iconColor,
  style,
  disabled,
}: Props) {
  const dim = DIMENSIONS[size];
  const defaultColor = variant === 'dark' ? colors.textInverse : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { width: dim, height: dim, borderRadius: dim / 2 },
        variantStyles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={name} size={ICON_SIZES[size]} color={iconColor ?? defaultColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
});

const variantStyles: Record<Variant, ViewStyle> = StyleSheet.create({
  surface: { backgroundColor: colors.surface, ...shadows.sm },
  muted: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  dark: { backgroundColor: colors.primary },
  transparent: { backgroundColor: 'transparent' },
});
