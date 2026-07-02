import React, { forwardRef, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography, motion } from '../../theme';

interface Props extends Omit<TextInputProps, 'placeholderTextColor'> {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

const TextField = forwardRef<TextInput, Props>(
  ({ label, error, icon, isPassword, style, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    const [secure, setSecure] = useState(!!isPassword);
    const borderAnim = useRef(new Animated.Value(0)).current;

    const handleFocus: TextInputProps['onFocus'] = (e) => {
      setFocused(true);
      Animated.timing(borderAnim, { toValue: 1, duration: motion.fast, useNativeDriver: false }).start();
      onFocus?.(e);
    };
    const handleBlur: TextInputProps['onBlur'] = (e) => {
      setFocused(false);
      Animated.timing(borderAnim, { toValue: 0, duration: motion.fast, useNativeDriver: false }).start();
      onBlur?.(e);
    };

    const borderColor = error
      ? colors.danger
      : borderAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.accent] });

    return (
      <View style={styles.group}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Animated.View style={[styles.wrap, { borderColor }, focused && shadows.sm]}>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={focused ? colors.accent : colors.textTertiary}
              style={styles.leftIcon}
            />
          )}
          <TextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={colors.placeholder}
            secureTextEntry={secure}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...rest}
          />
          {isPassword && (
            <Pressable
              onPress={() => setSecure((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.rightIcon}
            >
              <Ionicons name={secure ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textTertiary} />
            </Pressable>
          )}
        </Animated.View>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
);

TextField.displayName = 'TextField';
export default TextField;

const styles = StyleSheet.create({
  group: { gap: 6 },
  label: { ...typography.label, color: colors.textSecondary, marginLeft: 2 },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  leftIcon: { marginRight: spacing.sm },
  rightIcon: { marginLeft: spacing.sm },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 14,
  },
  error: { ...typography.caption, color: colors.danger, marginLeft: 2 },
});
