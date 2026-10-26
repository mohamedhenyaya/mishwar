import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
<<<<<<< HEAD
  Animated, Dimensions, ScrollView, Alert, ActivityIndicator, Linking, AppState,
=======
  Animated, Dimensions,
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

<<<<<<< HEAD
import { captainSocketService, MeterReading, RideRequestPayload } from '../services/socket';
import { apiGet, apiPatch, apiPost } from '../services/api';
import { ensureNotificationPermission, notify } from '../services/notifications';
import { playAlert, startRinging, stopRinging } from '../services/alerts';
import Avatar from '../components/Avatar';
import CancellationModal, { CancellationNotice } from '../components/CancellationModal';
import { openDirections } from '../services/directions';
import MapPin from '../components/MapPin';
import StarRating from '../components/StarRating';
import { SECURE_STORE_KEY, APP_VERSION } from '../config/constants';
import {
  Coordinates, DriverProfile, PublicUser, RideDetails, RootStackParamList,
} from '../types';
=======
import { useDriverStatus } from '../context/DriverStatusContext';
import { Coordinates, HomeScreenProps } from '../types';
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
import { C, G, SH, RADIUS } from '../theme';

const { width: SW } = Dimensions.get('window');
const DELTA = { latitudeDelta: 0.012, longitudeDelta: 0.012 };

<<<<<<< HEAD
const MENU_ITEMS = [
  { key: 'Mon profil',      icon: '👤', color: '#EDE9FF', route: 'Profil'     as const },
  { key: 'Notifications',   icon: '🔔', color: '#FFF3E0', route: null           },
  { key: 'Historique',      icon: '📋', color: '#E8F5E9', route: 'Historique' as const },
  { key: 'Mon compte',      icon: '💰', color: '#E3F2FD', route: 'MonCompte'  as const },
  { key: 'Paramètres',      icon: '⚙️', color: '#F3E5F5', route: 'Parametres' as const },
  { key: 'Nous contacter',  icon: '💬', color: '#E0F7FA', route: null           },
];

type RidePhase = 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS';

interface ActiveRide {
  rideId:          string;
  destinationName: string;
  price:           RideDetails['price'];
  pickup:          Coordinates;
  destination:     Coordinates | null;
  isOpenTrip:      boolean;
  user:            PublicUser;
  phase:           RidePhase;
}

// Course terminée, en attente de la note du chauffeur sur le client
interface RideToRate {
  rideId: string;
  user:   PublicUser;
  price:  number;
}

const toCoords = (lat: number | string | null, lng: number | string | null): Coordinates | null =>
  lat != null && lng != null ? { latitude: Number(lat), longitude: Number(lng) } : null;

const toActiveRide = (d: RideDetails): ActiveRide => ({
  rideId:          d.id,
  destinationName: d.destinationName,
  price:           d.price,
  pickup:          toCoords(d.startLatitude, d.startLongitude)!,
  destination:     toCoords(d.endLatitude, d.endLongitude),
  isOpenTrip:      d.isOpenTrip,
  user:            d.user,
  phase:           d.status as RidePhase,
});

const PHASE_TITLES: Record<RidePhase, string> = {
  ACCEPTED:    '📍  En route vers le client',
  ARRIVED:     '🙋  Client en attente',
  IN_PROGRESS: '🏁  Course en cours',
};

const formatPrice = (price: RideRequestPayload['price']) =>
  price != null ? `${Math.round(Number(price))} MRU` : 'Au compteur';

const apiErrorMessage = (e: any, fallback: string): string =>
  e?.response?.data?.message ?? fallback;

