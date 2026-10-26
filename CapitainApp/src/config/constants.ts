import Constants from 'expo-constants';

// IP du PC lue automatiquement depuis le serveur Expo (hostUri, ex. "192.168.1.17:8082"),
// pour suivre les changements d'IP du Wi-Fi. FALLBACK_HOST si absent ou tunnel Expo.
const FALLBACK_HOST = '192.168.1.17';

function devHost(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  const isLanIp = !!host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  return isLanIp ? host : FALLBACK_HOST;
}

const DEV_HOST = devHost();

export const API_BASE_URL    = `http://${DEV_HOST}:3000/api/v1`;
export const SOCKET_URL      = `http://${DEV_HOST}:3000`;
export const SECURE_STORE_KEY = 'mishwar_captain_token';

export const APP_VERSION = '3.2.65';
