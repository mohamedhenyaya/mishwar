import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { Button, IconButton } from './ui';
import { searchPlaces, getPlaceDetails, PlaceSuggestion } from '../services/places';
import { apiGet } from '../services/api';
import { getPlaceHistory, addPlaceToHistory, PlaceHistoryEntry } from '../services/placeHistory';
import { useLanguage } from '../i18n/LanguageContext';
import { colors, radius, shadows, spacing, typography } from '../theme';
import type { PickedPlace } from './MapPickerModal';

interface ReverseGeocodeResult { formattedAddress: string }

interface Props {
  visible: boolean;
  biasLatitude?: number;
  biasLongitude?: number;
  onClose: () => void;
  onPickFromMap: () => void;
  onConfirm: (place: PickedPlace) => void;
}

export default function OpenTripOriginModal({
  visible, biasLatitude, biasLongitude, onClose, onPickFromMap, onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [history, setHistory] = useState<PlaceHistoryEntry[]>([]);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setSuggestions([]);
    getPlaceHistory('origin').then(setHistory);
  }, [visible]);

  const searchSeq = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); setSearching(false); return; }
    setSearching(true);
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(q, biasLatitude, biasLongitude);
        if (seq === searchSeq.current) setSuggestions(results);
      } catch {
        if (seq === searchSeq.current) setSuggestions([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, biasLatitude, biasLongitude]);

  const confirmPlace = (place: PickedPlace) => {
    addPlaceToHistory('origin', {
      label: place.label, address: place.address,
      latitude: place.latitude, longitude: place.longitude,
    });
    onConfirm(place);
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        const geo = await apiGet<ReverseGeocodeResult>(`/places/reverse-geocode?lat=${latitude}&lng=${longitude}`);
        if (geo?.formattedAddress) address = geo.formattedAddress;
      } catch { /* on garde le repli coordonnées */ }
      confirmPlace({ label: t('openTripOriginCurrentLabel'), address, latitude, longitude });
    } finally {
      setLocating(false);
    }
  };

  const handleSelectSuggestion = async (s: PlaceSuggestion) => {
    setResolving(true);
    try {
      const details = await getPlaceDetails(s.placeId);
      if (!details) return;
      confirmPlace({
        label: s.mainText || s.description,
        address: details.formattedAddress || s.description,
        latitude: details.latitude,
        longitude: details.longitude,
      });
    } catch { /* silencieux */ } finally {
      setResolving(false);
    }
  };

  const handleSelectHistory = (h: PlaceHistoryEntry) => {
    confirmPlace({ label: h.label, address: h.address, latitude: h.latitude, longitude: h.longitude });
  };

  const showHistory = query.trim().length < 2;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('openTripOriginTitle')}</Text>
            <IconButton name="close" size="sm" onPress={onClose} variant="muted" />
          </View>

          <Button
            label={locating ? t('favoritesLocating') : t('favoritesUseCurrentLocation')}
            icon="locate"
            variant="secondary"
            onPress={handleUseCurrentLocation}
            loading={locating}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('openTripOriginOr')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder={t('openTripOriginPlaceholder')}
              placeholderTextColor={colors.placeholder}
            />
            {resolving && <ActivityIndicator size="small" color={colors.accent} />}
          </View>

          <TouchableOpacity style={styles.mapRow} onPress={onPickFromMap} activeOpacity={0.75}>
            <View style={styles.mapIconWrap}>
              <Ionicons name="map-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.mapRowText}>{t('chooseFromMap')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {showHistory ? (
              <>
                {history.length > 0 && <Text style={styles.sectionLabel}>{t('history')}</Text>}
                {history.map((h, idx) => (
                  <TouchableOpacity key={`${h.label}-${idx}`} style={styles.row} onPress={() => handleSelectHistory(h)} activeOpacity={0.75}>
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                    <View style={styles.rowContent}>
                      <Text style={styles.rowLabel} numberOfLines={1}>{h.label}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>{h.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.sectionLabel}>{searching ? t('searching') : t('suggestions')}</Text>
                {suggestions.map((s) => (
                  <TouchableOpacity key={s.placeId} style={styles.row} onPress={() => handleSelectSuggestion(s)} activeOpacity={0.75}>
                    <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                    <View style={styles.rowContent}>
                      <Text style={styles.rowLabel} numberOfLines={1}>{s.mainText}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>{s.secondaryText}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {!searching && suggestions.length === 0 && (
                  <Text style={styles.empty}>{t('noPlacesFound')}</Text>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, maxHeight: '85%', gap: spacing.md,
    ...shadows.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.h3, color: colors.text },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.caption, color: colors.textTertiary },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, minHeight: 48,
  },
  input: { flex: 1, fontSize: 15, color: colors.text },

  mapRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  mapIconWrap: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center',
  },
  mapRowText: { flex: 1, ...typography.bodySm, fontWeight: '700', color: colors.accent },

  list: { marginTop: spacing.xs },
  sectionLabel: { ...typography.overline, color: colors.textSecondary, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowContent: { flex: 1 },
  rowLabel: { ...typography.bodySm, fontWeight: '600', color: colors.text },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  empty: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
});
