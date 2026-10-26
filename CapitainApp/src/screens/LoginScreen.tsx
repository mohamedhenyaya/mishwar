import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView,
  Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { apiPost } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { RootStackParamList } from '../types';
import PhoneInput from '../components/PhoneInput';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
interface LoginResponse { accessToken: string }

// ─── Input row avec focus animé ───────────────────────────────────────────────

function Field({
  icon, label, children,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; children: React.ReactNode }) {
  return (
    <View style={field.wrap}>
      <View style={field.labelRow}>
        <Ionicons name={icon} size={14} color={C.sub} />
        <Text style={field.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const field = StyleSheet.create({
  wrap:  { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: C.sub },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [pwdFocus, setPwdFocus] = useState(false);

  const passwordRef = useRef<TextInputInstance>(null);
  const mountAnim   = useRef(new Animated.Value(0)).current;
  const canSubmit   = phone.trim().length >= 9 && password.length >= 6;

  useEffect(() => {
    Animated.spring(mountAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }).start();
  }, []);

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await apiPost<LoginResponse, { phone: string; password: string; role: string }>(
        '/auth/login',
        { phone: phone.trim(), password, role: 'driver' },
      );
      await SecureStore.setItemAsync(SECURE_STORE_KEY, res.accessToken);
      navigation.replace('Main');
    } catch (e: any) {
      Alert.alert('Connexion échouée', e?.response?.data?.message ?? 'Numéro ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const slideUp = mountAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingBottom: insets.bottom + 20 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Header gradient strip ── */}
      <LinearGradient colors={G.dark} style={[styles.headerStrip, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={C.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerEmojiWrap}>
            <Ionicons name="car-sport" size={26} color={C.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Volta Capitaine</Text>
            <Text style={styles.headerSub}>Espace chauffeur professionnel</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Form card ── */}
      <Animated.View style={[styles.formCard, { opacity: mountAnim, transform: [{ translateY: slideUp }] }]}>
        <Text style={styles.formSub}>Connectez-vous pour accéder à vos courses.</Text>

        <View style={styles.fields}>
          <Field icon="call-outline" label="Numéro de téléphone">
            <PhoneInput
              value={phone}
              onChange={setPhone}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </Field>

          <Field icon="lock-closed-outline" label="Mot de passe">
            <View style={[styles.pwdContainer, pwdFocus && styles.pwdFocused]}>
              <TextInput
                ref={passwordRef}
                style={styles.pwdInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={C.muted}
                secureTextEntry={!showPwd}
                returnKeyType="done"
                onFocus={() => setPwdFocus(true)}
                onBlur={() => setPwdFocus(false)}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPwd((v) => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.sub} />
              </TouchableOpacity>
            </View>
          </Field>

          <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading || !canSubmit}
          activeOpacity={0.88}
          style={[styles.btnWrap, !canSubmit && styles.btnDisabled]}
        >
          <LinearGradient
            colors={canSubmit ? G.primary : [C.muted, C.muted]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.btnLabel}>Se connecter</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>ou</Text>
          <View style={styles.divLine} />
        </View>

        {/* Register link */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.replace('Auth', { mode: 'register' })}
          activeOpacity={0.7}
        >
          <Text style={styles.registerText}>
            Pas encore inscrit ?{'  '}
            <Text style={styles.registerCta}>Créer un compte →</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header strip
  headerStrip: {
    paddingHorizontal: 20, paddingBottom: 28,
    borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerEmojiWrap: {
    width: 48, height: 48, borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.white },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Form card
  formCard: {
    flex: 1, backgroundColor: C.surface, marginHorizontal: 16,
    marginTop: -20, borderRadius: RADIUS.xxl,
    padding: 28, gap: 0,
    ...SH.md,
  },
  formTitle: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 6 },
  formSub:   { fontSize: 14, color: C.sub, marginBottom: 28, lineHeight: 21 },

  fields: { gap: 20, marginBottom: 24 },

  // Password field
  pwdContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: C.border,
    paddingRight: 4,
  },
  pwdFocused: { borderColor: C.primary, backgroundColor: '#FAF8FF' },
  pwdInput: {
    flex: 1, height: 54, paddingHorizontal: 18,
    fontSize: 16, color: C.text,
  },
  eyeBtn:  { padding: 10 },

  forgotRow: { alignSelf: 'flex-end' },
  forgotText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  // CTA
  btnWrap: { borderRadius: RADIUS.xl, overflow: 'hidden', ...SH.md },
  btnDisabled: { opacity: 0.5 },
  btn: { height: 58, alignItems: 'center', justifyContent: 'center' },
  btnLabel: { color: C.white, fontSize: 16, fontWeight: '800' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divText: { fontSize: 13, color: C.muted, fontWeight: '600' },

  registerLink: { alignItems: 'center', paddingVertical: 4 },
  registerText: { fontSize: 14, color: C.sub },
  registerCta:  { color: C.primary, fontWeight: '800' },
});
