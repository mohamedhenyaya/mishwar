import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView,
  Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { apiPost } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { RootStackParamList } from '../types';
import PhoneInput from '../components/PhoneInput';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;
type Step  = 'phone' | 'otp' | 'password';

interface SendOtpResponse  { message: string; otp?: string }
interface RegisterResponse { accessToken: string }

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { key: 'phone',    label: 'Téléphone', icon: '📱' },
  { key: 'otp',     label: 'Code OTP',   icon: '💬' },
  { key: 'password',label: 'Mot de passe',icon: '🔐' },
] as const;

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <View style={sb.row}>
      {STEPS.map((s, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={s.key}>
            <View style={sb.item}>
              <View style={[sb.dot, done && sb.dotDone, active && sb.dotActive]}>
                <Text style={[sb.dotLabel, (done || active) && sb.dotLabelActive]}>
                  {done ? '✓' : `${i + 1}`}
                </Text>
              </View>
              <Text style={[sb.stepLabel, active && sb.stepLabelActive]}>{s.label}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[sb.line, done && sb.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const sb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 8, marginBottom: 4 },
  item: { alignItems: 'center', gap: 4, width: 68 },
  dot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.border,
  },
  dotActive: { backgroundColor: C.primary, borderColor: C.primary },
  dotDone:   { backgroundColor: C.accent,  borderColor: C.accent  },
  dotLabel:  { fontSize: 13, fontWeight: '700', color: C.muted },
  dotLabelActive: { color: C.white },
  stepLabel: { fontSize: 10, fontWeight: '600', color: C.muted, textAlign: 'center' },
  stepLabelActive: { color: C.primary },
  line: { flex: 1, height: 2, backgroundColor: C.border, marginTop: 15, marginHorizontal: 4 },
  lineDone: { backgroundColor: C.accent },
});

