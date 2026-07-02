import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList, RideHistoryItem } from '../types';
import { apiGet } from '../services/api';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Historique'>;

const MOCK: RideHistoryItem[] = [
  { id:'1', status:'completed',           date:'26/06  17:39', originLabel:'ويسترين يونيون & مونيغرام، لاسبالماس', destLabel:'Trajet ouvert',                          clientName:'',        price:210, currency:'MRU' },
  { id:'2', status:'cancelled_by_client', date:'26/06  17:31', originLabel:'Epicérie Wel Mahfou8, Essahraoui',      destLabel:'ANATOLİA CAFE RESTAURANT, Las Pal...',  clientName:'Mokhtar', price:100, currency:'MRU' },
  { id:'3', status:'completed',           date:'26/06  12:38', originLabel:'Améliorer Google Maps, Tevragh Ze...',  destLabel:'Trajet ouvert',                          clientName:'soumeye', price:400, currency:'MRU' },
  { id:'4', status:'completed',           date:'25/06  23:49', originLabel:'لمسيد لخظر، لكصر',                      destLabel:'Trajet ouvert',                          clientName:'',        price:175, currency:'MRU' },
  { id:'5', status:'cancelled_by_client', date:'25/06  19:12', originLabel:'Station Total, Tevragh Zeina',          destLabel:'Hôpital Mère et Enfant',                 clientName:'Ahmed',   price:80,  currency:'MRU' },
  { id:'6', status:'completed',           date:'25/06  15:05', originLabel:'Carrefour Ould Mey, Ksar',              destLabel:'Aéroport International Nouakchott',      clientName:'Fatima',  price:650, currency:'MRU' },
];

const STATUS_META = {
  completed:           { label: 'Course finie',       icon: '✓', bg: '#ECFDF5', color: C.accent,  borderColor: C.accentDk },
  cancelled_by_client: { label: 'Client a annulé',   icon: '✕', bg: '#FFF1F5', color: C.danger,  borderColor: C.dangerDk },
  cancelled_by_driver: { label: 'Vous avez annulé',  icon: '✕', bg: '#FFF8EC', color: C.warning, borderColor: C.warningDk },
  ongoing:             { label: 'En cours',            icon: '→', bg: '#F5F0FF', color: C.primary, borderColor: C.primaryDk },
};

// ─── Ride card with entrance animation ───────────────────────────────────────

function RideCard({ item, index }: { item: RideHistoryItem; index: number }) {
  const meta    = STATUS_META[item.status] ?? STATUS_META.completed;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.timing(opacity,   { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 10, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY: slideAnim }] }]}>
      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: meta.color }]} />

      <View style={styles.cardContent}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.borderColor }]}>
            <Text style={[styles.statusIcon, { color: meta.color }]}>{meta.icon}</Text>
            <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.cardDate}>{item.date}</Text>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={styles.routeIndicators}>
            <View style={[styles.routeDot, { backgroundColor: C.accent }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, styles.routeDotDest, { borderColor: C.danger }]} />
          </View>
          <View style={styles.routeLabels}>
            <Text style={styles.routeOrigin} numberOfLines={1}>{item.originLabel}</Text>
            <View style={styles.routeGap} />
            <Text style={styles.routeDest} numberOfLines={1}>{item.destLabel}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.clientChip}>
            <Text style={styles.clientIcon}>👤</Text>
            <Text style={styles.clientName}>{item.clientName || 'Inconnu'}</Text>
          </View>
          <View style={[styles.priceChip, { backgroundColor: meta.bg }]}>
            <Text style={[styles.priceText, { color: meta.color }]}>
              {item.price} {item.currency}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Summary chip ─────────────────────────────────────────────────────────────

function SummaryChip({ icon, value, label, color }: {
  icon: string; value: string | number; label: string; color: string;
}) {
  return (
    <View style={[sum.chip, { borderColor: color + '40' }]}>
      <Text style={sum.icon}>{icon}</Text>
      <Text style={[sum.value, { color }]}>{value}</Text>
      <Text style={sum.label}>{label}</Text>
    </View>
  );
}
const sum = StyleSheet.create({
  chip:  { flex: 1, backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', gap: 3, borderWidth: 1.5, ...SH.sm },
  icon:  { fontSize: 20 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, color: C.sub, fontWeight: '600', textAlign: 'center' },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function HistoriqueScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [rides,      setRides]      = useState<RideHistoryItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiGet<RideHistoryItem[]>('/drivers/history?days=30');
      setRides(data);
    } catch {
      setRides(MOCK);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const completed = rides.filter((r) => r.status === 'completed');
  const cancelled = rides.filter((r) => r.status === 'cancelled_by_client');
  const total     = completed.reduce((s, r) => s + r.price, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Gradient header ── */}
      <LinearGradient colors={G.dark} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique</Text>
        <Text style={styles.headerSub}>30 derniers jours</Text>

        {/* Summary chips */}
        <View style={styles.summaryRow}>
          <SummaryChip icon="✅" value={completed.length} label="Terminées"   color={C.accent}  />
          <SummaryChip icon="💰" value={`${total}`}       label="MRU gagnés"  color={C.primary} />
          <SummaryChip icon="❌" value={cancelled.length} label="Annulations" color={C.danger}  />
        </View>
      </LinearGradient>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <RideCard item={item} index={index} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchHistory(); }}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>Aucune course</Text>
              <Text style={styles.emptySub}>Vos courses des 30 derniers jours apparaîtront ici.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  header: { paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  backBtn: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  backIcon:    { fontSize: 24, color: C.white, fontWeight: '300' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: C.white },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20, marginTop: 2 },

  summaryRow:  { flexDirection: 'row', gap: 10 },

  listContent: { padding: 16, paddingTop: 20, gap: 14, paddingBottom: 32 },

  loadingText: { fontSize: 14, color: C.sub },

  // ── Card
  card: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.xl, flexDirection: 'row',
    overflow: 'hidden', ...SH.md,
  },
  cardAccent:  { width: 5 },
  cardContent: { flex: 1, padding: 14, gap: 12 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate:    { fontSize: 12, color: C.muted, fontWeight: '600' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1,
  },
  statusIcon:  { fontSize: 11, fontWeight: '900' },
  statusLabel: { fontSize: 12, fontWeight: '700' },

  // Route
  routeRow:       { flexDirection: 'row', gap: 12 },
  routeIndicators:{ alignItems: 'center', paddingTop: 2, gap: 0 },
  routeDot: {
    width: 12, height: 12, borderRadius: 6,
  },
  routeDotDest: { backgroundColor: 'transparent', borderWidth: 2 },
  routeLine:    { width: 2, height: 20, backgroundColor: C.border, marginVertical: 3 },
  routeLabels:  { flex: 1 },
  routeOrigin:  { fontSize: 13, color: C.text, fontWeight: '600' },
  routeGap:     { height: 10 },
  routeDest:    { fontSize: 13, color: C.sub, fontWeight: '500' },

  // Footer
  cardFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: C.borderLt },
  clientChip:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientIcon:  { fontSize: 13 },
  clientName:  { fontSize: 13, color: C.sub, fontWeight: '500' },
  priceChip:   { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5 },
  priceText:   { fontSize: 14, fontWeight: '800' },

  // Empty
  emptyWrap:  { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 54 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptySub:   { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 21 },
});
