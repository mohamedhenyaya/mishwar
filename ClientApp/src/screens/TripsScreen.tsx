import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiDelete, apiGet } from '../services/api';
import { Ride, RideStatus, TabScreenProps } from '../types';
import { colors, radius, shadows, spacing, typography } from '../theme';

type Props = TabScreenProps<'Trips'>;
type Segment = 'upcoming' | 'history';

const STATUS_META: Record<RideStatus, { label: string; tone: 'success' | 'danger' | 'accent' | 'neutral' }> = {
  SCHEDULED:   { label: 'Programmée',        tone: 'accent'  },
  PENDING:     { label: 'Recherche en cours', tone: 'neutral' },
  ACCEPTED:    { label: 'Chauffeur trouvé',   tone: 'accent'  },
  IN_PROGRESS: { label: 'En cours',           tone: 'accent'  },
  COMPLETED:   { label: 'Terminée',           tone: 'success' },
  CANCELLED:   { label: 'Annulée',            tone: 'danger'  },
};

const TONE_COLORS: Record<string, { bg: string; fg: string }> = {
  success: { bg: colors.successMuted, fg: colors.success },
  danger:  { bg: colors.dangerMuted,  fg: colors.danger  },
  accent:  { bg: colors.accentMuted,  fg: colors.accent  },
  neutral: { bg: colors.surfaceAlt,   fg: colors.textSecondary },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function RideCard({ ride, onCancel }: { ride: Ride; onCancel?: () => void }) {
  const meta = STATUS_META[ride.status];
  const tone = TONE_COLORS[meta.tone];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusText, { color: tone.fg }]}>{meta.label}</Text>
        </View>
        {ride.price != null && <Text style={styles.price}>{ride.price} MRU</Text>}
      </View>

      <View style={styles.routeRow}>
        <Ionicons name="location" size={16} color={colors.accent} />
        <Text style={styles.destination} numberOfLines={2}>{ride.destinationName}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
        <Text style={styles.date}>{formatDate(ride.scheduledAt ?? ride.createdAt)}</Text>
        <View style={styles.vehicleChip}>
          <Text style={styles.vehicleChipText}>{ride.vehicleType}</Text>
        </View>
      </View>

      {onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
          <Ionicons name="close-circle-outline" size={15} color={colors.danger} />
          <Text style={styles.cancelBtnText}>Annuler cette course</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function TripsScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const [segment,    setSegment]    = useState<Segment>('upcoming');
  const [upcoming,   setUpcoming]   = useState<Ride[]>([]);
  const [history,    setHistory]    = useState<Ride[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [scheduled, mine] = await Promise.all([
        apiGet<Ride[]>('/rides/scheduled/my'),
        apiGet<Ride[]>('/rides/my'),
      ]);
      setUpcoming(scheduled);
      setHistory(mine.filter((r) => r.status !== 'SCHEDULED'));
    } catch {
      setUpcoming([]);
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cancelScheduled = (ride: Ride) => {
    Alert.alert('Annuler la course', 'Voulez-vous annuler cette course programmée ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/rides/scheduled/${ride.id}`);
            setUpcoming((prev) => prev.filter((r) => r.id !== ride.id));
          } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.message ?? "Impossible d'annuler cette course.");
          }
        },
      },
    ]);
  };

  const data = segment === 'upcoming' ? upcoming : history;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes trajets</Text>
        <Text style={styles.subtitle}>Historique et courses à venir</Text>
      </View>

      <View style={styles.segmentWrap}>
        {(['upcoming', 'history'] as Segment[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.segment, segment === s && styles.segmentActive]}
            onPress={() => setSegment(s)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, segment === s && styles.segmentTextActive]}>
              {s === 'upcoming' ? 'À venir' : 'Historique'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RideCard
              ride={item}
              onCancel={segment === 'upcoming' ? () => cancelScheduled(item) : undefined}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="reader-outline" size={44} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>
                {segment === 'upcoming' ? 'Aucune course programmée' : 'Aucune course pour le moment'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 2 },

  segmentWrap: {
    flexDirection: 'row', backgroundColor: colors.surfaceAlt,
    marginHorizontal: spacing.xxl, marginTop: spacing.md,
    borderRadius: radius.md, padding: 4, gap: 4,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.surface, ...shadows.sm },
  segmentText: { ...typography.bodySm, fontWeight: '700', color: colors.textSecondary },
  segmentTextActive: { color: colors.primary },

  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.sm, ...shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 5 },
  statusText: { ...typography.caption, fontWeight: '700' },
  price: { ...typography.bodyLg, fontWeight: '800', color: colors.text },

  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  destination: { flex: 1, ...typography.bodySm, fontWeight: '600', color: colors.text },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  date: { flex: 1, ...typography.caption, color: colors.textTertiary },
  vehicleChip: { backgroundColor: colors.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  vehicleChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' },

  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 2 },
  cancelBtnText: { ...typography.caption, color: colors.danger, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle: { ...typography.body, color: colors.textSecondary },
});
