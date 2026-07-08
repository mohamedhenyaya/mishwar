import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import type { default as MapView, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapComponent from './MapComponent';
import { Button, IconButton } from './ui';
import { apiGet } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { colors, radius, shadows, spacing, typography } from '../theme';

interface ReverseGeocodeResult {
  formattedAddress: string;
  placeId?: string;
}

export interface PickedPlace {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface Props {
  visible: boolean;
  initialRegion: Region;
  accentColor: string;
  title?: string;
  onClose: () => void;
  onConfirm: (place: PickedPlace) => void;
}

export default function MapPickerModal({
  visible, initialRegion, accentColor, title, onClose, onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const mapRef = useRef<MapView>(null);

  const [center, setCenter] = useState<Region>(initialRegion);
  const [address, setAddress] = useState(t('mapPickerMovingMap'));
  const [loadingAddress, setLoadingAddress] = useState(false);
  const seq = useRef(0);

  const resolveAddress = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    const mySeq = ++seq.current;
    try {
      const geo = await apiGet<ReverseGeocodeResult>(`/places/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (mySeq === seq.current) {
        setAddress(geo?.formattedAddress ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      if (mySeq === seq.current) setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      if (mySeq === seq.current) setLoadingAddress(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setCenter(initialRegion);
    setAddress(t('mapPickerMovingMap'));
    resolveAddress(initialRegion.latitude, initialRegion.longitude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleConfirm = () => {
    onConfirm({
      label: address.split(',')[0]?.trim() || address,
      address,
      latitude: center.latitude,
      longitude: center.longitude,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <MapComponent
          ref={mapRef}
          initialRegion={initialRegion}
          onRegionChangeComplete={(region: Region) => {
            setCenter(region);
            resolveAddress(region.latitude, region.longitude);
          }}
        />

        <View style={styles.pinWrap} pointerEvents="none">
          <Ionicons name="location" size={40} color={accentColor} />
        </View>

        <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
          <IconButton name="close" onPress={onClose} variant="surface" />
          <View style={styles.titleBadge}>
            <Text style={styles.titleText}>{title ?? t('mapPickerDefaultTitle')}</Text>
          </View>
        </View>

        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.sheetLabel}>{t('mapPickerSelectedPosition')}</Text>
          <View style={styles.addressRow}>
            {loadingAddress
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Ionicons name="location-outline" size={18} color={colors.text} />}
            <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
          </View>
          <Button label={t('mapPickerChoosePlace')} onPress={handleConfirm} disabled={loadingAddress} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  pinWrap: {
    position: 'absolute', top: '50%', left: '50%',
    marginLeft: -20, marginTop: -40,
  },

  topBar: {
    position: 'absolute', left: spacing.lg, right: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  titleBadge: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  titleText: { ...typography.bodySm, fontWeight: '700', color: colors.text },

  bottomSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md,
    ...shadows.lg,
  },
  sheetLabel: { ...typography.overline, color: colors.textSecondary },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  addressText: { flex: 1, ...typography.bodyLg, color: colors.text, fontWeight: '600' },
});
