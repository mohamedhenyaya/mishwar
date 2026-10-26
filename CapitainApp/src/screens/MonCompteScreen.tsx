import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { DriverProfile, RootStackParamList } from '../types';
import RechargeSheet from '../components/RechargeSheet';
import { apiGet } from '../services/api';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MonCompte'>;
type Tab   = 'compte' | 'statistiques';

interface AccountData { balance: number; currency: string; totalEarned: number; totalRides: number; rating: number; }
interface Transaction  { id: string; type: 'credit' | 'debit'; label: string; amount: number; date: string; }

const MOCK_ACCOUNT: AccountData = { balance: 0.75, currency: 'MRU', totalEarned: 12450, totalRides: 238, rating: 4.8 };
const MOCK_TXN: Transaction[] = [
  { id:'1', type:'credit', label:'Course #3281',    amount: 400,  date:'26/06' },
  { id:'2', type:'credit', label:'Course #3280',    amount: 210,  date:'26/06' },
  { id:'3', type:'debit',  label:'Commission app.', amount: -63,  date:'26/06' },
  { id:'4', type:'credit', label:'Course #3279',    amount: 175,  date:'25/06' },
  { id:'5', type:'debit',  label:'Retrait',         amount: -500, date:'24/06' },
  { id:'6', type:'credit', label:'Bonus fidélité',  amount: 50,   date:'23/06' },
];

