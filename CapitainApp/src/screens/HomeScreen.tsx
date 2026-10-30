import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  Animated, Alert, ActivityIndicator, Linking, AppState,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { captainSocketService, MeterReading, RideRequestPayload } from '../services/socket';
import { apiErrorMessage, apiGet, apiPatch, apiPost, signOut } from '../services/api';
import { ensureNotificationPermission, notify } from '../services/notifications';
import { DossierItem } from '../data/documents';
import { tr, useLanguage } from '../i18n/LanguageContext';
import { playAlert, startRinging, stopRinging } from '../services/alerts';
import {
  dismissRideOffer, ensureRideOfferPermissions, parseRideUrl, registerRideOffers, releaseLockScreen,
  rideOffersAvailable, startOnlineTracking, stopOnlineTracking,
} from '../services/rideOffers';
import Avatar from '../components/Avatar';
import CancellationModal, { CancellationNotice } from '../components/CancellationModal';
import { openDirections } from '../services/directions';
import MapPin from '../components/MapPin';
import StarRating from '../components/StarRating';
import { SECURE_STORE_KEY } from '../config/constants';
import {
  Coordinates, DriverProfile, HomeScreenProps, PublicUser, RideDetails,
} from '../types';
import { C, G, SH, RADIUS } from '../theme';

const DELTA = { latitudeDelta: 0.012, longitudeDelta: 0.012 };

// Liens de l'écran d'appel déjà traités (l'écran d'accueil peut être remonté après reconnexion)
const handledRideLinks = new Set<string>();

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

const formatPrice = (price: RideRequestPayload['price']) =>
  price != null ? `${Math.round(Number(price))} MRU` : tr('homeMeterPrice');

// Solde négatif ou véhicule non approuvé : le serveur refuse le passage en ligne et les courses
interface OnlineBlock { code: string; message: string }
const ONLINE_BLOCK_CODES = ['INSUFFICIENT_BALANCE', 'VEHICLE_NOT_APPROVED', 'INSURANCE_EXPIRED'];
const onlineBlock = (e: any): OnlineBlock | null => {
  const data = e?.response?.data;
  return ONLINE_BLOCK_CODES.includes(data?.code) ? { code: data.code, message: data.message } : null;
};

