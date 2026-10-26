import * as ImagePicker from 'expo-image-picker';
import { apiClient } from './api';
import { SOCKET_URL } from '../config/constants';

// URL absolue d'une photo stockée par le serveur (photoUrl = /uploads/xxx.jpg)
export const photoUri = (photoUrl?: string | null): string | null =>
  photoUrl ? `${SOCKET_URL}${photoUrl}` : null;

// Ouvre la galerie, recadre en carré puis envoie la photo au serveur.
// Retourne la réponse du serveur, ou null si l'utilisateur annule.
export async function pickAndUploadPhoto<T>(endpoint: string): Promise<T | null> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) throw new Error('Accès aux photos refusé');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const form = new FormData();
  form.append('photo', {
    uri:  asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    type: asset.mimeType ?? 'image/jpeg',
  } as any);

  const res = await apiClient.post<T>(endpoint, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
