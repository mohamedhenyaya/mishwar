import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { CarFront, CornerDownLeft, Loader2, Search, ShieldCheck, User as UserIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useDebounced } from '@/lib/hooks';
import type { Driver, Paginated, User } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { NAV } from './nav';

interface Result {
  key: string;
  to: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tag?: React.ReactNode;
}

// Recherche globale (Ctrl+K) : comptes clients, capitaines, admins et pages du back-office
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useDebounced(query.trim(), 250);
  const enabled = open && search.length >= 2;

  useEffect(() => {
    if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [open]);

  const users = useQuery({
    queryKey: ['palette', 'users', search],
    queryFn: async () => (await api.get<Paginated<User>>('/admin/users', { params: { search, limit: 6 } })).data,
    enabled,
  });
  const drivers = useQuery({
    queryKey: ['palette', 'drivers', search],
    queryFn: async () => (await api.get<Paginated<Driver>>('/admin/drivers', { params: { search, limit: 6 } })).data,
    enabled,
  });

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const pages: Result[] = NAV.flatMap((g) => g.items)
      .filter((i) => !q || i.label.toLowerCase().includes(q))
      .slice(0, q ? 4 : 6)
      .map((i) => ({
        key: `page:${i.to}`, to: i.to, title: i.label, subtitle: 'Page',
        icon: <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5"><i.icon className="h-4 w-4" /></span>,
      }));
    if (!enabled) return pages;

    const people: Result[] = [
      ...(drivers.data?.data ?? []).map((d) => ({
        key: `driver:${d.id}`, to: `/capitaines/${d.id}`, title: d.name || 'Sans nom',
        subtitle: [d.phone, d.vehiclePlate].filter(Boolean).join(' · '),
        icon: <Avatar name={d.name} photoUrl={d.photoUrl} seed={d.id} size={32} />,
        tag: <Badge tone="blue"><CarFront className="h-3 w-3" /> Capitaine</Badge>,
      })),
      ...(users.data?.data ?? []).map((u) => ({
        key: `user:${u.id}`, to: `/clients/${u.id}`, title: u.name || 'Sans nom', subtitle: u.phone,
        icon: <Avatar name={u.name} photoUrl={u.photoUrl} seed={u.id} size={32} />,
        tag: u.role === 'admin'
          ? <Badge tone="violet"><ShieldCheck className="h-3 w-3" /> Admin</Badge>
          : <Badge><UserIcon className="h-3 w-3" /> Client</Badge>,
      })),
    ];
    return [...people, ...pages];
  }, [query, enabled, users.data, drivers.data]);

  useEffect(() => setActive(0), [results.length]);

  if (!open) return null;

  const go = (r: Result) => { navigate(r.to); onClose(); };
  const loading = enabled && (users.isFetching || drivers.isFetching);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-ink-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-pop-in overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-slate-200 dark:bg-[#17172A] dark:ring-white/10">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-white/[0.06]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Search className="h-4 w-4 text-slate-400" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === 'Enter' && results[active]) go(results[active]);
            }}
            placeholder="Nom, téléphone, plaque d'immatriculation, page…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-white/10">Échap</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-slate-500">
              {enabled && !loading ? 'Aucun compte ne correspond.' : 'Tapez au moins 2 caractères.'}
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.key}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={clsx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left', i === active && 'bg-slate-100 dark:bg-white/[0.06]')}
              >
                {r.icon}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-slate-500">{r.subtitle}</span>
                </span>
                {r.tag}
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
