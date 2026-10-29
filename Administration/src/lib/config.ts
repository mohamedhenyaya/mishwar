// Serveur NestJS — VITE_API_URL dans Administration/.env.local (ex. https://xxx.up.railway.app)
export const SERVER_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:3000';
export const API_BASE_URL = `${SERVER_URL}/api/v1`;

export const CURRENCY = 'MRU';
export const DEFAULT_COUNTRY_CODE = '+222';

export const STORAGE_KEYS = {
  accessToken: 'mishwar_admin_access',
  refreshToken: 'mishwar_admin_refresh',
  theme: 'mishwar_admin_theme',
} as const;

// Photos servies en statique par le serveur : /uploads/<fichier>
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${SERVER_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
