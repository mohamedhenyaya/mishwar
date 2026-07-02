import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { apiGet, apiPatch } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { TabScreenProps, UserProfile } from '../types';
import { colors, radius, shadows, spacing, typography } from '../theme';

type Props = TabScreenProps<'Profile'>;

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuRow({ icon, label, onPress, danger }: MenuRowProps) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, danger && { backgroundColor: colors.dangerMuted }]}>
        <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={19} color={colors.textTertiary} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState('');
  const [editEmail, setEditEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<UserProfile>('/users/me')
      .then((data) => {
        setProfile(data);
        setName(data.name ?? '');
        setEmail(data.email ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveField = async (patch: { name?: string; email?: string }) => {
    setSaving(true);
    try {
      const updated = await apiPatch<UserProfile, typeof patch>('/users/me', patch);
      setProfile(updated);
      setEditName(false);
      setEditEmail(false);
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de mettre à jour le profil.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
          navigation.replace('Welcome');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profil</Text>

        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(profile?.name?.[0] ?? profile?.phone?.[1] ?? 'U').toUpperCase()}</Text>
            </View>
          </View>

          {editName ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={name}
                onChangeText={setName}
                placeholder="Votre nom"
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
              <TouchableOpacity onPress={() => saveField({ name })} style={styles.confirmBtn} disabled={saving}>
                <Ionicons name="checkmark" size={16} color={colors.textInverse} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditName(true)} style={styles.nameRow} activeOpacity={0.7}>
              <Text style={styles.name}>{profile?.name || 'Ajouter votre nom'}</Text>
              <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          <Text style={styles.phone}>{profile?.phone}</Text>

          <View style={styles.ratingChip}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.ratingText}>{profile?.rating.toFixed(1)} · {profile?.ratingCount ?? 0} courses</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Informations</Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={17} color={colors.textSecondary} />
            {editEmail ? (
              <>
                <TextInput
                  style={[styles.editInput, { flex: 1 }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Votre email"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                <TouchableOpacity onPress={() => saveField({ email })} style={styles.confirmBtn} disabled={saving}>
                  <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setEditEmail(true)} style={{ flex: 1 }}>
                <Text style={styles.infoValue}>{profile?.email || 'Non renseigné'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <MenuRow icon="heart-outline" label="Mes favoris" onPress={() => navigation.navigate('Favorites')} />
          <MenuRow icon="headset-outline" label="Support" onPress={() => navigation.navigate('Support')} />
          <MenuRow icon="wallet-outline" label="Portefeuille" onPress={() => navigation.navigate('Wallet')} />
        </View>

        <View style={styles.card}>
          <MenuRow icon="log-out-outline" label="Se déconnecter" onPress={handleLogout} danger />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  title: { ...typography.h1, color: colors.text, marginLeft: spacing.xs, marginBottom: spacing.xs },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadows.sm },

  avatarWrap: { alignItems: 'center', marginBottom: spacing.sm },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.textInverse, fontSize: 26, fontWeight: '800' },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center' },
  name: { ...typography.h3, color: colors.text, textAlign: 'center' },
  phone: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },

  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    backgroundColor: colors.surfaceAlt, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 5, marginTop: spacing.sm,
  },
  ratingText: { ...typography.caption, fontWeight: '700', color: colors.text },

  sectionLabel: { ...typography.overline, color: colors.textSecondary, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoValue: { ...typography.bodySm, color: colors.text, fontWeight: '600' },

  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  editInput: {
    ...typography.h3, color: colors.text,
    borderBottomWidth: 1.5, borderBottomColor: colors.primary, paddingBottom: 2,
    minWidth: 120, textAlign: 'center',
  },
  confirmBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, ...typography.bodySm, fontWeight: '600', color: colors.text },
});
