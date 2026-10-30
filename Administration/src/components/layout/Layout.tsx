import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { LogOut, Menu, Moon, Search, Sun, UserCog, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAdminRealtime } from '@/lib/realtime';
import { useTheme } from '@/lib/theme';
import type { Overview } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown, MenuItem } from '@/components/accounts/AccountActions';
import { NAV } from './nav';
import { CommandPalette } from './CommandPalette';

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: async () => (await api.get<Overview>('/admin/dashboard/overview')).data,
    refetchInterval: 60_000, // filet de sécurité : le temps réel (useAdminRealtime) rafraîchit aussitôt
  });
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/30">
        <svg viewBox="0 0 64 64" className="h-5 w-5"><path d="M14 46V18l18 16 18-16v28" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div className="leading-tight">
        <p className="text-[15px] font-semibold text-white">Mishwar</p>
        <p className="text-[11px] text-white/50">Administration</p>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: overview } = useOverview();
  return (
    <nav className="flex h-full flex-col bg-ink px-3 py-5">
      <Logo />
      <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">{group.section}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const count = overview && item.badge ? item.badge(overview) : 0;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onNavigate}
                      className={({ isActive }) => clsx(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                        isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/[0.05] hover:text-white',
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={clsx('h-[18px] w-[18px]', isActive ? 'text-accent-300' : 'text-white/45 group-hover:text-white/80')} />
                          <span className="flex-1">{item.label}</span>
                          {count > 0 && (
                            <span className="rounded-full bg-accent-500 px-1.5 py-px text-[10px] font-semibold text-white">{count > 99 ? '99+' : count}</span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function Layout() {
  const { me, logout } = useAuth();
  useAdminRealtime();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"><Sidebar /></aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-pop-in">
            <button className="absolute right-3 top-5 z-10 rounded-lg p-1.5 text-white/60 hover:bg-white/10" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6 dark:border-white/[0.06] dark:bg-[#0B0B16]/80">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-white/5" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-10 flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 transition hover:border-slate-300 sm:max-w-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 truncate text-left">Rechercher un client, un capitaine…</span>
            <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-500 sm:block dark:border-white/10 dark:bg-white/5">Ctrl K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button onClick={toggle} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5" aria-label="Changer de thème">
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <Dropdown trigger={
              <button className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 hover:bg-slate-100 dark:hover:bg-white/5">
                <Avatar name={me?.name} photoUrl={me?.photoUrl} seed={me?.id} size={30} />
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-medium">{me?.name || 'Administrateur'}</span>
                  <span className="block text-[11px] text-slate-500">{me?.phone}</span>
                </span>
              </button>
            }>
              {(close) => (
                <>
                  <MenuItem icon={<UserCog />} onClick={() => { close(); navigate('/compte'); }}>Mon compte</MenuItem>
                  <MenuItem icon={<LogOut />} danger onClick={() => { close(); logout(); }}>Se déconnecter</MenuItem>
                </>
              )}
            </Dropdown>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
