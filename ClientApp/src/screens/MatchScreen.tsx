import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { socketService } from '../services/socket';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Match'>;
type MatchStatus = 'searching' | 'found' | 'cancelled';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  blue:    '#007AFF',
  bg:      '#F5F6FA',
  text:    '#1A1A1A',
  subtle:  '#7F8C8D',
  white:   '#FFFFFF',
  green:   '#34C759',
  red:     '#FF3B30',
  blueBg:  '#EBF5FF',
  border:  '#EAECF0',
};

// ── Composant rings pulsants ───────────────────────────────────────────────────
function PulseRings() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const rings = [ring1, ring2, ring3];

  useEffect(() => {
    const DURATION = 2200;
    const STAGGER  = 700;

    const animations = rings.map((ring, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * STAGGER),
          Animated.timing(ring, {
            toValue: 1,
            duration: DURATION,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    );

    const master = Animated.parallel(animations);
    master.start();
    return () => master.stop();
  }, []);

  return (
    <View style={pulse.container}>
      {rings.map((ring, i) => (
        <Animated.View
          key={i}
          style={[
            pulse.ring,
            {
              transform: [{
                scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }),
              }],
              opacity: ring.interpolate({
                inputRange: [0, 0.25, 1],
                outputRange: [0, 0.45, 0],
              }),
            },
          ]}
        />
      ))}
      {/* Point central */}
      <View style={pulse.dot} />
    </View>
  );
}

