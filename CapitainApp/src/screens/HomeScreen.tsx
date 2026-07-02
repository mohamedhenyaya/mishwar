import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { captainSocketService } from '../services/socket';
import { Coordinates, HomeScreenProps } from '../types';
import { C, G, SH, RADIUS } from '../theme';

const { width: SW } = Dimensions.get('window');
const DELTA = { latitudeDelta: 0.012, longitudeDelta: 0.012 };

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [location,   setLocation]   = useState<Coordinates | null>(null);
  const [region,     setRegion]     = useState<Region | null>(null);
  const [isOnline,   setIsOnline]   = useState(false);
  const [now,        setNow]        = useState(new Date());
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayRides,    setTodayRides]    = useState(0);

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

  useEffect(() => {
    initLocation();
    captainSocketService.connect();
    return () => captainSocketService.disconnect();
  }, [initLocation]);

  // Location tracking when online
  useEffect(() => {
    if (!isOnline || !location) return;
    const id = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords: Coordinates = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setLocation(coords);
        captainSocketService.updateLocation(coords);
      } catch { /* silent */ }
    }, 10_000);
    return () => clearInterval(id);
  }, [isOnline, location]);

  const toggleOnline = () => {
    Animated.sequence([
      Animated.timing(pillScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(pillScale, { toValue: 1,   tension: 80, useNativeDriver: true }),
    ]).start();
    if (!isOnline && location) captainSocketService.goOnline(location);
    else captainSocketService.goOffline();
    setIsOnline((v) => !v);
    if (!isOnline) { setTodayRides((n) => n); }
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
        />
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
        {isOnline ? (
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
