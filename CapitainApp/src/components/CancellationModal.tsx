import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Avatar from './Avatar';
import { PublicUser } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { C, RADIUS } from '../theme';

export interface CancellationNotice {
  user:        PublicUser;
  destination: string;
}

interface Props {
  notice:  CancellationNotice | null;
  onClose: () => void;
}

// Popup « course annulée par le client » aux couleurs de l'annulation
export default function CancellationModal({ notice, onClose }: Props) {
  const { t } = useLanguage();
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!notice) return;
    scale.setValue(0.85);
    Animated.spring(scale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }).start();
  }, [notice]);

  return (
    <Modal visible={!!notice} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {notice && (
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
            <View style={styles.header}>
              <View style={styles.iconRing}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>✕</Text>
                </View>
              </View>
              <Text style={styles.title}>{t('tripCancelledTitle')}</Text>
              <Text style={styles.subtitle}>{t('cancelModalByClient')}</Text>
            </View>

            <View style={styles.body}>
              <View style={styles.clientRow}>
                <Avatar photoUrl={notice.user.photoUrl} name={notice.user.name} size={44} color={C.danger} />
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{notice.user.name ?? t('commonClient')}</Text>
                  <Text style={styles.clientDest} numberOfLines={1}>📍 {notice.destination}</Text>
                </View>
              </View>

              <Text style={styles.message}>{t('cancelModalMessage')}</Text>

              <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.buttonText}>{t('commonUnderstood')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(26, 11, 59, 0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  card: {
    width: '100%', maxWidth: 360, borderRadius: RADIUS.xl, overflow: 'hidden',
    backgroundColor: C.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 16,
  },

  header: { backgroundColor: C.danger, alignItems: 'center', paddingTop: 26, paddingBottom: 20 },
  iconRing: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 26, fontWeight: '900', color: C.danger },
  title:    { fontSize: 22, fontWeight: '900', color: C.white },
  subtitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  body:       { padding: 20, gap: 16 },
  clientRow:  {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF0F3', borderRadius: RADIUS.lg, padding: 12,
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '800', color: C.text },
  clientDest: { fontSize: 13, color: C.sub, marginTop: 2 },
  message:    { fontSize: 14, color: C.sub, lineHeight: 20, textAlign: 'center' },

  button:     { height: 52, borderRadius: RADIUS.lg, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '800', color: C.white },
});
