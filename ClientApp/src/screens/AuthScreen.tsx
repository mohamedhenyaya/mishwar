import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { apiPost } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { RootStackParamList } from '../types';
import PhoneInput from '../components/PhoneInput';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

type Step = 'phone' | 'otp' | 'password';

interface SendOtpResponse    { message: string; otp?: string }
interface RegisterResponse   { accessToken: string }

const WA_GREEN = '#25D366';
const WA_DARK  = '#075E54';
const WA_LIGHT = '#DCF8C6';

// Barre de progression
function ProgressBar({ step }: { step: Step }) {
  const steps: Step[] = ['phone', 'otp', 'password'];
  const current = steps.indexOf(step) + 1;
  return (
    <View style={prog.wrap}>
      {steps.map((_, i) => (
        <View
          key={i}
          style={[prog.segment, i < current && prog.segmentActive]}
        />
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
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const otpRef      = useRef<TextInputInstance>(null);
  const confirmRef  = useRef<TextInputInstance>(null);

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
  // La vraie vérification se fait à l'étape 3 avec le mot de passe.

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
      navigation.replace('Home');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Erreur lors de la création du compte.';
      Alert.alert('Erreur', msg);
      // Si l'OTP est invalide/expiré, revenir à l'étape OTP
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
      {/* Retour */}
      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 12 }]} onPress={handleBack}>
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <View style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>🚗</Text>
          <Text style={styles.appName}>Mishwar</Text>
        </View>

        {/* Barre de progression */}
        <ProgressBar step={step} />

        {/* ── Étape 1 : téléphone ─────────────────────────────────────────── */}
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

            <TouchableOpacity
              style={[styles.btn, styles.waBtn, phone.length < 9 && styles.btnDisabled]}
              onPress={handleSendOtp}
              disabled={loading || phone.length < 9}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.btnLabel}>Recevoir le code WhatsApp</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchWrap} onPress={() => navigation.replace('Login')}>
              <Text style={styles.switchText}>
                Déjà un compte ?{' '}
                <Text style={styles.switchLink}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Étape 2 : OTP ───────────────────────────────────────────────── */}
        {step === 'otp' && (
          <>
            <View style={styles.waBadge}>
              <Text style={styles.waBadgeText}>✅ Code envoyé sur WhatsApp au {phone}</Text>
            </View>

            <Text style={styles.title}>Vérification</Text>
            <Text style={styles.subtitle}>Entrez le code à 6 chiffres reçu sur WhatsApp</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Code OTP</Text>
              <TextInput
                ref={otpRef}
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                placeholderTextColor="#BBB"
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleOtpNext}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, otp.length < 6 && styles.btnDisabled]}
              onPress={handleOtpNext}
              disabled={otp.length < 6}
              activeOpacity={0.85}
            >
              <Text style={styles.btnLabel}>Continuer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchWrap} onPress={handleSendOtp} disabled={loading}>
              <Text style={styles.switchText}>
                Code non reçu ?{' '}
                <Text style={styles.switchLink}>Renvoyer</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Étape 3 : mot de passe ──────────────────────────────────────── */}
        {step === 'password' && (
          <>
            <Text style={styles.title}>Créer un mot de passe</Text>
            <Text style={styles.subtitle}>
              Choisissez un mot de passe pour sécuriser votre compte
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.pwdWrap}>
                <TextInput
                  style={[styles.input, styles.pwdInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 6 caractères"
                  placeholderTextColor="#BBB"
                  secureTextEntry={!showPwd}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd((v) => !v)}>
                  <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <TextInput
                ref={confirmRef}
                style={[
                  styles.input,
                  confirm.length > 0 && confirm !== password && styles.inputError,
                ]}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Répétez le mot de passe"
                placeholderTextColor="#BBB"
                secureTextEntry={!showPwd}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              {confirm.length > 0 && confirm !== password && (
                <Text style={styles.errorHint}>Les mots de passe ne correspondent pas</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.btn, (password.length < 6 || password !== confirm) && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading || password.length < 6 || password !== confirm}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.btnLabel}>Créer mon compte</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const prog = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E8',
  },
  segmentActive: {
    backgroundColor: '#1A1A2E',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  backIcon: {
    fontSize: 26,
    color: '#1A1A2E',
    fontWeight: '300',
    marginTop: Platform.OS === 'ios' ? -2 : 0,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 76,
    gap: 14,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  logoEmoji: { fontSize: 40 },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
    marginTop: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  waText: {
    color: WA_GREEN,
    fontWeight: '700',
  },
  waBadge: {
    backgroundColor: WA_LIGHT,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: WA_GREEN,
  },
  waBadgeText: {
    fontSize: 13,
    color: WA_DARK,
    fontWeight: '600',
  },
  fieldGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#1A1A2E',
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
  },
  pwdWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  pwdInput: { paddingRight: 52 },
  eyeBtn: { position: 'absolute', right: 16 },
  eyeIcon: { fontSize: 18 },
  errorHint: {
    fontSize: 12,
    color: '#FF3B30',
    marginLeft: 4,
    marginTop: 2,
  },
  btn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  waBtn: { backgroundColor: WA_GREEN },
  btnDisabled: { opacity: 0.4 },
  btnLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchWrap: { alignItems: 'center', marginTop: 2 },
  switchText: { fontSize: 14, color: '#888' },
  switchLink: { color: '#1A1A2E', fontWeight: '700' },
});