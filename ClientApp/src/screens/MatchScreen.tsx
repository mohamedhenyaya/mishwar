import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  Animated, Easing, Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from '../services/secureStorage';
import { socketService, RideAcceptedDriver, RideMeterPayload } from '../services/socket';
import { apiPost } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { RootStackParamList } from '../types';
import { Button, IconButton, ScreenHeader } from '../components/ui';
import { useLanguage } from '../i18n/LanguageContext';
import { StringTranslationKey } from '../i18n/translations';
import { colors, radius, shadows, spacing, typography, motion } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Match'>;
type MatchStatus = 'searching' | 'found' | 'cancelled' | 'completed';

const CANCEL_REASON_KEYS: StringTranslationKey[] = [
  'matchCancelReason1',
  'matchCancelReason2',
  'matchCancelReason3',
  'matchCancelReason4',
  'matchCancelReason5',
];

// ── Composant rings pulsants ───────────────────────────────────────────────────
function PulseRings() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const rings = [ring1, ring2, ring3];

  useEffect(() => {
    const DURATION = 2200;
    const STAGGER  = 700;

    const animations = rings.map((ring, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * STAGGER),
          Animated.timing(ring, {
            toValue: 1,
            duration: DURATION,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    );

    const master = Animated.parallel(animations);
    master.start();
    return () => master.stop();
  }, []);

  return (
    <View style={pulse.container}>
      {rings.map((ring, i) => (
        <Animated.View
          key={i}
          style={[
            pulse.ring,
            {
              transform: [{
                scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }),
              }],
              opacity: ring.interpolate({
                inputRange: [0, 0.25, 1],
                outputRange: [0, 0.45, 0],
              }),
            },
          ]}
        />
      ))}
      <View style={pulse.dot}>
        <Ionicons name="car-sport" size={13} color={colors.textInverse} />
      </View>
    </View>
  );
}

