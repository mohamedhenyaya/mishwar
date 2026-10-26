import React, { forwardRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region, MapViewProps } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Coordinates, Driver } from '../types';
import { colors, shadows } from '../theme';

interface Props extends Omit<MapViewProps, 'provider'> {
  initialRegion: Region;
  userLocation?: Coordinates | null;
  drivers?: Driver[];
  onDriverPress?: (driver: Driver) => void;
}

const MapComponent = forwardRef<MapView, Props>(
  ({ initialRegion, userLocation, drivers = [], onDriverPress, children, ...rest }, ref) => {
    return (
      <MapView
        ref={ref}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        {...rest}
      >
        {userLocation && (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </Marker>
        )}

        {drivers.map((driver) => (
          <Marker
            key={driver.id}
            coordinate={driver.coordinate}
            title={driver.name}
            description={`Note: ${driver.rating} ★`}
            anchor={{ x: 0.5, y: 0.5 }}
            onPress={() => onDriverPress?.(driver)}
          >
            <View style={styles.driverMarker}>
              <Ionicons name="car-sport" size={16} color={colors.primary} />
            </View>
          </Marker>
        ))}

        {children}
      </MapView>
    );
  }
);

MapComponent.displayName = 'MapComponent';
export default MapComponent;

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFill,
  },
  userMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(20, 20, 43, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  driverMarker: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 6,
    ...shadows.sm,
  },
});
