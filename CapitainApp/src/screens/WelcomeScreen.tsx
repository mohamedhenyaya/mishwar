import React, { useEffect, useRef } from 'react';
import {
  Animated, Dimensions, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C, G, SH, RADIUS } from '../theme';
import { RootStackParamList } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_NAMES } from '../i18n/translations';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
const { height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useLanguage();
  const otherLanguage = language === 'fr' ? 'ar' : 'fr';

  const STATS = [
    { icon: 'car-sport'  as const, value: '50K+', label: t('welcomeStatRides') },
    { icon: 'star'       as const, value: '4.9',  label: t('welcomeStatRating') },
    { icon: 'diamond'    as const, value: '24/7', label: t('welcomeStatSupport') },
  ];

  const logoScale   = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textY       = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const float1      = useRef(new Animated.Value(0)).current;
  const float2      = useRef(new Animated.Value(0)).current;
  const pulse       = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1,  tension: 65, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1,  duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(textY,       { toValue: 0,  tension: 70, friction: 10, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1,  duration: 350, useNativeDriver: true }),
        Animated.spring(cardY,       { toValue: 0,  tension: 65, friction: 10, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1,  duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float1, { toValue: -14, duration: 2800, useNativeDriver: true }),
        Animated.timing(float1, { toValue: 0,   duration: 2800, useNativeDriver: true }),
      ]),
    );
    const floatLoop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(float2, { toValue: 10,  duration: 3400, useNativeDriver: true }),
        Animated.timing(float2, { toValue: 0,   duration: 3400, useNativeDriver: true }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1500, useNativeDriver: true }),
      ]),
    );
    const t = setTimeout(() => { floatLoop.start(); floatLoop2.start(); pulseLoop.start(); }, 800);
    return () => { clearTimeout(t); floatLoop.stop(); floatLoop2.stop(); pulseLoop.stop(); };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Hero gradient ──────────────────────────────────────────────────── */}
      <LinearGradient
        colors={G.hero}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        {/* Decorative blobs */}
        <Animated.View style={[styles.blob1, { transform: [{ translateY: float1 }] }]} />
        <Animated.View style={[styles.blob2, { transform: [{ translateY: float2 }] }]} />
        <View style={styles.blob3} />

        {/* Langue : bascule FR ⇄ AR */}
        <TouchableOpacity
          style={[styles.langChip, { top: insets.top + 12 }]}
          onPress={() => setLanguage(otherLanguage)}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={15} color={C.white} />
          <Text style={styles.langChipText}>{LANGUAGE_NAMES[otherLanguage]}</Text>
        </TouchableOpacity>

        {/* Logo block */}
        <Animated.View
          style={[styles.logoBlock, {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }]}
        >
          <Animated.View style={[styles.logoRingOuter, { transform: [{ scale: pulse }] }]}>
            <View style={styles.logoRingInner}>
              <Ionicons name="car-sport" size={36} color={C.white} />
            </View>
          </Animated.View>
          <Text style={styles.appName}>Volta</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{t('welcomeRole')}</Text>
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }] }}>
          <Text style={styles.tagline}>{t('welcomeTagline')}</Text>
        </Animated.View>

        {/* Stats row */}
        <Animated.View style={[styles.statsRow, { opacity: textOpacity }]}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statChip}>
              <Ionicons name={s.icon} size={17} color={C.white} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>
      </LinearGradient>

      {/* ── Bottom card ────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.bottomCard,
          { opacity: cardOpacity, transform: [{ translateY: cardY }], paddingBottom: insets.bottom + 28 },
        ]}
      >
        <View style={styles.cardHandle} />
        <Text style={styles.cardTitle}>{t('welcomeCardTitle')}</Text>
        <Text style={styles.cardSub}>{t('welcomeCardSub')}</Text>

        {/* Primary button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.88}
          style={styles.btnWrap}
        >
          <LinearGradient
            colors={G.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnPrimaryLabel}>{t('welcomeLogin')}</Text>
            <View style={styles.btnArrowWrap}>
              <Text style={styles.btnArrow}>›</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary button */}
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('Auth', { mode: 'register' })}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryLabel}>{t('welcomeRegister')}</Text>
        </TouchableOpacity>

        {/* WhatsApp note */}
        <View style={styles.waBadge}>
          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          <Text style={styles.waText}>
            {t('welcomeWaPrefix')}<Text style={styles.waGreen}>{t('welcomeWaOtp')}</Text>
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  hero: {
    height: height * 0.55,
    overflow: 'hidden',
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 36,
  },

  // Blobs
  blob1: {
    position: 'absolute', top: -50, right: -70,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: C.primary, opacity: 0.2,
  },
  blob2: {
    position: 'absolute', bottom: 10, left: -90,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.accent, opacity: 0.12,
  },
  blob3: {
    position: 'absolute', bottom: -20, right: 30,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: C.primaryLt, opacity: 0.1,
  },

  langChip: {
    position: 'absolute', right: 20, zIndex: 2,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  langChipText: { fontSize: 13, fontWeight: '700', color: C.white },

  // Logo
  logoBlock: { alignItems: 'center', gap: 12, marginTop: 8 },
  logoRingOuter: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoRingInner: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  appName:   { fontSize: 42, fontWeight: '900', color: C.white, letterSpacing: -1 },
  roleBadge: {
    backgroundColor: 'rgba(167,139,250,0.25)',
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)',
  },
  roleText: { fontSize: 11, fontWeight: '800', color: C.primaryLt, letterSpacing: 3 },

  tagline: {
    fontSize: 21, fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center', lineHeight: 31,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  statChip: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: RADIUS.lg, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    gap: 2,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: C.white },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },

  // Bottom card
  bottomCard: {
    flex: 1, backgroundColor: C.surface,
    borderTopLeftRadius: RADIUS.xxl + 4, borderTopRightRadius: RADIUS.xxl + 4,
    paddingHorizontal: 28, paddingTop: 20, gap: 14,
    marginTop: -24,
    ...SH.dark,
  },
  cardHandle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: C.border, marginBottom: 6,
  },
  cardTitle: { fontSize: 26, fontWeight: '800', color: C.text },
  cardSub:   { fontSize: 14, color: C.sub, lineHeight: 22, marginBottom: 4 },

  // Buttons
  btnWrap:   { borderRadius: RADIUS.xl, overflow: 'hidden', ...SH.md },
  btnPrimary: {
    height: 58, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 24, gap: 12,
  },
  btnPrimaryLabel: { color: C.white, fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  btnArrowWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnArrow: { color: C.white, fontSize: 22, fontWeight: '600', marginTop: -1 },

  btnSecondary: {
    height: 58, borderRadius: RADIUS.xl,
    borderWidth: 2, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryLabel: { color: C.primary, fontSize: 16, fontWeight: '700' },

  // WhatsApp
  waBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#F0FFF9',
    borderRadius: RADIUS.pill, padding: 12,
    borderWidth: 1, borderColor: '#C6F6E5',
  },
  waText:  { fontSize: 13, color: C.sub },
  waGreen: { color: '#25D366', fontWeight: '700' },
});
