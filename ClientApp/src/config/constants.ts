/**
 * Remplace DEV_HOST par l'IP locale de ton PC quand tu testes sur un vrai appareil.
 * Windows : ipconfig → "Adresse IPv4"  ex: 192.168.1.100
 * Le tunnel Expo n'affecte pas NestJS — il faut une IP accessible depuis le téléphone.
 */
const DEV_HOST = '192.168.1.177'; // ← IP locale du PC (Wi-Fi) pour test sur appareil réel

export const API_BASE_URL = `http://${DEV_HOST}:3000/api/v1`;
export const SOCKET_URL   = `http://${DEV_HOST}:3000`;

export const SECURE_STORE_KEY = 'mishwar_auth_token';