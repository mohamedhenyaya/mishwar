import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { apiPost } from '../services/api';
import { Button, ScreenHeader, TextField } from '../components/ui';
import { colors, radius, shadows, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Recharge'>;

interface BankOption {
  key: string;
  name: string;
  by: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const BANKS: BankOption[] = [
  { key: 'bankily', name: 'Bankily', by: 'BY BPM',     icon: 'wallet',           color: '#F5A623' },
  { key: 'masrvi',  name: 'Masrvi',  by: 'BY BMCI',    icon: 'phone-portrait',   color: '#10B981' },
  { key: 'sedad',   name: 'Sedad',   by: 'BY BMI',     icon: 'shield-checkmark', color: '#0EA45C' },
  { key: 'bim',     name: 'BIM',     by: 'BY Bimbank', icon: 'card',             color: '#3B5BDB' },
];

export default function RechargeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selected,  setSelected]  = useState<BankOption | null>(null);
  const [amount,    setAmount]    = useState('');
  const [reference, setReference] = useState('');
  const [loading,   setLoading]   = useState(false);

  const canSubmit = !!selected && Number(amount) >= 1 && !loading;

  const handleSubmit = async () => {
    if (!selected || !canSubmit) return;
    setLoading(true);
    try {
      await apiPost('/wallet/requests', {
        type: 'TOPUP',
        amount: Number(amount),
        method: selected.name,
        reference: reference.trim() || undefined,
      });
      Alert.alert(
        'Demande envoyée',
        `Votre demande de recharge de ${amount} MRU via ${selected.name} a été transmise. Elle sera créditée après validation.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? "Impossible d'envoyer la demande de recharge.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Recharger mon solde" onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={styles.hint}>
          Effectuez votre transfert via l'une de ces applications, puis indiquez le montant et la référence
          pour que votre recharge soit validée.
        </Text>

        <View style={styles.bankList}>
          {BANKS.map((bank) => {
            const active = selected?.key === bank.key;
            return (
              <TouchableOpacity
                key={bank.key}
                style={[styles.bankCard, active && styles.bankCardActive]}
                onPress={() => setSelected((prev) => (prev?.key === bank.key ? null : bank))}
                activeOpacity={0.8}
              >
                <View style={[styles.bankIconWrap, { backgroundColor: bank.color + '22' }]}>
                  <Ionicons name={bank.icon} size={21} color={bank.color} />
                </View>
                <View style={styles.bankInfo}>
                  <Text style={styles.bankName}>{bank.name}</Text>
                  <Text style={styles.bankBy}>{bank.by}</Text>
                </View>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? colors.accent : colors.border}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {selected && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Confirmer la recharge {selected.name}</Text>
            <View style={{ gap: spacing.md }}>
              <TextField
                label="Montant (MRU)"
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
                placeholder="Ex : 500"
                keyboardType="number-pad"
              />
              <TextField
                label="Référence de transaction (optionnel)"
                value={reference}
                onChangeText={setReference}
                placeholder="Numéro de reçu / transaction"
              />
            </View>
            <Button
              label="Envoyer la demande"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={loading}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  hint: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 20 },

  bankList: { gap: spacing.sm },
  bankCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 2, borderColor: 'transparent',
    ...shadows.sm,
  },
  bankCardActive: { borderColor: colors.accent },
  bankIconWrap: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bankInfo: { flex: 1 },
  bankName: { ...typography.bodyLg, fontWeight: '700', color: colors.text },
  bankBy: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },

  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadows.sm },
  formTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
});