// ── Étoiles rating ────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={13}
          color={i <= Math.round(rating) ? colors.star : colors.textTertiary}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MatchScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { rideId, isOpenTrip = false, estimatedPrice } = route.params;

  const [status, setStatus] = useState<MatchStatus>('searching');
  const [eta,    setEta]    = useState(0);
  const [driver, setDriver] = useState<RideAcceptedDriver | null>(null);
  const [tripStarted, setTripStarted] = useState(false);
  const [meter,  setMeter]  = useState<RideMeterPayload | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fadeIn    = useRef(new Animated.Value(0)).current;
  const slideUp   = useRef(new Animated.Value(40)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const showDriverCard = () => {
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }),
      Animated.timing(cardFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  // ── Socket temps réel ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (cancelled) return;

      socketService.connect(token ?? undefined);

      socketService.onRideAccepted((payload) => {
        if (payload.rideId !== rideId) return;
        setDriver(payload.driver);
        setEta(payload.eta);
        setStatus('found');
        showDriverCard();
      });

      socketService.onRideStarted(({ rideId: startedId }) => {
        if (startedId === rideId) setTripStarted(true);
      });

      socketService.onRideMeter((payload) => {
        if (payload.rideId === rideId) setMeter(payload);
      });

      socketService.onRideCompleted(({ rideId: completedId, price }) => {
        if (completedId !== rideId) return;
        setFinalPrice(price);
        setStatus('completed');
      });

      socketService.onRideCancelled(({ rideId: cancelledId }) => {
        if (cancelledId === rideId) setStatus('cancelled');
      });
    })();

    return () => {
      cancelled = true;
      socketService.offRideAccepted();
      socketService.offRideStarted();
      socketService.offRideMeter();
      socketService.offRideCompleted();
      socketService.offRideCancelled();
    };
  }, [rideId]);

  // ── Annulation côté serveur (libère la course) ────────────────────────────

  const confirmCancel = async (reason: string) => {
    setShowCancelModal(false);
    try {
      await apiPost(`/rides/${rideId}/cancel`, { reason });
    } catch {
      // best-effort — la course a peut-être déjà été acceptée/annulée/expirée
    }
    navigation.goBack();
  };

  const handleClosePress = () => {
    if (status === 'searching') { setShowCancelModal(true); return; }
    if (status === 'completed') { navigation.popToTop(); return; }
    navigation.goBack();
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />

      <ScreenHeader
        bordered
        title={
          status === 'searching' ? t('matchHeaderSearching') :
          status === 'completed' ? t('matchHeaderCompleted') :
          status === 'found'     ? (tripStarted ? t('matchHeaderInProgress') : t('matchHeaderFound')) : t('matchHeaderCancelled')
        }
        right={<IconButton name="close" size="sm" variant="muted" onPress={handleClosePress} />}
      />

      <Animated.View
        style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}
      >
        {/* ── Searching ─────────────────────────────────────────────── */}
        {status === 'searching' && (
          <View style={styles.searchingSection}>
            <PulseRings />

            <Text style={styles.searchingTitle}>{t('matchSearchingTitle')}</Text>
            <Text style={styles.searchingSubtitle}>{t('matchSearchingSubtitle')}</Text>

            <View style={styles.searchingInfo}>
              {([t('matchInfoLowestPrice'), t('matchInfoTopRated'), t('matchInfoClosest')]).map((item) => (
                <View key={item} style={styles.infoRow}>
                  <View style={styles.infoCheck}>
                    <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                  </View>
                  <Text style={styles.infoText}>{item}</Text>
                </View>
              ))}
            </View>

            <Button
              label={t('matchCancelSearch')}
              variant="outline"
              size="md"
              fullWidth={false}
              onPress={() => setShowCancelModal(true)}
            />
          </View>
        )}

        {/* ── Found ─────────────────────────────────────────────────── */}
        {status === 'found' && (
          <View style={styles.foundSection}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={30} color={colors.textInverse} />
            </View>
            <Text style={styles.foundTitle}>{tripStarted ? t('matchHeaderInProgress') : t('matchFoundTitle')}</Text>

            {!tripStarted ? (
              <View style={styles.etaCard}>
                <Text style={styles.etaLabel}>{t('matchEtaLabel')}</Text>
                <View style={styles.etaRow}>
                  <Text style={styles.etaNumber}>{eta}</Text>
                  <Text style={styles.etaUnit}> min</Text>
                </View>
              </View>
            ) : (
              <View style={styles.priceCard}>
                {isOpenTrip ? (
                  <>
                    <Text style={styles.priceDistance}>{(meter?.distanceKm ?? 0).toFixed(2)} km</Text>
                    <Text style={styles.priceAmount}>{meter?.price ?? estimatedPrice ?? 0} MRU</Text>
                  </>
                ) : (
                  <Text style={styles.priceAmount}>{estimatedPrice ?? 0} MRU</Text>
                )}
              </View>
            )}

            <Animated.View
              style={[
                styles.driverCard,
                { opacity: cardFade, transform: [{ scale: cardScale }] },
              ]}
            >
              <View style={styles.driverAvatarWrap}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>{(driver?.name?.[0] ?? '?').toUpperCase()}</Text>
                </View>
                <View style={styles.driverOnline} />
              </View>

              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driver?.name ?? t('matchDriverFallback')}</Text>
                <Stars rating={driver?.rating ?? 5} />
                <Text style={styles.driverMeta}>
                  {driver?.vehicleModel ?? t('matchVehicleFallback')} · {driver?.vehiclePlate ?? '—'}
                </Text>
              </View>

              <View style={styles.driverActions}>
                <IconButton name="call-outline" size="md" variant="muted" onPress={() => {}} />
                <IconButton name="chatbubble-outline" size="md" variant="muted" onPress={() => {}} />
              </View>
            </Animated.View>

            <Text style={styles.rideId}>{t('matchRideIdPrefix')}{rideId.slice(0, 8).toUpperCase()}</Text>

            {tripStarted && (
              <Text style={styles.waitingHint}>{t('matchWaitingHint')}</Text>
            )}
          </View>
        )}

        {/* ── Completed ─────────────────────────────────────────────── */}
        {status === 'completed' && (
          <View style={styles.foundSection}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={30} color={colors.textInverse} />
            </View>
            <Text style={styles.foundTitle}>{t('matchHeaderCompleted')}</Text>

            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>{t('matchPriceFinalLabel')}</Text>
              <Text style={styles.priceAmount}>{finalPrice ?? 0} MRU</Text>
            </View>

            <Button label={t('matchBackHome')} onPress={() => navigation.popToTop()} />
          </View>
        )}

        {/* ── Cancelled ─────────────────────────────────────────────── */}
        {status === 'cancelled' && (
          <View style={styles.cancelledSection}>
            <View style={styles.cancelledCircle}>
              <Ionicons name="close" size={28} color={colors.textInverse} />
            </View>
            <Text style={styles.cancelledTitle}>{t('matchCancelledTitle')}</Text>
            <Text style={styles.cancelledSubtitle}>{t('matchCancelledSubtitle')}</Text>

            <Button label={t('matchRetry')} onPress={() => navigation.goBack()} />

            <TouchableOpacity style={styles.homeLink} onPress={() => navigation.popToTop()}>
              <Text style={styles.homeLinkText}>{t('matchBackHome')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* ── Raison d'annulation ───────────────────────────────────────── */}
      <Modal
        visible={showCancelModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowCancelModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalIconWrap}>
              <Ionicons name="alert-circle" size={28} color={colors.warning} />
            </View>
            <Text style={styles.modalTitle}>{t('matchCancelReasonTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('matchCancelReasonSubtitle')}</Text>

            {CANCEL_REASON_KEYS.map((key) => {
              const reason = t(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.reasonRow}
                  onPress={() => confirmCancel(reason)}
                  activeOpacity={0.7}
                >
                  <View style={styles.reasonDot} />
                  <Text style={styles.reasonText}>{reason}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}

            <Button
              label={t('matchBack')}
              variant="secondary"
              onPress={() => setShowCancelModal(false)}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const pulse = StyleSheet.create({
  container: {
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  ring: {
    position: 'absolute',
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: colors.accent,
  },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.md, shadowColor: colors.accent,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },

  // Searching
  searchingSection: { alignItems: 'center', gap: spacing.xl, width: '100%' },
  searchingTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  searchingSubtitle: {
    ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: -8,
  },
  searchingInfo: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    alignSelf: 'stretch', gap: spacing.md, ...shadows.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  infoText: { ...typography.bodySm, fontWeight: '500', color: colors.text },

  // Found
  foundSection: { alignItems: 'center', gap: spacing.lg, width: '100%' },
  successCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center',
    ...shadows.lg, shadowColor: colors.success,
  },
  foundTitle: { ...typography.display, fontSize: 24, color: colors.text },

  etaCard: {
    backgroundColor: colors.accentMuted, borderRadius: radius.lg,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xxxl,
    alignItems: 'center', alignSelf: 'stretch',
    borderWidth: 1.5, borderColor: colors.accentMuted,
  },
  etaLabel: { ...typography.overline, color: colors.accent },
  etaRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  etaNumber: { fontSize: 52, fontWeight: '800', color: colors.accent, lineHeight: 60 },
  etaUnit: { fontSize: 20, fontWeight: '600', color: colors.accent, marginBottom: 8 },

  priceCard: {
    backgroundColor: colors.accentMuted, borderRadius: radius.lg,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xxxl,
    alignItems: 'center', alignSelf: 'stretch',
    borderWidth: 1.5, borderColor: colors.accentMuted,
  },
  priceLabel: { ...typography.overline, color: colors.accent },
  priceDistance: { ...typography.bodySm, color: colors.accent, fontWeight: '600' },
  priceAmount: { fontSize: 40, fontWeight: '800', color: colors.accent, marginTop: 4 },
  waitingHint: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center' },

  driverCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, alignSelf: 'stretch',
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    ...shadows.md,
  },
  driverAvatarWrap: { position: 'relative' },
  driverAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  driverAvatarText: { color: colors.textInverse, fontSize: 22, fontWeight: '800' },
  driverOnline: {
    position: 'absolute', bottom: 2, right: 2,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface,
  },
  driverInfo: { flex: 1, gap: 4 },
  driverName: { ...typography.h3, fontSize: 15, color: colors.text },
  driverMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  driverActions: { flexDirection: 'row', gap: spacing.sm },

  rideId: { ...typography.caption, color: colors.textTertiary, marginTop: -4 },

  // Cancelled
  cancelledSection: { alignItems: 'center', gap: spacing.lg, width: '100%' },
  cancelledCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    ...shadows.lg, shadowColor: colors.danger,
  },
  cancelledTitle: { ...typography.display, fontSize: 24, color: colors.text },
  cancelledSubtitle: {
    ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: -4,
  },
  homeLink: { marginTop: spacing.xs },
  homeLinkText: { ...typography.bodySm, color: colors.textSecondary, fontWeight: '500' },

  // Cancel reason modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xxl, paddingTop: spacing.md,
    alignItems: 'center',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.lg },
  modalIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.warningMuted, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h3, color: colors.text, textAlign: 'center' },
  modalSubtitle: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: spacing.lg },

  reasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    alignSelf: 'stretch', paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  reasonDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warning },
  reasonText: { flex: 1, ...typography.bodySm, fontWeight: '600', color: colors.text },
});
