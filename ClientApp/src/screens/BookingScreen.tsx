import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Alert, ScrollView, Animated, Platform, Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { apiPost } from '../services/api';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

interface CreateRideResponse { id: string; status: string }

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  blue:   '#007AFF',
  bg:     '#F5F6FA',
  text:   '#1A1A1A',
  subtle: '#7F8C8D',
  white:  '#FFFFFF',
  border: '#EAECF0',
  blueBg: '#EBF5FF',
};

// ── Données ───────────────────────────────────────────────────────────────────
const RECENT = [
  { id: '1', label: 'Aéroport Houari Boumediene', sub: 'Dar El Beïda',         icon: '✈️' },
  { id: '2', label: 'Centre Commercial Bab Ezzouar', sub: 'Bab Ezzouar',       icon: '🛍️' },
  { id: '3', label: 'Université USTHB',              sub: 'Bab Ezzouar',       icon: '🎓' },
  { id: '4', label: 'Grande Mosquée d\'Alger',       sub: 'Mohammadia',        icon: '🕌' },
];

const VEHICLE_TYPES = [
  {
    id: 'economy', label: 'Économie', icon: '🚗',
    desc: 'Voiture standard', price: 'Dès 300 DA', eta: '~3 min',
  },
  {
    id: 'comfort', label: 'Confort', icon: '🚙',
    desc: 'Berline confortable', price: 'Dès 500 DA', eta: '~5 min',
  },
  {
    id: 'premium', label: 'Premium', icon: '⭐',
    desc: 'Véhicule haut de gamme', price: 'Dès 800 DA', eta: '~7 min',
  },
];

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────