// Les écouteurs du socket (enregistrés une seule fois) lisent la langue courante via tr()
export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const mapRef = useRef<MapView>(null);

  const [location,   setLocation]   = useState<Coordinates | null>(null);
  const locationRef = useRef<Coordinates | null>(null);
  locationRef.current = location;
  const [region,     setRegion]     = useState<Region | null>(null);
  const [isOnline,   setIsOnline]   = useState(false);
  // Lus par les listeners socket (enregistrés une seule fois)
  const isOnlineRef = useRef(false);
  isOnlineRef.current = isOnline;
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

  // Hors ligne, puis : solde négatif → « Mon compte » pour recharger ;
  // compte non approuvé ou assurance expirée → message du serveur et accès à « Mon profil »
  const handleOnlineBlock = useCallback((block: OnlineBlock) => {
    setIsOnline(false);
    setRideRequest(null);
    void stopOnlineTracking();
    if (block.code === 'INSUFFICIENT_BALANCE') {
      navigation.navigate('MonCompte', { insufficientBalance: true });
      return;
    }
    Alert.alert(tr(block.code === 'INSURANCE_EXPIRED' ? 'homeInsuranceExpired' : 'homeAccountNotApproved'), block.message, [
      { text: tr('commonLater'), style: 'cancel' },
      { text: tr('commonMyProfile'), onPress: () => navigation.navigate('Profil') },
    ]);
  }, [navigation]);
  const handleOnlineBlockRef = useRef(handleOnlineBlock);
  handleOnlineBlockRef.current = handleOnlineBlock;

  // Popup « le client a annulé » — une seule fois par course (socket + vérification au premier plan)
  const announcedCancellations = useRef(new Set<string>());
  const [cancelNotice, setCancelNotice] = useState<CancellationNotice | null>(null);
  const announceClientCancellation = (ride: ActiveRide) => {
    if (announcedCancellations.current.has(ride.rideId)) return;
    announcedCancellations.current.add(ride.rideId);
    setActiveRide(null);
    setMeter(null);
    const name = ride.user.name ?? tr('homeTheClientCap');
    playAlert('cancel');
    notify(tr('homeCancelledByClientTitle'), tr('homeCancelledByClientBody')(name));
    setCancelNotice({
      user:        ride.user,
      destination: ride.isOpenTrip ? tr('commonOpenTrip') : ride.destinationName,
    });
  };

  // Sonnerie en boucle tant qu'une demande de course est affichée à l'écran
  // (arrêtée à l'acceptation, au refus, si la course est prise ailleurs ou annulée).
  // App en arrière-plan : c'est l'écran d'appel Android qui sonne.
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (rideRequest && appActive) {
      dismissRideOffer(rideRequest.rideId); // la carte à l'écran remplace l'écran d'appel
      startRinging();
    } else {
      stopRinging();
    }
    if (!rideRequest) releaseLockScreen();
  }, [rideRequest?.rideId, appActive]);
  useEffect(() => stopRinging, []);

  // Annulation manquée pendant que l'app était en arrière-plan
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const ride = activeRideRef.current;
      if (state !== 'active' || !ride) return;
      apiGet<RideDetails>(`/rides/${ride.rideId}`)
        .then((d) => {
          if (d.status === 'CANCELLED' && d.cancelledBy === 'user') announceClientCancellation(ride);
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
      // Encore en ligne (app relancée) : le suivi en arrière-plan doit tourner
      if (me.status === 'ONLINE') void startOnlineTracking();
    } catch { /* réseau indisponible */ }
  }, []);

  useEffect(() => {
    ensureNotificationPermission();
    registerRideOffers(); // téléphone joignable par l'écran « Nouvelle course », app fermée
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
          .catch((e) => {
            const block = onlineBlock(e);
            if (block) handleOnlineBlockRef.current(block);
          });
      });

      captainSocketService.onAccountBlocked(({ reason }) => {
        signOut(reason ?? tr('homeAccountBlocked')); // message complet du serveur (durée et motif)
      });
      captainSocketService.onForcedOffline((block) => handleOnlineBlockRef.current(block));
      captainSocketService.onDossierUpdated((e) => {
        const toProfile = { text: tr('commonMyProfile'), onPress: () => navigation.navigate('Profil') };
        const later = { text: tr('commonLater'), style: 'cancel' as const };
        if (e.event === 'ACCOUNT_APPROVED') {
          notify(tr('homeAccountApprovedTitle'), tr('homeAccountApprovedNotif'));
          Alert.alert(tr('homeAccountApprovedTitle'), tr('homeAccountApprovedAlert'));
        } else if (e.event === 'DOSSIER_REJECTED') {
          notify(tr('homeDossierRejectedTitle'), e.reason ?? tr('homeDossierRejectedNotif'));
          Alert.alert(tr('homeDossierRejectedTitle'), tr('homeDossierRejectedAlert')(e.reason), [later, toProfile]);
        } else if (e.event === 'DOCUMENT_REVIEWED' && e.status === 'REJECTED') {
          const label = tr('dossierLabels')[e.type as DossierItem] ?? tr('homeADocument');
          notify(tr('homeDocumentRejectedTitle'), tr('homeDocumentRejectedNotif')(label, e.note));
          Alert.alert(tr('homeDocumentRejectedTitle'), tr('homeDocumentRejectedAlert')(label, e.note), [later, toProfile]);
        }
        loadProfile();
      });

      captainSocketService.onRideRequest((payload) => {
        setRideRequest((current) => current ?? payload);
        // Build Android : l'écran d'appel (message Firebase) remplace la notification
        if (!rideOffersAvailable) {
          notify(tr('homeNewRideNotif'), payload.isOpenTrip
            ? tr('homeNewRideOpenTripBody')
            : tr('homeNewRideBody')(payload.destinationName, formatPrice(payload.price)));
        }
      });
      captainSocketService.onMeter((reading) => {
        if (reading.rideId === activeRideIdRef.current) setMeter(reading);
      });
      // Course prise par un autre chauffeur, expirée ou annulée par le client
      const dropRide = ({ rideId }: { rideId: string }) => {
        setRideRequest((r) => (r?.rideId === rideId ? null : r));
        dismissRideOffer(rideId);
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
      captainSocketService.offAccountEvents();
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
    Animated.sequence([
      Animated.timing(pillScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(pillScale, { toValue: 1,   tension: 80, useNativeDriver: true }),
    ]).start();

    const goingOnline = !isOnline;
    try {
      await apiPatch('/drivers/status', { status: goingOnline ? 'ONLINE' : 'OFFLINE' });
      // Position immédiate : le serveur ne cherche que les chauffeurs localisés
      if (goingOnline && location) captainSocketService.updateLocation(location);
      if (!goingOnline) setRideRequest(null);
      setIsOnline(goingOnline);
      // En ligne : écran de course et position garantis même app fermée
      if (goingOnline) void ensureRideOfferPermissions().then(startOnlineTracking);
      else void stopOnlineTracking();
    } catch (e) {
      const block = onlineBlock(e);
      if (block) handleOnlineBlock(block);
      else Alert.alert(t('commonError'), apiErrorMessage(e, t('homeStatusError')));
    }
  };

  // ── Actions sur la course ──────────────────────────────────────────────────

  const runRideAction = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      const block = onlineBlock(e);
      if (block) handleOnlineBlock(block);
      else Alert.alert(t('commonError'), apiErrorMessage(e, fallback));
    } finally {
      setBusy(false);
    }
  };

  const acceptOffer = (rideId: string) => runRideAction(async () => {
    try {
      // La réponse contient le profil du client
      const details = await apiPost<RideDetails>(`/rides/${rideId}/accept`, {});
      setActiveRide(toActiveRide(details));
    } finally {
      setRideRequest(null);
    }
  }, t('homeRideUnavailable'));
  const acceptRide = () => rideRequest && acceptOffer(rideRequest.rideId);

  // App ouverte depuis l'écran d'appel : affiche la demande, ou l'accepte directement (« Accepter »)
  const acceptOfferRef = useRef(acceptOffer);
  acceptOfferRef.current = acceptOffer;
  useEffect(() => {
    const handle = (url: string | null | undefined) => {
      const link = url ? parseRideUrl(url) : null;
      if (!link || handledRideLinks.has(url!)) return;
      handledRideLinks.add(url!);
      dismissRideOffer(link.offer.rideId);
      navigation.navigate('Main');
      if (link.action === 'accept') acceptOfferRef.current(link.offer.rideId);
      else setRideRequest((current) => current ?? link.offer);
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [navigation]);

  const rejectRide = () => rideRequest && runRideAction(async () => {
    setRideRequest(null);
    await apiPost(`/rides/${rideRequest.rideId}/reject`, {});
  }, t('homeRejectError'));

  const arriveRide = () => activeRide && runRideAction(async () => {
    await apiPost(`/rides/${activeRide.rideId}/arrive`, {});
    setActiveRide({ ...activeRide, phase: 'ARRIVED' });
  }, t('homeArriveError'));

  const startRide = () => activeRide && runRideAction(async () => {
    await apiPost(`/rides/${activeRide.rideId}/start`, {});
    setActiveRide({ ...activeRide, phase: 'IN_PROGRESS' });
  }, t('homeStartError'));

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
  }, t('homeCompleteError'));

  const submitClientRating = (skip = false) => rideToRate && runRideAction(async () => {
    if (!skip) await apiPost(`/rides/${rideToRate.rideId}/rate-rider`, { stars: clientRating });
    setRideToRate(null);
    loadProfile(); // nombre de courses à jour
  }, t('homeRateError'));

  const callClient = (user: PublicUser) => {
    Linking.openURL(`tel:${user.phone}`).catch(() => Alert.alert(t('homeCallFailed'), user.phone));
  };

  // Avant l'arrivée : itinéraire vers le client. Ensuite : vers la destination (absente en trajet ouvert).
  const navigationTarget = (ride: ActiveRide): { coords: Coordinates; title: string } | null =>
    ride.phase === 'ACCEPTED'
      ? { coords: ride.pickup, title: t('homeGoPickup') }
      : ride.destination ? { coords: ride.destination, title: t('homeGoDestination') } : null;

  const cancelActiveRide = () => {
    if (!activeRide) return;
    Alert.alert(t('homeCancelRideTitle'), t('homeCancelRideMessage'), [
      { text: t('commonNo'), style: 'cancel' },
      {
        text: t('homeYesCancel'), style: 'destructive',
        onPress: () => runRideAction(async () => {
          await apiPost(`/rides/${activeRide.rideId}/driver-cancel`, {});
          setActiveRide(null);
          setMeter(null);
        }, t('homeCancelRideError')),
      },
    ]);
  };

  const ridePhaseAction: Record<RidePhase, { label: string; onPress: () => void }> = {
    ACCEPTED:    { label: t('homeArrived'),      onPress: arriveRide },
    ARRIVED:     { label: t('homeStartRide'),    onPress: startRide },
    IN_PROGRESS: { label: t('homeCompleteRide'), onPress: completeRide },
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
          <Text style={styles.mapPlaceholderText}>{t('homeLocating')}</Text>
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
              <Text style={styles.pillLabel}>{isOnline ? t('commonOnline') : t('commonOffline')}</Text>
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
              <Text style={styles.rateTitle}>{t('homeRideCompleted')(rideToRate.price)}</Text>
              <Avatar photoUrl={rideToRate.user.photoUrl} name={rideToRate.user.name} size={64} color={C.primary} />
              <Text style={styles.rateQuestion}>{t('homeRateClient')(rideToRate.user.name ?? t('commonTheClient'))}</Text>
              <StarRating value={clientRating} onChange={setClientRating} size={36} />
            </View>
            <View style={styles.rideActions}>
              {busy ? <ActivityIndicator color={C.primary} /> : (
                <>
                  <TouchableOpacity style={[styles.rideBtn, styles.rideBtnGhost]} onPress={() => submitClientRating(true)} activeOpacity={0.8}>
                    <Text style={styles.rideBtnGhostText}>{t('commonLater')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rideBtn, styles.rideBtnMain, clientRating === 0 && { opacity: 0.4 }]}
                    onPress={() => submitClientRating()}
                    disabled={clientRating === 0}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.rideBtnMainText}>{t('commonSend')}</Text>
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
                {rideRequest ? t('homeNewRide') : t('homePhaseTitles')[activeRide!.phase]}
              </Text>
              <Text style={styles.ridePrice}>
                {(rideRequest ?? activeRide)!.isOpenTrip ? t('homeMeterPrice') : formatPrice((rideRequest ?? activeRide)!.price)}
              </Text>
            </LinearGradient>

            {/* Client (après acceptation) */}
            {activeRide && (
              <View style={styles.clientRow}>
                <Avatar photoUrl={activeRide.user.photoUrl} name={activeRide.user.name} size={52} color={C.primary} />
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{activeRide.user.name ?? t('commonClient')}</Text>
                  <Text style={styles.clientMeta}>
                    ⭐ {activeRide.user.rating.toFixed(1)} · {t('ridesCount')(activeRide.user.totalRides)}
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
              <Text style={styles.rideLabel}>{t('homeDestination')}</Text>
              <Text style={styles.rideDest} numberOfLines={2}>
                {(rideRequest ?? activeRide)!.isOpenTrip
                  ? t('homeOpenTripClientWillTell')
                  : (rideRequest ?? activeRide)!.destinationName}
              </Text>
            </View>

            {/* Compteur en direct (trajet ouvert en cours) */}
            {activeRide?.isOpenTrip && activeRide.phase === 'IN_PROGRESS' && (
              <View style={styles.meterRow}>
                <Text style={styles.meterPrice}>{meter ? `${meter.price} MRU` : '…'}</Text>
                <Text style={styles.meterStat}>
                  {t('homeMeterStats')(meter ? meter.distanceKm.toFixed(1) : '0.0', meter ? meter.stoppedMinutes : 0)}
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
                  <Text style={styles.rideBtnGhostText}>{t('commonReject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rideBtn, styles.rideBtnMain]} onPress={acceptRide} activeOpacity={0.85}>
                  <Text style={styles.rideBtnMainText}>{t('commonAccept')}</Text>
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
                <Text style={styles.cancelRideText}>{t('homeCancelRide')}</Text>
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
                <Text style={styles.onlineTitle}>{t('homeWaitingRides')}</Text>
              </View>
              <View style={styles.onlineStats}>
                <View style={styles.onlineStat}>
                  <Text style={styles.onlineStatVal}>{todayRides}</Text>
                  <Text style={styles.onlineStatLabel}>{t('homeRidesLower')}</Text>
                </View>
                <View style={styles.onlineStatDiv} />
                <View style={styles.onlineStat}>
                  <Text style={styles.onlineStatVal}>{todayEarnings} MRU</Text>
                  <Text style={styles.onlineStatLabel}>{t('homeToday')}</Text>
                </View>
              </View>
            </LinearGradient>
            <TouchableOpacity style={styles.goOfflineBtn} onPress={toggleOnline} activeOpacity={0.8}>
              <Text style={styles.goOfflineBtnText}>{t('homeGoOffline')}</Text>
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
                <Text style={styles.offlineTitle}>{t('homeYouAreOffline')}</Text>
                <Text style={styles.offlineSub}>{t('homeActivateToReceive')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleOnline} activeOpacity={0.85} style={styles.goOnlineBtnWrap}>
              <LinearGradient
                colors={G.accent}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.goOnlineBtn}
              >
                <Text style={styles.goOnlineBtnText}>{t('commonOnline')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      <CancellationModal notice={cancelNotice} onClose={() => setCancelNotice(null)} />
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
