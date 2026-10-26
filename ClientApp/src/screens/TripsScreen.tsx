import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGet } from '../services/api';
import { Ride, RideStatus, TabScreenProps } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { StringTranslationKey } from '../i18n/translations';
import { colors, radius, shadows, spacing, typography } from '../theme';

type Props = TabScreenProps<'Trips'>;

const STATUS_KEYS: Record<RideStatus, { key: StringTranslationKey; tone: 'success' | 'danger' | 'accent' | 'neutral' }> = {
  SCHEDULED:   { key: 'tripsStatusScheduled',  tone: 'accent'  },
  PENDING:     { key: 'tripsStatusPending',    tone: 'neutral' },
  ACCEPTED:    { key: 'tripsStatusAccepted',   tone: 'accent'  },
  ARRIVED:     { key: 'tripsStatusArrived',    tone: 'accent'  },
  IN_PROGRESS: { key: 'tripsStatusInProgress', tone: 'accent'  },
  COMPLETED:   { key: 'tripsStatusCompleted',  tone: 'success' },
  CANCELLED:   { key: 'tripsStatusCancelled',  tone: 'danger'  },
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

function RideCard({ ride }: { ride: Ride }) {
  const { t } = useLanguage();
  const meta = STATUS_KEYS[ride.status];
  const tone = TONE_COLORS[meta.tone];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusText, { color: tone.fg }]}>{t(meta.key)}</Text>
        </View>
        {ride.price != null && <Text style={styles.price}>{ride.price} MRU</Text>}
      </View>

      <View style={styles.routeRow}>
        <Ionicons name="location" size={16} color={colors.accent} />
        <Text style={styles.destination} numberOfLines={2}>{ride.destinationName}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
        <Text style={styles.date}>{formatDate(ride.createdAt)}</Text>
        <View style={styles.vehicleChip}>
          <Text style={styles.vehicleChipText}>{ride.vehicleType}</Text>
        </View>
      </View>
    </View>
  );
}

export default function TripsScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [history,    setHistory]    = useState<Ride[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const mine = await apiGet<Ride[]>('/rides/my');
      setHistory(mine.filter((r) => r.status !== 'SCHEDULED'));
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="time" size={18} color={colors.accent} />
        </View>
        <Text style={styles.title}>{t('tripsTitle')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RideCard ride={item} />}
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
              <Text style={styles.emptyTitle}>{t('tripsEmptyHistory')}</Text>
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

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  headerIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center',
  },
  title: { ...typography.h1, color: colors.text },

  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
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

  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle: { ...typography.body, color: colors.textSecondary },
});
