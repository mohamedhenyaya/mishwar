import React, { useState, useRef } from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

interface LoginResponse { accessToken: string }

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const passwordRef = useRef<TextInputInstance>(null);

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
      navigation.replace('Home');
    } catch (e: any) {
      Alert.alert(
        'Connexion échouée',
        e?.response?.data?.message ?? 'Numéro ou mot de passe incorrect.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Bouton retour */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <View style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>🚗</Text>
          <Text style={styles.appName}>Mishwar</Text>
        </View>

        <Text style={styles.title}>Bon retour !</Text>
        <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>

        {/* Téléphone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Téléphone</Text>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        </View>

        {/* Mot de passe */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.pwdWrap}>
            <TextInput
              ref={passwordRef}
              style={[styles.input, styles.pwdInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#BBB"
              secureTextEntry={!showPwd}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPwd((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mot de passe oublié */}
        <TouchableOpacity style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        {/* Bouton connexion */}
        <TouchableOpacity
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading || !canSubmit}
          activeOpacity={0.88}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.btnLabel}>Se connecter</Text>}
        </TouchableOpacity>

        {/* Lien inscription */}
        <TouchableOpacity
          style={styles.switchWrap}
          onPress={() => navigation.replace('Auth', { mode: 'register' })}
        >
          <Text style={styles.switchText}>
            Pas encore de compte ?{' '}
            <Text style={styles.switchLink}>Créer un compte</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

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
    paddingTop: 80,
    gap: 14,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoEmoji: { fontSize: 44 },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
    marginTop: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 6,
  },
  fieldGroup: {
    gap: 6,
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  pwdWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  pwdInput: {
    paddingRight: 52,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
  },
  eyeIcon: {
    fontSize: 18,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: '#1A1A2E',
    fontWeight: '600',
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
  btnDisabled: {
    opacity: 0.4,
  },
  btnLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  switchText: {
    fontSize: 14,
    color: '#888',
  },
  switchLink: {
    color: '#1A1A2E',
    fontWeight: '700',
  },
});