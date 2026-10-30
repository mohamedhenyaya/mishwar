import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from './api';
import { SOCKET_URL } from '../config/constants';
import { tr } from '../i18n/LanguageContext';

// URL absolue d'une photo stockée par le serveur (photoUrl = /uploads/xxx.jpg)
export const photoUri = (photoUrl?: string | null): string | null =>
  photoUrl ? `${SOCKET_URL}${photoUrl}` : null;

export type PickedImage = ImagePicker.ImagePickerAsset;

// Demande la source (appareil photo ou galerie) puis renvoie l'image, ou null si annulé.
// square : recadrage carré (photo de profil) ; sinon la pièce est gardée entière et lisible.
export function chooseImage({ square = false }: { square?: boolean } = {}): Promise<PickedImage | null> {
  return new Promise((resolve, reject) => {
    const pick = async (source: 'camera' | 'library') => {
      try {
        const { granted } = source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) throw new Error(tr(source === 'camera' ? 'photoCameraDenied' : 'photoLibraryDenied'));

        const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: ['images'],
          allowsEditing: square,
          aspect: square ? [1, 1] : undefined,
          quality: 0.6,
          // iPhone : les photos de la galerie sont en HEIC, illisible par les navigateurs (back-office) → JPEG
          preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        };
        const result = source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
        resolve(result.canceled ? null : result.assets[0] ?? null);
      } catch (e) {
        reject(e);
      }
    };

    Alert.alert(tr('photoAddTitle'), undefined, [
      { text: tr('photoTake'),          onPress: () => pick('camera') },
      { text: tr('photoChooseGallery'), onPress: () => pick('library') },
      { text: tr('commonCancel'), style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}

// Envoie une image en multipart (champ « photo ») avec d'éventuels champs texte
export async function uploadImage<T>(endpoint: string, image: PickedImage, fields: Record<string, string> = {}): Promise<T> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  // Nom dérivé du format réel (une photo convertie en JPEG garde parfois un nom « .HEIC »)
  const type = image.mimeType ?? 'image/jpeg';
  form.append('photo', {
    uri:  image.uri,
    name: `photo.${type === 'image/png' ? 'png' : type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1]}`,
    type,
  } as any);

  const res = await apiClient.post<T>(endpoint, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  });
  return res.data;
}

// Photo de profil : choix de la source, recadrage carré, envoi.
// Retourne la réponse du serveur, ou null si l'utilisateur annule.
export async function pickAndUploadPhoto<T>(endpoint: string): Promise<T | null> {
  const image = await chooseImage({ square: true });
  return image ? uploadImage<T>(endpoint, image) : null;
}
