import React, { useEffect, useState } from 'react';
import {
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
    } finally {
      setSaving(false);
    }
  };

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
    </View>
  );
}

const styles = StyleSheet.create({
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
});
