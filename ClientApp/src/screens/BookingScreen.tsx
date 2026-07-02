import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Alert, ScrollView, Animated, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiPost } from '../services/api';
import { searchPlaces, PlaceSuggestion } from '../services/places';
import { RootStackParamList } from '../types';
import { Button, ScreenHeader, TextField } from '../components/ui';
import { colors, radius, shadows, spacing, typography, motion } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;
type When = 'now' | 'later';

interface CreateRideResponse { id: string; status: string }

// ── Données ───────────────────────────────────────────────────────────────────
const RECENT = [
  { id: '1', label: 'Aéroport Houari Boumediene', sub: 'Dar El Beïda',    icon: 'airplane-outline' as const },
  { id: '2', label: 'Centre Commercial Bab Ezzouar', sub: 'Bab Ezzouar',  icon: 'cart-outline' as const },
  { id: '3', label: 'Université USTHB',              sub: 'Bab Ezzouar', icon: 'school-outline' as const },
  { id: '4', label: "Grande Mosquée d'Alger",        sub: 'Mohammadia',  icon: 'business-outline' as const },
];

const VEHICLE_TYPES = [
  { id: 'economy', label: 'Économie', icon: 'car-outline' as const,       desc: 'Voiture standard',    price: 'Dès 300 DA', eta: '~3 min' },
  { id: 'comfort', label: 'Confort',  icon: 'car-sport-outline' as const, desc: 'Berline confortable', price: 'Dès 500 DA', eta: '~5 min' },
  { id: 'premium', label: 'Premium',  icon: 'sparkles-outline' as const,  desc: 'Véhicule haut de gamme', price: 'Dès 800 DA', eta: '~7 min' },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function BookingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { destination: initDest = '', startLatitude, startLongitude } = route.params ?? {};

  const [destination,    setDestination]    = useState(initDest);
  const [vehicleType,    setVehicleType]    = useState('economy');
  const [loading,        setLoading]        = useState(false);
  const [inputFocused,   setInputFocused]   = useState(false);
  const [suggestions,    setSuggestions]    = useState<PlaceSuggestion[]>([]);
  const [searching,      setSearching]      = useState(false);

  const [when,           setWhen]           = useState<When>('now');
  const [scheduledDate,  setScheduledDate]  = useState<Date | null>(null);
  const [showPicker,     setShowPicker]     = useState(false);

  const [showCoupon,     setShowCoupon]     = useState(false);
  const [couponCode,     setCouponCode]     = useState('');

  const inputRef = useRef<TextInput>(null);

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(24)).current;
  const focusBorder = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Autocomplete de lieux (debounce 350ms) ────────────────────────────────

  const searchSeq = useRef(0);

  useEffect(() => {
    const query = destination.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const seq = ++searchSeq.current;

    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(query, startLatitude, startLongitude);
        if (seq === searchSeq.current) setSuggestions(results);
      } catch {
        if (seq === searchSeq.current) setSuggestions([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [destination, startLatitude, startLongitude]);

  const handleFocus = () => {
    setInputFocused(true);
    Animated.timing(focusBorder, { toValue: 1, duration: motion.fast, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    setInputFocused(false);
    Animated.timing(focusBorder, { toValue: 0, duration: motion.fast, useNativeDriver: false }).start();
  };

  const borderColor = focusBorder.interpolate({
    inputRange: [0, 1], outputRange: [colors.border, colors.accent],
  });

  // ── Confirmer ──────────────────────────────────────────────────────────────

  const handleDateChange = (_event: unknown, selected?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selected) setScheduledDate(selected);
  };

  const handleConfirm = async () => {
    if (!destination.trim()) return;
    if (when === 'later' && !scheduledDate) {
      Alert.alert('Date manquante', 'Choisissez une date et une heure pour votre course.');
      return;
    }

    setLoading(true);
    try {
      const basePayload = {
        startLatitude:   startLatitude  ?? 0,
        startLongitude:  startLongitude ?? 0,
        destinationName: destination.trim(),
        vehicleType,
        ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
      };

      if (when === 'later' && scheduledDate) {
        await apiPost<CreateRideResponse, object>('/rides/scheduled', {
          ...basePayload,
          scheduledAt: scheduledDate.toISOString(),
        });
        Alert.alert(
          'Course programmée',
          `Votre course est programmée pour le ${scheduledDate.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}.`,
          [{ text: 'OK', onPress: () => navigation.navigate('Main') }],
        );
        return;
      }

      const ride = await apiPost<CreateRideResponse, object>('/rides', basePayload);
      navigation.navigate('Match', { rideId: ride.id });
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de créer la course.');
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = destination.trim().length >= 3 && !loading && (when === 'now' || !!scheduledDate);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScreenHeader title="Nouvelle course" onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Barre trajet ──────────────────────────────────────────── */}
          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <View style={styles.originDot} />
              <Text style={styles.routeLabel} numberOfLines={1}>
                {startLatitude ? `Ma position actuelle` : 'Position de départ'}
              </Text>
            </View>
            <View style={styles.routeSeparator}>
              <View style={styles.routeLine} />
            </View>
            <View style={styles.routeRow}>
              <View style={styles.destDot} />
              <Animated.View style={[styles.inputWrap, { borderColor }]}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="Où allez-vous ?"
                  placeholderTextColor={colors.placeholder}
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
                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
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
                  <Ionicons name={v.icon} size={24} color={active ? colors.accent : colors.text} style={{ marginBottom: 4 }} />
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
                  {active && (
                    <View style={styles.vehicleCheck}>
                      <Ionicons name="checkmark" size={11} color={colors.textInverse} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Quand ? ─────────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Quand ?</Text>
          <View style={styles.whenRow}>
            <TouchableOpacity
              style={[styles.whenBtn, when === 'now' && styles.whenBtnActive]}
              onPress={() => { setWhen('now'); setScheduledDate(null); }}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={16} color={when === 'now' ? colors.accent : colors.textSecondary} />
              <Text style={[styles.whenBtnText, when === 'now' && styles.whenBtnTextActive]}>Maintenant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.whenBtn, when === 'later' && styles.whenBtnActive]}
              onPress={() => setWhen('later')}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar" size={16} color={when === 'later' ? colors.accent : colors.textSecondary} />
              <Text style={[styles.whenBtnText, when === 'later' && styles.whenBtnTextActive]}>Plus tard</Text>
            </TouchableOpacity>
          </View>

          {when === 'later' && (
            <TouchableOpacity style={styles.dateRow} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
              <Ionicons name="time-outline" size={18} color={colors.accent} />
              <Text style={styles.dateRowText}>
                {scheduledDate
                  ? scheduledDate.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Choisir la date et l\'heure'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}

          {showPicker && (
            <DateTimePicker
              value={scheduledDate ?? new Date(Date.now() + 30 * 60 * 1000)}
              mode="datetime"
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {/* ── Code promo ────────────────────────────────────────────── */}
          {showCoupon ? (
            <View style={{ marginBottom: spacing.xxl }}>
              <TextField
                label="Code promo"
                value={couponCode}
                onChangeText={(v) => setCouponCode(v.toUpperCase())}
                placeholder="Ex : WELCOME10"
                autoCapitalize="characters"
                icon="pricetag-outline"
              />
            </View>
          ) : (
            <TouchableOpacity style={styles.couponLink} onPress={() => setShowCoupon(true)}>
              <Ionicons name="pricetag-outline" size={15} color={colors.accent} />
              <Text style={styles.couponLinkText}>Ajouter un code promo</Text>
            </TouchableOpacity>
          )}

          {/* ── Suggestions de lieux (pendant la frappe) ─────────────────── */}
          {inputFocused && destination.trim().length >= 2 && (
            <>
              <Text style={styles.sectionTitle}>
                {searching ? 'Recherche…' : 'Suggestions'}
              </Text>
              <View style={styles.recentList}>
                {suggestions.map((place, idx) => (
                  <TouchableOpacity
                    key={place.placeId}
                    style={[
                      styles.recentItem,
                      idx === suggestions.length - 1 && styles.recentItemLast,
                    ]}
                    onPress={() => {
                      setDestination(place.mainText || place.description);
                      inputRef.current?.blur();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentIconWrap}>
                      <Ionicons name="location-outline" size={19} color={colors.textSecondary} />
                    </View>
                    <View style={styles.recentContent}>
                      <Text style={styles.recentLabel} numberOfLines={1}>{place.mainText}</Text>
                      <Text style={styles.recentSub} numberOfLines={1}>{place.secondaryText}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
                {!searching && suggestions.length === 0 && (
                  <Text style={styles.emptySuggestions}>Aucun lieu trouvé</Text>
                )}
              </View>
            </>
          )}

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
                      <Ionicons name={place.icon} size={19} color={colors.textSecondary} />
                    </View>
                    <View style={styles.recentContent}>
                      <Text style={styles.recentLabel} numberOfLines={1}>{place.label}</Text>
                      <Text style={styles.recentSub}>{place.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Bouton confirmer (fixe en bas) ──────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={
            loading
              ? 'Création de la course…'
              : when === 'later' ? 'Programmer la course' : 'Confirmer la destination'
          }
          onPress={handleConfirm}
          disabled={!canConfirm}
          icon={loading ? undefined : 'arrow-forward'}
          iconPosition="right"
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  routeCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg,
    marginBottom: spacing.xxl, ...shadows.sm,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  originDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.accent, borderWidth: 2.5, borderColor: colors.accentMuted,
  },
  routeLabel: { ...typography.bodySm, color: colors.textSecondary, fontWeight: '500', flex: 1 },
  routeSeparator: { paddingLeft: 5, paddingVertical: 6 },
  routeLine: { width: 2, height: 20, backgroundColor: colors.border, borderRadius: 1, marginLeft: 1 },
  destDot: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.text },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: radius.md,
    backgroundColor: colors.bg, paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  input: {
    flex: 1, fontSize: 15, color: colors.text,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },

  sectionTitle: {
    ...typography.overline, color: colors.textSecondary,
    marginBottom: spacing.md, marginLeft: 2,
  },

  vehicleGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
  vehicleCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 2, borderColor: 'transparent',
    ...shadows.sm, gap: 4, position: 'relative',
  },
  vehicleCardActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  vehicleName: { ...typography.bodySm, fontWeight: '700', color: colors.text },
  vehicleNameActive: { color: colors.accent },
  vehicleDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 15 },
  vehicleDescActive: { color: colors.accent, opacity: 0.85 },
  vehicleFooter: { marginTop: 6, gap: 2 },
  vehiclePrice: { ...typography.caption, fontWeight: '700', color: colors.text },
  vehiclePriceActive: { color: colors.accent },
  vehicleEta: { ...typography.caption, color: colors.textSecondary },
  vehicleEtaActive: { color: colors.accent, opacity: 0.85 },
  vehicleCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },

  whenRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  whenBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingVertical: spacing.sm, borderWidth: 1.5, borderColor: 'transparent',
    ...shadows.sm,
  },
  whenBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  whenBtnText: { ...typography.bodySm, fontWeight: '700', color: colors.textSecondary },
  whenBtnTextActive: { color: colors.accent },

  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.xxl, ...shadows.sm,
  },
  dateRowText: { flex: 1, ...typography.bodySm, fontWeight: '600', color: colors.text },

  couponLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xxl, alignSelf: 'flex-start' },
  couponLinkText: { ...typography.bodySm, fontWeight: '700', color: colors.accent },

  recentList: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    overflow: 'hidden', ...shadows.sm,
  },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  recentItemLast: { borderBottomWidth: 0 },
  recentIconWrap: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  recentContent: { flex: 1 },
  recentLabel: { ...typography.bodySm, fontWeight: '600', color: colors.text },
  recentSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  emptySuggestions: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
});
