import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import MapPickerModal, { PickedPlace } from '../components/MapPickerModal';
import OpenTripOriginModal from '../components/OpenTripOriginModal';
import LanguagePickerButton from '../components/LanguagePickerButton';
import { useLanguage } from '../i18n/LanguageContext';
import { Button } from '../components/ui';
import { apiGet, apiPost } from '../services/api';
import { socketService } from '../services/socket';
import * as SecureStore from '../services/secureStorage';
import { SECURE_STORE_KEY } from '../config/constants';
import AvailableDriversBadge from '../components/AvailableDriversBadge';
import { searchPlaces, getPlaceDetails, PlaceSuggestion } from '../services/places';
import { getPlaceHistory, addPlaceToHistory, PlaceHistoryEntry } from '../services/placeHistory';
import { RideDetails, TabScreenProps } from '../types';
import { colors, radius, shadows, spacing, typography, motion } from '../theme';

type Props = TabScreenProps<'Home'>;
type FieldKey = 'origin' | 'destination';
type MapPickerContext = FieldKey | 'openTripOrigin';

interface Coords { latitude: number; longitude: number }
interface RideEstimate { distanceKm: number; estimatedDurationMinutes: number; estimatedPrice: number }
interface CreateRideResponse { id: string; status: string }

const FALLBACK_REGION = { latitude: 36.7538, longitude: 3.0588 };
const DELTA = { latitudeDelta: 0.0122, longitudeDelta: 0.0121 };

