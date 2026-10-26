import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from '../services/secureStorage';
import { apiGet, apiPatch } from '../services/api';
import { pickAndUploadPhoto } from '../services/photo';
import Avatar from '../components/Avatar';
import { SECURE_STORE_KEY } from '../config/constants';
import { TabScreenProps, UserProfile } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
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
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState('');
  const [editEmail, setEditEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Photo visible par le chauffeur pendant la course
  const changePhoto = async () => {
    setUploading(true);
    try {
      const updated = await pickAndUploadPhoto<UserProfile>('/users/me/photo');
      if (updated) setProfile(updated);
    } catch (e: any) {
      Alert.alert(t('commonError'), e?.response?.data?.message ?? e?.message ?? 'Envoi de la photo impossible.');
    } finally {
      setUploading(false);
    }
  };

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
      Alert.alert(t('commonError'), e?.response?.data?.message ?? t('profileUpdateErrorDefault'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profileLogoutTitle'), t('profileLogoutMessage'), [
      { text: t('commonCancel'), style: 'cancel' },
      {
        text: t('profileLogoutConfirm'), style: 'destructive',
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
        <Text style={styles.title}>{t('profileTitle')}</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.avatarWrap} onPress={changePhoto} disabled={uploading} activeOpacity={0.8}>
            <Avatar photoUrl={profile?.photoUrl} name={profile?.name ?? profile?.phone?.[1] ?? 'U'} size={72} color={colors.primary} />
            <View style={styles.avatarBadge}>
              {uploading
                ? <ActivityIndicator size="small" color={colors.textInverse} />
                : <Ionicons name="camera" size={14} color={colors.textInverse} />}
            </View>
          </TouchableOpacity>

          {editName ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={name}
                onChangeText={setName}
                placeholder={t('profileNamePlaceholder')}
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
              <TouchableOpacity onPress={() => saveField({ name })} style={styles.confirmBtn} disabled={saving}>
                <Ionicons name="checkmark" size={16} color={colors.textInverse} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditName(true)} style={styles.nameRow} activeOpacity={0.7}>
              <Text style={styles.name}>{profile?.name || t('profileAddName')}</Text>
              <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          <Text style={styles.phone}>{profile?.phone}</Text>

          <View style={styles.ratingChip}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.ratingText}>{Number(profile?.rating ?? 0).toFixed(1)} · {profile?.ratingCount ?? 0}{t('profileRatingSuffix')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t('profileInfoSection')}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={17} color={colors.textSecondary} />
            {editEmail ? (
              <>
                <TextInput
                  style={[styles.editInput, { flex: 1 }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('profileEmailPlaceholder')}
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
                <Text style={styles.infoValue}>{profile?.email || t('profileNotProvided')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <MenuRow icon="heart-outline" label={t('profileFavorites')} onPress={() => navigation.navigate('Favorites')} />
          <MenuRow icon="headset-outline" label={t('profileSupport')} onPress={() => navigation.navigate('Support')} />
        </View>

        <View style={styles.card}>
          <MenuRow icon="log-out-outline" label={t('profileLogout')} onPress={handleLogout} danger />
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
  avatarBadge: {
    position: 'absolute', bottom: 0, right: '38%',
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface,
  },

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
