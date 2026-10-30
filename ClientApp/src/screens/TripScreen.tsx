import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Linking, Alert, ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

import Avatar from '../components/Avatar';
import { announceDriverCancellation, watchRide } from '../components/RideCancellationWatcher';
import MapComponent from '../components/MapComponent';
import MapPin from '../components/MapPin';
import StarRating from '../components/StarRating';
import { socketService } from '../services/socket';
import { apiGet, apiPost } from '../services/api';
import { ensureNotificationPermission, notify } from '../services/notifications';
import { playAlert } from '../services/alerts';
import { SECURE_STORE_KEY } from '../config/constants';
import {
  Coordinates, MeterReading, PublicDriver, RideDetails, RideStatus, RootStackParamList, ridePrice,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Trip'>;

const C = {
  blue:   '#007AFF',
  blueBg: '#EBF5FF',
  bg:     '#F5F6FA',
  text:   '#1A1A1A',
  subtle: '#7F8C8D',
  white:  '#FFFFFF',
  green:  '#34C759',
  red:    '#FF3B30',
  border: '#EAECF0',
};

// Étapes affichées au client, dans l'ordre
const STEPS: { status: RideStatus; label: string; title: string; subtitle: string }[] = [
  { status: 'ACCEPTED',    label: 'Accepté',  title: 'Votre chauffeur arrive',   subtitle: 'Il se dirige vers votre point de départ' },
  { status: 'ARRIVED',     label: 'Arrivé',   title: 'Votre chauffeur est là',   subtitle: 'Rejoignez-le au point de départ' },
  { status: 'IN_PROGRESS', label: 'En route', title: 'Course en cours',          subtitle: 'Bon trajet !' },
  { status: 'COMPLETED',   label: 'Terminé',  title: 'Vous êtes arrivé',         subtitle: 'Merci d\'avoir voyagé avec nous' },
];

const toCoords = (lat: number | string | null, lng: number | string | null): Coordinates | null =>
  lat != null && lng != null ? { latitude: Number(lat), longitude: Number(lng) } : null;

export default function TripScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { rideId } = route.params;
  const mapRef = useRef<MapView>(null);

  const [ride,      setRide]      = useState<RideDetails | null>(null);
  const [status,    setStatus]    = useState<RideStatus>('ACCEPTED');
  const [driverPos, setDriverPos] = useState<Coordinates | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [meter,      setMeter]      = useState<MeterReading | null>(null);

  // Gardé à jour pour l'écran de notation (l'événement « terminé » arrive via socket)
  const rideRef = useRef<RideDetails | null>(null);
  rideRef.current = ride;

  const goToRating = (price: number | string | null) => {
    watchRide(null);
    const current = rideRef.current;
    navigation.replace('Rating', {
      rideId,
      driver: current?.driver ?? null,
      price:  price != null ? Number(price) : current?.price != null ? Number(current.price) : null,
    });
  };

  // ── Chargement + temps réel ────────────────────────────────────────────────

  useEffect(() => {
    // Suivie même si le client revient à l'accueil : annulation vérifiée au retour au premier plan
    watchRide(rideId);
    let cancelled = false;
    const unsubscribers: Array<() => void> = [];
    ensureNotificationPermission();

    (async () => {
      const token = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (cancelled) return;
      socketService.connect(token ?? undefined);

      unsubscribers.push(
        socketService.subscribe('driver:position', (p) => {
          setDriverPos({ latitude: p.latitude, longitude: p.longitude });
        }),
        socketService.subscribe('ride:arrived', (p) => {
          if (p.rideId !== rideId) return;
          setStatus('ARRIVED');
          playAlert('event');
          notify('Votre chauffeur est arrivé 📍', 'Il vous attend au point de départ.');
        }),
        socketService.subscribe('ride:meter', (m) => {
          if (m.rideId === rideId) setMeter(m);
        }),
        socketService.subscribe('ride:started', (p) => {
          if (p.rideId !== rideId) return;
          setStatus('IN_PROGRESS');
          playAlert('event');
          notify('Course démarrée 🚗', 'Vous êtes en route vers votre destination.');
        }),
        socketService.subscribe('ride:completed', (p) => {
          if (p.rideId !== rideId) return;
          setStatus('COMPLETED');
          const amount = p.price != null ? ` Montant : ${Math.round(Number(p.price))} MRU.` : '';
          playAlert('success');
          notify('Course terminée ✅', `Vous êtes arrivé à destination.${amount}`);
          goToRating(p.price);
        }),
        socketService.subscribe('ride:cancelled', (p) => {
          if (p.rideId !== rideId) return;
          // Annulation par le chauffeur : popup global (RideCancellationWatcher)
          if (p.reason !== 'driver_cancelled') navigation.popToTop();
        }),
      );

      // État réel (reprise de l'app, événements manqués)
      try {
        const details = await apiGet<RideDetails>(`/rides/${rideId}`);
        if (cancelled) return;
        setRide(details);
        setStatus(details.status);
        const pos = toCoords(details.driver?.latitude ?? null, details.driver?.longitude ?? null);
        if (pos) setDriverPos((current) => current ?? pos);
        if (details.status === 'COMPLETED') goToRating(details.price);
        if (details.status === 'CANCELLED') {
          if (details.cancelledBy === 'driver') announceDriverCancellation(rideId);
          else navigation.popToTop();
        }
      } catch {
        Alert.alert('Erreur', 'Impossible de charger la course.');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribers.forEach((off) => off());
    };
  }, [rideId]);

  // Cadre la carte sur le chauffeur et le point utile (départ, puis destination)
  const pickup      = ride ? toCoords(ride.startLatitude, ride.startLongitude) : null;
  const destination = ride ? toCoords(ride.endLatitude, ride.endLongitude) : null;
  const target      = status === 'IN_PROGRESS' ? destination ?? pickup : pickup;

  useEffect(() => {
    const points = [driverPos, target].filter(Boolean) as Coordinates[];
    if (points.length === 0 || !mapRef.current) return;
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 80, right: 60, bottom: 60, left: 60 },
      animated: true,
    });
  }, [driverPos?.latitude, driverPos?.longitude, target?.latitude, target?.longitude]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const callDriver = (driver: PublicDriver) => {
    Linking.openURL(`tel:${driver.phone}`).catch(() =>
      Alert.alert('Appel impossible', driver.phone),
    );
  };

  const cancelRide = () => {
    Alert.alert('Annuler la course ?', 'Le chauffeur sera prévenu.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await apiPost(`/rides/${rideId}/cancel`, {});
            navigation.popToTop();
          } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible d\'annuler la course.');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!ride) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.blue} />
      </View>
    );
  }

  const driver    = ride.driver;
  const stepIndex = Math.max(0, STEPS.findIndex((s) => s.status === status));
  const step      = STEPS[stepIndex];
  const canCancel = status === 'ACCEPTED' || status === 'ARRIVED';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Carte en direct ───────────────────────────────────────────── */}
      {/* Même composant que l'accueil (configuration de carte éprouvée) */}
      <View style={styles.map}>
        <MapComponent
          ref={mapRef}
          initialRegion={{
            ...(driverPos ?? pickup ?? { latitude: 18.0858, longitude: -15.9785 }),
            latitudeDelta: 0.02, longitudeDelta: 0.02,
          }}
          showsUserLocation
        >
          {pickup && <MapPin coordinate={pickup} color={C.blue} />}
          {destination && <MapPin coordinate={destination} color={C.red} square />}
          {driverPos && (
            <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.carMarker}><Text style={styles.carMarkerText}>🚕</Text></View>
            </Marker>
          )}
        </MapComponent>
      </View>

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 10 }]}
        onPress={() => navigation.popToTop()}
        activeOpacity={0.8}
      >
        <Text style={styles.backBtnText}>‹</Text>
      </TouchableOpacity>

      {/* ── Panneau bas ───────────────────────────────────────────────── */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepSubtitle}>{step.subtitle}</Text>

        {/* Progression */}
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s.status} style={styles.stepItem}>
              <View style={[styles.stepBar, i <= stepIndex && styles.stepBarDone]} />
              <Text style={[styles.stepLabel, i <= stepIndex && styles.stepLabelDone]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Chauffeur */}
        {driver && (
          <View style={styles.driverCard}>
            <Avatar photoUrl={driver.photoUrl} name={driver.name} size={58} color={C.blue} />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driver.name ?? 'Chauffeur'}</Text>
              <View style={styles.driverMetaRow}>
                <StarRating value={driver.rating} size={13} />
                <Text style={styles.driverMeta}>
                  {driver.rating.toFixed(1)} · {driver.totalRides} course{driver.totalRides > 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={styles.driverPhone}>{driver.phone}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => callDriver(driver)} activeOpacity={0.8}>
              <Text style={styles.callBtnText}>📞</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Véhicule */}
        {driver && (
          <View style={styles.vehicleRow}>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleLabel}>Véhicule</Text>
              <Text style={styles.vehicleValue}>{driver.vehicleModel ?? 'Non renseigné'}</Text>
            </View>
            <View style={styles.plate}>
              <Text style={styles.plateText}>{driver.vehiclePlate ?? '—'}</Text>
            </View>
          </View>
        )}

        {/* Compteur en direct (trajet ouvert) */}
        {ride.isOpenTrip && status === 'IN_PROGRESS' && (
          <View style={styles.meterCard}>
            <View style={styles.meterMain}>
              <Text style={styles.meterLabel}>Compteur</Text>
              <Text style={styles.meterPrice}>{meter ? `${meter.price} MRU` : '…'}</Text>
            </View>
            <View style={styles.meterStats}>
              <Text style={styles.meterStat}>{meter ? meter.distanceKm.toFixed(1) : '0.0'} km</Text>
              <Text style={styles.meterStat}>{meter ? meter.stoppedMinutes : 0} min d’arrêt</Text>
            </View>
          </View>
        )}

        {/* Trajet + prix */}
        <View style={styles.tripRow}>
          <Text style={styles.tripDest} numberOfLines={1}>
            {ride.isOpenTrip ? '⏱ Trajet ouvert' : `📍 ${ride.destinationName}`}
          </Text>
          <Text style={styles.tripPrice}>
            {ridePrice(ride) != null ? `${ridePrice(ride)} MRU` : 'Au compteur'}
          </Text>
        </View>

        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelRide} disabled={cancelling} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>{cancelling ? 'Annulation…' : 'Annuler la course'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  map:       { flex: 1 },

  backBtn: {
    position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  backBtnText: { fontSize: 26, color: C.text, marginTop: -3 },

  carMarker: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.blue,
  },
  carMarkerText: { fontSize: 20 },

  sheet: {
    backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 12,
  },
  stepTitle:    { fontSize: 20, fontWeight: '800', color: C.text },
  stepSubtitle: { fontSize: 13, color: C.subtle, marginTop: -10 },

  steps:         { flexDirection: 'row', gap: 6 },
  stepItem:      { flex: 1, gap: 6 },
  stepBar:       { height: 4, borderRadius: 2, backgroundColor: C.border },
  stepBarDone:   { backgroundColor: C.blue },
  stepLabel:     { fontSize: 11, color: C.subtle, fontWeight: '600' },
  stepLabelDone: { color: C.blue },

  driverCard:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverInfo:    { flex: 1, gap: 3 },
  driverName:    { fontSize: 16, fontWeight: '700', color: C.text },
  driverMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverMeta:    { fontSize: 12, color: C.subtle },
  driverPhone:   { fontSize: 12, color: C.subtle },
  callBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  callBtnText: { fontSize: 20 },

  vehicleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.bg, borderRadius: 14, padding: 12,
  },
  vehicleInfo:  { flex: 1 },
  vehicleLabel: { fontSize: 11, color: C.subtle, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  vehicleValue: { fontSize: 14, color: C.text, fontWeight: '700', marginTop: 2 },
  plate: {
    borderWidth: 2, borderColor: C.text, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.white,
  },
  plateText: { fontSize: 14, fontWeight: '800', color: C.text, letterSpacing: 1 },

  meterCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.blueBg, borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: '#CCE4FF',
  },
  meterMain:  { gap: 2 },
  meterLabel: { fontSize: 11, color: C.blue, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  meterPrice: { fontSize: 26, color: C.blue, fontWeight: '900', fontVariant: ['tabular-nums'] },
  meterStats: { alignItems: 'flex-end', gap: 2 },
  meterStat:  { fontSize: 14, color: C.text, fontWeight: '700', fontVariant: ['tabular-nums'] },

  tripRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tripDest:  { flex: 1, fontSize: 14, color: C.text, fontWeight: '600' },
  tripPrice: { fontSize: 18, color: C.blue, fontWeight: '800' },

  cancelBtn: {
    paddingVertical: 13, borderRadius: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
  },
  cancelBtnText: { fontSize: 14, color: C.red, fontWeight: '700' },
});