export default function ItineraryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const originInputRef = useRef<TextInputInstance>(null);
  const destInputRef = useRef<TextInputInstance>(null);

  const [currentLocation, setCurrentLocation] = useState<Coords | null>(null);

  const [originText, setOriginText] = useState('');
  const [originCoords, setOriginCoords] = useState<Coords | null>(null);
  const [destinationText, setDestinationText] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<Coords | null>(null);

  const [activeField, setActiveField] = useState<FieldKey | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolvingSuggestion, setResolvingSuggestion] = useState(false);
  const [history, setHistory] = useState<PlaceHistoryEntry[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const [mapPickerFor, setMapPickerFor] = useState<MapPickerContext | null>(null);
  const [openTripVisible, setOpenTripVisible] = useState(false);
  const [openTripSubmitting, setOpenTripSubmitting] = useState(false);

  const [estimate, setEstimate] = useState<RideEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const originTouchedRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: motion.base, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...motion.spring, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── Socket authentifié (événements de course, statut des chauffeurs) + reprise
  // d'une course en cours si l'app a été relancée pendant une recherche ou un trajet
  useEffect(() => {
    SecureStore.getItemAsync(SECURE_STORE_KEY).then((token) => socketService.connect(token ?? undefined));
    apiGet<RideDetails | null>('/rides/active')
      .then((ride) => {
        if (!ride) return;
        if (ride.status === 'PENDING') {
          navigation.navigate('Match', { rideId: ride.id, isOpenTrip: ride.isOpenTrip });
        } else {
          navigation.navigate('Trip', { rideId: ride.id });
        }
      })
      .catch(() => { /* pas de course active */ });
  }, []);

  // ── Géolocalisation silencieuse (sert de repli pour l'origine) ────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCurrentLocation(coords);
        // Origine par défaut = position actuelle (silencieusement, le champ reste vide
        // avec son placeholder), tant que le client n'a rien changé lui-même
        if (!originTouchedRef.current) {
          setOriginCoords(coords);
        }
      } catch { /* silencieux — l'utilisateur pourra choisir une origine manuellement */ }
    })();
  }, []);

  // ── Historique du champ actif ─────────────────────────────────────────────
  useEffect(() => {
    setHistoryExpanded(false);
    if (!activeField) return;
    getPlaceHistory(activeField).then(setHistory);
  }, [activeField]);

  // ── Autocomplete (debounce 350ms) ─────────────────────────────────────────
  const searchSeq = useRef(0);
  useEffect(() => {
    if (!activeField) { setSuggestions([]); return; }
    const query = (activeField === 'origin' ? originText : destinationText).trim();
    if (query.length < 2) { setSuggestions([]); setSearching(false); return; }

    setSearching(true);
    const seq = ++searchSeq.current;
    const bias = originCoords ?? currentLocation;
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(query, bias?.latitude, bias?.longitude);
        if (seq === searchSeq.current) setSuggestions(results);
      } catch {
        if (seq === searchSeq.current) setSuggestions([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [activeField, originText, destinationText, originCoords, currentLocation]);

  // ── Estimation distance / prix dès que départ + arrivée sont connus ───────
  useEffect(() => {
    const origin = originCoords ?? currentLocation;
    if (!origin || !destinationCoords) { setEstimate(null); return; }
    let cancelled = false;
    setEstimating(true);
    apiPost<RideEstimate, object>('/rides/estimate', {
      startLatitude: origin.latitude,
      startLongitude: origin.longitude,
      endLatitude: destinationCoords.latitude,
      endLongitude: destinationCoords.longitude,
      vehicleType: 'economy',
    })
      .then((res) => { if (!cancelled) setEstimate(res); })
      .catch(() => { if (!cancelled) setEstimate(null); })
      .finally(() => { if (!cancelled) setEstimating(false); });
    return () => { cancelled = true; };
  }, [originCoords, currentLocation, destinationCoords]);

  // ── Sélection d'un lieu (historique, suggestion ou carte) ─────────────────

  const applySelection = (field: FieldKey, label: string, address: string, coords?: Coords) => {
    if (field === 'origin') {
      originTouchedRef.current = true;
      setOriginText(label);
      setOriginCoords(coords ?? null);
    } else {
      setDestinationText(label);
      setDestinationCoords(coords ?? null);
    }
    addPlaceToHistory(field, {
      label,
      address: address || label,
      latitude: coords?.latitude ?? 0,
      longitude: coords?.longitude ?? 0,
    });
    setActiveField(null);
    setSuggestions([]);

    if (field === 'origin') {
      setTimeout(() => destInputRef.current?.focus(), 200);
    }
  };

  const handleSelectHistory = (h: PlaceHistoryEntry) => {
    if (!activeField) return;
    const hasCoords = h.latitude !== 0 || h.longitude !== 0;
    applySelection(
      activeField, h.label, h.address,
      hasCoords ? { latitude: h.latitude, longitude: h.longitude } : undefined,
    );
  };

  const handleSelectSuggestion = async (s: PlaceSuggestion) => {
    if (!activeField) return;
    const field = activeField;
    setResolvingSuggestion(true);
    try {
      const details = await getPlaceDetails(s.placeId);
      if (!details) return;
      applySelection(field, s.mainText || s.description, details.formattedAddress || s.description, {
        latitude: details.latitude, longitude: details.longitude,
      });
    } catch { /* silencieux */ } finally {
      setResolvingSuggestion(false);
    }
  };

  const handleChangeText = (field: FieldKey, text: string) => {
    if (field === 'origin') {
      originTouchedRef.current = true;
      setOriginText(text);
      setOriginCoords(null);
    } else {
      setDestinationText(text);
      setDestinationCoords(null);
    }
  };

  const clearField = (field: FieldKey) => {
    if (field === 'origin') {
      originTouchedRef.current = true;
      setOriginText('');
      setOriginCoords(null);
      originInputRef.current?.focus();
    }
    else { setDestinationText(''); setDestinationCoords(null); destInputRef.current?.focus(); }
  };

  // ── Choisir depuis la carte ────────────────────────────────────────────────

  const openMapPicker = (context: MapPickerContext) => {
    setOpenTripVisible(false);
    setMapPickerFor(context);
  };

  const closeMapPicker = () => {
    const wasOpenTrip = mapPickerFor === 'openTripOrigin';
    setMapPickerFor(null);
    if (wasOpenTrip) setOpenTripVisible(true);
  };

  const handleMapPick = (place: PickedPlace) => {
    const context = mapPickerFor;
    setMapPickerFor(null);
    if (!context) return;
    const coords = { latitude: place.latitude, longitude: place.longitude };
    if (context === 'openTripOrigin') {
      setOriginText(place.label);
      setOriginCoords(coords);
      addPlaceToHistory('origin', { ...place });
      confirmOpenTrip(coords, place.label);
    } else {
      applySelection(context, place.label, place.address, coords);
    }
  };

  const mapPickerRegion = () => {
    const base = originCoords ?? currentLocation ?? FALLBACK_REGION;
    return { ...base, ...DELTA };
  };

  const mapPickerAccent = mapPickerFor === 'destination' ? colors.routeDestination : colors.routeOrigin;

  // ── Trajet ouvert — démarre immédiatement, le prix est calculé en temps réel ─

  const confirmOpenTrip = async (coords: Coords, label: string) => {
    setOpenTripVisible(false);
    setOpenTripSubmitting(true);
    try {
      const ride = await apiPost<CreateRideResponse, object>('/rides', {
        startLatitude: coords.latitude,
        startLongitude: coords.longitude,
        vehicleType: 'economy',
        isOpenTrip: true,
      });
      navigation.navigate('Match', { rideId: ride.id, isOpenTrip: true });
    } catch (e: any) {
      Alert.alert(t('commonError'), e?.response?.data?.message ?? t('openTripErrorDefault'));
    } finally {
      setOpenTripSubmitting(false);
    }
  };

  const handleOpenTrip = () => {
    if (originCoords) {
      confirmOpenTrip(originCoords, originText.trim() || t('originPlaceholder'));
    } else if (currentLocation) {
      confirmOpenTrip(currentLocation, t('originPlaceholder'));
    } else {
      setOpenTripVisible(true);
    }
  };

  // ── Réservation point à point ──────────────────────────────────────────────

  const requestRide = async () => {
    const origin = originCoords ?? currentLocation;
    if (!origin || !destinationCoords) return;
    setRequesting(true);
    try {
      const ride = await apiPost<CreateRideResponse, object>('/rides', {
        startLatitude: origin.latitude,
        startLongitude: origin.longitude,
        destinationName: destinationText.trim(),
        endLatitude: destinationCoords.latitude,
        endLongitude: destinationCoords.longitude,
        vehicleType: 'economy',
      });
      navigation.navigate('Match', { rideId: ride.id, isOpenTrip: false, estimatedPrice: estimate?.estimatedPrice });
    } catch (e: any) {
      Alert.alert(t('commonError'), e?.response?.data?.message ?? t('requestRideErrorDefault'));
    } finally {
      setRequesting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const showingHistory = activeField
    ? (activeField === 'origin' ? originText : destinationText).trim().length < 2
    : true;

  const showPriceCard = !activeField && !!destinationCoords && (estimating || !!estimate);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      >
        <Animated.View
          style={[
            styles.body,
            { paddingTop: insets.top + spacing.xl, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >

          {/* ── Barre supérieure — sélecteur de langue ───────────────────── */}
          <View style={styles.topBar}>
            <AvailableDriversBadge location={currentLocation} />
            <LanguagePickerButton />
          </View>

          {/* ── Champs origine / destination ─────────────────────────────── */}
          <View style={styles.routeCard}>
            <View style={styles.fieldRow}>
              <View style={[styles.dotBadge, { backgroundColor: colors.routeOriginMuted }]}>
                <View style={[styles.dot, { backgroundColor: colors.routeOrigin }]} />
              </View>
              <TextInput
                ref={originInputRef}
                style={styles.fieldInput}
                value={originText}
                onChangeText={(text) => handleChangeText('origin', text)}
                onFocus={() => setActiveField('origin')}
                placeholder={t('originPlaceholder')}
                placeholderTextColor={colors.placeholder}
                returnKeyType="next"
                onSubmitEditing={() => destInputRef.current?.focus()}
              />
              {resolvingSuggestion && activeField === 'origin' && (
                <ActivityIndicator size="small" color={colors.accent} />
              )}
              {!!originText && !(resolvingSuggestion && activeField === 'origin') && (
                <TouchableOpacity onPress={() => clearField('origin')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.separator}>
              <View style={styles.separatorDot} />
              <View style={styles.separatorDot} />
              <View style={styles.separatorDot} />
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.dotBadge, { backgroundColor: colors.routeDestinationMuted }]}>
                <View style={[styles.dot, styles.dotSquare, { backgroundColor: colors.routeDestination }]} />
              </View>
              <TextInput
                ref={destInputRef}
                style={styles.fieldInput}
                value={destinationText}
                onChangeText={(text) => handleChangeText('destination', text)}
                onFocus={() => setActiveField('destination')}
                placeholder={t('destinationPlaceholder')}
                placeholderTextColor={colors.placeholder}
                returnKeyType="search"
              />
              {resolvingSuggestion && activeField === 'destination' && (
                <ActivityIndicator size="small" color={colors.accent} />
              )}
              {!!destinationText && !(resolvingSuggestion && activeField === 'destination') && (
                <TouchableOpacity onPress={() => clearField('destination')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Panneau historique / suggestions (uniquement si un champ est actif) ─ */}
          {activeField && (
            <View style={styles.panel}>
              <TouchableOpacity
                style={styles.mapPickRow}
                onPress={() => openMapPicker(activeField)}
                activeOpacity={0.75}
              >
                <View style={styles.mapPickIconWrap}>
                  <Ionicons name="map-outline" size={18} color={colors.accent} />
                </View>
                <Text style={styles.mapPickText}>{t('chooseFromMap')}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>

              {showingHistory ? (
                <>
                  <TouchableOpacity
                    style={styles.historyToggleRow}
                    onPress={() => setHistoryExpanded((v) => !v)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.mapPickIconWrap}>
                      <Ionicons name="time-outline" size={18} color={colors.accent} />
                    </View>
                    <Text style={styles.mapPickText}>{t('history')}</Text>
                    <Ionicons
                      name={historyExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18} color={colors.textTertiary}
                    />
                  </TouchableOpacity>

                  {historyExpanded && (
                    history.length === 0 ? (
                      <Text style={styles.emptyText}>{t('noHistory')}</Text>
                    ) : (
                      history.map((h, idx) => (
                        <TouchableOpacity
                          key={`${h.label}-${idx}`}
                          style={styles.listRow}
                          onPress={() => handleSelectHistory(h)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.listRowIconWrap}>
                            <Ionicons name="time-outline" size={17} color={colors.textSecondary} />
                          </View>
                          <View style={styles.listRowContent}>
                            <Text style={styles.listRowLabel} numberOfLines={1}>{h.label}</Text>
                            <Text style={styles.listRowSub} numberOfLines={1}>{h.address}</Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    )
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.sectionLabel}>{searching ? t('searching') : t('suggestions')}</Text>
                  {suggestions.map((s) => (
                    <TouchableOpacity
                      key={s.placeId}
                      style={styles.listRow}
                      onPress={() => handleSelectSuggestion(s)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.listRowIconWrap, { backgroundColor: colors.accentMuted }]}>
                        <Ionicons name="location-outline" size={17} color={colors.accent} />
                      </View>
                      <View style={styles.listRowContent}>
                        <Text style={styles.listRowLabel} numberOfLines={1}>{s.mainText}</Text>
                        <Text style={styles.listRowSub} numberOfLines={1}>{s.secondaryText}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {!searching && suggestions.length === 0 && (
                    <Text style={styles.emptyText}>{t('noPlacesFound')}</Text>
                  )}
                </>
              )}
            </View>
          )}

          {/* ── Distance + prix + demande, dès que départ et arrivée sont connus ─── */}
          {showPriceCard && (
            <View style={styles.priceCard}>
              {estimating ? (
                <View style={styles.priceLoadingRow}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.priceLoadingText}>{t('calculatingTrip')}</Text>
                </View>
              ) : estimate && (
                <>
                  <View style={styles.distanceRow}>
                    <Ionicons name="navigate-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.distanceText}>{estimate.distanceKm} km</Text>
                  </View>
                  <Text style={styles.priceText}>{estimate.estimatedPrice} MRU</Text>
                  <Button
                    label={t('requestRide')}
                    onPress={requestRide}
                    loading={requesting}
                    icon={requesting ? undefined : 'arrow-forward'}
                    iconPosition="right"
                    style={{ marginTop: spacing.md }}
                  />
                </>
              )}
            </View>
          )}

          {/* ── Trajet ouvert ─────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.openTripCard, openTripSubmitting && styles.openTripCardDisabled]}
            onPress={handleOpenTrip}
            activeOpacity={0.88}
            disabled={openTripSubmitting}
          >
            <View style={styles.openTripIconWrap}>
              {openTripSubmitting
                ? <ActivityIndicator size="small" color={colors.textInverse} />
                : <Ionicons name="navigate" size={20} color={colors.textInverse} />}
            </View>
            <Text style={styles.openTripTitle}>{t('openTrip')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <MapPickerModal
        visible={!!mapPickerFor}
        initialRegion={mapPickerRegion()}
        accentColor={mapPickerAccent}
        title={mapPickerFor === 'destination' ? t('mapPickerTitleDestination') : t('mapPickerTitleOrigin')}
        onClose={closeMapPicker}
        onConfirm={handleMapPick}
      />

      <OpenTripOriginModal
        visible={openTripVisible}
        biasLatitude={currentLocation?.latitude}
        biasLongitude={currentLocation?.longitude}
        onClose={() => setOpenTripVisible(false)}
        onPickFromMap={() => openMapPicker('openTripOrigin')}
        onConfirm={(place) => {
          setOriginText(place.label);
          setOriginCoords({ latitude: place.latitude, longitude: place.longitude });
          confirmOpenTrip({ latitude: place.latitude, longitude: place.longitude }, place.label);
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  body: { paddingHorizontal: spacing.lg },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  routeCard: {
    backgroundColor: colors.surface, borderRadius: radius.xxl,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    ...shadows.lg,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 58 },
  dotBadge: {
    width: 38, height: 38, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: { width: 11, height: 11, borderRadius: 6 },
  dotSquare: { borderRadius: 3 },
  fieldInput: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text, paddingVertical: 8 },
  separator: { paddingLeft: 18, gap: 3, paddingVertical: 2 },
  separatorDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.borderStrong },

  panel: {
    backgroundColor: colors.surface, borderRadius: radius.xxl,
    padding: spacing.lg, marginTop: spacing.md,
    ...shadows.md,
  },
  mapPickRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingBottom: spacing.md, marginBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  mapPickIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center',
  },
  mapPickText: { flex: 1, ...typography.bodySm, fontWeight: '700', color: colors.accent },
  historyToggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.xs,
  },

  sectionLabel: { ...typography.overline, color: colors.textSecondary, marginBottom: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  listRowIconWrap: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  listRowContent: { flex: 1 },
  listRowLabel: { ...typography.bodySm, fontWeight: '600', color: colors.text },
  listRowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  emptyText: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md },

  priceCard: {
    alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.xxl,
    padding: spacing.xl, marginTop: spacing.md,
    ...shadows.md,
  },
  priceLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  priceLoadingText: { ...typography.bodySm, color: colors.textSecondary, fontWeight: '600' },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceText: { ...typography.bodySm, color: colors.textSecondary, fontWeight: '600' },
  priceText: { ...typography.display, color: colors.text, marginTop: 2 },

  openTripCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.xxl, marginTop: spacing.xl,
    backgroundColor: colors.routeDestination, padding: spacing.lg,
    ...shadows.lg, shadowColor: colors.routeDestination,
  },
  openTripCardDisabled: { opacity: 0.7 },
  openTripIconWrap: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center',
  },
  openTripTitle: { flex: 1, ...typography.h3, color: colors.textInverse },
});
