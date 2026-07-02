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
import * as SecureStore from 'expo-secure-store';
import { apiPost } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { RootStackParamList } from '../types';
import PhoneInput from '../components/PhoneInput';
import { Button, IconButton, TextField } from '../components/ui';
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
      if (res.otp) Alert.alert('Mode DEV', `Code OTP : ${res.otp}`);
      setStep('otp');
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? "Impossible d'envoyer le code.");
    } finally {
      setLoading(false);
    }
  };

  // ── Étape 2 : OTP → passer à la création du mot de passe ─────────────────

  const handleOtpNext = () => {
    if (otp.length !== 6) {
      Alert.alert('Code invalide', 'Le code doit contenir 6 chiffres.');
      return;
    }
    setStep('password');
  };

  // ── Étape 3 : mot de passe → POST /auth/register/verify ──────────────────

  const handleRegister = async () => {
    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Minimum 6 caractères.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mots de passe différents', 'Les deux mots de passe doivent correspondre.');
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
      const msg = e?.response?.data?.message ?? 'Erreur lors de la création du compte.';
      Alert.alert('Erreur', msg);
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
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>
                Entrez votre numéro — vous recevrez un code via{' '}
                <Text style={styles.waText}>WhatsApp</Text>
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Numéro de téléphone</Text>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  onSubmitEditing={handleSendOtp}
                  returnKeyType="done"
                />
              </View>

              <Button
                label="Recevoir le code WhatsApp"
                variant="whatsapp"
                icon="logo-whatsapp"
                onPress={handleSendOtp}
                loading={loading}
                disabled={phone.length < 9}
              />

              <Text style={styles.switchText}>
                Déjà un compte ?{' '}
                <Text style={styles.switchLink} onPress={() => navigation.replace('Login')}>
                  Se connecter
                </Text>
              </Text>
            </>
          )}

          {step === 'otp' && (
            <>
              <View style={styles.waBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.whatsappDark} />
                <Text style={styles.waBadgeText}>Code envoyé sur WhatsApp au {phone}</Text>
              </View>

              <Text style={styles.title}>Vérification</Text>
              <Text style={styles.subtitle}>Entrez le code à 6 chiffres reçu sur WhatsApp</Text>

              <TextField
                ref={otpRef}
                label="Code OTP"
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleOtpNext}
                style={styles.otpInput}
              />

              <Button label="Continuer" onPress={handleOtpNext} disabled={otp.length < 6} />

              <Text style={styles.switchText} onPress={handleSendOtp}>
                Code non reçu ? <Text style={styles.switchLink}>Renvoyer</Text>
              </Text>
            </>
          )}

          {step === 'password' && (
            <>
              <Text style={styles.title}>Créer un mot de passe</Text>
              <Text style={styles.subtitle}>Choisissez un mot de passe pour sécuriser votre compte</Text>

              <TextField
                label="Mot de passe"
                icon="lock-closed-outline"
                isPassword
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 6 caractères"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />

              <TextField
                ref={confirmRef}
                label="Confirmer le mot de passe"
                icon="lock-closed-outline"
                isPassword
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Répétez le mot de passe"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                error={confirm.length > 0 && confirm !== password ? 'Les mots de passe ne correspondent pas' : undefined}
              />

              <Button
                label="Créer mon compte"
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
