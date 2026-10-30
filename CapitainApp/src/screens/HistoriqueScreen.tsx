import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, RideHistoryItem, RideStatus } from '../types';
import { apiGet } from '../services/api';
import { placeName } from '../services/geocode';
import { useLanguage } from '../i18n/LanguageContext';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Historique'>;
type IoniconName = keyof typeof Ionicons.glyphMap;

const HISTORY_DAYS = 30;

// Libellés traduits : t('historyStatus')
const STATUS_META: Record<RideStatus, { icon: IoniconName; bg: string; color: string; borderColor: string }> = {
  completed:           { icon: 'checkmark',     bg: '#ECFDF5', color: C.accent,  borderColor: C.accentDk },
  cancelled_by_client: { icon: 'close',         bg: '#FFF1F5', color: C.danger,  borderColor: C.dangerDk },
  cancelled_by_driver: { icon: 'close',         bg: '#FFF8EC', color: C.warning, borderColor: C.warningDk },
  cancelled_other:     { icon: 'close',         bg: '#F4F4F6', color: C.sub,     borderColor: C.border },
  ongoing:             { icon: 'arrow-forward', bg: '#F5F0FF', color: C.primary, borderColor: C.primaryDk },
};

const isCancelled = (status: RideStatus) => status.startsWith('cancelled');

// 2026-06-26T17:39:00Z → « 26/06  17:39 » (heure du téléphone)
function formatRideDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Ride card with entrance animation ───────────────────────────────────────

function RideCard({ item, index }: { item: RideHistoryItem; index: number }) {
  const { t } = useLanguage();
  const status  = STATUS_META[item.status] ? item.status : 'completed';
  const meta    = STATUS_META[status];
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacity   = useRef(new Animated.Value(0)).current;

  // Adresse du point de départ, retrouvée à partir des coordonnées
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    placeName(item.startLatitude, item.startLongitude).then((name) => { if (!cancelled) setOrigin(name); });
    return () => { cancelled = true; };
  }, [item.startLatitude, item.startLongitude]);

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
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.statusLabel, { color: meta.color }]}>{t('historyStatus')[status]}</Text>
          </View>
          <Text style={styles.cardDate}>{formatRideDate(item.date)}</Text>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={styles.routeIndicators}>
            <View style={[styles.routeDot, { backgroundColor: C.accent }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, styles.routeDotDest, { borderColor: C.danger }]} />
          </View>
          <View style={styles.routeLabels}>
            <Text style={styles.routeOrigin} numberOfLines={1}>{origin ?? t('historyPickupPoint')}</Text>
            <View style={styles.routeGap} />
            <Text style={styles.routeDest} numberOfLines={1}>
              {item.isOpenTrip || !item.destinationName ? t('commonOpenTrip') : item.destinationName}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.clientChip}>
            <Ionicons name="person" size={12} color={C.sub} />
            <Text style={styles.clientName}>{item.clientName || t('historyUnknown')}</Text>
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
  icon: IoniconName; value: string | number; label: string; color: string;
}) {
  return (
    <View style={[sum.chip, { borderColor: color + '40' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[sum.value, { color }]}>{value}</Text>
      <Text style={sum.label}>{label}</Text>
    </View>
  );
}
const sum = StyleSheet.create({
  chip:  { flex: 1, backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', gap: 3, borderWidth: 1.5, ...SH.sm },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, color: C.sub, fontWeight: '600', textAlign: 'center' },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function HistoriqueScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [rides,      setRides]      = useState<RideHistoryItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed,     setFailed]     = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiGet<RideHistoryItem[]>(`/rides/driver/history?days=${HISTORY_DAYS}`);
      setRides(data);
      setFailed(false);
    } catch {
      setFailed(true); // les courses déjà affichées restent visibles
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const completed = rides.filter((r) => r.status === 'completed');
  const cancelled = rides.filter((r) => isCancelled(r.status));
  const total     = completed.reduce((s, r) => s + r.price, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Gradient header ── */}
      <LinearGradient colors={G.dark} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('commonHistory')}</Text>
        <Text style={styles.headerSub}>{t('historyLast30Days')}</Text>

        {/* Summary chips */}
        <View style={styles.summaryRow}>
          <SummaryChip icon="checkmark-circle" value={completed.length} label={t('historyCompleted')}   color={C.accent}  />
          <SummaryChip icon="cash"             value={`${total}`}       label={t('historyEarned')}  color={C.primary} />
          <SummaryChip icon="close-circle"     value={cancelled.length} label={t('historyCancellations')} color={C.danger}  />
        </View>
      </LinearGradient>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>{t('commonLoading')}</Text>
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
          ListHeaderComponent={failed && rides.length > 0 ? (
            <View style={styles.errorBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color={C.danger} />
              <Text style={styles.errorBannerText}>{t('historyLoadErrorSub')}</Text>
            </View>
          ) : undefined}
          ListEmptyComponent={failed ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="cloud-offline-outline" size={48} color={C.muted} />
              <Text style={styles.emptyTitle}>{t('historyLoadErrorTitle')}</Text>
              <Text style={styles.emptySub}>{t('historyLoadErrorSub')}</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="reader-outline" size={48} color={C.muted} />
              <Text style={styles.emptyTitle}>{t('historyEmptyTitle')}</Text>
              <Text style={styles.emptySub}>{t('historyEmptySub')}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    backgroundColor: '#FFF1F1', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#FFD0D0',
  },
  errorBannerText: { flex: 1, fontSize: 13, color: C.danger, fontWeight: '600' },

  header: { paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  backBtn: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
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
  clientName:  { fontSize: 13, color: C.sub, fontWeight: '500' },
  priceChip:   { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5 },
  priceText:   { fontSize: 14, fontWeight: '800' },

  // Empty
  emptyWrap:  { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptySub:   { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 21 },
});
