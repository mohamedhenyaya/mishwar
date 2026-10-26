import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDriverStatus } from '../context/DriverStatusContext';
import { navigationRef } from '../navigation/navigationRef';
import { apiPost } from '../services/api';
import { C, SH, RADIUS } from '../theme';

const COUNTDOWN_SECONDS = 20; // purement indicatif — le vrai délai est géré côté serveur

export default function IncomingRideModal() {
  const { incomingRequest, dismissIncomingRequest, setHasActiveRide } = useDriverStatus();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [busy, setBusy] = useState(false);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!incomingRequest) return;
    setSecondsLeft(COUNTDOWN_SECONDS);
    setBusy(false);
    progress.setValue(1);
    Animated.timing(progress, {
      toValue: 0,
      duration: COUNTDOWN_SECONDS * 1000,
      useNativeDriver: false,
    }).start();

    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          dismissIncomingRequest();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingRequest?.rideId]);

  if (!incomingRequest) return null;

  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiPost(`/rides/${incomingRequest.rideId}/accept`, {});
      setHasActiveRide(true);
      const rideId = incomingRequest.rideId;
      dismissIncomingRequest();
      navigationRef.current?.navigate('ActiveTrip', { rideId });
    } catch {
      // course déjà prise par un autre chauffeur, ou plus disponible
      dismissIncomingRequest();
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiPost(`/rides/${incomingRequest.rideId}/reject`, {});
    } catch { /* best-effort */ } finally {
      dismissIncomingRequest();
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleReject}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.pulseIconWrap}>
              <Ionicons name="car-sport" size={22} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Nouvelle course</Text>
              <Text style={styles.subtitle}>{secondsLeft}s pour répondre</Text>
            </View>
          </View>

          <View style={styles.destRow}>
            <Ionicons name="navigate-outline" size={16} color={C.sub} />
            <Text style={styles.destText} numberOfLines={1}>
              {incomingRequest.destinationName ?? 'Trajet ouvert — destination à définir'}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} disabled={busy} activeOpacity={0.85}>
              <Text style={styles.rejectText}>Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={busy} activeOpacity={0.85}>
              <Text style={styles.acceptText}>Accepter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10, 6, 27, 0.55)' },
  sheet: {
    backgroundColor: C.white, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 20, paddingBottom: 32, ...SH.lg,
  },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: C.border, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: 4, backgroundColor: C.accent },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pulseIconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 13, color: C.sub, marginTop: 2, fontWeight: '600' },
  destRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surfaceAlt, borderRadius: RADIUS.md, padding: 12, marginBottom: 18,
  },
  destText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  actionsRow: { flexDirection: 'row', gap: 12 },
  rejectBtn: {
    flex: 1, height: 50, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectText: { fontSize: 15, fontWeight: '700', color: C.sub },
  acceptBtn: {
    flex: 1.4, height: 50, borderRadius: RADIUS.lg, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center', ...SH.green,
  },
  acceptText: { fontSize: 15, fontWeight: '800', color: C.white },
});