const BAR_DATA = [6, 9, 4, 11, 8, 14, 3];
const BAR_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// ─── Action tile ──────────────────────────────────────────────────────────────
function ActionTile({ icon, label, color, bg, onPress, disabled = false }: {
  icon: string; label: string; color: string; bg: string;
  onPress?: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.tile, disabled && styles.tileDisabled]}
      onPress={onPress} disabled={disabled} activeOpacity={0.7}
    >
      <View style={[styles.tileIconWrap, { backgroundColor: bg }]}>
        <Text style={styles.tileIcon}>{icon}</Text>
      </View>
      <Text style={[styles.tileLabel, disabled && { color: C.muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color, bg }: {
  icon: string; value: string; label: string; color: string; bg: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: color + '30' }]}>
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MonCompteScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab,  setActiveTab]  = useState<Tab>('compte');
  const [account,    setAccount]    = useState<AccountData | null>(null);
  const [txns,       setTxns]       = useState<Transaction[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [driverPhone,  setDriverPhone]  = useState<string | undefined>();

  useEffect(() => {
    apiGet<DriverProfile>('/drivers/me').then((d) => setDriverPhone(d.phone)).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [acc, t] = await Promise.all([
        apiGet<AccountData>('/drivers/account'),
        apiGet<Transaction[]>('/drivers/transactions'),
      ]);
      setAccount(acc); setTxns(t);
    } catch {
      setAccount(MOCK_ACCOUNT); setTxns(MOCK_TXN);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const acc = account ?? MOCK_ACCOUNT;
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
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon espace financier</Text>
        <Text style={styles.headerSub}>Gérez vos revenus et statistiques</Text>
      </LinearGradient>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        {(['compte', 'statistiques'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'compte' ? '💳  Mon compte' : '📊  Statistiques'}
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
          {/* ── Credit card style balance ── */}
          <View style={styles.balanceCardWrap}>
            <LinearGradient
              colors={[C.primary, C.darkMid, C.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              {/* Decorative circles */}
              <View style={styles.balanceBlob1} />
              <View style={styles.balanceBlob2} />

              <View style={styles.balanceTop}>
                <Text style={styles.balanceCardLabel}>Solde disponible</Text>
                <View style={styles.balanceCurrencyBadge}>
                  <Text style={styles.balanceCurrencyText}>MRU</Text>
                </View>
              </View>

              <Text style={styles.balanceAmount}>
                {acc.balance.toFixed(2).replace('.', ',')}
              </Text>

              <View style={styles.balanceBottom}>
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Total gagné</Text>
                  <Text style={styles.balanceStatValue}>{acc.totalEarned.toLocaleString()} MRU</Text>
                </View>
                <View style={styles.balanceStatDiv} />
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Courses</Text>
                  <Text style={styles.balanceStatValue}>{acc.totalRides}</Text>
                </View>
                <View style={styles.balanceStatDiv} />
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Note</Text>
                  <Text style={styles.balanceStatValue}>⭐ {acc.rating}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* ── Action tiles ── */}
          <View style={styles.tilesRow}>
            <ActionTile
              icon="💳" label="Recharger" color={C.primary} bg={C.surfaceAlt}
              onPress={() => setRechargeOpen(true)}
            />
            <ActionTile icon="📤" label="Transférer"  color={C.sub}    bg={C.bg} disabled />
            <ActionTile icon="📥" label="Historique"  color={C.accent} bg="#ECFDF5"
              onPress={() => navigation.navigate('Historique')}
            />
          </View>

          {/* ── Transactions ── */}
          <View style={styles.txnSection}>
            <Text style={styles.sectionTitle}>Dernières opérations</Text>
            <View style={styles.txnCard}>
              {txns.map((t, idx) => (
                <View key={t.id} style={[styles.txnRow, idx === txns.length - 1 && styles.txnRowLast]}>
                  <View style={[styles.txnIconWrap, { backgroundColor: t.type === 'credit' ? '#ECFDF5' : '#FFF1F5' }]}>
                    <Text style={styles.txnIcon}>{t.type === 'credit' ? '↑' : '↓'}</Text>
                  </View>
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnLabel}>{t.label}</Text>
                    <Text style={styles.txnDate}>{t.date}</Text>
                  </View>
                  <Text style={[styles.txnAmount, { color: t.type === 'credit' ? C.accentDk : C.danger }]}>
                    {t.type === 'credit' ? '+' : ''}{t.amount} MRU
                  </Text>
                </View>
              ))}
            </View>
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
            <StatCard icon="⭐" value={acc.rating.toFixed(1)} label="Note moyenne" color={C.warning} bg="#FFF8E1" />
            <StatCard icon="🚗" value={`${acc.totalRides}`}  label="Total courses" color={C.primary} bg={C.surfaceAlt} />
            <StatCard icon="💰" value={`${acc.totalEarned.toLocaleString()}`} label="MRU gagnés" color={C.accentDk} bg="#ECFDF5" />
            <StatCard icon="📈" value={`${Math.round(acc.totalEarned / 30)}`} label="MRU / mois moy." color={C.primaryLt} bg={C.surfaceAlt} />
          </View>

          {/* Bar chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Courses — 7 derniers jours</Text>
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
                  <Text style={styles.barDay}>{BAR_DAYS[i]}</Text>
                </View>
              ))}
            </View>

            {/* Earnings summary */}
            <View style={styles.chartSummary}>
              <View style={styles.chartSumItem}>
                <Text style={styles.chartSumValue}>{BAR_DATA.reduce((a, b) => a + b, 0)}</Text>
                <Text style={styles.chartSumLabel}>courses cette semaine</Text>
              </View>
              <View style={styles.chartSumDiv} />
              <View style={styles.chartSumItem}>
                <Text style={[styles.chartSumValue, { color: C.accentDk }]}>
                  {BAR_DATA.reduce((a, b) => a + b, 0) * 180} MRU
                </Text>
                <Text style={styles.chartSumLabel}>revenus estimés</Text>
              </View>
            </View>
          </View>

          {/* Performance strip */}
          <View style={styles.perfCard}>
            <Text style={styles.sectionTitle}>Taux d'acceptation</Text>
            <View style={styles.perfBar}>
              <View style={[styles.perfFill, { width: '86%' }]} />
            </View>
            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>86%</Text>
              <Text style={styles.perfSub}>Excellent — continuez comme ça !</Text>
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
  backIcon:    { fontSize: 24, color: C.white, fontWeight: '300' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: C.white },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: C.surface,
    marginHorizontal: 16, marginTop: -14, borderRadius: RADIUS.xl,
    padding: 4, ...SH.sm,
  },
  tab: {
    flex: 1, paddingVertical: 11, borderRadius: RADIUS.lg + 2,
    alignItems: 'center',
  },
  tabActive:     { backgroundColor: C.primary },
  tabText:       { fontSize: 13, color: C.sub, fontWeight: '600' },
  tabTextActive: { color: C.white, fontWeight: '700' },

  scroll: { padding: 16, gap: 16 },

  // Balance card
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
    padding: 16, alignItems: 'center', gap: 10, ...SH.sm,
  },
  tileDisabled:  { opacity: 0.4 },
  tileIconWrap:  { width: 48, height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  tileIcon:      { fontSize: 24 },
  tileLabel:     { fontSize: 12, fontWeight: '700', color: C.text, textAlign: 'center' },

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
  txnIcon:     { fontSize: 16, fontWeight: '800' },
  txnInfo:     { flex: 1 },
  txnLabel:    { fontSize: 14, color: C.text, fontWeight: '600' },
  txnDate:     { fontSize: 11, color: C.muted, marginTop: 2 },
  txnAmount:   { fontSize: 14, fontWeight: '800' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%', backgroundColor: C.surface, borderRadius: RADIUS.xl,
    padding: 16, alignItems: 'center', gap: 6,
    borderWidth: 1.5, ...SH.sm,
  },
  statIconWrap: { width: 44, height: 44, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  statIconText: { fontSize: 22 },
  statValue:    { fontSize: 24, fontWeight: '900' },
  statLabel:    { fontSize: 11, color: C.sub, textAlign: 'center', fontWeight: '600' },

  // Chart
  chartCard: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: 18, gap: 16, ...SH.sm },
  chartTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 8 },
  barColumn: { flex: 1, alignItems: 'center', gap: 4 },
  barValue:  { fontSize: 10, fontWeight: '700', color: C.sub },
  barTrack:  { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: RADIUS.sm, overflow: 'hidden', backgroundColor: C.borderLt },
  bar:       { width: '100%', borderRadius: RADIUS.sm },
  barDay:    { fontSize: 11, color: C.sub, fontWeight: '700' },
  chartSummary: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: RADIUS.lg, padding: 12 },
  chartSumItem: { flex: 1, alignItems: 'center' },
  chartSumValue:{ fontSize: 18, fontWeight: '900', color: C.text },
  chartSumLabel:{ fontSize: 11, color: C.sub, marginTop: 2 },
  chartSumDiv:  { width: 1, backgroundColor: C.border, marginHorizontal: 8 },

  // Performance
  perfCard: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: 18, gap: 10, ...SH.sm },
  perfBar:  { height: 8, backgroundColor: C.borderLt, borderRadius: 4, overflow: 'hidden' },
  perfFill: { height: 8, backgroundColor: C.accent, borderRadius: 4 },
  perfRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perfLabel:{ fontSize: 20, fontWeight: '900', color: C.accentDk },
  perfSub:  { fontSize: 13, color: C.sub, flex: 1 },
});
