import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Alert, ScrollView, Animated, Platform, ActivityIndicator,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { apiGet, apiPost } from '../services/api';
import { searchPlaces, PlaceSuggestion } from '../services/places';
import { RideDetails, RootStackParamList, Tariff } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;
type Mode = 'destination' | 'open';

interface CreateRideResponse { id: string; status: string; price: number | string | null }

// Coordonnées de la destination saisie — null si l'adresse n'est pas reconnue
async function geocodeDestination(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const [match] = await Location.geocodeAsync(address);
    return match ? { latitude: match.latitude, longitude: match.longitude } : null;
  } catch {
    return null;
  }
}

// Destinations des dernières courses du client (sans doublon, hors trajets ouverts)
function recentPlaces(rides: RideDetails[]): PlaceSuggestion[] {
  const seen = new Set<string>();
  const places: PlaceSuggestion[] = [];
  for (const r of rides) {
    if (r.isOpenTrip || r.endLatitude == null || r.endLongitude == null) continue;
    const key = r.destinationName.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({
      id:        r.id,
      label:     r.destinationName,
      sub:       new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      latitude:  Number(r.endLatitude),
      longitude: Number(r.endLongitude),
    });
    if (places.length === 5) break;
  }
  return places;
}

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

// ─────────────────────────────────────────────────────────────────────────────

