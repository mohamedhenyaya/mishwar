import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Dict, LanguageCode, TranslationKey, translations } from './translations';

const LANGUAGE_STORAGE_KEY = 'mishwar_captain_language';

// Langue courante, aussi lue hors des composants (alertes des services, notifications)
let currentLanguage: LanguageCode = 'fr';

export function tr<K extends TranslationKey>(key: K): Dict[K] {
  return translations[currentLanguage][key];
}

// Tâches d'arrière-plan (app fermée) : LanguageProvider n'est pas monté, la langue est relue ici
export async function restoreLanguage(): Promise<void> {
  const stored = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY).catch(() => null);
  if (stored === 'fr' || stored === 'ar') currentLanguage = stored;
}

interface LanguageContextValue {
  language:    LanguageCode;
  ready:       boolean; // langue enregistrée lue
  chosen:      boolean; // false au premier lancement : l'écran de choix s'affiche
  setLanguage: (code: LanguageCode) => void;
  t:           <K extends TranslationKey>(key: K) => Dict[K];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage doit être utilisé sous LanguageProvider');
  return ctx;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('fr');
  const [ready,    setReady]         = useState(false);
  const [chosen,   setChosen]        = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'fr' || stored === 'ar') {
          currentLanguage = stored;
          setLanguageState(stored);
          setChosen(true);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    currentLanguage = code;
    setLanguageState(code);
    setChosen(true);
    SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, code).catch(() => {});
  }, []);

  const t = useCallback(
    <K extends TranslationKey>(key: K): Dict[K] => translations[language][key],
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, ready, chosen, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