export default function BookingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { destination: initDest = '', startLatitude, startLongitude } = route.params ?? {};

  const [destination,    setDestination]    = useState(initDest);
  const [vehicleType,    setVehicleType]    = useState('economy');
  const [loading,        setLoading]        = useState(false);
  const [inputFocused,   setInputFocused]   = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Animations
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(24)).current;
  const focusBorder = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleFocus = () => {
    setInputFocused(true);
    Animated.timing(focusBorder, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    setInputFocused(false);
    Animated.timing(focusBorder, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = focusBorder.interpolate({
    inputRange: [0, 1], outputRange: [C.border, C.blue],
  });

  // ── Confirmer ──────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!destination.trim()) return;
    setLoading(true);
    try {
      const ride = await apiPost<CreateRideResponse, object>('/rides', {
        startLatitude:   startLatitude  ?? 0,
        startLongitude:  startLongitude ?? 0,
        destinationName: destination.trim(),
        vehicleType,
      });
      navigation.navigate('Match', { rideId: ride.id });
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de créer la course.');
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = destination.trim().length >= 3 && !loading;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle course</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Barre trajet ──────────────────────────────────────────── */}
          <View style={styles.routeCard}>
            {/* Origine */}
            <View style={styles.routeRow}>
              <View style={styles.originDot} />
              <Text style={styles.routeLabel} numberOfLines={1}>
                {startLatitude ? `Ma position actuelle` : 'Position de départ'}
              </Text>
            </View>
            <View style={styles.routeSeparator}>
              <View style={styles.routeLine} />
            </View>
            {/* Destination input */}
            <View style={styles.routeRow}>
              <View style={styles.destDot} />
              <Animated.View style={[styles.inputWrap, { borderColor }]}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="Où allez-vous ?"
                  placeholderTextColor="#AEAEB2"
                  returnKeyType="search"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onSubmitEditing={handleConfirm}
                  autoFocus={!initDest}
                />
                {destination.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setDestination('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            </View>
          </View>

          {/* ── Type de véhicule ──────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Type de véhicule</Text>
          <View style={styles.vehicleGrid}>
            {VEHICLE_TYPES.map((v) => {
              const active = vehicleType === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleCard, active && styles.vehicleCardActive]}
                  onPress={() => setVehicleType(v.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.vehicleIcon}>{v.icon}</Text>
                  <Text style={[styles.vehicleName, active && styles.vehicleNameActive]}>
                    {v.label}
                  </Text>
                  <Text style={[styles.vehicleDesc, active && styles.vehicleDescActive]}>
                    {v.desc}
                  </Text>
                  <View style={styles.vehicleFooter}>
                    <Text style={[styles.vehiclePrice, active && styles.vehiclePriceActive]}>
                      {v.price}
                    </Text>
                    <Text style={[styles.vehicleEta, active && styles.vehicleEtaActive]}>
                      {v.eta}
                    </Text>
                  </View>
                  {active && <View style={styles.vehicleCheck}><Text style={styles.vehicleCheckIcon}>✓</Text></View>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Destinations récentes ─────────────────────────────────── */}
          {!inputFocused && (
            <>
              <Text style={styles.sectionTitle}>Récents</Text>
              <View style={styles.recentList}>
                {RECENT.map((place, idx) => (
                  <TouchableOpacity
                    key={place.id}
                    style={[
                      styles.recentItem,
                      idx === RECENT.length - 1 && styles.recentItemLast,
                    ]}
                    onPress={() => setDestination(place.label)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentIconWrap}>
                      <Text style={styles.recentIconText}>{place.icon}</Text>
                    </View>
                    <View style={styles.recentContent}>
                      <Text style={styles.recentLabel} numberOfLines={1}>{place.label}</Text>
                      <Text style={styles.recentSub}>{place.sub}</Text>
                    </View>
                    <Text style={styles.recentChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Bouton confirmer (fixe en bas) ──────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}
          activeOpacity={0.88}
        >
          {loading ? (
            <Text style={styles.confirmBtnLabel}>Création de la course…</Text>
          ) : (
            <>
              <Text style={styles.confirmBtnLabel}>Confirmer la destination</Text>
              <View style={styles.confirmArrow}>
                <Text style={styles.confirmArrowText}>→</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 5,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.bg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
    ...CARD_SHADOW,
  },
  backIcon: { fontSize: 20, color: C.text, fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  // Route card
  routeCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 16,
    marginBottom: 24, ...CARD_SHADOW,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  originDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.blue, borderWidth: 2.5, borderColor: '#CCE4FF',
  },
  routeLabel: { fontSize: 14, color: C.subtle, fontWeight: '500', flex: 1 },
  routeSeparator: { paddingLeft: 5, paddingVertical: 6 },
  routeLine: { width: 2, height: 20, backgroundColor: C.border, borderRadius: 1, marginLeft: 1 },
  destDot: {
    width: 12, height: 12, borderRadius: 3,
    backgroundColor: C.text,
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    backgroundColor: C.bg, paddingHorizontal: 12,
    minHeight: 44,
  },
  input: {
    flex: 1, fontSize: 15, color: C.text,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  clearIcon: { fontSize: 14, color: C.subtle, paddingLeft: 8 },

  // Section title
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: C.subtle,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 12, marginLeft: 2,
  },

  // Vehicle cards
  vehicleGrid: {
    flexDirection: 'row', gap: 10, marginBottom: 28,
  },
  vehicleCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 16,
    padding: 14, borderWidth: 2, borderColor: 'transparent',
    ...CARD_SHADOW, gap: 4, position: 'relative',
  },
  vehicleCardActive: {
    borderColor: C.blue, backgroundColor: C.blueBg,
  },
  vehicleIcon: { fontSize: 24, marginBottom: 4 },
  vehicleName: { fontSize: 13, fontWeight: '700', color: C.text },
  vehicleNameActive: { color: C.blue },
  vehicleDesc: { fontSize: 11, color: C.subtle, lineHeight: 15 },
  vehicleDescActive: { color: '#4A9FE5' },
  vehicleFooter: { marginTop: 6, gap: 2 },
  vehiclePrice: { fontSize: 12, fontWeight: '700', color: C.text },
  vehiclePriceActive: { color: C.blue },
  vehicleEta: { fontSize: 11, color: C.subtle },
  vehicleEtaActive: { color: '#4A9FE5' },
  vehicleCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center',
  },
  vehicleCheckIcon: { color: C.white, fontSize: 10, fontWeight: '800' },

  // Recent list
  recentList: {
    backgroundColor: C.white, borderRadius: 20,
    overflow: 'hidden', ...CARD_SHADOW,
  },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  recentItemLast: { borderBottomWidth: 0 },
  recentIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  recentIconText: { fontSize: 20 },
  recentContent: { flex: 1 },
  recentLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  recentSub: { fontSize: 12, color: C.subtle, marginTop: 2 },
  recentChevron: { fontSize: 20, color: '#C7C7CC', fontWeight: '300' },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  confirmBtn: {
    height: 58, backgroundColor: C.blue, borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  confirmBtnLabel: { color: C.white, fontSize: 16, fontWeight: '700' },
  confirmArrow: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmArrowText: { color: C.white, fontSize: 16, fontWeight: '700' },
});