export default function BookingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { destination: initDest = '', startLatitude, startLongitude } = route.params ?? {};

  const [mode,          setMode]          = useState<Mode>('destination');
  const [destination,   setDestination]   = useState(initDest);
  const [loading,       setLoading]       = useState(false);
  const [suggestions,   setSuggestions]   = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [recents,       setRecents]       = useState<PlaceSuggestion[]>([]);
  const [tariff,        setTariff]        = useState<Tariff | null>(null);

  const inputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    apiGet<RideDetails[]>('/rides/my').then((rides) => setRecents(recentPlaces(rides))).catch(() => {});
    apiGet<Tariff>('/rides/tariff').then(setTariff).catch(() => {});
  }, []);

  // ── Autocomplétion (débounce 350 ms) ────────────────────────────────────────
  useEffect(() => {
    const query = destination.trim();
    if (mode !== 'destination' || query.length < 3 || selectedPlace?.label === destination) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const near = startLatitude != null && startLongitude != null
        ? { latitude: startLatitude, longitude: startLongitude }
        : undefined;
      searchPlaces(query, near, controller.signal)
        .then(setSuggestions)
        .catch(() => { /* requête annulée ou réseau indisponible */ });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [destination, mode]);

  const handleChangeDestination = (text: string) => {
    setDestination(text);
    setSelectedPlace(null);
  };

  const handleSelectPlace = (place: PlaceSuggestion) => {
    setSelectedPlace(place);
    setDestination(place.label);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  // Animations
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(24)).current;
  const focusBorder = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateFocus = (toValue: number) =>
    Animated.timing(focusBorder, { toValue, duration: 200, useNativeDriver: false }).start();

  const borderColor = focusBorder.interpolate({
    inputRange: [0, 1], outputRange: [C.border, C.blue],
  });

  // ── Confirmer ──────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (mode === 'destination' && !destination.trim()) return;
    setLoading(true);
    try {
      const start = { startLatitude: startLatitude ?? 0, startLongitude: startLongitude ?? 0 };
      let body: object;
      if (mode === 'open') {
        body = { ...start, isOpenTrip: true };
      } else {
        // Destination reconnue → le serveur calcule un prix fixe au kilomètre
        const end = selectedPlace ?? await geocodeDestination(destination.trim());
        body = {
          ...start,
          destinationName: destination.trim(),
          endLatitude:     end?.latitude,
          endLongitude:    end?.longitude,
        };
      }
      const ride = await apiPost<CreateRideResponse, object>('/rides', body);
      navigation.replace('Match', {
        rideId: ride.id,
        price:  ride.price != null ? Number(ride.price) : null,
      });
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de créer la course.');
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = !loading && (mode === 'open' || destination.trim().length >= 3);
  const showRecents = mode === 'destination' && suggestions.length === 0 && recents.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  const placeRow = (place: PlaceSuggestion, idx: number, list: PlaceSuggestion[], icon: string) => (
    <TouchableOpacity
      key={place.id}
      style={[styles.placeItem, idx === list.length - 1 && styles.placeItemLast]}
      onPress={() => handleSelectPlace(place)}
      activeOpacity={0.7}
    >
      <View style={styles.placeIconWrap}><Text style={styles.placeIconText}>{icon}</Text></View>
      <View style={styles.placeContent}>
        <Text style={styles.placeLabel} numberOfLines={1}>{place.label}</Text>
        {!!place.sub && <Text style={styles.placeSub} numberOfLines={1}>{place.sub}</Text>}
      </View>
      <Text style={styles.placeChevron}>›</Text>
    </TouchableOpacity>
  );

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

          {/* ── Choix du mode ─────────────────────────────────────────── */}
          <View style={styles.segment}>
            {([['destination', '📍  Destination'], ['open', '⏱  Trajet ouvert']] as const).map(([m, label]) => (
              <TouchableOpacity
                key={m}
                style={[styles.segmentItem, mode === m && styles.segmentItemActive]}
                onPress={() => setMode(m)}
                activeOpacity={0.85}
              >
                <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Barre trajet ──────────────────────────────────────────── */}
          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <View style={styles.originDot} />
              <Text style={styles.routeLabel} numberOfLines={1}>
                {startLatitude ? 'Ma position actuelle' : 'Position de départ'}
              </Text>
            </View>
            <View style={styles.routeSeparator}><View style={styles.routeLine} /></View>
            <View style={styles.routeRow}>
              <View style={styles.destDot} />
              {mode === 'destination' ? (
                <Animated.View style={[styles.inputWrap, { borderColor }]}>
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={destination}
                    onChangeText={handleChangeDestination}
                    placeholder="Où allez-vous ?"
                    placeholderTextColor="#AEAEB2"
                    returnKeyType="search"
                    onFocus={() => animateFocus(1)}
                    onBlur={() => animateFocus(0)}
                    onSubmitEditing={handleConfirm}
                    autoFocus={!initDest}
                  />
                  {destination.length > 0 && (
                    <TouchableOpacity
                      onPress={() => handleChangeDestination('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.clearIcon}>✕</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              ) : (
                <Text style={styles.openTripDest}>Destination libre — à indiquer au chauffeur</Text>
              )}
            </View>
          </View>

          {/* ── Trajet ouvert : explication + tarif ───────────────────── */}
          {mode === 'open' && (
            <View style={styles.openCard}>
              <Text style={styles.openTitle}>Prix au compteur, en temps réel</Text>
              <Text style={styles.openText}>
                Le montant évolue selon la distance parcourue et la durée du trajet.
                Vous le suivez en direct pendant la course.
              </Text>
              {tariff && (
                <View style={styles.tariffRow}>
                  <View style={styles.tariffItem}>
                    <Text style={styles.tariffValue}>{tariff.baseFare}</Text>
                    <Text style={styles.tariffLabel}>{tariff.currency} prise en charge</Text>
                  </View>
                  <View style={styles.tariffItem}>
                    <Text style={styles.tariffValue}>{tariff.perKm}</Text>
                    <Text style={styles.tariffLabel}>{tariff.currency} / km</Text>
                  </View>
                  <View style={styles.tariffItem}>
                    <Text style={styles.tariffValue}>{tariff.perMinute}</Text>
                    <Text style={styles.tariffLabel}>{tariff.currency} / min</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Suggestions d'adresses ────────────────────────────────── */}
          {mode === 'destination' && suggestions.length > 0 && (
            <View style={styles.placeList}>
              {suggestions.map((p, i) => placeRow(p, i, suggestions, '📍'))}
            </View>
          )}

          {/* ── Destinations récentes (historique réel) ───────────────── */}
          {showRecents && (
            <>
              <Text style={styles.sectionTitle}>Récents</Text>
              <View style={styles.placeList}>
                {recents.map((p, i) => placeRow(p, i, recents, '🕘'))}
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
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Text style={styles.confirmBtnLabel}>
                {mode === 'open' ? 'Commander un trajet ouvert' : 'Confirmer la destination'}
              </Text>
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

  // Segment
  segment: {
    flexDirection: 'row', backgroundColor: '#E9EBF0', borderRadius: 14,
    padding: 4, marginBottom: 14,
  },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  segmentItemActive: { backgroundColor: C.white, ...CARD_SHADOW },
  segmentText: { fontSize: 14, fontWeight: '600', color: C.subtle },
  segmentTextActive: { color: C.text, fontWeight: '700' },

  // Route card
  routeCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 16,
    marginBottom: 20, ...CARD_SHADOW,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  originDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.blue, borderWidth: 2.5, borderColor: '#CCE4FF',
  },
  routeLabel: { fontSize: 14, color: C.subtle, fontWeight: '500', flex: 1 },
  routeSeparator: { paddingLeft: 5, paddingVertical: 6 },
  routeLine: { width: 2, height: 20, backgroundColor: C.border, borderRadius: 1, marginLeft: 1 },
  destDot: { width: 12, height: 12, borderRadius: 3, backgroundColor: C.text },
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
  openTripDest: { flex: 1, fontSize: 14, color: C.text, fontWeight: '600', paddingVertical: 12 },

  // Trajet ouvert
  openCard: {
    backgroundColor: C.blueBg, borderRadius: 20, padding: 18, gap: 8,
    borderWidth: 1.5, borderColor: '#CCE4FF', marginBottom: 20,
  },
  openTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  openText:  { fontSize: 13, color: C.subtle, lineHeight: 19 },
  tariffRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  tariffItem: { flex: 1, backgroundColor: C.white, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  tariffValue: { fontSize: 18, fontWeight: '800', color: C.blue },
  tariffLabel: { fontSize: 11, color: C.subtle, marginTop: 2, textAlign: 'center' },

  // Section title
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: C.subtle,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 12, marginLeft: 2,
  },

  // Listes de lieux (suggestions + récents)
  placeList: {
    backgroundColor: C.white, borderRadius: 20,
    overflow: 'hidden', marginBottom: 20, ...CARD_SHADOW,
  },
  placeItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  placeItemLast: { borderBottomWidth: 0 },
  placeIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  placeIconText: { fontSize: 20 },
  placeContent: { flex: 1 },
  placeLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  placeSub: { fontSize: 12, color: C.subtle, marginTop: 2 },
  placeChevron: { fontSize: 20, color: '#C7C7CC', fontWeight: '300' },

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
