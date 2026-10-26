import React, { useEffect, useRef, useState } from 'react';
import {
<<<<<<< HEAD
  StyleSheet, View, Text, TouchableOpacity, Animated, Easing, Alert,
=======
  StyleSheet, View, Text, TouchableOpacity,
  Animated, Easing, Modal,
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
<<<<<<< HEAD
import * as SecureStore from 'expo-secure-store';
import { socketService } from '../services/socket';
import { apiGet, apiPost } from '../services/api';
import { ensureNotificationPermission, notify } from '../services/notifications';
import { playAlert } from '../services/alerts';
import { SECURE_STORE_KEY } from '../config/constants';
import { RideDetails, RootStackParamList, Tariff } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Match'>;
type MatchStatus = 'searching' | 'cancelled';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  blue:    '#007AFF',
  bg:      '#F5F6FA',
  text:    '#1A1A1A',
  subtle:  '#7F8C8D',
  white:   '#FFFFFF',
  red:     '#FF3B30',
  blueBg:  '#EBF5FF',
  border:  '#EAECF0',
};
=======
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
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba

const CANCEL_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  rider_cancelled:     { title: 'Course annulée',             subtitle: 'Vous avez annulé cette demande.' },
  driver_cancelled:    { title: 'Course annulée',             subtitle: 'Le chauffeur a annulé la course. Faites une nouvelle demande.' },
  timeout:             { title: 'Aucun chauffeur disponible', subtitle: 'Aucun chauffeur n\'a accepté à temps. Réessayez dans un instant.' },
  no_driver_available: { title: 'Aucun chauffeur disponible', subtitle: 'Les chauffeurs proches sont occupés. Réessayez dans un instant.' },
};

const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

// ── Radar pulsant sur le point de départ ──────────────────────────────────────
function Radar() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const rings = [ring1, ring2, ring3];

  useEffect(() => {
    const master = Animated.parallel(rings.map((ring, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 700),
        Animated.timing(ring, { toValue: 1, duration: 2100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])),
    ));
    master.start();
    return () => master.stop();
  }, []);

  return (
    <View style={radar.container} pointerEvents="none">
      {rings.map((ring, i) => (
        <Animated.View
          key={i}
          style={[radar.ring, {
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 3] }) }],
            opacity:   ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.35, 0] }),
          }]}
        />
      ))}
<<<<<<< HEAD
      <View style={radar.dot} />
=======
      <View style={pulse.dot}>
        <Ionicons name="car-sport" size={13} color={colors.textInverse} />
      </View>
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    </View>
  );
}

// ── Barre de progression indéterminée ─────────────────────────────────────────
function SearchProgress() {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(x, {
      toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
<<<<<<< HEAD
    <View style={styles.progressTrack}>
      <Animated.View
        style={[styles.progressBar, {
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-120, 360] }) }],
        }]}
      />
=======
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={13}
          color={i <= Math.round(rating) ? colors.star : colors.textTertiary}
        />
      ))}
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MatchScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
<<<<<<< HEAD
  const { rideId, price } = route.params;

  const [status,       setStatus]       = useState<MatchStatus>('searching');
  const [cancelReason, setCancelReason] = useState<string>('timeout');
  const [ride,         setRide]         = useState<RideDetails | null>(null);
  const [tariff,       setTariff]       = useState<Tariff | null>(null);
  const [elapsed,      setElapsed]      = useState(0);
  const [cancelling,   setCancelling]   = useState(false);
