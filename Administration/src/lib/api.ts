import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from './config';
import { readStorage, writeStorage } from './storage';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtClaims {
  sub: string;
  phone: string;
  role: string;
  exp?: number;
}

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 20_000 });

// ── Jetons ────────────────────────────────────────────────────────────────────

let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export function getTokens(): TokenPair | null {
  const accessToken = readStorage(STORAGE_KEYS.accessToken);
  const refreshToken = readStorage(STORAGE_KEYS.refreshToken);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export function saveTokens(tokens: TokenPair | null) {
  writeStorage(STORAGE_KEYS.accessToken, tokens?.accessToken ?? null);
  writeStorage(STORAGE_KEYS.refreshToken, tokens?.refreshToken ?? null);
}

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return config;
});

// Un seul rafraîchissement à la fois : les requêtes en 401 simultanées attendent le même
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens) return null;
  try {
    const { data } = await axios.post<TokenPair>(`${API_BASE_URL}/auth/refresh`, { refreshToken: tokens.refreshToken });
    saveTokens(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshing ??= refreshAccessToken().finally(() => { refreshing = null; });
      const newToken = await refreshing;
      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return api(original);
      }
      saveTokens(null);
      onSessionExpired?.();
    }
    return Promise.reject(error);
  },
);

// ── Erreurs ───────────────────────────────────────────────────────────────────

export function errorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return error.code === 'ECONNABORTED'
        ? 'Le serveur met trop de temps à répondre'
        : 'Serveur injoignable — vérifiez votre connexion';
    }
    const msg = (error.response.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(msg)) return msg.join(' · ');
    if (typeof msg === 'string' && msg) return msg;
    if (error.response.status === 403) return 'Action non autorisée';
    if (error.response.status === 404) return 'Élément introuvable';
  }
  return fallback;
}
