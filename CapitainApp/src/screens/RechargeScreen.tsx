import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { apiPost } from '../services/api';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Recharge'>;

interface BankOption {
  key: string;
  name: string;
  by: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const BANKS: BankOption[] = [
  { key: 'bankily', name: 'Bankily', by: 'BY BPM',      icon: 'wallet',       color: '#F5A623' },
  { key: 'masrvi',  name: 'Masrvi',  by: 'BY BMCI',     icon: 'phone-portrait', color: '#10D4A0' },
  { key: 'sedad',   name: 'Sedad',   by: 'BY BMI',      icon: 'shield-checkmark', color: '#0EA45C' },
  { key: 'bim',     name: 'BIM',     by: 'BY Bimbank',  icon: 'card',         color: '#3B82F6' },
];

export default function RechargeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<BankOption | null>(null);
  const [amount,    setAmount]  = useState('');
  const [reference, setReference] = useState('');
  const [loading,   setLoading]   = useState(false);

  const canSubmit = !!selected && Number(amount) >= 1 && !loading;

  const handleSelect = (bank: BankOption) => {
    setSelected((prev) => (prev?.key === bank.key ? null : bank));
  };

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
        `Votre demande de recharge de ${amount} MRU via ${selected.name} a été transmise. Elle sera créditée après validation par un administrateur.`,
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
      <LinearGradient colors={G.dark} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recharger mon solde</Text>
        <Text style={styles.headerSub}>Rechargez via une application bancaire, puis confirmez ci-dessous</Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={styles.hint}>
          Effectuez votre transfert vers notre compte via l'une de ces applications, puis renseignez le montant
          et la référence de la transaction pour que notre équipe valide votre recharge.
        </Text>

        <View style={styles.bankList}>
          {BANKS.map((bank) => {
            const active = selected?.key === bank.key;
            return (
              <TouchableOpacity
                key={bank.key}
                style={[styles.bankCard, active && styles.bankCardActive]}
                onPress={() => handleSelect(bank)}
                activeOpacity={0.8}
              >
                <View style={[styles.bankIconWrap, { backgroundColor: bank.color + '22' }]}>
                  <Ionicons name={bank.icon} size={22} color={bank.color} />
                </View>
                <View style={styles.bankInfo}>
                  <Text style={styles.bankName}>{bank.name}</Text>
                  <Text style={styles.bankBy}>{bank.by}</Text>
                </View>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? C.primary : C.border}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {selected && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Confirmer la recharge {selected.name}</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Montant (MRU)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
                placeholder="Ex : 500"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Référence de transaction (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={reference}
                onChangeText={setReference}
                placeholder="Numéro de reçu / transaction"
                placeholderTextColor={C.muted}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={canSubmit ? G.primary : [C.muted, C.muted]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitBtnGrad}
              >
                {loading
                  ? <ActivityIndicator color={C.white} />
                  : <Text style={styles.submitBtnText}>Envoyer la demande</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
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
  backBtn: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: C.white },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 6, lineHeight: 19 },

  scroll: { padding: 16, gap: 16 },
  hint: { fontSize: 13, color: C.sub, lineHeight: 20 },

  bankList: { gap: 10 },
  bankCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: RADIUS.xl,
    padding: 14, borderWidth: 2, borderColor: 'transparent',
    ...SH.sm,
  },
  bankCardActive: { borderColor: C.primary },
  bankIconWrap: { width: 46, height: 46, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  bankInfo: { flex: 1 },
  bankName: { fontSize: 15, fontWeight: '800', color: C.text },
  bankBy:   { fontSize: 12, color: C.sub, marginTop: 1 },

  formCard: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: 18, gap: 16, ...SH.sm },
  formTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.sub },
  input: {
    backgroundColor: C.bg, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: C.border,
    height: 52, paddingHorizontal: 16, fontSize: 15, color: C.text,
  },
  submitBtn: { borderRadius: RADIUS.xl, overflow: 'hidden', ...SH.md },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnGrad: { height: 54, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },
});
