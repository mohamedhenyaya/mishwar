import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { photoUri } from '../services/photo';

interface Props {
  photoUrl?: string | null;
  name?: string | null;
  size?: number;
  color?: string;
}

// Photo de profil, ou initiale du nom à défaut
export default function Avatar({ photoUrl, name, size = 56, color = '#007AFF' }: Props) {
  const uri = photoUri(photoUrl);
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri) return <Image source={{ uri }} style={[styles.base, box]} />;

  return (
    <View style={[styles.base, box, { backgroundColor: color }]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
        {(name?.trim()?.[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base:    { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E5EA' },
  initial: { color: '#FFFFFF', fontWeight: '800' },
});
