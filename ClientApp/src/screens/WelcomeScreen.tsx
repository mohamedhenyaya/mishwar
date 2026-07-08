import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { Button } from '../components/ui';
import { useLanguage } from '../i18n/LanguageContext';
import { colors, radius, spacing, typography, motion } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const { height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: motion.slow, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, ...motion.spring }),
    ]).start();
  }, [fade, slide]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.topSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={[styles.logoWrap, { marginTop: insets.top + 48 }]}>
          <View style={styles.logoCircle}>
            <Ionicons name="car-sport" size={34} color={colors.textInverse} />
          </View>
          <Text style={styles.appName}>Mishwar</Text>
          <Text style={styles.tagline}>{t('welcomeTagline')}</Text>
        </View>

        <View style={styles.illustrationWrap}>
          <Ionicons name="map" size={72} color="rgba(255,255,255,0.18)" />
        </View>
      </View>

      <Animated.View
        style={[
          styles.bottomSection,
          { paddingBottom: insets.bottom + 32, opacity: fade, transform: [{ translateY: slide }] },
        ]}
      >
        <Text style={styles.welcomeTitle}>{t('welcomeTitle')}</Text>
        <Text style={styles.welcomeSubtitle}>{t('welcomeSubtitle')}</Text>

        <View style={{ gap: spacing.md }}>
          <Button
            label={t('welcomeCreateAccount')}
            onPress={() => navigation.navigate('Auth', { mode: 'register' })}
          />
          <Button
            label={t('welcomeHaveAccount')}
            variant="outline"
            onPress={() => navigation.navigate('Login')}
          />
        </View>

        <View style={styles.waNote}>
          <Ionicons name="logo-whatsapp" size={15} color={colors.whatsapp} style={{ marginTop: 1 }} />
          <Text style={styles.waNoteText}>
            {t('welcomeOtpNotePrefix')}<Text style={styles.waNoteGreen}>WhatsApp OTP</Text>{t('welcomeOtpNoteSuffix')}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  topSection: {
    height: height * 0.5,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.accent,
    opacity: 0.12,
    top: -90,
    right: -90,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.whatsapp,
    opacity: 0.08,
    bottom: -20,
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
  appName: {
    ...typography.display,
    color: colors.textInverse,
  },
  tagline: {
    ...typography.body,
    color: colors.textInverseMuted,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomSection: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  welcomeTitle: {
    ...typography.h1,
    color: colors.text,
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -8,
  },
  waNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  waNoteText: {
    flex: 1,
    ...typography.caption,
    color: colors.textTertiary,
    lineHeight: 18,
  },
  waNoteGreen: {
    color: colors.whatsappDark,
    fontWeight: '700',
  },
});