=======
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
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba

  // Chronomètre de recherche
  useEffect(() => {
<<<<<<< HEAD
    if (status !== 'searching') return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);
=======
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
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba

  // ── Socket temps réel ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const unsubscribers: Array<() => void> = [];
    ensureNotificationPermission();

    const openTrip = () => navigation.replace('Trip', { rideId });

    (async () => {
      const token = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (cancelled) return;
      socketService.connect(token ?? undefined);

      unsubscribers.push(
        socketService.subscribe('ride:accepted', (payload) => {
          if (payload.rideId !== rideId) return;
          const name = payload.driver.name ?? 'Votre chauffeur';
          playAlert('event');
          notify('Chauffeur trouvé 🚕', `${name} arrive dans environ ${payload.eta} min.`);
          openTrip();
        }),
        socketService.subscribe('ride:cancelled', (payload) => {
          if (payload.rideId !== rideId) return;
          setCancelReason(payload.reason ?? 'timeout');
          setStatus('cancelled');
          if (payload.reason !== 'rider_cancelled') playAlert('cancel');
        }),
      );

<<<<<<< HEAD
      // État réel de la course (événement manqué pendant la connexion)
      apiGet<RideDetails>(`/rides/${rideId}`)
        .then((details) => {
          if (cancelled) return;
          setRide(details);
          if (details.status === 'CANCELLED') setStatus('cancelled');
          else if (details.status !== 'PENDING') openTrip();
        })
        .catch(() => {});
      apiGet<Tariff>('/rides/tariff').then(setTariff).catch(() => {});
=======
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
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    })();

    return () => {
      cancelled = true;
<<<<<<< HEAD
      unsubscribers.forEach((off) => off());
=======
      socketService.offRideAccepted();
      socketService.offRideStarted();
      socketService.offRideMeter();
      socketService.offRideCompleted();
      socketService.offRideCancelled();
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    };
  }, [rideId]);

  // ── Actions ────────────────────────────────────────────────────────────────

<<<<<<< HEAD
  const cancelSearch = async () => {
    setCancelling(true);
=======
  const confirmCancel = async (reason: string) => {
    setShowCancelModal(false);
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    try {
      await apiPost(`/rides/${rideId}/cancel`, { reason });
    } catch {
      // best-effort — la course a peut-être déjà été acceptée/annulée/expirée
    }
    navigation.popToTop();
  };

<<<<<<< HEAD
  const confirmCancel = () =>
    Alert.alert('Annuler la recherche ?', 'Votre demande ne sera plus envoyée aux chauffeurs.', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Annuler', style: 'destructive', onPress: cancelSearch },
    ]);

  const retry = () => {
    navigation.replace('Booking', {
      startLatitude:  ride ? Number(ride.startLatitude) : undefined,
      startLongitude: ride ? Number(ride.startLongitude) : undefined,
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isOpenTrip = ride?.isOpenTrip ?? false;
  const fixedPrice = price ?? (ride?.price != null ? Number(ride.price) : null);
  const cancelMsg  = CANCEL_MESSAGES[cancelReason] ?? CANCEL_MESSAGES.timeout;
=======
  const handleClosePress = () => {
    if (status === 'searching') { setShowCancelModal(true); return; }
    if (status === 'completed') { navigation.popToTop(); return; }
    navigation.goBack();
  };

  // ─────────────────────────────────────────────────────────────────────────
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

<<<<<<< HEAD
      {/* ── Radar (pas de carte native ici : une seconde MapView montée par-dessus
           celle de l'accueil est soupçonnée de fermer l'app sur iOS) ─────────── */}
      <View style={styles.radarWrap}>
        <View style={[styles.radarCircle, styles.radarCircleLg]} />
        <View style={[styles.radarCircle, styles.radarCircleMd]} />
        <View style={[styles.radarCircle, styles.radarCircleSm]} />
        {status === 'searching' ? <Radar /> : <View style={radar.dot} />}
        <View style={[styles.positionChip, { top: '50%' }]}>
          <Text style={styles.positionChipText}>📍 Votre position</Text>
        </View>

        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 10 }]}
          onPress={status === 'searching' ? confirmCancel : () => navigation.popToTop()}
          activeOpacity={0.8}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Panneau ───────────────────────────────────────────────────── */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {status === 'searching' ? (
          <>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Recherche d'un chauffeur</Text>
              <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
            </View>
            <SearchProgress />
            <Text style={styles.subtitle}>Votre demande est envoyée aux chauffeurs à proximité</Text>
          </>
        ) : (
          <View style={styles.cancelHeader}>
            <View style={styles.cancelIcon}><Text style={styles.cancelIconText}>!</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{cancelMsg.title}</Text>
              <Text style={styles.subtitleLeft}>{cancelMsg.subtitle}</Text>
            </View>
          </View>
        )}

        {/* Trajet */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.originDot} />
            <Text style={styles.routeText} numberOfLines={1}>Ma position</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={styles.destDot} />
            <Text style={styles.routeText} numberOfLines={1}>
              {isOpenTrip ? 'Trajet ouvert · destination libre' : ride?.destinationName ?? '…'}
            </Text>
          </View>
        </View>

        {/* Prix */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>{isOpenTrip ? 'Prix au compteur' : 'Prix de la course'}</Text>
            {isOpenTrip && tariff && (
              <Text style={styles.priceHint}>
                {tariff.baseFare} + {tariff.perKm}/km + {tariff.perMinute}/min
              </Text>
            )}
          </View>
          <Text style={styles.priceValue}>
            {isOpenTrip ? 'Temps réel' : fixedPrice != null ? `${fixedPrice} MRU` : 'À l\'arrivée'}
          </Text>
        </View>

        {/* Actions */}
        {status === 'searching' ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={confirmCancel} disabled={cancelling} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>{cancelling ? 'Annulation…' : 'Annuler la demande'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.88}>
              <Text style={styles.retryBtnText}>Nouvelle demande</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeLink} onPress={() => navigation.popToTop()}>
              <Text style={styles.homeLinkText}>Retour à l'accueil</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
=======
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
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

<<<<<<< HEAD
const radar = StyleSheet.create({
=======
const pulse = StyleSheet.create({
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center',
<<<<<<< HEAD
  },
  ring: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: C.blue,
  },
  dot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.blue,
    borderWidth: 4, borderColor: C.white,
    shadowColor: C.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
=======
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
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  },
});

