import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, SECURE_STORE_KEY } from '../config/constants';
import { resetToWelcome } from '../navigation/navigationRef';
import { tr } from '../i18n/LanguageContext';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// Message d'erreur affichable dans une alerte : toujours une chaîne (une liste passée à
// Alert.alert fait planter l'app sur Android)
export function apiErrorMessage(e: any, fallback: string): string {
  if (e?.response === undefined && e?.request) return tr('commonNetworkError');
  const message = e?.response?.data?.message;
  if (Array.isArray(message)) return message.join('\n') || fallback;
  return typeof message === 'string' && message ? message : fallback;
}

// ── Fin de session (jeton refusé, compte bloqué ou supprimé) ─────────────────
const signOutListeners = new Set<() => void>();
let signingOut = false;

// DriverStatusContext s'y abonne pour repasser hors ligne et couper le socket
export function onSignedOut(listener: () => void): () => void {
  signOutListeners.add(listener);
  return () => { signOutListeners.delete(listener); };
}

export async function signOut(message?: string): Promise<void> {
  if (signingOut) return; // plusieurs requêtes refusées en même temps : une seule déconnexion
  signingOut = true;
  try {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    signOutListeners.forEach((listener) => listener());
    resetToWelcome();
    if (message) Alert.alert(tr('sessionEndedTitle'), message);
  } finally {
    signingOut = false;
  }
}

// « Se déconnecter » : le serveur repasse le capitaine hors ligne (au retour, il devra
// cliquer « En ligne » lui-même). Sans réseau, la session locale est quand même effacée.
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout', {}, { timeout: 5_000 }).catch(() => {});
  await signOut();
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const hadAuthHeader = !!error.config?.headers?.Authorization;
    if (error.response?.status === 401 && hadAuthHeader) {
      // « Compte bloqué : … » / « Compte supprimé » (JwtStrategy) : affiché au capitaine
      const message = error.response?.data?.message;
      await signOut(typeof message === 'string' && message.startsWith('Compte') ? message : undefined);
    }
    return Promise.reject(error);
  },
);

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiClient.get<T>(path);
  return res.data;
}

export async function apiPost<T, B = unknown>(path: string, body: B): Promise<T> {
  const res = await apiClient.post<T>(path, body);
  return res.data;
}

export async function apiPatch<T, B = unknown>(path: string, body: B): Promise<T> {
  const res = await apiClient.patch<T>(path, body);
  return res.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiClient.delete<T>(path);
  return res.data;
}
