import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, SECURE_STORE_KEY } from '../config/constants';
import { resetToWelcome } from '../navigation/navigationRef';

// ─── Instance Axios ───────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Intercepteur requête — injection automatique du JWT ──────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Intercepteur réponse — gestion des erreurs globales ─────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    // Ne redirige que si la requête envoyait déjà un token (session expirée/invalide) —
    // un 401 sur /auth/login ou /auth/register/verify est une erreur de saisie normale,
    // pas une session à couper.
    const hadAuthHeader = !!error.config?.headers?.Authorization;
    if (error.response?.status === 401 && hadAuthHeader) {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
      resetToWelcome();
    }
    return Promise.reject(error);
  },
);

// ─── Helpers typés (le serveur retourne les données directement) ──────────────

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