const styles = StyleSheet.create({
<<<<<<< HEAD
  container: { flex: 1, backgroundColor: C.bg },

  radarWrap: { flex: 1, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  radarCircle: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: '#D3E6FF' },
  radarCircleLg: { width: 420, height: 420 },
  radarCircleMd: { width: 280, height: 280 },
  radarCircleSm: { width: 140, height: 140 },
  positionChip: {
    position: 'absolute', marginTop: 26, backgroundColor: C.white,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  positionChipText: { fontSize: 12, fontWeight: '700', color: C.text },
  closeBtn: {
    position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  closeBtnText: { fontSize: 15, color: C.text, fontWeight: '700' },

  sheet: {
    backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 22, gap: 16, marginTop: -24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:    { fontSize: 20, fontWeight: '800', color: C.text },
  elapsed:  { fontSize: 15, fontWeight: '700', color: C.subtle, fontVariant: ['tabular-nums'] },
  subtitle: { fontSize: 13, color: C.subtle, marginTop: -6 },
  subtitleLeft: { fontSize: 13, color: C.subtle, marginTop: 2 },

  progressTrack: { height: 4, borderRadius: 2, backgroundColor: C.blueBg, overflow: 'hidden' },
  progressBar:   { width: 120, height: 4, borderRadius: 2, backgroundColor: C.blue },

  cancelHeader:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cancelIcon:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF1F0', alignItems: 'center', justifyContent: 'center' },
  cancelIconText: { fontSize: 20, fontWeight: '900', color: C.red },

  routeCard: { backgroundColor: C.bg, borderRadius: 16, padding: 14 },
  routeRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  routeLine: { width: 2, height: 14, backgroundColor: C.border, marginLeft: 5, marginVertical: 4 },
  originDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.blue, borderWidth: 2.5, borderColor: '#CCE4FF' },
  destDot:   { width: 12, height: 12, borderRadius: 3, backgroundColor: C.text },

  priceRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { fontSize: 13, fontWeight: '600', color: C.subtle },
  priceHint:  { fontSize: 12, color: C.subtle, marginTop: 2 },
  priceValue: { fontSize: 22, fontWeight: '800', color: C.text },

  cancelBtn: {
    height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.border,
  },
  cancelBtnText: { fontSize: 15, color: C.red, fontWeight: '700' },

  actions:      { gap: 4 },
  retryBtn:     { height: 54, borderRadius: 16, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  retryBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },
  homeLink:     { alignItems: 'center', paddingVertical: 10 },
  homeLinkText: { fontSize: 14, color: C.subtle, fontWeight: '600' },
=======
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
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
});
