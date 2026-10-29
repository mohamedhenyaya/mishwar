import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Champ de recherche à saisie libre, synchronisé (avec délai) vers un filtre d'URL
export function useSearchInput(urlValue: string, commit: (value: string) => void) {
  const [input, setInput] = useState(urlValue);
  const debounced = useDebounced(input, 300);
  useEffect(() => {
    if (debounced.trim() !== urlValue) commit(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return [input, setInput] as const;
}

// Filtres de liste persistés dans l'URL : partageables, et conservés au retour arrière
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();

  const values = Object.fromEntries(
    Object.keys(defaults).map((k) => [k, params.get(k) ?? defaults[k]]),
  ) as T;
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);

  const set = (patch: Partial<T> & { page?: number }) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'page') continue;
      if (v === undefined || v === '' || v === defaults[k]) next.delete(k);
      else next.set(k, String(v));
    }
    // Toute modification de filtre ramène à la page 1
    const newPage = patch.page ?? 1;
    if (newPage > 1) next.set('page', String(newPage));
    else next.delete('page');
    setParams(next, { replace: true });
  };

  return { values, page, set };
}
