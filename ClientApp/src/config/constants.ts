import Constants from 'expo-constants';

/**
 * Adresse du serveur NestJS.
 *
 * En développement, l'IP du PC est lue automatiquement dans l'adresse du serveur Expo
 * (hostUri, ex. "192.168.1.17:8081") : c'est celle que le téléphone utilise déjà pour
 * charger l'app, donc elle suit les changements d'IP du Wi-Fi sans rien modifier.
 *
 * FALLBACK_HOST ne sert que si hostUri est absent ou passe par un tunnel Expo
 * (le tunnel ne donne pas accès à NestJS) : Windows → ipconfig → « Adresse IPv4 ».
 */
const FALLBACK_HOST = '192.168.1.17';

function devHost(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  const isLanIp = !!host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  return isLanIp ? host : FALLBACK_HOST;
}

const DEV_HOST = devHost();

export const API_BASE_URL = `http://${DEV_HOST}:3000/api/v1`;
export const SOCKET_URL   = `http://${DEV_HOST}:3000`;

export const SECURE_STORE_KEY = 'mishwar_auth_token';
