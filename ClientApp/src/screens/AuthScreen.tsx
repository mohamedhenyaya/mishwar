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
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from '../services/secureStorage';
import { apiPost } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { RootStackParamList } from '../types';
import PhoneInput from '../components/PhoneInput';
import { Button, IconButton, TextField } from '../components/ui';
import { useLanguage } from '../i18n/LanguageContext';
import { colors, radius, spacing, typography, motion } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

type Step = 'phone' | 'otp' | 'password';

interface SendOtpResponse    { message: string; otp?: string }
interface RegisterResponse   { accessToken: string }

function ProgressBar({ step }: { step: Step }) {
  const steps: Step[] = ['phone', 'otp', 'password'];
  const current = steps.indexOf(step) + 1;
  return (
    <View style={prog.wrap}>
      {steps.map((_, i) => (
        <View key={i} style={[prog.segment, i < current && prog.segmentActive]} />
      ))}
    </View>
  );
}

export default function AuthScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [step,     setStep]     = useState<Step>('phone');
  const [phone,    setPhone]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const otpRef      = useRef<TextInput>(null);
  const confirmRef  = useRef<TextInput>(null);

  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  const animateStep = () => {
    fade.setValue(0);
    slide.setValue(16);
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: motion.base, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, ...motion.spring }),
    ]).start();
  };

  React.useEffect(animateStep, [step]);

  // ── Retour ────────────────────────────────────────────────────────────────

  const handleBack = () => {
    if (step === 'otp')      { setStep('phone'); setOtp(''); return; }
    if (step === 'password') { setStep('otp');   setPassword(''); setConfirm(''); return; }
    navigation.goBack();
  };

  // ── Étape 1 : téléphone → envoyer OTP ────────────────────────────────────

  const handleSendOtp = async () => {
    if (phone.trim().length < 9) return;
    setLoading(true);
    try {
      const res = await apiPost<SendOtpResponse, { phone: string; role: string }>(
        '/auth/send-otp',
        { phone: phone.trim(), role: 'user' },
      );
      if (res.otp) Alert.alert(t('authDevModeTitle'), `${t('authDevModeMessagePrefix')}${res.otp}`);
      setStep('otp');
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e: any) {
      Alert.alert(t('commonError'), e?.response?.data?.message ?? t('authSendErrorMessage'));
    } finally {
      setLoading(false);
    }
  };

  // ── Étape 2 : OTP → passer à la création du mot de passe ─────────────────

  const handleOtpNext = () => {
    if (otp.length !== 6) {
      Alert.alert(t('authInvalidCodeTitle'), t('authInvalidCodeMessage'));
      return;
    }
    setStep('password');
  };

  // ── Étape 3 : mot de passe → POST /auth/register/verify ──────────────────

  const handleRegister = async () => {
    if (password.length < 6) {
      Alert.alert(t('authPasswordTooShortTitle'), t('authPasswordTooShortMessage'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('authPasswordDiffTitle'), t('authPasswordDiffMessage'));
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost<RegisterResponse, { phone: string; code: string; password: string }>(
        '/auth/register/verify',
        { phone: phone.trim(), code: otp, password },
      );
      await SecureStore.setItemAsync(SECURE_STORE_KEY, res.accessToken);
      navigation.replace('Main');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? t('authRegisterErrorDefault');
      Alert.alert(t('commonError'), msg);
      if (e?.response?.status === 401) { setStep('otp'); setOtp(''); }
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <IconButton
        name="chevron-back"
        onPress={handleBack}
        style={[styles.backBtn, { top: insets.top + 12 }]}
      />

      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <View style={styles.logoBadge}>
            <Ionicons name="car-sport" size={22} color={colors.textInverse} />
          </View>
          <Text style={styles.appName}>Mishwar</Text>
        </View>

        <ProgressBar step={step} />

        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], gap: spacing.md }}>

          {step === 'phone' && (
            <>
              <Text style={styles.title}>{t('authPhoneTitle')}</Text>
              <Text style={styles.subtitle}>
                {t('authPhoneSubtitlePrefix')}
                <Text style={styles.waText}>WhatsApp</Text>
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t('authPhoneNumberLabel')}</Text>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  onSubmitEditing={handleSendOtp}
                  returnKeyType="done"
                />
              </View>

              <Button
                label={t('authReceiveCode')}
                variant="whatsapp"
                icon="logo-whatsapp"
                onPress={handleSendOtp}
                loading={loading}
                disabled={phone.length < 9}
              />

              <Text style={styles.switchText}>
                {t('authAlreadyAccount')}
                <Text style={styles.switchLink} onPress={() => navigation.replace('Login')}>
                  {t('authLogin')}
                </Text>
              </Text>
            </>
          )}

          {step === 'otp' && (
            <>
              <View style={styles.waBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.whatsappDark} />
                <Text style={styles.waBadgeText}>{t('authCodeSentTo')}{phone}</Text>
              </View>

              <Text style={styles.title}>{t('authVerificationTitle')}</Text>
              <Text style={styles.subtitle}>{t('authVerificationSubtitle')}</Text>

              <TextField
                ref={otpRef}
                label={t('authOtpLabel')}
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleOtpNext}
                style={styles.otpInput}
              />

              <Button label={t('authContinue')} onPress={handleOtpNext} disabled={otp.length < 6} />

              <Text style={styles.switchText} onPress={handleSendOtp}>
                {t('authCodeNotReceived')}<Text style={styles.switchLink}>{t('authResend')}</Text>
              </Text>
            </>
          )}

          {step === 'password' && (
            <>
              <Text style={styles.title}>{t('authCreatePasswordTitle')}</Text>
              <Text style={styles.subtitle}>{t('authCreatePasswordSubtitle')}</Text>

              <TextField
                label={t('authPasswordLabel')}
                icon="lock-closed-outline"
                isPassword
                value={password}
                onChangeText={setPassword}
                placeholder={t('authPasswordPlaceholder')}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />

              <TextField
                ref={confirmRef}
                label={t('authConfirmPasswordLabel')}
                icon="lock-closed-outline"
                isPassword
                value={confirm}
                onChangeText={setConfirm}
                placeholder={t('authConfirmPasswordPlaceholder')}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                error={confirm.length > 0 && confirm !== password ? t('authPasswordMismatch') : undefined}
              />

              <Button
                label={t('authCreateAccountBtn')}
                onPress={handleRegister}
                loading={loading}
                disabled={password.length < 6 || password !== confirm}
              />
            </>
          )}
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const prog = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 6, marginBottom: spacing.xs },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  segmentActive: { backgroundColor: colors.primary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backBtn: { position: 'absolute', left: spacing.lg, zIndex: 10 },
  inner: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: 76, gap: spacing.md },
  logoWrap: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  logoBadge: {
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  appName: { ...typography.bodyLg, fontWeight: '800', color: colors.text },
  title: { ...typography.h1, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: -6 },
  waText: { color: colors.whatsappDark, fontWeight: '700' },
  waBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.whatsappMuted, borderRadius: radius.md, padding: spacing.md,
    borderLeftWidth: 4, borderLeftColor: colors.whatsapp,
  },
  waBadgeText: { ...typography.bodySm, color: colors.whatsappDark, fontWeight: '600', flex: 1 },
  fieldGroup: { gap: 6 },
  label: { ...typography.label, color: colors.textSecondary, marginLeft: 2 },
  otpInput: { textAlign: 'center', fontSize: 22, fontWeight: '700', letterSpacing: 8 },
  switchText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  switchLink: { color: colors.text, fontWeight: '700' },
});
