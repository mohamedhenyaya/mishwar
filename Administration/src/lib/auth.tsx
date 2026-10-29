import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, decodeJwt, getTokens, saveTokens, setSessionExpiredHandler, TokenPair } from './api';
import type { User } from './types';

interface AuthState {
  me: User | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export class NotAdminError extends Error {
  constructor() {
    super('Ce compte n\'a pas les droits administrateur');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [me, setMe] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState['status']>(() => (getTokens() ? 'loading' : 'anonymous'));

  const clearSession = useCallback(() => {
    saveTokens(null);
    setMe(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  const refreshMe = useCallback(async () => {
    const { data } = await api.get<User>('/users/me');
    if (data.role !== 'admin') throw new NotAdminError();
    setMe(data);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    if (getTokens()) refreshMe().catch(clearSession);
  }, [clearSession, refreshMe]);

  const login = useCallback(async (phone: string, password: string) => {
    const { data } = await api.post<TokenPair>('/auth/login', { phone, password });
    // Le serveur accepte aussi les clients sur /auth/login : seul le rôle du jeton ouvre le back-office
    if (decodeJwt(data.accessToken)?.role !== 'admin') {
      await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${data.accessToken}` } }).catch(() => {});
      throw new NotAdminError();
    }
    saveTokens(data);
    try {
      await refreshMe();
    } catch (e) {
      clearSession();
      throw e;
    }
  }, [refreshMe, clearSession]);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ me, status, login, logout, refreshMe }), [me, status, login, logout, refreshMe]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
