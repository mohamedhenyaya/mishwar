import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, Platform, Dimensions,
  Animated, AppState,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import MapComponent from '../components/MapComponent';
import Avatar from '../components/Avatar';
import { socketService } from '../services/socket';
import { apiGet } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { Coordinates, Driver, PublicUser, RideDetails, RootStackParamList, ridePrice } from '../types';

const { width } = Dimensions.get('window');
const DELTA = { latitudeDelta: 0.0122, longitudeDelta: 0.0121 };

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  blue:    '#007AFF',
  bg:      '#F5F6FA',
  text:    '#1A1A1A',
  subtle:  '#7F8C8D',
  white:   '#FFFFFF',
  card:    '#FFFFFF',
  border:  '#EAECF0',
};

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface NearbyDriverApi {
  id: string; name: string; phone: string;
  status: string; vehicleType: string; rating: number;
  latitude: number; longitude: number; distanceMeters: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDriver(d: any): Driver {
  return {
    id: d.id,
    name: d.name ?? 'Chauffeur',
    vehicleType: (d.vehicleType ?? 'sedan') as Driver['vehicleType'],
    rating: Number(d.rating ?? 5),
    isAvailable: d.status === 'ONLINE' || d.isAvailable === true,
    coordinate: {
      latitude:  Number(d.latitude  ?? d.coordinate?.latitude  ?? 0),
      longitude: Number(d.longitude ?? d.coordinate?.longitude ?? 0),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const isFocused = useIsFocused();

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [region,       setRegion]       = useState<Region | null>(null);
  const [drivers,      setDrivers]      = useState<Driver[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);

  // Animations
  const headerAnim  = useRef(new Animated.Value(0)).current;
  const searchAnim  = useRef(new Animated.Value(0)).current;
  const searchScale = useRef(new Animated.Value(1)).current;

  const mountAnimations = () => {
    Animated.stagger(80, [
      Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.spring(searchAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();
  };

  // ── API chauffeurs proches ─────────────────────────────────────────────────

  const fetchNearbyDrivers = useCallback(async (lat: number, lng: number) => {
    try {
      const data = await apiGet<NearbyDriverApi[]>(
        `/drivers/nearby?lat=${lat}&lng=${lng}&radius=5000`,
      );
      setDrivers(data.map(toDriver));
    } catch { /* silencieux */ }
  }, []);

  // ── Géolocalisation ────────────────────────────────────────────────────────

  const initLocation = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission de géolocalisation refusée.');
      setIsLoading(false);
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords: Coordinates = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      setRegion({ ...coords, ...DELTA });
      await fetchNearbyDrivers(coords.latitude, coords.longitude);
      socketService.emitUserLocation(coords);
    } catch {
      setErrorMsg("Impossible d'obtenir votre position.");
    }

    setIsLoading(false);
    mountAnimations();
  }, [fetchNearbyDrivers]);

  // ── Socket ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    let unsubscribePosition = () => {};

    (async () => {
      // Authentifié : le serveur place le socket dans la room user:<id> (événements de course)
      const token = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (cancelled) return;
      socketService.connect(token ?? undefined);
      socketService.onDriversUpdate((updated) =>
        setDrivers((updated as unknown as NearbyDriverApi[]).map(toDriver))
      );
      unsubscribePosition = socketService.subscribe('driver:position', (p) =>
        setDrivers((prev) =>
          prev.map((d) =>
            d.id === p.driverId
              ? { ...d, coordinate: { latitude: p.latitude, longitude: p.longitude } }
              : d
          )
        )
      );
    })();

    return () => {
      cancelled = true;
      socketService.offDriversUpdate();
      unsubscribePosition();
      socketService.disconnect();
    };
  }, []);

  // ── Rafraîchissement automatique des chauffeurs disponibles ────────────────

  const userLocationRef = useRef<Coordinates | null>(null);
  userLocationRef.current = userLocation;

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      const loc = userLocationRef.current;
      if (loc) fetchNearbyDrivers(loc.latitude, loc.longitude);
    };

    // Un chauffeur se connecte, se déconnecte ou devient occupé → liste rechargée
    // (regroupé sur 800 ms quand plusieurs changements arrivent ensemble)
    const unsubscribe = socketService.subscribe('driver:status', () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(refresh, 800);
    });
    // Filet de sécurité si un événement est manqué, et au retour au premier plan
    const interval = setInterval(refresh, 30_000);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      unsubscribe();
      if (debounce) clearTimeout(debounce);
      clearInterval(interval);
      appState.remove();
    };
  }, [fetchNearbyDrivers]);

  // Reprise d'une course en cours (app relancée pendant une recherche ou un trajet)
  useEffect(() => {
    apiGet<RideDetails | null>('/rides/active')
      .then((ride) => {
        if (!ride) return;
        if (ride.status === 'PENDING') {
          navigation.navigate('Match', { rideId: ride.id, price: ridePrice(ride) });
        } else {
          navigation.navigate('Trip', { rideId: ride.id });
        }
      })
      .catch(() => { /* pas de course active */ });
  }, []);

  // Profil (photo + prénom) rechargé à chaque retour sur l'accueil
  const [profile, setProfile] = useState<PublicUser | null>(null);
  useFocusEffect(
    useCallback(() => {
      apiGet<PublicUser>('/users/me').then(setProfile).catch(() => {});
      const loc = userLocationRef.current;
      if (loc) fetchNearbyDrivers(loc.latitude, loc.longitude);
    }, [fetchNearbyDrivers]),
  );

  useEffect(() => { initLocation(); }, [initLocation]);

  // ── Interaction barre de recherche ────────────────────────────────────────

  const handleSearchPress = () => {
    Animated.sequence([
      Animated.timing(searchScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(searchScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start(() => {
      navigation.navigate('Booking', {
        startLatitude:  userLocation?.latitude,
        startLongitude: userLocation?.longitude,
      });
    });
  };

  const centerOnUser = () => {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.animateToRegion({ ...userLocation, ...DELTA }, 400);
  };

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={styles.loadingText}>Localisation en cours…</Text>
      </View>
    );
  }

  if (errorMsg || !region) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorEmoji}>📍</Text>
        <Text style={styles.errorText}>{errorMsg ?? 'Position indisponible.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={initLocation}>
          <Text style={styles.retryLabel}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const headerTranslate = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] });
  const searchTranslate = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0]  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Carte démontée quand un autre écran est au premier plan :
          une seule carte native à la fois (soupçonnée des fermetures d'app sur iOS) */}
      {isFocused && (
        <MapComponent
          ref={mapRef}
          initialRegion={region}
          userLocation={userLocation}
          drivers={drivers}
          onDriverPress={(d) => console.log('Driver:', d.name)}
        />
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          { top: insets.top + 12 },
          { opacity: headerAnim, transform: [{ translateY: headerTranslate }] },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Bonjour{profile?.name ? ` ${profile.name.split(' ')[0]}` : ''} 👋</Text>
          <Text style={styles.headerTitle}>Où souhaitez-vous aller ?</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
          <Avatar photoUrl={profile?.photoUrl} name={profile?.name ?? 'U'} size={40} color={C.blue} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Badge chauffeurs ──────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.driversBadge,
          { top: insets.top + 96 },
          { opacity: headerAnim },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: drivers.length > 0 ? '#34C759' : '#C7C7CC' }]} />
        <Text style={styles.badgeText}>
          {drivers.length > 0
            ? `${drivers.length} chauffeur${drivers.length > 1 ? 's' : ''} disponible${drivers.length > 1 ? 's' : ''}`
            : 'Aucun chauffeur à proximité'}
        </Text>
      </Animated.View>

      {/* ── Recentrer ─────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.recenterBtn, { bottom: insets.bottom + 150 }]}
        onPress={centerOnUser}
        activeOpacity={0.8}
      >
        <Text style={styles.recenterIcon}>⊕</Text>
      </TouchableOpacity>

      {/* ── Barre de recherche ────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.searchBarWrap,
          { bottom: insets.bottom + 28, width: width - 32 },
          { opacity: searchAnim, transform: [{ translateY: searchTranslate }, { scale: searchScale }] },
        ]}
      >
        <TouchableOpacity style={styles.searchBar} onPress={handleSearchPress} activeOpacity={1}>
          <View style={styles.searchIconBg}>
            <Text style={styles.searchIconText}>📍</Text>
          </View>
          <Text style={styles.searchPlaceholder}>Où allez-vous ?</Text>
          <View style={styles.searchCTA}>
            <Text style={styles.searchCTAText}>→</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 6,
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg, padding: 32, gap: 14,
  },
  loadingText: { fontSize: 15, color: C.subtle, marginTop: 8 },
  errorEmoji: { fontSize: 44 },
  errorText:  { fontSize: 15, color: C.text, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: C.blue, paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: 14, marginTop: 6,
  },
  retryLabel: { color: C.white, fontWeight: '700', fontSize: 15 },

  // Header
  header: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: C.white, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...CARD_SHADOW,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 12, color: C.subtle, marginBottom: 2, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 16 },

  // Badge
  driversBadge: {
    position: 'absolute', left: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 24,
    paddingHorizontal: 12, paddingVertical: 7, gap: 7,
    ...CARD_SHADOW,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: C.text },


  // Recentrer
  recenterBtn: {
    position: 'absolute', right: 16,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
    ...CARD_SHADOW,
  },
  recenterIcon: {
    fontSize: 22, color: C.text,
    marginTop: Platform.OS === 'ios' ? -1 : 0,
  },

  // Search bar
  searchBarWrap: {
    position: 'absolute', alignSelf: 'center',
  },
  searchBar: {
    height: 64, backgroundColor: C.white, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12,
    ...CARD_SHADOW,
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 10,
  },
  searchIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center',
  },
  searchIconText: { fontSize: 18 },
  searchPlaceholder: { flex: 1, fontSize: 16, color: '#AEAEB2', fontWeight: '500' },
  searchCTA: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center',
  },
  searchCTAText: {
    color: C.white, fontSize: 18, fontWeight: '700',
    marginTop: Platform.OS === 'ios' ? -1 : 0,
  },
});