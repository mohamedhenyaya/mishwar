import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGet } from '../services/api';
import { LeaderboardEntry, LeaderboardPeriod, LeaderboardResult, TabScreenProps } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { colors, radius, shadows, spacing, typography } from '../theme';

type Props = TabScreenProps<'Ranking'>;

const PERIODS: LeaderboardPeriod[] = ['day', 'week', 'month', 'year'];

const RANK_COLORS: Record<number, string> = {
  1: '#D4AF37', // or
  2: '#A7A7AD', // argent
  3: '#B8722C', // bronze
};

function RankBadge({ rank }: { rank: number }) {
  const medalColor = RANK_COLORS[rank];
  return (
    <View style={[styles.rankBadge, medalColor ? { backgroundColor: medalColor } : null]}>
      <Text style={[styles.rankBadgeText, medalColor && styles.rankBadgeTextMedal]}>{rank}</Text>
    </View>
  );
}

export default function RankingScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [period, setPeriod] = useState<LeaderboardPeriod>('day');
  const [result, setResult] = useState<LeaderboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (p: LeaderboardPeriod) => {
    try {
      const data = await apiGet<LeaderboardResult>(`/rides/leaderboard?period=${p}`);
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData(period);
  }, [period, fetchData]);

  const periodLabel: Record<LeaderboardPeriod, string> = {
    day: t('periodDay'),
    week: t('periodWeek'),
    month: t('periodMonth'),
    year: t('periodYear'),
  };

  const entries = result?.entries ?? [];
  const currentUser = result?.currentUser ?? null;
  const currentUserInList = entries.some((e) => e.isCurrentUser);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="trophy" size={18} color={colors.accent} />
        </View>
        <Text style={styles.title}>{t('rankingTitle')}</Text>
      </View>

      <View style={styles.segmentWrap}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.segment, period === p && styles.segmentActive]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, period === p && styles.segmentTextActive]}>
              {periodLabel[p]}
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
          data={entries}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => <RankRow entry={item} pointsSuffix={t('rankingPointsSuffix')} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(period); }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="trophy-outline" size={44} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>{t('rankingEmpty')}</Text>
            </View>
          }
          ListFooterComponent={
            currentUser && !currentUserInList ? (
              <View style={styles.yourRankCard}>
                <RankBadge rank={currentUser.rank} />
                <Text style={styles.yourRankLabel}>{t('rankingYourRank')}</Text>
                <Text style={styles.yourRankPoints}>{currentUser.points}{t('rankingPointsSuffix')}</Text>
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

function RankRow({ entry, pointsSuffix }: { entry: LeaderboardEntry; pointsSuffix: string }) {
  return (
    <View style={[styles.row, entry.isCurrentUser && styles.rowActive]}>
      <RankBadge rank={entry.rank} />
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{entry.name[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <Text style={styles.rowName} numberOfLines={1}>{entry.name}</Text>
      <Text style={[styles.rowPoints, entry.isCurrentUser && styles.rowPointsActive]}>
        {entry.points}{pointsSuffix}
      </Text>
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

  segmentWrap: {
    flexDirection: 'row', backgroundColor: colors.surfaceAlt,
    marginHorizontal: spacing.xxl, marginTop: spacing.sm,
    borderRadius: radius.full, padding: 4, gap: 4,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: radius.full, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primary, ...shadows.sm, shadowColor: colors.primary },
  segmentText: { ...typography.bodySm, fontWeight: '700', color: colors.textSecondary },
  segmentTextActive: { color: colors.textInverse },

  listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.md, ...shadows.sm,
  },
  rowActive: { borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.accentMuted },

  rankBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  rankBadgeText: { ...typography.bodySm, fontWeight: '800', color: colors.textSecondary },
  rankBadgeTextMedal: { color: colors.textInverse },

  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.textInverse, fontSize: 15, fontWeight: '800' },

  rowName: { flex: 1, ...typography.bodySm, fontWeight: '600', color: colors.text },
  rowPoints: { ...typography.bodySm, fontWeight: '800', color: colors.text },
  rowPointsActive: { color: colors.accent },

  yourRankCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.xl,
    padding: spacing.md, marginTop: spacing.sm,
    ...shadows.md, shadowColor: colors.primary,
  },
  yourRankLabel: { flex: 1, ...typography.bodySm, fontWeight: '700', color: colors.textInverse },
  yourRankPoints: { ...typography.bodySm, fontWeight: '800', color: colors.textInverse },

  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle: { ...typography.body, color: colors.textSecondary },
});
