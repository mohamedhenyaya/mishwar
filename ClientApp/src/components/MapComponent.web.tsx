import React, { forwardRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Coordinates, Driver } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { colors, radius, shadows, spacing, typography } from '../theme';

// react-native-maps has no web bundle, so on web we show a driver list
// instead of an interactive map. The ref is accepted (to match the native
// component's forwardRef signature) but intentionally never attached —
// callers already guard `if (!mapRef.current) return` before using it.
interface Props {
  initialRegion?: unknown;
  userLocation?: Coordinates | null;
  drivers?: Driver[];
  onDriverPress?: (driver: Driver) => void;
}

const MapComponent = forwardRef<never, Props>(({ drivers = [], onDriverPress }, _ref) => {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Ionicons name="map-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.bannerText}>{t('mapUnavailableWeb')}</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {drivers.length === 0 ? (
          <Text style={styles.emptyText}>{t('noDriversNearby')}</Text>
        ) : (
          drivers.map((driver) => (
            <TouchableOpacity
              key={driver.id}
              style={styles.row}
              onPress={() => onDriverPress?.(driver)}
              disabled={!onDriverPress}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="car-sport" size={16} color={colors.primary} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{driver.name}</Text>
                <Text style={styles.rowVehicle}>{driver.vehicleType}</Text>
              </View>
              <Text style={styles.rowRating}>{driver.rating} ★</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
});

MapComponent.displayName = 'MapComponent';
export default MapComponent;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bannerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  rowIcon: {
    backgroundColor: colors.bg,
    borderRadius: 20,
    padding: 6,
    marginRight: spacing.sm,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    ...typography.label,
    color: colors.text,
  },
  rowVehicle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rowRating: {
    ...typography.label,
    color: colors.text,
  },
});
