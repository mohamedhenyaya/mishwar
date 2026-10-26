<<<<<<< HEAD
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
=======
const DEV_HOST = '172.20.10.2';
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba

export const API_BASE_URL    = `http://${DEV_HOST}:3000/api/v1`;
export const SOCKET_URL      = `http://${DEV_HOST}:3000`;
export const SECURE_STORE_KEY = 'mishwar_captain_token';

export const APP_VERSION = '3.2.65';

// ── Support — à mettre à jour avec les vrais contacts de l'équipe support ──────
export const SUPPORT_PHONE    = '+22220122724';
export const SUPPORT_WHATSAPP = '+22220122724';
