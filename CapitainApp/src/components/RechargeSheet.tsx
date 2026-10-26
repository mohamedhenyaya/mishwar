import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import PaymentLogo from './PaymentLogo';
import { apiPost } from '../services/api';
import {
  PAYMENT_METHODS, PaymentMethod, RECHARGE_WHATSAPP, formatAccountNumber, formatWhatsapp,
} from '../config/payments';
import { C, RADIUS } from '../theme';

interface Props {
  visible:      boolean;
  onClose:      () => void;
  driverPhone?: string; // repris dans le message WhatsApp pour identifier le compte à créditer
}

const WHATSAPP_GREEN = '#25D366';

// Recharge du compte capitaine : choix du moyen de paiement puis numéro de compte + envoi de la capture
export default function RechargeSheet({ visible, onClose, driverPhone }: Props) {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  // Toujours rouvrir sur la liste des moyens de paiement
  useEffect(() => {
    if (!visible) { setMethod(null); setCopied(false); setAmount(''); }
  }, [visible]);

  // Demande de recharge enregistrée dans le portefeuille : créditée après validation par un admin
  const declareTopup = async () => {
    if (!method) return;
    setSending(true);
    try {
      await apiPost('/wallet/requests', { type: 'TOPUP', amount: Number(amount), method: method.name });
      Alert.alert(
        'Demande envoyée',
        `Votre recharge de ${amount} MRU via ${method.name} sera créditée après vérification de la capture.`,
        [{ text: 'OK', onPress: onClose }],
      );
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible d\'envoyer la demande de recharge.');
    } finally {
      setSending(false);
    }
  };

  const copyAccount = async () => {
    if (!method?.accountNumber) return;
    await Clipboard.setStringAsync(method.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsapp = () => {
    const text = method?.accountNumber
      ? `Bonjour, voici la capture de ma recharge ${method.name} pour le compte capitaine ${driverPhone ?? ''}.`
      : `Bonjour, je souhaite recharger mon compte capitaine ${driverPhone ?? ''} avec un autre moyen de paiement.`;
    const url = `https://wa.me/${RECHARGE_WHATSAPP}?text=${encodeURIComponent(text.trim())}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp indisponible', formatWhatsapp(RECHARGE_WHATSAPP)));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handle} />

        {!method ? (
          <>
            <Text style={styles.title}>Recharger mon compte</Text>
            <Text style={styles.subtitle}>Choisissez votre moyen de paiement</Text>

            <View style={styles.grid}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity key={m.id} style={styles.option} onPress={() => setMethod(m)} activeOpacity={0.75}>
                  <PaymentLogo method={m.id} size={52} />
                  <Text style={styles.optionName}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setMethod(null)} style={styles.backBtn} hitSlop={8}>
                <Text style={styles.backText}>‹</Text>
              </TouchableOpacity>
              <PaymentLogo method={method.id} size={40} />
              <Text style={styles.detailTitle}>{method.name}</Text>
            </View>

            {method.accountNumber ? (
              <>
                {/* Numéro de compte + copier */}
                <View style={styles.accountCard}>
                  <Text style={styles.label}>Numéro de compte {method.name}</Text>
                  <View style={styles.accountRow}>
                    <Text style={styles.accountNumber} selectable>{formatAccountNumber(method.accountNumber)}</Text>
                    <TouchableOpacity
                      style={[styles.copyBtn, copied && styles.copyBtnDone]}
                      onPress={copyAccount}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.copyText, copied && styles.copyTextDone]}>
                        {copied ? '✓ Copié' : '⧉ Copier'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.steps}>
                  <Text style={styles.step}><Text style={styles.stepNum}>1 </Text>Envoyez le montant de la recharge sur ce numéro via {method.name}.</Text>
                  <Text style={styles.step}><Text style={styles.stepNum}>2 </Text>Faites une capture d'écran de la confirmation.</Text>
                  <Text style={styles.step}><Text style={styles.stepNum}>3 </Text>Envoyez-la sur WhatsApp : votre solde sera crédité après vérification.</Text>
                </View>
              </>
            ) : (
              <Text style={styles.otherText}>
                Pour recharger avec un autre moyen de paiement, contactez-nous sur WhatsApp : nous vous indiquerons la marche à suivre.
              </Text>
            )}

            {/* Montant envoyé → demande de recharge (validée par un admin) */}
            <View style={styles.amountRow}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^\d]/g, ''))}
                placeholder="Montant envoyé (MRU)"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={[styles.declareBtn, (!Number(amount) || sending) && { opacity: 0.5 }]}
                onPress={declareTopup}
                disabled={!Number(amount) || sending}
                activeOpacity={0.85}
              >
                {sending ? <ActivityIndicator color={C.white} /> : <Text style={styles.declareText}>Déclarer</Text>}
              </TouchableOpacity>
            </View>

            {/* WhatsApp */}
            <View style={styles.whatsappCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>WhatsApp (captures d'écran)</Text>
                <Text style={styles.whatsappNumber} selectable>{formatWhatsapp(RECHARGE_WHATSAPP)}</Text>
              </View>
              <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsapp} activeOpacity={0.85}>
                <Text style={styles.whatsappBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26, 11, 59, 0.5)' },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 20, paddingTop: 10, gap: 16,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.border, marginBottom: 4 },

  title:    { fontSize: 20, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 14, color: C.sub, marginTop: -10 },

  grid:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  option:     { alignItems: 'center', gap: 8, width: '24%' },
  optionName: { fontSize: 13, fontWeight: '700', color: C.text },

  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:      { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  backText:     { fontSize: 24, color: C.text, marginTop: -3 },
  detailTitle:  { fontSize: 20, fontWeight: '800', color: C.text },

  label: { fontSize: 12, fontWeight: '700', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.5 },

  accountCard: { backgroundColor: C.surfaceAlt, borderRadius: RADIUS.lg, padding: 16, gap: 8 },
  accountRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  accountNumber: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  copyBtn:      { paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: C.primary },
  copyBtnDone:  { backgroundColor: C.accent },
  copyText:     { fontSize: 14, fontWeight: '800', color: C.white },
  copyTextDone: { color: C.white },

  steps:   { gap: 6 },
  step:    { fontSize: 14, color: C.text, lineHeight: 20 },
  stepNum: { fontWeight: '900', color: C.primary },

  otherText: { fontSize: 14, color: C.sub, lineHeight: 21 },

  amountRow:   { flexDirection: 'row', gap: 10 },
  amountInput: {
    flex: 1, height: 50, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, fontSize: 16, fontWeight: '700', color: C.text, backgroundColor: C.surface,
  },
  declareBtn:  { paddingHorizontal: 18, borderRadius: RADIUS.md, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  declareText: { fontSize: 15, fontWeight: '800', color: C.white },

  whatsappCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#CDEFD9', backgroundColor: '#F2FCF6',
    borderRadius: RADIUS.lg, padding: 14,
  },
  whatsappNumber:  { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 4 },
  whatsappBtn:     { paddingHorizontal: 16, paddingVertical: 11, borderRadius: RADIUS.md, backgroundColor: WHATSAPP_GREEN },
  whatsappBtnText: { fontSize: 14, fontWeight: '800', color: C.white },
});
