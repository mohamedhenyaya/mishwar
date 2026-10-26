import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Animated, Easing, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
      <View style={radar.dot} />
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
    <View style={styles.progressTrack}>
      <Animated.View
        style={[styles.progressBar, {
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-120, 360] }) }],
        }]}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MatchScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { rideId, price } = route.params;

  const [status,       setStatus]       = useState<MatchStatus>('searching');
  const [cancelReason, setCancelReason] = useState<string>('timeout');
  const [ride,         setRide]         = useState<RideDetails | null>(null);
  const [tariff,       setTariff]       = useState<Tariff | null>(null);
  const [elapsed,      setElapsed]      = useState(0);
  const [cancelling,   setCancelling]   = useState(false);

  // Chronomètre de recherche
  useEffect(() => {
    if (status !== 'searching') return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

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
    })();

    return () => {
      cancelled = true;
      unsubscribers.forEach((off) => off());
    };
  }, [rideId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const cancelSearch = async () => {
    setCancelling(true);
    try {
      await apiPost(`/rides/${rideId}/cancel`, {});
    } catch {
      // best-effort — la course a peut-être déjà été acceptée/annulée/expirée
    }
    navigation.popToTop();
  };

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

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

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
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const radar = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: C.blue,
  },
  dot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.blue,
    borderWidth: 4, borderColor: C.white,
    shadowColor: C.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
});

const styles = StyleSheet.create({
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
});
