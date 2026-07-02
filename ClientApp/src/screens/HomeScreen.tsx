import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, Dimensions,
  Animated, ScrollView,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapComponent from '../components/MapComponent';
import { IconButton, StatusBadge } from '../components/ui';
import { socketService } from '../services/socket';
import { apiGet } from '../services/api';
import { Coordinates, Driver, TabScreenProps } from '../types';
import { colors, radius, shadows, spacing, typography } from '../theme';

const { width } = Dimensions.get('window');
const DELTA = { latitudeDelta: 0.0122, longitudeDelta: 0.0121 };

type Props = TabScreenProps<'Home'>;

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

const CATEGORIES = [
  { id: 'economy', label: 'Économie', icon: 'car-outline' as const, desc: '~3 min' },
  { id: 'comfort', label: 'Confort',  icon: 'car-sport-outline' as const, desc: '~5 min' },
  { id: 'premium', label: 'Premium',  icon: 'sparkles-outline' as const, desc: '~7 min' },
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
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Localisation en cours…</Text>
      </View>
    );
  }

  if (errorMsg || !region) {
    return (
      <View style={styles.centered}>
        <Ionicons name="location-outline" size={44} color={colors.textTertiary} />
        <Text style={styles.errorText}>{errorMsg ?? 'Position indisponible.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={initLocation} activeOpacity={0.88}>
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
        <TouchableOpacity
          style={styles.avatarCircle}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.85}
        >
          <Text style={styles.avatarText}>U</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Badge chauffeurs ──────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.driversBadgeWrap,
          { top: insets.top + 96 },
          { opacity: headerAnim },
        ]}
      >
        <StatusBadge
          tone={drivers.length > 0 ? 'success' : 'neutral'}
          label={
            drivers.length > 0
              ? `${drivers.length} chauffeur${drivers.length > 1 ? 's' : ''} disponible${drivers.length > 1 ? 's' : ''}`
              : 'Aucun chauffeur à proximité'
          }
        />
      </Animated.View>

      {/* ── Chips catégories ──────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.chipsContainer,
          { bottom: 150 },
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
                <Ionicons name={cat.icon} size={20} color={active ? colors.accent : colors.text} />
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
      <IconButton
        name="locate"
        size="lg"
        onPress={centerOnUser}
        style={[styles.recenterBtn, { bottom: 150 }]}
      />

      {/* ── Barre de recherche ────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.searchBarWrap,
          { bottom: 20, width: width - 32 },
          { opacity: searchAnim, transform: [{ translateY: searchTranslate }, { scale: searchScale }] },
        ]}
      >
        <TouchableOpacity style={styles.searchBar} onPress={handleSearchPress} activeOpacity={1}>
          <View style={styles.searchIconBg}>
            <Ionicons name="location" size={18} color={colors.accent} />
          </View>
          <Text style={styles.searchPlaceholder}>Où allez-vous ?</Text>
          <View style={styles.searchCTA}>
            <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg, padding: spacing.xxl, gap: spacing.md,
  },
  loadingText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  errorText:  { ...typography.body, color: colors.text, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.xxl, paddingVertical: 13,
    borderRadius: radius.md, marginTop: spacing.sm,
  },
  retryLabel: { ...typography.button, color: colors.textInverse },

  // Header
  header: {
    position: 'absolute', left: spacing.lg, right: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...shadows.md,
  },
  headerLeft: { flex: 1 },
  greeting: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  headerTitle: { ...typography.h3, color: colors.text },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.md,
  },
  avatarText: { color: colors.textInverse, fontWeight: '800', fontSize: 16 },

  // Badge
  driversBadgeWrap: { position: 'absolute', left: spacing.lg },

  // Chips
  chipsContainer: { position: 'absolute', left: 0, right: 0 },
  chipsScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderWidth: 1.5, borderColor: 'transparent',
    ...shadows.md,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipLabel: { ...typography.bodySm, fontWeight: '700', color: colors.text },
  chipLabelActive: { color: colors.accent },
  chipDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  chipDescActive: { color: colors.accent, opacity: 0.85 },

  // Recentrer
  recenterBtn: { position: 'absolute', right: spacing.lg },

  // Search bar
  searchBarWrap: { position: 'absolute', alignSelf: 'center' },
  searchBar: {
    height: 64, backgroundColor: colors.surface, borderRadius: radius.xl,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.md,
    ...shadows.lg,
  },
  searchIconBg: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center',
  },
  searchPlaceholder: { flex: 1, ...typography.bodyLg, color: colors.placeholder },
  searchCTA: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
});
