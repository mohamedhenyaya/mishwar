import React from 'react';
import { ActivityIndicator, Image, ImageURISource, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { C, RADIUS } from '../theme';

export type SlotStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Libellés traduits : t('slotStatus')
const STATUS: Record<SlotStatus, { color: string; bg: string }> = {
  PENDING:  { color: '#B7791F', bg: '#FFF8E6' },
  APPROVED: { color: '#1A6B45', bg: '#E8F8F0' },
  REJECTED: { color: C.danger,  bg: '#FFF1F1' },
};

interface DocumentSlotProps {
  label:        string;
  hint:         string;
  image?:       ImageURISource | null; // photo choisie, ou pièce déjà envoyée (avec le jeton)
  status?:      SlotStatus;            // dernière version reçue par le serveur
  note?:        string | null;         // motif du refus
  loading?:     boolean;
  actionLabel?: string;
  onPress?:     () => void;            // absent : pièce figée (validée), consultable seulement
  onView?:      () => void;            // agrandir la photo
  editIcon?:    boolean;               // petit crayon au lieu du libellé d'action
}

// Une pièce du dossier : aperçu de la photo et statut de la vérification
export default function DocumentSlot({ label, hint, image, status, note, loading, actionLabel, onPress, onView, editIcon }: DocumentSlotProps) {
  const { t } = useLanguage();
  const badge = status ? { ...STATUS[status], label: t('slotStatus')[status] } : null;
  return (
    <TouchableOpacity
      style={[styles.slot, status === 'REJECTED' && styles.slotRejected]}
      onPress={editIcon ? onView : onPress ?? onView}
      disabled={loading || (editIcon ? !onView : !onPress && !onView)}
      activeOpacity={0.75}
    >
      <TouchableOpacity style={styles.thumb} onPress={onView} disabled={!onView || !image} activeOpacity={0.8}>
        {loading
          ? <ActivityIndicator color={C.primary} />
          : image
            ? <Image source={image} style={styles.image} />
            : <Ionicons name="camera-outline" size={22} color={C.sub} />}
      </TouchableOpacity>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        {badge
          ? <View style={[styles.badge, { backgroundColor: badge.bg }]}><Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text></View>
          : <Text style={styles.hint}>{hint}</Text>}
        {status === 'REJECTED' && note ? <Text style={styles.note}>{t('slotReason')(note)}</Text> : null}
      </View>
      {!onPress
        ? <Ionicons name="lock-closed-outline" size={16} color={C.muted} />
        : editIcon
          ? (
            <TouchableOpacity style={styles.editBtn} onPress={onPress} hitSlop={8} accessibilityLabel={t('editLabel')(label)}>
              <Ionicons name="pencil" size={14} color={C.primary} />
            </TouchableOpacity>
          )
          : <Text style={styles.action}>{actionLabel ?? (image ? t('slotChange') : t('slotAdd'))}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: RADIUS.lg,
    backgroundColor: C.bg, borderWidth: 2, borderColor: C.border,
  },
  slotRejected: { borderColor: '#FFD0D0' },
  thumb: {
    width: 56, height: 56, borderRadius: RADIUS.md, overflow: 'hidden',
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
  },
  image:     { width: '100%', height: '100%' },
  body:      { flex: 1, gap: 4 },
  label:     { fontSize: 14, fontWeight: '700', color: C.text },
  hint:      { fontSize: 12, color: C.muted, lineHeight: 16 },
  badge:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  note:      { fontSize: 12, color: C.danger },
  action:    { fontSize: 13, fontWeight: '800', color: C.primary },
  editBtn:   { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1EDFF', alignItems: 'center', justifyContent: 'center' },
});
