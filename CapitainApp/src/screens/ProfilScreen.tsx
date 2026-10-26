import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Avatar from '../components/Avatar';
import { apiGet, apiPatch } from '../services/api';
import { pickAndUploadPhoto } from '../services/photo';
import { DriverProfile, RootStackParamList } from '../types';
import { C, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profil'>;

// Profil visible par le client : nom, photo, modèle du véhicule et immatriculation
export default function ProfilScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [profile,      setProfile]      = useState<DriverProfile | null>(null);
  const [name,         setName]         = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);

  useEffect(() => {
    apiGet<DriverProfile>('/drivers/me')
      .then((d) => {
        setProfile(d);
        setName(d.name ?? '');
        setVehicleModel(d.vehicleModel ?? '');
        setVehiclePlate(d.vehiclePlate ?? '');
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger le profil.'));
  }, []);

  const changePhoto = async () => {
    setUploading(true);
    try {
      const updated = await pickAndUploadPhoto<DriverProfile>('/drivers/me/photo');
      if (updated) setProfile(updated);
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? e?.message ?? 'Envoi de la photo impossible.');
    } finally {
      setUploading(false);
    }
  };

  const canSave = name.trim().length > 0 && vehiclePlate.trim().length > 0 && !saving;

  const save = async () => {
    setSaving(true);
    try {
      await apiPatch('/drivers/me', {
        name:         name.trim(),
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
      });
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join('\n') : msg ?? 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Mon profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <TouchableOpacity style={styles.avatarWrap} onPress={changePhoto} disabled={uploading} activeOpacity={0.8}>
        <Avatar photoUrl={profile.photoUrl} name={name || profile.name} size={110} color={C.primary} />
        <View style={styles.avatarBadge}>
          {uploading ? <ActivityIndicator size="small" color={C.white} /> : <Text style={styles.avatarBadgeText}>📷</Text>}
        </View>
      </TouchableOpacity>
      <Text style={styles.phone}>{profile.phone}</Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>⭐ {Number(profile.rating).toFixed(1)}</Text>
          <Text style={styles.statLabel}>Note</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.totalRides}</Text>
          <Text style={styles.statLabel}>Courses réalisées</Text>
        </View>
      </View>

      <Text style={styles.label}>Nom complet</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Visible par le client"
        placeholderTextColor={C.muted}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Modèle</Text>
      <TextInput
        style={styles.input}
        value={vehicleModel}
        onChangeText={setVehicleModel}
        placeholder="ex. Renault Symbol blanche"
        placeholderTextColor={C.muted}
      />

      <Text style={styles.label}>Immatriculation</Text>
      <TextInput
        style={styles.input}
        value={vehiclePlate}
        onChangeText={setVehiclePlate}
        placeholder="ex. 01234-116-16"
        placeholderTextColor={C.muted}
        autoCapitalize="characters"
      />

      <TouchableOpacity
        style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}
        onPress={save}
        disabled={!canSave}
        activeOpacity={0.85}
      >
        {saving ? <ActivityIndicator color={C.white} /> : <Text style={styles.saveText}>Enregistrer</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn:  { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, color: C.text, marginTop: -3 },
  topTitle: { fontSize: 17, fontWeight: '700', color: C.text },

  avatarWrap:  { alignSelf: 'center' },
  avatarBadge: {
    position: 'absolute', right: 0, bottom: 0, width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: C.bg,
  },
  avatarBadgeText: { fontSize: 15 },
  phone: { alignSelf: 'center', marginTop: 10, fontSize: 14, color: C.sub },

  stats: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderRadius: RADIUS.lg, paddingVertical: 14, marginVertical: 24,
  },
  stat:        { flex: 1, alignItems: 'center', gap: 2 },
  statValue:   { fontSize: 18, fontWeight: '800', color: C.text },
  statLabel:   { fontSize: 12, color: C.sub },
  statDivider: { width: 1, height: 30, backgroundColor: C.border },

  label: { fontSize: 13, fontWeight: '600', color: C.sub, marginBottom: 6, marginTop: 14 },
  input: {
    height: 52, borderRadius: RADIUS.lg, backgroundColor: C.surface, paddingHorizontal: 16,
    fontSize: 15, color: C.text, borderWidth: 1.5, borderColor: C.border,
  },


  saveBtn:  { height: 54, borderRadius: RADIUS.lg, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  saveText: { color: C.white, fontSize: 16, fontWeight: '700' },
});