// ── Étoiles rating ────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 13, color: i <= Math.round(rating) ? '#FFD60A' : '#E5E5EA' }}>
          ★
        </Text>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MatchScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { rideId } = route.params;

  const [status, setStatus] = useState<MatchStatus>('searching');
  const [eta,    setEta]    = useState(0);

  // Animations d'entrée / transition
  const fadeIn    = useRef(new Animated.Value(0)).current;
  const slideUp   = useRef(new Animated.Value(40)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animation d'apparition de la carte chauffeur
  const showDriverCard = () => {
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }),
      Animated.timing(cardFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  // ── Socket + simulation DEV ────────────────────────────────────────────────

  useEffect(() => {
    socketService.connect();

    socketService.onRideAccepted(({ rideId: acceptedId }) => {
      if (acceptedId === rideId) {
        setEta(Math.floor(Math.random() * 5) + 2);
        setStatus('found');
        showDriverCard();
      }
    });

    socketService.onRideCancelled(() => setStatus('cancelled'));

    // Simulation en développement (3 secondes)
    const timer = setTimeout(() => {
      setEta(4);
      setStatus('found');
      showDriverCard();
    }, 3_000);

    return () => {
      clearTimeout(timer);
      socketService.offRideAccepted();
      socketService.offRideCancelled();
    };
  }, [rideId]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />

      {/* ── En-tête ───────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.cancelTopBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.cancelTopText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {status === 'searching' ? 'Recherche en cours' :
           status === 'found'     ? 'Chauffeur trouvé'  : 'Course annulée'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <Animated.View
        style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}
      >
        {/* ── Searching ─────────────────────────────────────────────── */}
        {status === 'searching' && (
          <View style={styles.searchingSection}>
            <PulseRings />

            <Text style={styles.searchingTitle}>Recherche de votre chauffeur</Text>
            <Text style={styles.searchingSubtitle}>
              Nous trouvons le meilleur chauffeur{'\n'}à proximité de vous…
            </Text>

            <View style={styles.searchingInfo}>
              {['Tarif le plus bas', 'Chauffeur le mieux noté', 'Le plus proche'].map((item) => (
                <View key={item} style={styles.infoRow}>
                  <View style={styles.infoCheck}><Text style={styles.infoCheckIcon}>✓</Text></View>
                  <Text style={styles.infoText}>{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Annuler la recherche</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Found ─────────────────────────────────────────────────── */}
        {status === 'found' && (
          <View style={styles.foundSection}>
            {/* Icône succès */}
            <View style={styles.successCircle}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.foundTitle}>Chauffeur trouvé !</Text>

            {/* ETA */}
            <View style={styles.etaCard}>
              <Text style={styles.etaLabel}>Arrivée estimée</Text>
              <View style={styles.etaRow}>
                <Text style={styles.etaNumber}>{eta}</Text>
                <Text style={styles.etaUnit}> min</Text>
              </View>
            </View>

            {/* Carte chauffeur */}
            <Animated.View
              style={[
                styles.driverCard,
                { opacity: cardFade, transform: [{ scale: cardScale }] },
              ]}
            >
              {/* Avatar */}
              <View style={styles.driverAvatarWrap}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>A</Text>
                </View>
                <View style={styles.driverOnline} />
              </View>

              {/* Infos */}
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>Ahmed Benali</Text>
                <Stars rating={4.8} />
                <Text style={styles.driverMeta}>Toyota Corolla · Blanc · AB-123-DZ</Text>
              </View>

              {/* Actions */}
              <View style={styles.driverActions}>
                <TouchableOpacity style={styles.driverActionBtn}>
                  <Text style={styles.driverActionIcon}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.driverActionBtn}>
                  <Text style={styles.driverActionIcon}>💬</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Course ID */}
            <Text style={styles.rideId}>Course #{rideId.slice(0, 8).toUpperCase()}</Text>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => navigation.popToTop()}
              activeOpacity={0.88}
            >
              <Text style={styles.doneBtnText}>Terminer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Cancelled ─────────────────────────────────────────────── */}
        {status === 'cancelled' && (
          <View style={styles.cancelledSection}>
            <View style={styles.cancelledCircle}>
              <Text style={styles.cancelledIcon}>✕</Text>
            </View>
            <Text style={styles.cancelledTitle}>Trajet annulé</Text>
            <Text style={styles.cancelledSubtitle}>
              Aucun chauffeur disponible pour le moment.{'\n'}
              Réessayez dans quelques instants.
            </Text>

            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.88}
            >
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeLink}
              onPress={() => navigation.popToTop()}
            >
              <Text style={styles.homeLinkText}>Retour à l'accueil</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 6,
};

const pulse = StyleSheet.create({
  container: {
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: C.blue,
  },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.blue,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
    elevation: 6,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: C.bg,
  },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  cancelTopBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  cancelTopText: { fontSize: 14, color: C.subtle, fontWeight: '600' },
  topBarTitle: { fontSize: 15, fontWeight: '700', color: C.text },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  // Searching
  searchingSection: { alignItems: 'center', gap: 20, width: '100%' },
  searchingTitle: { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  searchingSubtitle: {
    fontSize: 14, color: C.subtle, textAlign: 'center', lineHeight: 22,
    marginTop: -8,
  },
  searchingInfo: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    alignSelf: 'stretch', gap: 10, ...CARD_SHADOW,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center',
  },
  infoCheckIcon: { color: C.white, fontSize: 11, fontWeight: '800' },
  infoText: { fontSize: 14, color: C.text, fontWeight: '500' },
  cancelBtn: {
    paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white,
    marginTop: 4,
  },
  cancelBtnText: { fontSize: 14, color: C.subtle, fontWeight: '600' },

  // Found
  foundSection: { alignItems: 'center', gap: 16, width: '100%' },
  successCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.green, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  successIcon: { color: C.white, fontSize: 32, fontWeight: '800' },
  foundTitle: { fontSize: 24, fontWeight: '800', color: C.text },

  etaCard: {
    backgroundColor: C.blueBg, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 32,
    alignItems: 'center', alignSelf: 'stretch',
    borderWidth: 1.5, borderColor: '#CCE4FF',
  },
  etaLabel: { fontSize: 12, color: C.blue, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  etaRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  etaNumber: { fontSize: 52, fontWeight: '800', color: C.blue, lineHeight: 60 },
  etaUnit: { fontSize: 20, fontWeight: '600', color: C.blue, marginBottom: 8 },

  driverCard: {
    backgroundColor: C.white, borderRadius: 20,
    padding: 16, alignSelf: 'stretch',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...CARD_SHADOW,
  },
  driverAvatarWrap: { position: 'relative' },
  driverAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center',
  },
  driverAvatarText: { color: C.white, fontSize: 22, fontWeight: '800' },
  driverOnline: {
    position: 'absolute', bottom: 2, right: 2,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.white,
  },
  driverInfo: { flex: 1, gap: 4 },
  driverName: { fontSize: 15, fontWeight: '700', color: C.text },
  driverMeta: { fontSize: 11, color: C.subtle, marginTop: 2 },
  driverActions: { flexDirection: 'row', gap: 8 },
  driverActionBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  driverActionIcon: { fontSize: 18 },

  rideId: { fontSize: 11, color: '#C7C7CC', fontWeight: '500', marginTop: -4 },

  doneBtn: {
    height: 54, borderRadius: 16, backgroundColor: C.blue,
    alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  doneBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },

  // Cancelled
  cancelledSection: { alignItems: 'center', gap: 16, width: '100%' },
  cancelledCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.red, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  cancelledIcon: { color: C.white, fontSize: 28, fontWeight: '800' },
  cancelledTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  cancelledSubtitle: {
    fontSize: 14, color: C.subtle, textAlign: 'center', lineHeight: 22, marginTop: -4,
  },
  retryBtn: {
    height: 54, borderRadius: 16, backgroundColor: C.blue,
    alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  retryBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },
  homeLink: { marginTop: 4 },
  homeLinkText: { fontSize: 14, color: C.subtle, fontWeight: '500' },
});