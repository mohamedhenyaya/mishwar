import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useDriverStatus } from '../context/DriverStatusContext';
import { captainSocketService, RideMeterPayload } from '../services/socket';
import { apiGet, apiPost, apiErrorMessage } from '../services/api';
import { tr, useLanguage } from '../i18n/LanguageContext';
import { C, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveTrip'>;

type RideStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface RideDetails {
  id: string;
  status: RideStatus;
  isOpenTrip: boolean;
  destinationName: string | null;
  estimatedPrice: number | null;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number | null;
  endLongitude: number | null;
  riderName?: string;
  riderPhone?: string;
}

export default function ActiveTripScreen({ navigation, route }: Props) {
  const { rideId } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { location, setHasActiveRide } = useDriverStatus();

  const [ride, setRide] = useState<RideDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [meter, setMeter] = useState<RideMeterPayload | null>(null);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setHasActiveRide(true);
    return () => setHasActiveRide(false);
  }, [setHasActiveRide]);

  useEffect(() => {
    let cancelled = false;
    apiGet<RideDetails>(`/rides/${rideId}`)
      .then((r) => { if (!cancelled) setRide(r); })
      .catch(() => {
        Alert.alert(tr('commonError'), tr('tripLoadError'));
        navigation.goBack();
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [rideId, navigation]);

  useEffect(() => {
    captainSocketService.onRideMeter((payload) => {
      if (payload.rideId === rideId) setMeter(payload);
    });
    captainSocketService.onRideCancelled(({ rideId: cancelledId }) => {
      if (cancelledId !== rideId) return;
      Alert.alert(tr('tripCancelledTitle'), tr('tripClientCancelledThis'), [
        { text: tr('commonOk'), onPress: () => navigation.popToTop() },
      ]);
    });
    return () => {
      captainSocketService.offRideMeter();
    };
  }, [rideId, navigation]);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const updated = await apiPost<RideDetails, object>(`/rides/${rideId}/start`, {});
      setRide(updated);
    } catch (e: any) {
      Alert.alert(t('commonError'), apiErrorMessage(e, t('homeStartError')));
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
    if (completing || !ride) return;
    setCompleting(true);
    try {
      const endLatitude  = location?.latitude  ?? ride.endLatitude  ?? ride.startLatitude;
      const endLongitude = location?.longitude ?? ride.endLongitude ?? ride.startLongitude;
      const completed = await apiPost<{ price: number }, object>(`/rides/${rideId}/complete`, {
        endLatitude, endLongitude,
      });
      Alert.alert(
        t('tripCompletedTitle'),
        t('tripFinalPrice')(completed.price),
        [{ text: t('commonOk'), onPress: () => navigation.popToTop() }],
      );
    } catch (e: any) {
      Alert.alert(t('commonError'), apiErrorMessage(e, t('homeCompleteError')));
    } finally {
      setCompleting(false);
    }
  };

  if (loading || !ride) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const isInProgress = ride.status === 'IN_PROGRESS';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isInProgress ? t('tripInProgress') : t('tripEnRoute')}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.clientCard}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientAvatarText}>{(ride.riderName?.[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{ride.riderName ?? t('commonClient')}</Text>
            <Text style={styles.clientPhone}>{ride.riderPhone ?? ''}</Text>
          </View>
        </View>

        <View style={styles.destRow}>
          <Ionicons name="navigate-outline" size={16} color={C.sub} />
          <Text style={styles.destText}>
            {ride.destinationName ?? t('commonOpenTripNoDest')}
          </Text>
        </View>

        {isInProgress && (
          <View style={styles.priceCard}>
            {ride.isOpenTrip ? (
              <>
                <Text style={styles.distanceText}>{(meter?.distanceKm ?? 0).toFixed(2)} {t('commonKm')}</Text>
                <Text style={styles.priceText}>{meter?.price ?? ride.estimatedPrice ?? 0} MRU</Text>
                <Text style={styles.meterHint}>{t('tripLiveMeter')}</Text>
              </>
            ) : (
              <Text style={styles.priceText}>{ride.estimatedPrice ?? 0} MRU</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {isInProgress ? (
          <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} disabled={completing} activeOpacity={0.85}>
            {completing
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.completeBtnText}>{t('homeCompleteRide')}</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.startBtn} onPress={handleStart} disabled={starting} activeOpacity={0.85}>
            {starting
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.startBtnText}>{t('homeStartRide')}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  centered: { alignItems: 'center', justifyContent: 'center' },

  header: { marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.text },

  content: { flex: 1, gap: 16 },
  clientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: 16, ...SH.sm,
  },
  clientAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  clientAvatarText: { color: C.white, fontSize: 20, fontWeight: '800' },
  clientName: { fontSize: 15, fontWeight: '700', color: C.text },
  clientPhone: { fontSize: 13, color: C.sub, marginTop: 2 },

  destRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surfaceAlt, borderRadius: RADIUS.md, padding: 12,
  },
  destText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },

  priceCard: {
    alignItems: 'center', backgroundColor: C.surface, borderRadius: RADIUS.xl,
    padding: 24, ...SH.md,
  },
  distanceText: { fontSize: 13, fontWeight: '700', color: C.sub },
  priceText: { fontSize: 34, fontWeight: '900', color: C.text, marginTop: 4 },
  meterHint: { fontSize: 12, color: C.accentDk, fontWeight: '700', marginTop: 8 },

  footer: { paddingTop: 12 },
  startBtn: {
    height: 56, borderRadius: RADIUS.lg, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', ...SH.md,
  },
  startBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
  completeBtn: {
    height: 56, borderRadius: RADIUS.lg, backgroundColor: C.danger,
    alignItems: 'center', justifyContent: 'center', ...SH.red,
  },
  completeBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