// ─── OTP Boxes ────────────────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<TextInputInstance>(null);
  const boxes = 6;

  return (
    <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
      <View style={otp.row}>
        {Array.from({ length: boxes }).map((_, i) => {
          const ch     = value[i] ?? '';
          const active = value.length === i && value.length < boxes;
          return (
            <View key={i} style={[otp.box, ch && otp.boxFilled, active && otp.boxActive]}>
              <Text style={otp.char}>{ch || (active ? '|' : '')}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={otp.hidden}
        autoFocus
      />
    </TouchableOpacity>
  );
}

const otp = StyleSheet.create({
  row:    { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  box: {
    width: 48, height: 58, borderRadius: RADIUS.md,
    backgroundColor: C.bg, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  boxFilled: { backgroundColor: '#FAF8FF', borderColor: C.primaryLt },
  boxActive: { borderColor: C.primary, backgroundColor: '#FAF8FF' },
  char:      { fontSize: 22, fontWeight: '800', color: C.text },
  hidden:    { position: 'absolute', opacity: 0, height: 0 },
});

// ─── Password Strength ────────────────────────────────────────────────────────

function StrengthBar({ pwd }: { pwd: string }) {
  const score = pwd.length === 0 ? 0
    : pwd.length < 6  ? 1
    : pwd.length < 10 ? 2
    : /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) ? 4 : 3;

  const labels = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const colors = ['', C.danger, C.warning, C.accent, C.accentDk];

  if (pwd.length === 0) return null;

  return (
    <View style={str.wrap}>
      <View style={str.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[str.bar, { backgroundColor: i <= score ? colors[score] : C.border }]}
          />
        ))}
      </View>
      <Text style={[str.label, { color: colors[score] }]}>{labels[score]}</Text>
    </View>
  );
}

const str = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  bars:  { flex: 1, flexDirection: 'row', gap: 4 },
  bar:   { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: 12, fontWeight: '700', width: 60, textAlign: 'right' },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function AuthScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [step,     setStep]     = useState<Step>('phone');
  const [phone,    setPhone]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const confirmRef = useRef<TextInputInstance>(null);
  const slideAnim  = useRef(new Animated.Value(0)).current;
  const mountAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(mountAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }).start();
  }, []);

  const animateStep = (fn: () => void) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
    ]).start();
    fn();
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
  };

  const handleBack = () => {
    if (step === 'otp')      { animateStep(() => { setStep('phone'); setOtp(''); }); return; }
    if (step === 'password') { animateStep(() => { setStep('otp');  setPassword(''); setConfirm(''); }); return; }
    navigation.goBack();
  };

  const handleSendOtp = async () => {
    if (phone.trim().length < 9) return;
    setLoading(true);
    try {
      const res = await apiPost<SendOtpResponse, { phone: string; role: string }>(
        '/auth/send-otp', { phone: phone.trim(), role: 'driver' },
      );
      if (res.otp) Alert.alert('DEV', `OTP: ${res.otp}`);
      animateStep(() => setStep('otp'));
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? "Impossible d'envoyer le code.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpNext = () => {
    if (otp.length !== 6) return;
    animateStep(() => setStep('password'));
  };

  const handleRegister = async () => {
    if (password.length < 6 || password !== confirm) return;
    setLoading(true);
    try {
      const res = await apiPost<RegisterResponse, { phone: string; code: string; password: string }>(
        '/auth/register/verify', { phone: phone.trim(), code: otp, password },
      );
      await SecureStore.setItemAsync(SECURE_STORE_KEY, res.accessToken);
      navigation.replace('Home');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Erreur lors de la création du compte.';
      Alert.alert('Erreur', msg);
      if (e?.response?.status === 401) { setStep('otp'); setOtp(''); }
    } finally {
      setLoading(false);
    }
  };

  const pwdMatch = confirm.length > 0 && password !== confirm;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingBottom: insets.bottom + 20 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient colors={G.dark} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer un compte</Text>
        <Text style={styles.headerSub}>Rejoignez Volta en 3 étapes rapides</Text>
        <View style={styles.stepBarWrap}>
          <StepBar current={step} />
        </View>
      </LinearGradient>

      {/* Content card */}
      <Animated.View
        style={[styles.card, {
          opacity: mountAnim,
          transform: [{ translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }]}
      >
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>

          {/* ── Step 1: Phone ── */}
          {step === 'phone' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Votre numéro</Text>
              <Text style={styles.stepSub}>
                Un code de vérification sera envoyé sur{' '}
                <Text style={styles.waHighlight}>WhatsApp</Text>
              </Text>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />
              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={loading || phone.length < 9}
                activeOpacity={0.88}
                style={[styles.btnWrap, phone.length < 9 && styles.btnDisabled]}
              >
                <LinearGradient
                  colors={['#25D366', '#1DA851']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btn}
                >
                  {loading
                    ? <ActivityIndicator color={C.white} />
                    : <>
                        <Text style={styles.waIcon}>💬</Text>
                        <Text style={styles.btnLabel}>Recevoir le code WhatsApp</Text>
                      </>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.switchLink}>
                <Text style={styles.switchText}>
                  Déjà un compte ?{'  '}<Text style={styles.switchCta}>Se connecter →</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <View style={styles.stepContent}>
              <View style={styles.waBanner}>
                <Text style={styles.waBannerIcon}>✅</Text>
                <Text style={styles.waBannerText}>Code envoyé sur WhatsApp au {phone}</Text>
              </View>
              <Text style={styles.stepTitle}>Code de vérification</Text>
              <Text style={styles.stepSub}>Entrez les 6 chiffres reçus sur WhatsApp</Text>
              <OtpInput value={otp} onChange={setOtp} />
              <TouchableOpacity
                onPress={handleOtpNext}
                disabled={otp.length < 6}
                activeOpacity={0.88}
                style={[styles.btnWrap, otp.length < 6 && styles.btnDisabled]}
              >
                <LinearGradient
                  colors={otp.length === 6 ? G.primary : [C.muted, C.muted]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btn}
                >
                  <Text style={styles.btnLabel}>Continuer</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendOtp} disabled={loading} style={styles.switchLink}>
                <Text style={styles.switchText}>
                  Code non reçu ?{'  '}<Text style={styles.switchCta}>Renvoyer →</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 3: Password ── */}
          {step === 'password' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Sécurisez votre compte</Text>
              <Text style={styles.stepSub}>Choisissez un mot de passe robuste pour protéger vos données.</Text>

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>🔐  Mot de passe</Text>
                <View style={styles.pwdRow}>
                  <TextInput
                    style={styles.pwdInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Minimum 6 caractères"
                    placeholderTextColor={C.muted}
                    secureTextEntry={!showPwd}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                  <TouchableOpacity onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                <StrengthBar pwd={password} />
              </View>

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>🔁  Confirmer</Text>
                <View style={[styles.pwdRow, pwdMatch && styles.pwdRowError]}>
                  <TextInput
                    ref={confirmRef}
                    style={styles.pwdInput}
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Répétez le mot de passe"
                    placeholderTextColor={C.muted}
                    secureTextEntry={!showPwd}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                </View>
                {pwdMatch && <Text style={styles.pwdError}>Les mots de passe ne correspondent pas</Text>}
              </View>

              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading || password.length < 6 || password !== confirm}
                activeOpacity={0.88}
                style={[styles.btnWrap, (password.length < 6 || password !== confirm) && styles.btnDisabled]}
              >
                <LinearGradient
                  colors={G.primary}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btn}
                >
                  {loading
                    ? <ActivityIndicator color={C.white} />
                    : <Text style={styles.btnLabel}>Créer mon compte ✓</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 24, paddingBottom: 32,
    borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  backIcon:    { fontSize: 24, color: C.white, fontWeight: '300' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 4 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 20 },
  stepBarWrap: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.lg, padding: 12 },

  card: {
    flex: 1, backgroundColor: C.surface,
    marginHorizontal: 16, marginTop: -20,
    borderRadius: RADIUS.xxl, padding: 28,
    ...SH.md,
  },
  stepContent: { gap: 18 },

  stepTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  stepSub:   { fontSize: 14, color: C.sub, lineHeight: 21, marginBottom: 4 },

  waHighlight: { color: '#25D366', fontWeight: '700' },
  waBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FFF9', borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: '#C6F6E5',
  },
  waBannerIcon: { fontSize: 16 },
  waBannerText: { flex: 1, fontSize: 13, color: '#1A6B45', fontWeight: '600' },

  btnWrap:    { borderRadius: RADIUS.xl, overflow: 'hidden', ...SH.md },
  btnDisabled:{ opacity: 0.45 },
  btn:        { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  waIcon:     { fontSize: 18 },
  btnLabel:   { color: C.white, fontSize: 16, fontWeight: '800' },

  switchLink: { alignItems: 'center' },
  switchText: { fontSize: 14, color: C.sub },
  switchCta:  { color: C.primary, fontWeight: '800' },

  // Password step
  pwdField:   { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.sub },
  pwdRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: C.border,
  },
  pwdRowError: { borderColor: C.danger },
  pwdInput: {
    flex: 1, height: 54, paddingHorizontal: 18,
    fontSize: 16, color: C.text,
  },
  eyeBtn:    { padding: 14 },
  eyeIcon:   { fontSize: 18 },
  pwdError:  { fontSize: 12, color: C.danger, fontWeight: '600', marginLeft: 4 },
});
