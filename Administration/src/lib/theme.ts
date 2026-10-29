import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from './config';
import { writeStorage } from './storage';

export type Theme = 'light' | 'dark';

function current(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(current);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      writeStorage(STORAGE_KEYS.theme, next);
      return next;
    });
  }, []);

  return { theme, toggle };
}

// Couleurs des graphiques (Recharts n'hérite pas des classes Tailwind)
export function chartColors(theme: Theme) {
  return theme === 'dark'
    ? { grid: 'rgba(255,255,255,0.06)', axis: '#7C7C92', tooltipBg: '#1B1B2B', tooltipBorder: 'rgba(255,255,255,0.08)' }
    : { grid: '#EEF0F5', axis: '#8A8A9A', tooltipBg: '#FFFFFF', tooltipBorder: '#E7E7EF' };
}

