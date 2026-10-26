import React, { useEffect, useState } from 'react';
import {
<<<<<<< HEAD
  StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

import Avatar from '../components/Avatar';
import { apiGet, apiPatch } from '../services/api';
import { pickAndUploadPhoto } from '../services/photo';
import { socketService } from '../services/socket';
import { SECURE_STORE_KEY } from '../config/constants';
import { PublicUser, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const C = {
  blue:   '#007AFF',
  bg:     '#F5F6FA',
  text:   '#1A1A1A',
  subtle: '#7F8C8D',
  white:  '#FFFFFF',
  red:    '#FF3B30',
  border: '#EAECF0',
};

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [profile,   setProfile]   = useState<PublicUser | null>(null);
  const [name,      setName]      = useState('');
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiGet<PublicUser>('/users/me')
      .then((u) => { setProfile(u); setName(u.name ?? ''); })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger le profil.'));
  }, []);

  const changePhoto = async () => {
    setUploading(true);
    try {
      const updated = await pickAndUploadPhoto<PublicUser>('/users/me/photo');
      if (updated) setProfile(updated);
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? e?.message ?? 'Envoi de la photo impossible.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await apiPatch<PublicUser>('/users/me', { name: name.trim() });
      setProfile(updated);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Enregistrement impossible.');
=======
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from '../services/secureStorage';
import { apiGet, apiPatch } from '../services/api';
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
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    } finally {
      setSaving(false);
    }
  };

<<<<<<< HEAD
  const logout = async () => {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    socketService.disconnect();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  if (!profile) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={C.blue} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Mon profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <TouchableOpacity style={styles.avatarWrap} onPress={changePhoto} disabled={uploading} activeOpacity={0.8}>
        <Avatar photoUrl={profile.photoUrl} name={name || profile.name} size={110} color={C.blue} />
        <View style={styles.avatarBadge}>
          {uploading ? <ActivityIndicator size="small" color={C.white} /> : <Text style={styles.avatarBadgeText}>📷</Text>}
        </View>
      </TouchableOpacity>
      <Text style={styles.phone}>{profile.phone}</Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>⭐ {profile.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Note</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.totalRides}</Text>
          <Text style={styles.statLabel}>Courses</Text>
        </View>
      </View>

      <Text style={styles.label}>Nom complet</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Votre nom (visible par le chauffeur)"
        placeholderTextColor="#AEAEB2"
        autoCapitalize="words"
      />

      <TouchableOpacity
        style={[styles.saveBtn, (saving || !name.trim()) && { opacity: 0.5 }]}
        onPress={save}
        disabled={saving || !name.trim()}
        activeOpacity={0.85}
      >
        {saving ? <ActivityIndicator color={C.white} /> : <Text style={styles.saveText}>Enregistrer</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
=======
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
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    </View>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn:  { width: 40, height: 40, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, color: C.text, marginTop: -3 },
  topTitle: { fontSize: 17, fontWeight: '700', color: C.text },

  avatarWrap:  { alignSelf: 'center' },
  avatarBadge: {
    position: 'absolute', right: 0, bottom: 0, width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: C.bg,
  },
  avatarBadgeText: { fontSize: 15 },
  phone: { alignSelf: 'center', marginTop: 10, fontSize: 14, color: C.subtle },

  stats: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: 16, paddingVertical: 14, marginVertical: 24,
  },
  stat:        { flex: 1, alignItems: 'center', gap: 2 },
  statValue:   { fontSize: 18, fontWeight: '800', color: C.text },
  statLabel:   { fontSize: 12, color: C.subtle },
  statDivider: { width: 1, height: 30, backgroundColor: C.border },

  label: { fontSize: 13, fontWeight: '600', color: C.subtle, marginBottom: 6 },
  input: {
    height: 52, borderRadius: 14, backgroundColor: C.white, paddingHorizontal: 16,
    fontSize: 15, color: C.text, borderWidth: 1.5, borderColor: C.border,
  },
  saveBtn:  { height: 54, borderRadius: 16, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveText: { color: C.white, fontSize: 16, fontWeight: '700' },
  logoutBtn:  { alignItems: 'center', paddingVertical: 14, marginTop: 'auto' },
  logoutText: { color: C.red, fontSize: 14, fontWeight: '700' },
=======
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
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
});
