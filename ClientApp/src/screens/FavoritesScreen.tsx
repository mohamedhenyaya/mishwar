import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, FavoritePlace } from '../types';
import { apiDelete, apiGet, apiPatch, apiPost } from '../services/api';
import { Button, ScreenHeader, TextField } from '../components/ui';
import { colors, radius, shadows, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

interface ReverseGeocodeResult { address: string }

export default function FavoritesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [loading, setLoading] = useState(true);

  const [adding, setAdding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const fetchFavorites = () => {
    apiGet<FavoritePlace[]>('/places/favorites')
      .then(setFavorites)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchFavorites, []);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez la géolocalisation pour utiliser votre position actuelle.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setCoords({ latitude, longitude });
      try {
        const geo = await apiGet<ReverseGeocodeResult>(`/places/reverse-geocode?lat=${latitude}&lng=${longitude}`);
        setAddress(geo.address);
      } catch {
        setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'obtenir votre position.");
    } finally {
      setLocating(false);
    }
  };

  const resetForm = () => {
    setAdding(false);
    setLabel('');
    setAddress('');
    setCoords(null);
  };

  const handleSave = async () => {
    if (!coords || !label.trim() || !address.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost<FavoritePlace, object>('/places/favorites', {
        label: label.trim(),
        address: address.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setFavorites((prev) => [created, ...prev]);
      resetForm();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? "Impossible d'ajouter ce favori.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: FavoritePlace) => {
    Alert.alert('Supprimer', `Supprimer "${item.label}" de vos favoris ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/places/favorites/${item.id}`);
            setFavorites((prev) => prev.filter((f) => f.id !== item.id));
          } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.message ?? 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const saveEditLabel = async (item: FavoritePlace) => {
    if (!editLabel.trim() || editLabel === item.label) { setEditingId(null); return; }
    try {
      const updated = await apiPatch<FavoritePlace, { label: string }>(`/places/favorites/${item.id}`, { label: editLabel.trim() });
      setFavorites((prev) => prev.map((f) => (f.id === item.id ? updated : f)));
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Modification impossible.');
    } finally {
      setEditingId(null);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Mes favoris"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => setAdding((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={adding ? 'close' : 'add'} size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {adding && (
        <View style={styles.addCard}>
          <Button
            label={locating ? 'Localisation…' : 'Utiliser ma position actuelle'}
            icon="locate"
            variant="secondary"
            size="md"
            onPress={useCurrentLocation}
            loading={locating}
          />
          {coords && (
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              <TextField label="Nom (ex: Maison, Travail)" value={label} onChangeText={setLabel} placeholder="Maison" />
              <TextField label="Adresse" value={address} onChangeText={setAddress} placeholder="Adresse détectée" multiline />
              <Button label="Enregistrer" onPress={handleSave} disabled={!label.trim() || saving} loading={saving} />
            </View>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="heart" size={18} color={colors.accent} />
              </View>
              <View style={styles.cardContent}>
                {editingId === item.id ? (
                  <TextInput
                    style={styles.editInput}
                    value={editLabel}
                    onChangeText={setEditLabel}
                    onSubmitEditing={() => saveEditLabel(item)}
                    onBlur={() => saveEditLabel(item)}
                    autoFocus
                  />
                ) : (
                  <TouchableOpacity onPress={() => { setEditingId(item.id); setEditLabel(item.label); }}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="heart-outline" size={44} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aucun favori</Text>
              <Text style={styles.emptySub}>Ajoutez vos adresses fréquentes pour réserver plus vite.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  addCard: { backgroundColor: colors.surface, margin: spacing.lg, borderRadius: radius.lg, padding: spacing.lg, ...shadows.sm },

  listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadows.sm,
  },
  cardIconWrap: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardLabel: { ...typography.bodySm, fontWeight: '700', color: colors.text },
  cardAddress: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  editInput: {
    ...typography.bodySm, fontWeight: '700', color: colors.text,
    borderBottomWidth: 1.5, borderBottomColor: colors.accent, paddingBottom: 2,
  },

  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: spacing.sm, paddingHorizontal: spacing.xxl },
  emptyTitle: { ...typography.h3, color: colors.text },
  emptySub: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center' },
});