export default function HomeScreen({ navigation }: Props) {
=======
export default function HomeScreen({ navigation }: HomeScreenProps) {
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const { isOnline, goOnline, goOffline } = useDriverStatus();
  const [location,   setLocation]   = useState<Coordinates | null>(null);
  const locationRef = useRef<Coordinates | null>(null);
  locationRef.current = location;
  const [region,     setRegion]     = useState<Region | null>(null);
<<<<<<< HEAD
  const [isOnline,   setIsOnline]   = useState(false);
  // Lus par les listeners socket (enregistrés une seule fois)
  const isOnlineRef = useRef(false);
  isOnlineRef.current = isOnline;
=======
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  const [now,        setNow]        = useState(new Date());
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayRides,    setTodayRides]    = useState(0);
  const [rideRequest,   setRideRequest]   = useState<RideRequestPayload | null>(null);
  const [activeRide,    setActiveRide]    = useState<ActiveRide | null>(null);
  const [busy,          setBusy]          = useState(false);
  const [rideToRate,    setRideToRate]    = useState<RideToRate | null>(null);
  const [clientRating,  setClientRating]  = useState(0);
  const [profile,       setProfile]       = useState<DriverProfile | null>(null);
  const [meter,         setMeter]         = useState<MeterReading | null>(null);

  // Lu par les listeners socket (enregistrés une seule fois)
  const activeRideIdRef = useRef<string | null>(null);
  const activeRideRef   = useRef<ActiveRide | null>(null);
  useEffect(() => {
    activeRideIdRef.current = activeRide?.rideId ?? null;
    activeRideRef.current   = activeRide;
  }, [activeRide]);

  // Popup « le client a annulé » — une seule fois par course (socket + vérification au premier plan)
  const announcedCancellations = useRef(new Set<string>());
  const [cancelNotice, setCancelNotice] = useState<CancellationNotice | null>(null);
  const announceClientCancellation = (ride: ActiveRide) => {
    if (announcedCancellations.current.has(ride.rideId)) return;
    announcedCancellations.current.add(ride.rideId);
    setActiveRide(null);
    setMeter(null);
    const name = ride.user.name ?? 'Le client';
    playAlert('cancel');
    notify('Course annulée par le client', `${name} a annulé la course.`);
    setCancelNotice({
      user:        ride.user,
      destination: ride.isOpenTrip ? 'Trajet ouvert' : ride.destinationName,
    });
  };

  // Sonnerie en boucle tant qu'une demande de course est affichée
  // (arrêtée à l'acceptation, au refus, si la course est prise ailleurs ou annulée)
  useEffect(() => {
    if (rideRequest) startRinging();
    else stopRinging();
  }, [rideRequest?.rideId]);
  useEffect(() => stopRinging, []);

  // Annulation manquée pendant que l'app était en arrière-plan
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const ride = activeRideRef.current;
      if (state !== 'active' || !ride) return;
      apiGet<RideDetails>(`/rides/${ride.rideId}`)
        .then((d) => {
          if (d.status === 'CANCELLED' && d.cancelledBy === 'rider') announceClientCancellation(ride);
        })
        .catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const pillScale   = useRef(new Animated.Value(1)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const cardSlide   = useRef(new Animated.Value(120)).current;

  // Clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Online pulse ring
  useEffect(() => {
    if (!isOnline) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isOnline]);

  // Bottom card entrance
  useEffect(() => {
    Animated.spring(cardSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
  }, []);

  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  const initLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coords: Coordinates = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setLocation(coords);
    setRegion({ ...coords, ...DELTA });
  }, []);

  // Profil, statut et course en cours (reprise après redémarrage de l'app)
  const loadProfile = useCallback(async () => {
    try {
      const me = await apiGet<DriverProfile>('/drivers/me');
      setProfile(me);
      setIsOnline(me.status !== 'OFFLINE');
    } catch { /* réseau indisponible */ }
  }, []);

  useEffect(() => {
    ensureNotificationPermission();
    apiGet<RideDetails | null>('/rides/active')
      .then((ride) => { if (ride) setActiveRide(toActiveRide(ride)); })
      .catch(() => {});
  }, []);

  // Chargé à l'ouverture et au retour de l'écran profil (nom, photo, note)
  useEffect(() => {
    loadProfile();
    return navigation.addListener('focus', loadProfile);
  }, [navigation, loadProfile]);

  useEffect(() => {
    initLocation();
<<<<<<< HEAD
    let cancelled = false;

    (async () => {
      const token = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (!token || cancelled) return;
      captainSocketService.connect(token);

      // Le serveur repasse hors ligne un chauffeur déconnecté depuis plus de 60 s :
      // à la reconnexion, on rétablit le statut « en ligne » choisi par le chauffeur
      captainSocketService.onConnect(() => {
        if (!isOnlineRef.current || activeRideIdRef.current) return;
        apiPatch('/drivers/status', { status: 'ONLINE' })
          .then(() => { if (locationRef.current) captainSocketService.updateLocation(locationRef.current); })
          .catch(() => {});
      });

      captainSocketService.onRideRequest((payload) => {
        setRideRequest((current) => current ?? payload);
        notify('Nouvelle course 🚕', payload.isOpenTrip
          ? 'Trajet ouvert · prix au compteur'
          : `Destination : ${payload.destinationName} · ${formatPrice(payload.price)}`);
      });
      captainSocketService.onMeter((reading) => {
        if (reading.rideId === activeRideIdRef.current) setMeter(reading);
      });
      // Course prise par un autre chauffeur, expirée ou annulée par le client
      const dropRide = ({ rideId }: { rideId: string }) => {
        setRideRequest((r) => (r?.rideId === rideId ? null : r));
        const ride = activeRideRef.current;
        if (ride?.rideId === rideId) announceClientCancellation(ride);
      };
      captainSocketService.onRideUnavailable(dropRide);
      captainSocketService.onRideCancelled(dropRide);
    })();

    return () => {
      cancelled = true;
      captainSocketService.offRideRequest();
      captainSocketService.offMeter();
      captainSocketService.offRideUnavailable();
      captainSocketService.offRideCancelled();
      captainSocketService.disconnect();
    };
  }, [initLocation]);

  // Position en direct tant que le chauffeur est en ligne (suivie par le client pendant la course)
  useEffect(() => {
    if (!isOnline) return;
    let subscription: Location.LocationSubscription | null = null;
    let stopped = false;

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3_000, distanceInterval: 10 },
      (loc) => {
        const coords: Coordinates = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setLocation(coords);
        captainSocketService.updateLocation(coords);
      },
    ).then((sub) => {
      if (stopped) sub.remove();
      else subscription = sub;
    }).catch(() => { /* permission refusée */ });

    return () => {
      stopped = true;
      subscription?.remove();
    };
  }, [isOnline]);

  const toggleOnline = async () => {
    if (activeRide || rideToRate) return; // pas de changement de statut pendant une course
=======
  }, [initLocation]);

  const toggleOnline = async () => {
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    Animated.sequence([
      Animated.timing(pillScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(pillScale, { toValue: 1,   tension: 80, useNativeDriver: true }),
    ]).start();
<<<<<<< HEAD

    const goingOnline = !isOnline;
    try {
      await apiPatch('/drivers/status', { status: goingOnline ? 'ONLINE' : 'OFFLINE' });
      // Position immédiate : le serveur ne cherche que les chauffeurs localisés
      if (goingOnline && location) captainSocketService.updateLocation(location);
      if (!goingOnline) setRideRequest(null);
      setIsOnline(goingOnline);
    } catch (e) {
      Alert.alert('Erreur', apiErrorMessage(e, 'Impossible de changer le statut.'));
    }
  };

  // ── Actions sur la course ──────────────────────────────────────────────────

  const runRideAction = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert('Erreur', apiErrorMessage(e, fallback));
    } finally {
      setBusy(false);
    }
  };

  const acceptRide = () => rideRequest && runRideAction(async () => {
    try {
      // La réponse contient le profil du client
      const details = await apiPost<RideDetails>(`/rides/${rideRequest.rideId}/accept`, {});
      setActiveRide(toActiveRide(details));
    } finally {
      setRideRequest(null);
    }
  }, 'Cette course n\'est plus disponible.');

  const rejectRide = () => rideRequest && runRideAction(async () => {
    setRideRequest(null);
    await apiPost(`/rides/${rideRequest.rideId}/reject`, {});
  }, 'Impossible de refuser la course.');

  const arriveRide = () => activeRide && runRideAction(async () => {
    await apiPost(`/rides/${activeRide.rideId}/arrive`, {});
    setActiveRide({ ...activeRide, phase: 'ARRIVED' });
  }, 'Impossible de signaler votre arrivée.');

  const startRide = () => activeRide && runRideAction(async () => {
    await apiPost(`/rides/${activeRide.rideId}/start`, {});
    setActiveRide({ ...activeRide, phase: 'IN_PROGRESS' });
  }, 'Impossible de démarrer la course.');

  const completeRide = () => activeRide && runRideAction(async () => {
    // Sans destination connue, le prix est calculé sur la position d'arrivée réelle
    const body = activeRide.destination == null && location
      ? { endLatitude: location.latitude, endLongitude: location.longitude }
      : {};
    const ride = await apiPost<{ price: number | string | null }>(`/rides/${activeRide.rideId}/complete`, body);
    const price = Math.round(Number(ride.price ?? 0));
    setTodayRides((n) => n + 1);
    setTodayEarnings((sum) => sum + price);
    setActiveRide(null);
    setMeter(null);
    setClientRating(0);
    setRideToRate({ rideId: activeRide.rideId, user: activeRide.user, price });
    playAlert('success');
  }, 'Impossible de terminer la course.');

  const submitClientRating = (skip = false) => rideToRate && runRideAction(async () => {
    if (!skip) await apiPost(`/rides/${rideToRate.rideId}/rate`, { rating: clientRating });
    setRideToRate(null);
    loadProfile(); // nombre de courses à jour
  }, 'Impossible d\'envoyer la note.');

  const callClient = (user: PublicUser) => {
    Linking.openURL(`tel:${user.phone}`).catch(() => Alert.alert('Appel impossible', user.phone));
  };

  // Avant l'arrivée : itinéraire vers le client. Ensuite : vers la destination (absente en trajet ouvert).
  const navigationTarget = (ride: ActiveRide): { coords: Coordinates; title: string } | null =>
    ride.phase === 'ACCEPTED'
      ? { coords: ride.pickup, title: 'Aller chercher le client' }
      : ride.destination ? { coords: ride.destination, title: 'Aller à la destination' } : null;

  const cancelActiveRide = () => {
    if (!activeRide) return;
    Alert.alert('Annuler la course ?', 'Le client sera prévenu et pourra faire une nouvelle demande.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive',
        onPress: () => runRideAction(async () => {
          await apiPost(`/rides/${activeRide.rideId}/driver-cancel`, {});
          setActiveRide(null);
          setMeter(null);
        }, 'Impossible d\'annuler la course.'),
      },
    ]);
  };

  const ridePhaseAction: Record<RidePhase, { label: string; onPress: () => void }> = {
    ACCEPTED:    { label: 'Je suis arrivé',     onPress: arriveRide },
    ARRIVED:     { label: 'Démarrer la course', onPress: startRide },
    IN_PROGRESS: { label: 'Terminer la course', onPress: completeRide },
  };

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim,  { toValue: 0,    useNativeDriver: true, tension: 70, friction: 10 }),
      Animated.timing(overlayAnim, { toValue: 0.55, duration: 260, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(drawerAnim,  { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const handleMenu = (route: string | null) => {
    closeDrawer();
    if (route) setTimeout(() => navigation.navigate(route as any), 290);
  };

  const handleLogout = async () => {
    closeDrawer();
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    setTimeout(() => navigation.replace('Welcome'), 290);
=======
    if (isOnline) {
      await goOffline();
    } else {
      await goOnline();
    }
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  };

  const centerMap = () => {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion({ ...location, ...DELTA }, 400);
  };

  return (
    <View style={styles.root}>
      {/* ── Map ── */}
      {region ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          mapType="standard"
        >
          {activeRide && activeRide.phase !== 'IN_PROGRESS' && (
            <MapPin coordinate={activeRide.pickup} color={C.primary} />
          )}
          {activeRide?.destination && activeRide.phase === 'IN_PROGRESS' && (
            <MapPin coordinate={activeRide.destination} color={C.danger} square />
          )}
          {rideRequest && (
            <MapPin
              coordinate={toCoords(rideRequest.startLatitude, rideRequest.startLongitude)!}
              color={C.primary}
            />
          )}
        </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]}>
          <Text style={styles.mapPlaceholderText}>Localisation…</Text>
        </View>
      )}

      {/* ── Top control bar ──────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { top: insets.top + 10 }]}>

        {/* Burger */}
        <TouchableOpacity style={styles.topBtn} onPress={() => navigation.openDrawer()} activeOpacity={0.8}>
          <Ionicons name="menu" size={20} color={C.dark} />
        </TouchableOpacity>

        {/* Status pill */}
        <Animated.View style={{ transform: [{ scale: pillScale }], flex: 1 }}>
          <TouchableOpacity onPress={toggleOnline} activeOpacity={0.85}>
            <View style={[styles.statusPill, isOnline ? styles.pillOnline : styles.pillOffline]}>
              {isOnline && (
                <Animated.View
                  style={[styles.pulseRing, {
                    transform: [{ scale: pulseAnim }],
                    opacity:   pulseAnim.interpolate({ inputRange: [1, 1.35], outputRange: [0.6, 0] }),
                  }]}
                />
              )}
              <View style={[styles.pillDot, { backgroundColor: isOnline ? C.accent : C.danger }]} />
              <Text style={styles.pillLabel}>{isOnline ? 'En ligne' : 'Hors ligne'}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Time + Compass */}
        <View style={styles.topRight}>
          <View style={styles.timeChip}>
            <Text style={styles.timeText}>{formatTime(now)}</Text>
          </View>
          <TouchableOpacity style={styles.topBtn} onPress={centerMap} activeOpacity={0.8}>
            <Ionicons name="locate" size={19} color={C.dark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Bottom status card ───────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.bottomCard, {
          bottom: insets.bottom + 12,
          transform: [{ translateY: cardSlide }],
        }]}
      >
        {rideToRate ? (
          /* Notation du client après la course */
          <View style={styles.rideCard}>
            <View style={styles.rateBody}>
              <Text style={styles.rateTitle}>Course terminée · {rideToRate.price} MRU</Text>
              <Avatar photoUrl={rideToRate.user.photoUrl} name={rideToRate.user.name} size={64} color={C.primary} />
              <Text style={styles.rateQuestion}>Notez {rideToRate.user.name ?? 'le client'}</Text>
              <StarRating value={clientRating} onChange={setClientRating} size={36} />
            </View>
            <View style={styles.rideActions}>
              {busy ? <ActivityIndicator color={C.primary} /> : (
                <>
                  <TouchableOpacity style={[styles.rideBtn, styles.rideBtnGhost]} onPress={() => submitClientRating(true)} activeOpacity={0.8}>
                    <Text style={styles.rideBtnGhostText}>Plus tard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rideBtn, styles.rideBtnMain, clientRating === 0 && { opacity: 0.4 }]}
                    onPress={() => submitClientRating()}
                    disabled={clientRating === 0}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.rideBtnMainText}>Envoyer</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : rideRequest || activeRide ? (
          /* Ride card : nouvelle demande ou course en cours */
          <View style={styles.rideCard}>
            <LinearGradient
              colors={G.dark}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.rideHeader}
            >
              <Text style={styles.rideHeaderTitle}>
                {rideRequest ? '🚕  Nouvelle course' : PHASE_TITLES[activeRide!.phase]}
              </Text>
              <Text style={styles.ridePrice}>
                {(rideRequest ?? activeRide)!.isOpenTrip ? 'Au compteur' : formatPrice((rideRequest ?? activeRide)!.price)}
              </Text>
            </LinearGradient>

            {/* Client (après acceptation) */}
            {activeRide && (
              <View style={styles.clientRow}>
                <Avatar photoUrl={activeRide.user.photoUrl} name={activeRide.user.name} size={52} color={C.primary} />
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{activeRide.user.name ?? 'Client'}</Text>
                  <Text style={styles.clientMeta}>
                    ⭐ {activeRide.user.rating.toFixed(1)} · {activeRide.user.totalRides} course{activeRide.user.totalRides > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.clientMeta}>{activeRide.user.phone}</Text>
                </View>
                {(() => {
                  const target = navigationTarget(activeRide);
                  return target && (
                    <TouchableOpacity
                      style={[styles.roundBtn, styles.navBtn]}
                      onPress={() => openDirections(target.coords, target.title)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.roundBtnText}>🧭</Text>
                    </TouchableOpacity>
                  );
                })()}
                <TouchableOpacity style={[styles.roundBtn, styles.callBtn]} onPress={() => callClient(activeRide.user)} activeOpacity={0.8}>
                  <Text style={styles.roundBtnText}>📞</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.rideBody}>
              <Text style={styles.rideLabel}>Destination</Text>
              <Text style={styles.rideDest} numberOfLines={2}>
                {(rideRequest ?? activeRide)!.isOpenTrip
                  ? 'Trajet ouvert · le client vous indiquera la destination'
                  : (rideRequest ?? activeRide)!.destinationName}
              </Text>
            </View>

            {/* Compteur en direct (trajet ouvert en cours) */}
            {activeRide?.isOpenTrip && activeRide.phase === 'IN_PROGRESS' && (
              <View style={styles.meterRow}>
                <Text style={styles.meterPrice}>{meter ? `${meter.price} MRU` : '…'}</Text>
                <Text style={styles.meterStat}>
                  {meter ? meter.distanceKm.toFixed(1) : '0.0'} km · {meter ? meter.durationMin : 0} min
                </Text>
              </View>
            )}

            {busy ? (
              <View style={styles.rideActions}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : rideRequest ? (
              <View style={styles.rideActions}>
                <TouchableOpacity style={[styles.rideBtn, styles.rideBtnGhost]} onPress={rejectRide} activeOpacity={0.8}>
                  <Text style={styles.rideBtnGhostText}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rideBtn, styles.rideBtnMain]} onPress={acceptRide} activeOpacity={0.85}>
                  <Text style={styles.rideBtnMainText}>Accepter</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.rideActions}>
                <TouchableOpacity
                  style={[styles.rideBtn, styles.rideBtnMain]}
                  onPress={ridePhaseAction[activeRide!.phase].onPress}
                  activeOpacity={0.85}
                >
                  <Text style={styles.rideBtnMainText}>{ridePhaseAction[activeRide!.phase].label}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Annulation possible tant que la course n'a pas démarré */}
            {activeRide && activeRide.phase !== 'IN_PROGRESS' && !busy && (
              <TouchableOpacity style={styles.cancelRideBtn} onPress={cancelActiveRide} activeOpacity={0.7}>
                <Text style={styles.cancelRideText}>Annuler la course</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : isOnline ? (
          /* Online card */
          <View style={styles.onlineCard}>
            <LinearGradient
              colors={[C.accentDk, C.accent]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.onlineHeader}
            >
              <View style={styles.onlineTitleRow}>
                <Ionicons name="radio" size={14} color={C.white} />
                <Text style={styles.onlineTitle}>En attente de courses…</Text>
              </View>
              <View style={styles.onlineStats}>
                <View style={styles.onlineStat}>
                  <Text style={styles.onlineStatVal}>{todayRides}</Text>
                  <Text style={styles.onlineStatLabel}>courses</Text>
                </View>
                <View style={styles.onlineStatDiv} />
                <View style={styles.onlineStat}>
                  <Text style={styles.onlineStatVal}>{todayEarnings} MRU</Text>
                  <Text style={styles.onlineStatLabel}>aujourd'hui</Text>
                </View>
              </View>
            </LinearGradient>
            <TouchableOpacity style={styles.goOfflineBtn} onPress={toggleOnline} activeOpacity={0.8}>
              <Text style={styles.goOfflineBtnText}>Passer hors ligne</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Offline card */
          <View style={styles.offlineCard}>
            <View style={styles.offlineLeft}>
              <View style={styles.offlineIconWrap}>
                <Ionicons name="power" size={20} color={C.danger} />
              </View>
              <View>
                <Text style={styles.offlineTitle}>Vous êtes hors ligne</Text>
                <Text style={styles.offlineSub}>Activez pour recevoir des courses</Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleOnline} activeOpacity={0.85} style={styles.goOnlineBtnWrap}>
              <LinearGradient
                colors={G.accent}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.goOnlineBtn}
              >
                <Text style={styles.goOnlineBtnText}>En ligne</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
<<<<<<< HEAD

      {/* ── Overlay ── */}
      {drawerOpen && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayAnim }]}
          pointerEvents="auto"
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeDrawer} activeOpacity={1} />
        </Animated.View>
      )}

      {/* ── Drawer ── */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        {/* Dark header */}
        <LinearGradient
          colors={G.dark}
          style={[styles.drawerHeader, { paddingTop: insets.top + 24 }]}
        >
          {/* Decorative blob */}
          <View style={styles.drawerBlob} />

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <LinearGradient colors={G.primary} style={styles.avatarRing}>
              <Avatar photoUrl={profile?.photoUrl} name={profile?.name ?? 'C'} size={65} color={C.darkMid} />
            </LinearGradient>
            <View style={[styles.avatarBadge, { backgroundColor: isOnline ? C.accent : C.danger }]} />
          </View>
          <Text style={styles.drawerName}>{profile?.name || 'Complétez votre profil'}</Text>
          <Text style={styles.drawerPhone}>{profile?.phone ?? ''}</Text>

          {/* Rating chip */}
          <View style={styles.ratingChip}>
            <Text style={styles.ratingIcon}>⭐</Text>
            <Text style={styles.ratingText}>{Number(profile?.rating ?? 5).toFixed(1)}</Text>
            <Text style={styles.ratingDot}>·</Text>
            <Text style={styles.ratingText}>{profile?.totalRides ?? 0} courses</Text>
          </View>
        </LinearGradient>

        {/* Menu */}
        <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuItem}
              onPress={() => handleMenu(item.route)}
              activeOpacity={0.65}
            >
              <View style={[styles.menuIconBadge, { backgroundColor: item.color }]}>
                <Text style={styles.menuEmoji}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.key}</Text>
              <Text style={styles.menuChev}>›</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.menuDivider} />

          {/* Passenger mode */}
          <TouchableOpacity style={styles.passengerRow} activeOpacity={0.8}>
            <View style={styles.passengerContent}>
              <Text style={styles.passengerIcon}>👤</Text>
              <View>
                <Text style={styles.passengerTitle}>Mode Passager</Text>
                <Text style={styles.passengerSub}>Passer en mode client</Text>
              </View>
            </View>
            <View style={styles.passengerBadge}>
              <Text style={styles.passengerBadgeText}>Bêta</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Logout */}
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.menuIconBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.menuEmoji}>⎋</Text>
            </View>
            <Text style={[styles.menuLabel, { color: C.danger }]}>Se déconnecter</Text>
          </TouchableOpacity>

          <View style={styles.drawerFooter}>
            <Text style={styles.footerLang}>🌐  Français</Text>
            <Text style={styles.footerVersion}>Volta Capitaine v{APP_VERSION}</Text>
          </View>
        </ScrollView>
      </Animated.View>

      <CancellationModal notice={cancelNotice} onClose={() => setCancelNotice(null)} />
