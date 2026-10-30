import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { TranslationKey } from '../i18n/translations';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Performance'>;

// ─── Données de démonstration ──────────────────────────────────────────────────
// Aucun système de points/classement n'existe encore côté serveur : ces données
// sont simulées pour prévisualiser l'écran. À remplacer par un vrai appel API
// dès qu'un endpoint de gamification sera disponible.

interface Badge { key: string; label: TranslationKey | null; icon: keyof typeof Ionicons.glyphMap; unlocked: boolean }
interface LeaderboardEntry {
  id: string; name: string; points: number; trend: 'up' | 'down' | 'flat'; you?: boolean;
}

const CURRENT_POINTS = 200;
const CURRENT_RANK = 359;
const NEXT_BADGE = { label: 'perfBadgeRoadWarrior', target: 300 } as const;
const CURRENT_BADGE_LABEL = 'perfBadgeMarathon';

const STATS = [
  { icon: 'checkmark-done-circle' as const, value: '24', label: 'perfStatCompletion', color: C.accent,  bg: '#ECFDF5' },
  { icon: 'star' as const,                  value: '0',  label: 'commonRating',       color: C.warning, bg: '#FFF8E1' },
  { icon: 'time' as const,                  value: '0',  label: 'perfStatEta',        color: '#3B82F6', bg: '#E3F2FD' },
  { icon: 'flame' as const,                 value: '0',  label: 'perfStatHotZones',   color: C.danger,  bg: '#FFF1F5' },
] as const;

// label null : badge encore secret (« ??? »)
const BADGES: Badge[] = [
  { key: 'marathon', label: 'perfBadgeMarathon', icon: 'trail-sign',  unlocked: true },
  { key: 'mystery1', label: null,                icon: 'help',        unlocked: false },
  { key: 'mystery2', label: null,                icon: 'help',        unlocked: false },
];

const LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', name: 'محمدو',        points: 2080, trend: 'up'   },
  { id: '2', name: 'محمد',         points: 1080, trend: 'down' },
  { id: '3', name: 'Dedah Elmamy', points: 1050, trend: 'flat' },
  { id: '4', name: 'Nejib',        points: 1050, trend: 'down' },
  { id: '5', name: 'Ahmed',        points: 1050, trend: 'down' },
  { id: '6', name: 'أمينو',        points: 1040, trend: 'down' },
  { id: '7', name: 'Hamdi',        points: 880,  trend: 'down' },
];

const TREND_META = {
  up:   { icon: 'trending-up'   as const, color: C.accent },
  down: { icon: 'trending-down' as const, color: C.danger },
  flat: { icon: 'remove'        as const, color: C.muted  },
};

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PerformanceScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const progress = Math.min(1, CURRENT_POINTS / NEXT_BADGE.target);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <LinearGradient colors={G.dark} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('menuPerformance')}</Text>
          <View style={styles.backBtn}>
            <Ionicons name="help-circle-outline" size={20} color={C.white} />
          </View>
        </View>

        <Text style={styles.pointsLabel}>{t('perfCurrentPoints')}</Text>
        <View style={styles.rankRow}>
          <Ionicons name="ribbon" size={16} color="#FFD60A" />
          <Text style={styles.rankText}>{t('perfRank')(CURRENT_RANK)}</Text>
        </View>
        <Text style={styles.pointsValue}>{CURRENT_POINTS}</Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{t(CURRENT_BADGE_LABEL)}</Text>
          <Text style={styles.progressSub}>{t('perfPointsTo')(NEXT_BADGE.target - CURRENT_POINTS, t(NEXT_BADGE.label))}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* ── Stat cards ── */}
        <View style={styles.statsGrid}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{t(s.label)}</Text>
            </View>
          ))}
        </View>

        {/* ── Badges ── */}
        <Text style={styles.sectionTitle}>{t('perfUnlockedBadges')}</Text>
        <View style={styles.badgeRow}>
          {BADGES.map((b) => (
            <View key={b.key} style={styles.badgeItem}>
              <View style={[styles.badgeCircle, b.unlocked ? styles.badgeCircleUnlocked : styles.badgeCircleLocked]}>
                <Ionicons name={b.icon} size={26} color={b.unlocked ? C.warning : C.muted} />
              </View>
              <Text style={[styles.badgeLabel, !b.unlocked && styles.badgeLabelLocked]}>{b.label ? (t(b.label) as string) : '???'}</Text>
            </View>
          ))}
        </View>

        {/* ── Classement ── */}
        <Text style={styles.sectionTitle}>{t('perfLeaderboard')}</Text>
        <View style={styles.leaderboard}>
          {LEADERBOARD.map((entry, idx) => {
            const rank = idx + 1;
            const trend = TREND_META[entry.trend];
            const topThree = rank <= 3;
            return (
              <View key={entry.id} style={[styles.rankRowItem, idx === LEADERBOARD.length - 1 && styles.rankRowLast]}>
                <View style={styles.rankBadge}>
                  {topThree ? (
                    <Ionicons name="trophy" size={18} color={rank === 1 ? '#FFD60A' : rank === 2 ? '#C0C0C8' : '#CD7F32'} />
                  ) : (
                    <Text style={styles.rankNumber}>{rank}</Text>
                  )}
                </View>
                <View style={[styles.avatar, entry.you && styles.avatarYou]}>
                  <Text style={styles.avatarText}>{initials(entry.name)}</Text>
                </View>
                <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
                <Text style={styles.entryPoints}>{t('perfPoints')(entry.points)}</Text>
                <Ionicons name={trend.icon} size={16} color={trend.color} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 20, paddingBottom: 24,
    borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  backBtn: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: C.white },

  pointsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  rankText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  pointsValue: { fontSize: 46, fontWeight: '900', color: C.white, marginTop: 2, marginBottom: 16 },

  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '800', color: C.white },
  progressSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: C.accent },

  scroll: { padding: 16, gap: 8 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  statCard: {
    width: '47%', backgroundColor: C.surface, borderRadius: RADIUS.xl,
    padding: 16, alignItems: 'center', gap: 6, ...SH.sm,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: C.text },
  statLabel: { fontSize: 11, color: C.sub, textAlign: 'center', fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 16, marginBottom: 10, marginLeft: 4 },

  badgeRow: { flexDirection: 'row', gap: 20, paddingLeft: 4 },
  badgeItem: { alignItems: 'center', gap: 8, width: 76 },
  badgeCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  badgeCircleUnlocked: { backgroundColor: '#FFF8E1', borderColor: '#FFE083' },
  badgeCircleLocked:   { backgroundColor: C.surfaceAlt, borderColor: C.border },
  badgeLabel: { fontSize: 12, fontWeight: '700', color: C.text, textAlign: 'center' },
  badgeLabelLocked: { color: C.muted },

  leaderboard: { backgroundColor: C.surface, borderRadius: RADIUS.xl, overflow: 'hidden', ...SH.sm },
  rankRowItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.borderLt,
  },
  rankRowLast: { borderBottomWidth: 0 },
  rankBadge: { width: 24, alignItems: 'center' },
  rankNumber: { fontSize: 14, fontWeight: '800', color: C.sub },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  avatarYou: { borderWidth: 2, borderColor: C.primary },
  avatarText: { fontSize: 15, fontWeight: '800', color: C.primary },
  entryName: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text },
  entryPoints: { fontSize: 13, fontWeight: '700', color: C.sub },
});
