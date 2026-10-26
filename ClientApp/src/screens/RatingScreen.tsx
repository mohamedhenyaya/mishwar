import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import Avatar from '../components/Avatar';
import StarRating from '../components/StarRating';
import { apiPost } from '../services/api';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Rating'>;

const C = {
  blue:   '#007AFF',
  bg:     '#F5F6FA',
  text:   '#1A1A1A',
  subtle: '#7F8C8D',
  white:  '#FFFFFF',
  green:  '#34C759',
  border: '#EAECF0',
};

const LABELS = ['', 'Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent'];

export default function RatingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { rideId, driver, price } = route.params;

  const [rating,  setRating]  = useState(0);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await apiPost(`/rides/${rideId}/rate`, { rating });
      navigation.popToTop();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible d\'envoyer la note.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />

      <View style={styles.doneCircle}><Text style={styles.doneIcon}>✓</Text></View>
      <Text style={styles.title}>Course terminée</Text>
      {price != null && <Text style={styles.price}>{price} MRU</Text>}

      <View style={styles.card}>
        <Avatar photoUrl={driver?.photoUrl} name={driver?.name} size={72} color={C.blue} />
        <Text style={styles.question}>Comment s'est passée votre course avec {driver?.name ?? 'votre chauffeur'} ?</Text>
        <StarRating value={rating} onChange={setRating} size={40} />
        <Text style={styles.ratingLabel}>{LABELS[rating]}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.submitBtn, (rating === 0 || sending) && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={rating === 0 || sending}
          activeOpacity={0.85}
        >
          {sending ? <ActivityIndicator color={C.white} /> : <Text style={styles.submitText}>Envoyer la note</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.popToTop()} style={styles.skipBtn}>
          <Text style={styles.skipText}>Plus tard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: 'center', paddingHorizontal: 24, gap: 12 },
  doneCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  doneIcon: { color: C.white, fontSize: 32, fontWeight: '800' },
  title:    { fontSize: 24, fontWeight: '800', color: C.text },
  price:    { fontSize: 32, fontWeight: '900', color: C.blue },

  card: {
    alignSelf: 'stretch', backgroundColor: C.white, borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 14, marginTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  question:    { fontSize: 15, color: C.text, fontWeight: '600', textAlign: 'center' },
  ratingLabel: { fontSize: 14, color: C.subtle, fontWeight: '600', minHeight: 18 },

  actions:   { alignSelf: 'stretch', marginTop: 'auto', gap: 8 },
  submitBtn: { height: 54, borderRadius: 16, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: C.white, fontSize: 16, fontWeight: '700' },
  skipBtn:   { alignItems: 'center', paddingVertical: 10 },
  skipText:  { color: C.subtle, fontSize: 14, fontWeight: '600' },
});
