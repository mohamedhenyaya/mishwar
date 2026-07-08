import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from '../services/secureStorage';
import { Ionicons } from '@expo/vector-icons';
import { apiPost } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { RootStackParamList } from '../types';
import PhoneInput from '../components/PhoneInput';
import { Button, IconButton, TextField } from '../components/ui';
import { useLanguage } from '../i18n/LanguageContext';
import { colors, spacing, typography, motion } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

interface LoginResponse { accessToken: string }

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: motion.base, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, ...motion.spring }),
    ]).start();
  }, [fade, slide]);

  const canSubmit = phone.trim().length >= 9 && password.length >= 6;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await apiPost<LoginResponse, { phone: string; password: string }>(
        '/auth/login',
        { phone: phone.trim(), password },
      );
      await SecureStore.setItemAsync(SECURE_STORE_KEY, res.accessToken);
      navigation.replace('Main');
    } catch (e: any) {
      if (!e?.response) {
        Alert.alert(t('commonError'), t('commonNetworkError'));
      } else {
        Alert.alert(
          t('loginFailedTitle'),
          e.response.data?.message ?? t('loginFailedMessage'),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <IconButton
        name="chevron-back"
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { top: insets.top + 12 }]}
      />

      <Animated.View style={[styles.inner, { opacity: fade, transform: [{ translateY: slide }] }]}>

        <View style={styles.logoWrap}>
          <View style={styles.logoBadge}>
            <Ionicons name="car-sport" size={26} color={colors.textInverse} />
          </View>
          <Text style={styles.appName}>Mishwar</Text>
        </View>

        <Text style={styles.title}>{t('loginTitle')}</Text>
        <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('loginPhoneLabel')}</Text>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        </View>

        <TextField
          ref={passwordRef}
          label={t('loginPasswordLabel')}
          icon="lock-closed-outline"
          isPassword
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <Text style={styles.forgotText}>{t('loginForgotPassword')}</Text>

        <Button
          label={t('loginSubmit')}
          onPress={handleLogin}
          loading={loading}
          disabled={!canSubmit}
          style={{ marginTop: spacing.xs }}
        />

        <Text style={styles.switchText}>
          {t('loginNoAccount')}
          <Text style={styles.switchLink} onPress={() => navigation.replace('Auth', { mode: 'register' })}>
            {t('loginCreateAccount')}
          </Text>
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backBtn: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 10,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: 80,
    gap: spacing.md,
  },
  logoWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  logoBadge: {
    width: 52, height: 52, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { ...typography.h3, color: colors.text },
  title: { ...typography.h1, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: -8 },
  fieldGroup: { gap: 6 },
  label: { ...typography.label, color: colors.textSecondary, marginLeft: 2 },
  forgotText: {
    ...typography.label,
    color: colors.accent,
    alignSelf: 'flex-end',
    marginTop: -6,
  },
  switchText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  switchLink: { color: colors.text, fontWeight: '700' },
});
