import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { apiGet } from '../services/api';
import { socketService } from '../services/socket';
import { colors, radius, typography } from '../theme';

interface Props {
  location: { latitude: number; longitude: number } | null;
}

// Nombre de chauffeurs disponibles autour du client, mis à jour en direct :
// rechargé dès qu'un chauffeur se connecte, se déconnecte ou devient occupé (driver:status)
export default function AvailableDriversBadge({ location }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const locationRef = useRef(location);
  locationRef.current = location;

  const refresh = useCallback(() => {
    const loc = locationRef.current;
    if (!loc) return;
    apiGet<unknown[]>(`/drivers/nearby?lat=${loc.latitude}&lng=${loc.longitude}&radius=5000`)
      .then((drivers) => setCount(drivers.length))
      .catch(() => { /* silencieux */ });
  }, []);

  useEffect(() => { refresh(); }, [location?.latitude, location?.longitude, refresh]);

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    // Regroupé sur 800 ms quand plusieurs changements arrivent ensemble
    const unsubscribe = socketService.subscribe('driver:status', () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(refresh, 800);
    });
    // Filet de sécurité si un événement est manqué, et au retour au premier plan
    const interval = setInterval(refresh, 30_000);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      unsubscribe();
      if (debounce) clearTimeout(debounce);
      clearInterval(interval);
      appState.remove();
    };
  }, [refresh]);

  if (count == null) return <View />;

  const available = count > 0;
  return (
    <View style={[styles.badge, available ? styles.badgeOn : styles.badgeOff]}>
      <View style={[styles.dot, { backgroundColor: available ? colors.success : colors.textTertiary }]} />
      <Text style={[styles.text, { color: available ? colors.success : colors.textSecondary }]}>
        {available
          ? `${count} chauffeur${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''}`
          : 'Aucun chauffeur à proximité'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full,
  },
  badgeOn:  { backgroundColor: colors.successMuted },
  badgeOff: { backgroundColor: colors.surface },
  dot:  { width: 8, height: 8, borderRadius: 4 },
  text: { ...typography.caption, fontWeight: '700' },
});
