import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, Platform, Dimensions,
  Animated, ScrollView,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapComponent from '../components/MapComponent';
import { socketService } from '../services/socket';
import { apiGet } from '../services/api';
import { Coordinates, Driver, RootStackParamList } from '../types';

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

// ── Chips de catégorie ────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'economy', label: 'Économie', icon: '🚗', desc: '~3 min' },
  { id: 'comfort', label: 'Confort',  icon: '🚙', desc: '~5 min' },
  { id: 'premium', label: 'Premium',  icon: '✨', desc: '~7 min' },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [region,       setRegion]       = useState<Region | null>(null);
  const [drivers,      setDrivers]      = useState<Driver[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('economy');

  // Animations
  const headerAnim  = useRef(new Animated.Value(0)).current;
  const searchAnim  = useRef(new Animated.Value(0)).current;
  const searchScale = useRef(new Animated.Value(1)).current;
  const chipsAnim   = useRef(new Animated.Value(0)).current;

  const mountAnimations = () => {
    Animated.stagger(80, [
      Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.spring(chipsAnim,  { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
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
    socketService.connect();
    socketService.onDriversUpdate((updated) =>
      setDrivers((updated as unknown as NearbyDriverApi[]).map(toDriver))
    );
    socketService.onDriverPositionUpdate((updated) =>
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === updated.id
            ? { ...d, coordinate: { latitude: (updated as any).latitude ?? updated.coordinate?.latitude, longitude: (updated as any).longitude ?? updated.coordinate?.longitude } }
            : d
        )
      )
    );
    return () => {
      socketService.offDriversUpdate();
      socketService.offDriverPositionUpdate();
      socketService.disconnect();
    };
  }, []);

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
  const chipsTranslate  = chipsAnim.interpolate({  inputRange: [0, 1], outputRange: [-16, 0] });
  const searchTranslate = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0]  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <MapComponent
        ref={mapRef}
        initialRegion={region}
        userLocation={userLocation}
        drivers={drivers}
        onDriverPress={(d) => console.log('Driver:', d.name)}
      />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          { top: insets.top + 12 },
          { opacity: headerAnim, transform: [{ translateY: headerTranslate }] },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.headerTitle}>Où souhaitez-vous aller ?</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>U</Text>
        </View>
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

      {/* ── Chips catégories ──────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.chipsContainer,
          { bottom: insets.bottom + 150 },
          { opacity: chipsAnim, transform: [{ translateY: chipsTranslate }] },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.chipIcon}>{cat.icon}</Text>
                <View>
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {cat.label}
                  </Text>
                  <Text style={[styles.chipDesc, active && styles.chipDescActive]}>
                    {cat.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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

  // Chips
  chipsContainer: {
    position: 'absolute', left: 0, right: 0,
  },
  chipsScroll: {
    paddingHorizontal: 16, gap: 10,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1.5, borderColor: 'transparent',
    ...CARD_SHADOW,
  },
  chipActive: {
    borderColor: C.blue,
    backgroundColor: '#EBF5FF',
  },
  chipIcon: { fontSize: 20 },
  chipLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  chipLabelActive: { color: C.blue },
  chipDesc: { fontSize: 11, color: C.subtle, marginTop: 1 },
  chipDescActive: { color: C.blue, opacity: 0.8 },

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