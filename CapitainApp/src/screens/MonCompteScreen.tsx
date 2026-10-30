import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import RechargeSheet from '../components/RechargeSheet';
import { apiGet } from '../services/api';
import { tr, useLanguage } from '../i18n/LanguageContext';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MonCompte'>;
type Tab   = 'compte' | 'statistiques';

interface DriverProfile { rating: number; totalRides: number; }
interface WalletTransaction {
  id: string;
  type: 'admin_credit' | 'admin_debit' | 'commission_deduction';
  amount: number;      // signé : positif = crédit, négatif = débit
  note: string | null;
  createdAt: string;
}

const BAR_DATA = [6, 9, 4, 11, 8, 14, 3];

function txnLabel(txn: WalletTransaction): string {
  if (txn.note) return txn.note;
  if (txn.type === 'commission_deduction') return tr('accountTxnCommission');
  if (txn.type === 'admin_credit') return tr('accountTxnTopup');
  return tr('accountTxnWithdrawal');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

// ─── Action tile ──────────────────────────────────────────────────────────────
function ActionTile({ icon, label, color, bg, onPress, disabled = false, badge }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string;
  onPress?: () => void; disabled?: boolean; badge?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.tile, disabled && styles.tileDisabled]}
      onPress={onPress} disabled={disabled} activeOpacity={0.7}
    >
      <View style={[styles.tileIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.tileLabel, disabled && { color: C.muted }]}>{label}</Text>
      {badge && (
        <View style={styles.tileBadge}><Text style={styles.tileBadgeText}>{badge}</Text></View>
      )}
    </TouchableOpacity>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color, bg }: {
  icon: keyof typeof Ionicons.glyphMap; value: string; label: string; color: string; bg: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: color + '30' }]}>
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MonCompteScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [activeTab,  setActiveTab]  = useState<Tab>('compte');
  const [balance,    setBalance]    = useState(0);
  const [profile,    setProfile]    = useState<DriverProfile>({ rating: 5, totalRides: 0 });
  const [txns,       setTxns]       = useState<WalletTransaction[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [driverPhone,  setDriverPhone]  = useState<string | undefined>();

  useEffect(() => {
    apiGet<{ phone: string }>('/drivers/me').then((d) => setDriverPhone(d.phone)).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [wallet, tx, me] = await Promise.all([
        apiGet<{ balance: number }>('/wallet/me'),
        apiGet<{ data: WalletTransaction[] }>('/wallet/me/transactions?limit=20'),
        apiGet<DriverProfile>('/drivers/me'),
      ]);
      setBalance(Number(wallet.balance));
      setTxns(tx.data);
      setProfile({ rating: Number(me.rating), totalRides: Number(me.totalRides) });
    } catch {
      // Backend injoignable — l'écran reste vide plutôt que d'afficher des montants fictifs
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const maxBar = Math.max(...BAR_DATA);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <LinearGradient colors={G.dark} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('accountTitle')}</Text>
        <Text style={styles.headerSub}>{t('accountSub')}</Text>
      </LinearGradient>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        {(['compte', 'statistiques'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab === 'compte' ? 'card' : 'bar-chart'}
              size={15}
              color={activeTab === tab ? C.white : C.sub}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'compte' ? t('accountTabAccount') : t('accountTabStats')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'compte' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
        >
          {/* ── Solde négatif : ni en ligne ni courses tant que le compte n'est pas rechargé ── */}
          {(balance < 0 || route.params?.insufficientBalance) && (
            <View style={styles.lowBalance}>
              <Ionicons name="alert-circle" size={22} color={C.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.lowBalanceTitle}>{t('accountLowBalanceTitle')}</Text>
                <Text style={styles.lowBalanceText}>{t('accountLowBalanceText')}</Text>
              </View>
            </View>
          )}

          {/* ── Credit card style balance ── */}
          <View style={styles.balanceCardWrap}>
            <LinearGradient
              colors={[C.primary, C.darkMid, C.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <View style={styles.balanceBlob1} />
              <View style={styles.balanceBlob2} />

              <View style={styles.balanceTop}>
                <Text style={styles.balanceCardLabel}>{t('accountAvailableBalance')}</Text>
                <View style={styles.balanceCurrencyBadge}>
                  <Text style={styles.balanceCurrencyText}>MRU</Text>
                </View>
              </View>

              <Text style={styles.balanceAmount}>
                {balance.toFixed(2).replace('.', ',')}
              </Text>

              <View style={styles.balanceBottom}>
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>{t('commonRides')}</Text>
                  <Text style={styles.balanceStatValue}>{profile.totalRides}</Text>
                </View>
                <View style={styles.balanceStatDiv} />
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>{t('commonRating')}</Text>
                  <Text style={styles.balanceStatValue}>★ {profile.rating.toFixed(1)}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* ── Action tiles ── */}
          <View style={styles.tilesRow}>
            <ActionTile
              icon="add-circle" label={t('accountTopup')} color={C.primary} bg={C.surfaceAlt}
              onPress={() => setRechargeOpen(true)}
            />
            <ActionTile icon="paper-plane-outline" label={t('accountTransfer')} color={C.sub} bg={C.bg} disabled badge={t('accountSoon')} />
            <ActionTile icon="time-outline" label={t('commonHistory')} color={C.accent} bg="#ECFDF5"
              onPress={() => navigation.navigate('Historique')}
            />
          </View>

          {/* ── Transactions ── */}
          <View style={styles.txnSection}>
            <Text style={styles.sectionTitle}>{t('accountLastOperations')}</Text>
            {txns.length === 0 ? (
              <View style={styles.emptyTxn}>
                <Ionicons name="receipt-outline" size={32} color={C.muted} />
                <Text style={styles.emptyTxnText}>{t('accountNoOperations')}</Text>
              </View>
            ) : (
              <View style={styles.txnCard}>
                {txns.map((txn, idx) => {
                  const isCredit = Number(txn.amount) >= 0;
                  return (
                    <View key={txn.id} style={[styles.txnRow, idx === txns.length - 1 && styles.txnRowLast]}>
                      <View style={[styles.txnIconWrap, { backgroundColor: isCredit ? '#ECFDF5' : '#FFF1F5' }]}>
                        <Ionicons name={isCredit ? 'arrow-up' : 'arrow-down'} size={16} color={isCredit ? C.accentDk : C.danger} />
                      </View>
                      <View style={styles.txnInfo}>
                        <Text style={styles.txnLabel}>{txnLabel(txn)}</Text>
                        <Text style={styles.txnDate}>{formatDate(txn.createdAt)}</Text>
                      </View>
                      <Text style={[styles.txnAmount, { color: isCredit ? C.accentDk : C.danger }]}>
                        {isCredit ? '+' : ''}{Number(txn.amount).toFixed(0)} MRU
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* ── Statistics tab ── */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        >
          {/* Stat cards */}
          <View style={styles.statsGrid}>
            <StatCard icon="star" value={profile.rating.toFixed(1)} label={t('accountAvgRating')} color={C.warning} bg="#FFF8E1" />
            <StatCard icon="car-sport" value={`${profile.totalRides}`} label={t('accountTotalRides')} color={C.primary} bg={C.surfaceAlt} />
          </View>

          {/* Bar chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartTitleRow}>
              <Text style={styles.chartTitle}>{t('accountRidesLast7')}</Text>
              <View style={styles.previewBadge}><Text style={styles.previewBadgeText}>{t('accountPreview')}</Text></View>
            </View>
            <View style={styles.barChart}>
              {BAR_DATA.map((val, i) => (
                <View key={i} style={styles.barColumn}>
                  <Text style={styles.barValue}>{val}</Text>
                  <View style={styles.barTrack}>
                    <LinearGradient
                      colors={G.primary}
                      style={[styles.bar, { height: `${(val / maxBar) * 100}%` }]}
                    />
                  </View>
                  <Text style={styles.barDay}>{t('accountWeekDays')[i]}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Performance strip */}
          <View style={styles.perfCard}>
            <View style={styles.chartTitleRow}>
              <Text style={styles.sectionTitle}>{t('accountAcceptanceRate')}</Text>
              <View style={styles.previewBadge}><Text style={styles.previewBadgeText}>{t('accountPreview')}</Text></View>
            </View>
            <View style={styles.perfBar}>
              <View style={[styles.perfFill, { width: '86%' }]} />
            </View>
            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>86%</Text>
              <Text style={styles.perfSub}>{t('accountAcceptanceExcellent')}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <RechargeSheet visible={rechargeOpen} onClose={() => setRechargeOpen(false)} driverPhone={driverPhone} />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  centered:{ alignItems: 'center', justifyContent: 'center' },

  header: {
    paddingHorizontal: 20, paddingBottom: 28,
    borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: C.white },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: C.surface,
    marginHorizontal: 16, marginTop: -14, borderRadius: RADIUS.xl,
    padding: 4, ...SH.sm,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: RADIUS.lg + 2,
  },
  tabActive:     { backgroundColor: C.primary },
  tabText:       { fontSize: 13, color: C.sub, fontWeight: '600' },
  tabTextActive: { color: C.white, fontWeight: '700' },

  scroll: { padding: 16, gap: 16 },

  // Balance card
  lowBalance: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#FFF1F1', borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: '#FFD0D0',
  },
  lowBalanceTitle: { fontSize: 14, fontWeight: '800', color: C.danger, marginBottom: 2 },
  lowBalanceText:  { fontSize: 13, color: C.text, lineHeight: 19 },
  balanceCardWrap: { borderRadius: RADIUS.xl + 4, overflow: 'hidden', ...SH.lg },
  balanceCard:     { padding: 24, borderRadius: RADIUS.xl + 4, overflow: 'hidden', minHeight: 180 },
  balanceBlob1: {
    position: 'absolute', top: -60, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  balanceBlob2: {
    position: 'absolute', bottom: -40, left: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  balanceCardLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  balanceCurrencyBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  balanceCurrencyText: { fontSize: 11, color: C.white, fontWeight: '800', letterSpacing: 1 },
  balanceAmount: { fontSize: 46, fontWeight: '900', color: C.white, letterSpacing: -1, marginBottom: 20 },
  balanceBottom: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.lg, padding: 12 },
  balanceStat:   { flex: 1, alignItems: 'center' },
  balanceStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 2 },
  balanceStatValue: { fontSize: 14, color: C.white, fontWeight: '800' },
  balanceStatDiv:   { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Tiles
  tilesRow: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1, backgroundColor: C.surface, borderRadius: RADIUS.xl,
    padding: 16, alignItems: 'center', gap: 10, ...SH.sm, position: 'relative',
  },
  tileDisabled:  { opacity: 0.55 },
  tileIconWrap:  { width: 48, height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  tileLabel:     { fontSize: 12, fontWeight: '700', color: C.text, textAlign: 'center' },
  tileBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: C.surfaceAlt, borderRadius: RADIUS.pill,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  tileBadgeText: { fontSize: 9, fontWeight: '800', color: C.primary },

  // Transactions
  txnSection: { gap: 10 },
  sectionTitle:{ fontSize: 15, fontWeight: '800', color: C.text, marginLeft: 4 },
  txnCard: { backgroundColor: C.surface, borderRadius: RADIUS.xl, overflow: 'hidden', ...SH.sm },
  txnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.borderLt,
  },
  txnRowLast:  { borderBottomWidth: 0 },
  txnIconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  txnInfo:     { flex: 1 },
  txnLabel:    { fontSize: 14, color: C.text, fontWeight: '600' },
  txnDate:     { fontSize: 11, color: C.muted, marginTop: 2 },
  txnAmount:   { fontSize: 14, fontWeight: '800' },
  emptyTxn: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: 32, alignItems: 'center', gap: 10, ...SH.sm },
  emptyTxnText: { fontSize: 13, color: C.sub, fontWeight: '600' },

  // Stats
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: RADIUS.xl,
    padding: 16, alignItems: 'center', gap: 6,
    borderWidth: 1.5, ...SH.sm,
  },
  statIconWrap: { width: 44, height: 44, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  statValue:    { fontSize: 24, fontWeight: '900' },
  statLabel:    { fontSize: 11, color: C.sub, textAlign: 'center', fontWeight: '600' },

  // Chart
  chartCard: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: 18, gap: 16, ...SH.sm },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  previewBadge: { backgroundColor: C.surfaceAlt, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  previewBadgeText: { fontSize: 10, fontWeight: '800', color: C.primary },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 8 },
  barColumn: { flex: 1, alignItems: 'center', gap: 4 },
  barValue:  { fontSize: 10, fontWeight: '700', color: C.sub },
  barTrack:  { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: RADIUS.sm, overflow: 'hidden', backgroundColor: C.borderLt },
  bar:       { width: '100%', borderRadius: RADIUS.sm },
  barDay:    { fontSize: 11, color: C.sub, fontWeight: '700' },

  // Performance
  perfCard: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: 18, gap: 10, ...SH.sm },
  perfBar:  { height: 8, backgroundColor: C.borderLt, borderRadius: 4, overflow: 'hidden' },
  perfFill: { height: 8, backgroundColor: C.accent, borderRadius: 4 },
  perfRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perfLabel:{ fontSize: 20, fontWeight: '900', color: C.accentDk },
  perfSub:  { fontSize: 13, color: C.sub, flex: 1 },
});
