import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGet } from '../services/api';
import { TabScreenProps, WalletTransaction } from '../types';
import { Button } from '../components/ui';
import { colors, radius, shadows, spacing, typography } from '../theme';

type Props = TabScreenProps<'Wallet'>;

function txnLabel(t: WalletTransaction): string {
  if (t.note) return t.note;
  if (t.type === 'commission_deduction') return 'Frais de service';
  if (t.type === 'admin_credit') return 'Recharge validée';
  return 'Retrait validé';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function WalletScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [balance,    setBalance]    = useState(0);
  const [txns,       setTxns]       = useState<WalletTransaction[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [wallet, tx] = await Promise.all([
        apiGet<{ balance: number }>('/wallet/me'),
        apiGet<{ data: WalletTransaction[] }>('/wallet/me/transactions?limit=20'),
      ]);
      setBalance(Number(wallet.balance));
      setTxns(tx.data);
    } catch {
      // backend injoignable — l'écran reste à zéro plutôt que d'afficher un montant fictif
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Portefeuille</Text>
        <Text style={styles.subtitle}>Solde et opérations</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.accent} />}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>{balance.toFixed(2).replace('.', ',')} <Text style={styles.balanceCurrency}>MRU</Text></Text>
          <Button
            label="Recharger mon solde"
            icon="add-circle"
            size="md"
            onPress={() => navigation.navigate('Recharge')}
            style={{ marginTop: spacing.lg }}
          />
        </View>

        <Text style={styles.sectionTitle}>Dernières opérations</Text>
        {txns.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={32} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune opération pour le moment</Text>
          </View>
        ) : (
          <View style={styles.txnCard}>
            {txns.map((t, idx) => {
              const isCredit = Number(t.amount) >= 0;
              return (
                <View key={t.id} style={[styles.txnRow, idx === txns.length - 1 && styles.txnRowLast]}>
                  <View style={[styles.txnIconWrap, { backgroundColor: isCredit ? colors.successMuted : colors.dangerMuted }]}>
                    <Ionicons name={isCredit ? 'arrow-up' : 'arrow-down'} size={15} color={isCredit ? colors.success : colors.danger} />
                  </View>
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnLabel}>{txnLabel(t)}</Text>
                    <Text style={styles.txnDate}>{formatDate(t.createdAt)}</Text>
                  </View>
                  <Text style={[styles.txnAmount, { color: isCredit ? colors.success : colors.danger }]}>
                    {isCredit ? '+' : ''}{Number(t.amount).toFixed(0)} MRU
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 2 },

  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },

  balanceCard: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    padding: spacing.xxl, ...shadows.md, shadowColor: colors.primary,
  },
  balanceLabel: { ...typography.caption, color: colors.textInverseMuted, fontWeight: '600' },
  balanceAmount: { fontSize: 38, fontWeight: '900', color: colors.textInverse, marginTop: 6 },
  balanceCurrency: { fontSize: 16, fontWeight: '700', color: colors.textInverseMuted },

  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.sm, marginLeft: 2 },

  txnCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadows.sm },
  txnRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  txnRowLast: { borderBottomWidth: 0 },
  txnIconWrap: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  txnInfo: { flex: 1 },
  txnLabel: { ...typography.bodySm, fontWeight: '600', color: colors.text },
  txnDate: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  txnAmount: { ...typography.bodySm, fontWeight: '800' },

  emptyWrap: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xxxl, alignItems: 'center', gap: spacing.sm, ...shadows.sm },
  emptyText: { ...typography.bodySm, color: colors.textSecondary },
});
