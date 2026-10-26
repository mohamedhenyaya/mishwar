import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, typography, motion } from '../../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'whatsapp';
type Size = 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
}: Props) {
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: motion.pressScale, useNativeDriver: true, ...motion.springSnappy }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...motion.springSnappy }).start();

  const iconColor = variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textInverse;
  const showLeftIcon = icon && iconPosition === 'left' && !loading;
  const showRightIcon = icon && iconPosition === 'right' && !loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        !fullWidth && styles.autoWidth,
        isDisabled && styles.disabled,
        { transform: [{ scale }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <>
          {showLeftIcon && <Ionicons name={icon} size={size === 'lg' ? 19 : 17} color={iconColor} />}
          <Text
            style={[
              styles.label,
              size === 'md' && styles.labelSm,
              variantTextStyles[variant],
              textStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {showRightIcon && <Ionicons name={icon} size={size === 'lg' ? 19 : 17} color={iconColor} />}
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    paddingHorizontal: 22,
  },
  autoWidth: { alignSelf: 'flex-start' },
  disabled: { opacity: 0.4 },
  label: typography.button,
  labelSm: typography.buttonSm,
});

const sizeStyles: Record<Size, ViewStyle> = StyleSheet.create({
  md: { height: 46 },
  lg: { height: 56 },
});

const variantStyles: Record<Variant, ViewStyle> = StyleSheet.create({
  primary: { backgroundColor: colors.primary, ...shadows.md, shadowColor: colors.primary },
  secondary: { backgroundColor: colors.primaryMuted },
  outline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger, ...shadows.sm },
  whatsapp: { backgroundColor: colors.whatsapp, ...shadows.md, shadowColor: colors.whatsappDark },
});

const variantTextStyles: Record<Variant, TextStyle> = StyleSheet.create({
  primary: { color: colors.textInverse },
  secondary: { color: colors.primary },
  outline: { color: colors.primary },
  ghost: { color: colors.primary },
  danger: { color: colors.textInverse },
  whatsapp: { color: colors.textInverse },
});
