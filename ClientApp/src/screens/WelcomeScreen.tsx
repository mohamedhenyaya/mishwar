import React from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const { height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Fond avec dégradé simulé */}
      <View style={styles.topSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        {/* Logo */}
        <View style={[styles.logoWrap, { marginTop: insets.top + 48 }]}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🚗</Text>
          </View>
          <Text style={styles.appName}>Mishwar</Text>
          <Text style={styles.tagline}>Votre trajet, votre prix</Text>
        </View>

        {/* Illustration */}
        <Text style={styles.illustration}>🗺️</Text>
      </View>

      {/* Section bas */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.welcomeTitle}>Bienvenue !</Text>
        <Text style={styles.welcomeSubtitle}>
          Réservez un trajet ou connectez-vous à votre compte existant.
        </Text>

        {/* Bouton Créer un compte */}
        <TouchableOpacity
          style={styles.btnPrimary}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Auth', { mode: 'register' })}
        >
          <Text style={styles.btnPrimaryLabel}>Créer un compte</Text>
        </TouchableOpacity>

        {/* Bouton Se connecter */}
        <TouchableOpacity
          style={styles.btnSecondary}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.btnSecondaryLabel}>J'ai déjà un compte</Text>
        </TouchableOpacity>

        {/* Mention WhatsApp */}
        <View style={styles.waNote}>
          <Text style={styles.waNoteIcon}>💬</Text>
          <Text style={styles.waNoteText}>
            Inscription via{' '}
            <Text style={styles.waNoteGreen}>WhatsApp OTP</Text>
            {' '}· Connexion par mot de passe.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },

  // ── Section haute ──────────────────────────────────────────────────────────
  topSection: {
    height: height * 0.52,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 24,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#25D366',
    opacity: 0.08,
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#4F8EF7',
    opacity: 0.1,
    bottom: 0,
    left: -60,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '400',
  },
  illustration: {
    fontSize: 80,
    opacity: 0.85,
  },

  // ── Section basse ──────────────────────────────────────────────────────────
  bottomSection: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
    gap: 14,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#888',
    lineHeight: 21,
    marginBottom: 6,
  },
  btnPrimary: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  btnPrimaryLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  btnSecondaryLabel: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '600',
  },
  waNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  waNoteIcon: {
    fontSize: 14,
    marginTop: Platform.OS === 'ios' ? 1 : 2,
  },
  waNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#AAA',
    lineHeight: 18,
  },
  waNoteGreen: {
    color: '#25D366',
    fontWeight: '600',
  },
});