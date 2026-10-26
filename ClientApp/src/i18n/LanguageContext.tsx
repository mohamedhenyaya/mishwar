import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStorage from '../services/secureStorage';
import { translations, LanguageCode, TranslationKey } from './translations';

const LANGUAGE_STORAGE_KEY = 'mishwar_language';

type Dict = (typeof translations)['fr'];

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: <K extends TranslationKey>(key: K) => Dict[K];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage doit être utilisé sous LanguageProvider');
  return ctx;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('fr');

  useEffect(() => {
    SecureStorage.getItemAsync(LANGUAGE_STORAGE_KEY).then((stored) => {
      if (stored === 'fr' || stored === 'en' || stored === 'ar') setLanguageState(stored);
    });
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    SecureStorage.setItemAsync(LANGUAGE_STORAGE_KEY, code);
  }, []);

  const t = useCallback(
    <K extends TranslationKey>(key: K): Dict[K] => translations[language][key] as Dict[K],
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
