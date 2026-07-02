import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  Animated, Dimensions, ScrollView,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';

import { captainSocketService } from '../services/socket';
import { SECURE_STORE_KEY, APP_VERSION } from '../config/constants';
import { Coordinates, RootStackParamList } from '../types';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const { width: SW } = Dimensions.get('window');
const DRAWER_WIDTH  = SW * 0.80;
const DELTA         = { latitudeDelta: 0.012, longitudeDelta: 0.012 };

const MENU_ITEMS = [
  { key: 'Courses',         icon: '🚗', color: '#EDE9FF', route: null           },
  { key: 'Notifications',   icon: '🔔', color: '#FFF3E0', route: null           },
  { key: 'Historique',      icon: '📋', color: '#E8F5E9', route: 'Historique' as const },
  { key: 'Mon compte',      icon: '💰', color: '#E3F2FD', route: 'MonCompte'  as const },
  { key: 'Paramètres',      icon: '⚙️', color: '#F3E5F5', route: 'Parametres' as const },
  { key: 'Nous contacter',  icon: '💬', color: '#E0F7FA', route: null           },
];

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [location,   setLocation]   = useState<Coordinates | null>(null);
  const [region,     setRegion]     = useState<Region | null>(null);
  const [isOnline,   setIsOnline]   = useState(false);
  const [now,        setNow]        = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayRides,    setTodayRides]    = useState(0);

  const drawerAnim  = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
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
        <TouchableOpacity style={styles.topBtn} onPress={openDrawer} activeOpacity={0.8}>
          <Text style={styles.topBtnIcon}>☰</Text>
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
            <Text style={styles.topBtnIcon}>◎</Text>
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
              <Text style={styles.onlineTitle}>🟢  En attente de courses…</Text>
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
              <Text style={styles.offlineIcon}>🔴</Text>
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
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>M</Text>
              </View>
            </LinearGradient>
            <View style={[styles.avatarBadge, { backgroundColor: isOnline ? C.accent : C.danger }]} />
          </View>
          <Text style={styles.drawerName}>MohamedhenYaya</Text>
          <Text style={styles.drawerPhone}>+22220122724</Text>

          {/* Rating chip */}
          <View style={styles.ratingChip}>
            <Text style={styles.ratingIcon}>⭐</Text>
            <Text style={styles.ratingText}>4.9</Text>
            <Text style={styles.ratingDot}>·</Text>
            <Text style={styles.ratingText}>238 courses</Text>
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
  topBtnIcon: { fontSize: 18, color: C.dark },

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
  onlineTitle:  { fontSize: 14, fontWeight: '700', color: C.white, marginBottom: 12 },
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
  offlineIcon:  { fontSize: 24 },
  offlineTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  offlineSub:   { fontSize: 12, color: C.sub, marginTop: 2 },
  goOnlineBtnWrap: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SH.green },
  goOnlineBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  goOnlineBtnText: { fontSize: 14, fontWeight: '800', color: C.white },

  // ── Overlay
  overlay: { backgroundColor: '#000', zIndex: 20 },

  // ── Drawer
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    width: DRAWER_WIDTH, backgroundColor: C.surface, zIndex: 30,
    ...SH.dark,
  },
  drawerHeader: {
    paddingHorizontal: 24, paddingBottom: 24, overflow: 'hidden',
  },
  drawerBlob: {
    position: 'absolute', top: -60, right: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.primaryLt, opacity: 0.1,
  },

  // Avatar
  avatarWrap: { position: 'relative', alignSelf: 'flex-start', marginBottom: 14 },
  avatarRing: {
    width: 70, height: 70, borderRadius: 35,
    padding: 2.5, alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 65, height: 65, borderRadius: 32.5,
    backgroundColor: C.darkMid,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: C.white },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2.5, borderColor: C.white,
  },

  drawerName:  { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 4 },
  drawerPhone: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 12 },

  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  ratingIcon: { fontSize: 12 },
  ratingText: { fontSize: 13, color: C.white, fontWeight: '700' },
  ratingDot:  { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  // Menu
  drawerMenu:   { flex: 1 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13, gap: 14,
  },
  menuIconBadge: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  menuEmoji: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, color: C.text, fontWeight: '600' },
  menuChev:  { fontSize: 22, color: C.muted, fontWeight: '300' },
  menuDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 20, marginVertical: 4 },

  // Passenger
  passengerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  passengerContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  passengerIcon:    { fontSize: 22, width: 40, textAlign: 'center' },
  passengerTitle:   { fontSize: 15, fontWeight: '600', color: C.text },
  passengerSub:     { fontSize: 12, color: C.sub, marginTop: 2 },
  passengerBadge:   { backgroundColor: C.surfaceAlt, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  passengerBadgeText: { fontSize: 11, color: C.primary, fontWeight: '700' },

  // Logout
  logoutRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13, gap: 14,
  },

  drawerFooter: { padding: 20, gap: 4 },
  footerLang:    { fontSize: 13, color: C.sub },
  footerVersion: { fontSize: 11, color: C.muted },
});