=======
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  mapPlaceholder: {
    backgroundColor: '#E8E4F5',
    alignItems: 'center', justifyContent: 'center',
  },
  mapPlaceholderText: { fontSize: 15, color: C.sub },

  // ── Top bar
  topBar: {
    position: 'absolute', left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10,
  },
  topBtn: {
    width: 44, height: 44, borderRadius: RADIUS.md + 2,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
    ...SH.sm,
  },

  // Status pill
  statusPill: {
    height: 44, borderRadius: RADIUS.pill,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingHorizontal: 18, position: 'relative', overflow: 'visible',
    ...SH.sm,
  },
  pillOnline:  { backgroundColor: C.dark },
  pillOffline: { backgroundColor: C.white },
  pulseRing: {
    position: 'absolute', width: '120%', height: '150%',
    borderRadius: RADIUS.pill, borderWidth: 2, borderColor: C.accent,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillLabel: {
    fontSize: 14, fontWeight: '700',
    color: C.white,
  },

  topRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeChip: {
    backgroundColor: C.white, borderRadius: RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 7, ...SH.sm,
  },
  timeText: { fontSize: 13, fontWeight: '700', color: C.dark },

  // ── Bottom card
  bottomCard: {
    position: 'absolute', left: 16, right: 16,
    borderRadius: RADIUS.xl, overflow: 'hidden',
    ...SH.lg,
  },

  // Online card
  onlineCard: { backgroundColor: C.surface },
  onlineHeader: { padding: 18 },
  onlineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  onlineTitle:  { fontSize: 14, fontWeight: '700', color: C.white },
  onlineStats:  { flexDirection: 'row', alignItems: 'center' },
  onlineStat:   { flex: 1, alignItems: 'center' },
  onlineStatVal:{ fontSize: 22, fontWeight: '900', color: C.white },
  onlineStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  onlineStatDiv: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },
  goOfflineBtn: {
    paddingVertical: 14, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.border,
  },
  goOfflineBtnText: { fontSize: 14, fontWeight: '700', color: C.sub },

  // Ride card
  rideCard:        { backgroundColor: C.surface },
  rideHeader: {
    padding: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  rideHeaderTitle: { fontSize: 15, fontWeight: '700', color: C.white },
  ridePrice:       { fontSize: 22, fontWeight: '900', color: C.white },
  rideBody:        { paddingHorizontal: 18, paddingVertical: 14 },
  rideLabel:       { fontSize: 11, fontWeight: '700', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.6 },
  rideDest:        { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 4 },
  rideActions: {
    flexDirection: 'row', gap: 10, padding: 14, paddingTop: 0,
    minHeight: 62, alignItems: 'center', justifyContent: 'center',
  },
  rideBtn:          { flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center' },
  rideBtnMain:      { backgroundColor: C.accent },
  rideBtnMainText:  { fontSize: 15, fontWeight: '800', color: C.white },
  rideBtnGhost:     { borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  rideBtnGhostText: { fontSize: 15, fontWeight: '700', color: C.sub },

  clientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: 14,
  },
  clientInfo: { flex: 1, gap: 2 },
  clientName: { fontSize: 16, fontWeight: '800', color: C.text },
  clientMeta: { fontSize: 12, color: C.sub },
  roundBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  roundBtnText: { fontSize: 20 },
  navBtn:  { backgroundColor: C.primary },
  callBtn: { backgroundColor: C.accent },
  cancelRideBtn:  { alignItems: 'center', paddingBottom: 14, marginTop: -4 },
  cancelRideText: { fontSize: 14, fontWeight: '700', color: C.danger },

  meterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 18, marginBottom: 14, padding: 14,
    borderRadius: RADIUS.lg, backgroundColor: C.surfaceAlt,
  },
  meterPrice: { fontSize: 24, fontWeight: '900', color: C.primary, fontVariant: ['tabular-nums'] },
  meterStat:  { fontSize: 14, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },

  rateBody:     { alignItems: 'center', gap: 10, padding: 18 },
  rateTitle:    { fontSize: 15, fontWeight: '800', color: C.text },
  rateQuestion: { fontSize: 14, fontWeight: '600', color: C.sub },

  // Offline card
  offlineCard: {
    backgroundColor: C.white, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  offlineLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  offlineIconWrap: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: '#FFF1F5', alignItems: 'center', justifyContent: 'center',
  },
  offlineTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  offlineSub:   { fontSize: 12, color: C.sub, marginTop: 2 },
  goOnlineBtnWrap: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SH.green },
  goOnlineBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  goOnlineBtnText: { fontSize: 14, fontWeight: '800', color: C.white },
});
