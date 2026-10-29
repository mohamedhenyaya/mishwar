import { ReactNode } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function PageHeader({ title, description, actions, back }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { to: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, actions, children, className, bodyClassName }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-white/[0.06]">
          <h3 className="text-sm font-semibold">{title}</h3>
          {actions}
        </div>
      )}
      <div className={clsx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon, tone = 'blue', to }: {
  label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'violet' | 'red' | 'slate'; to?: string;
}) {
  const tones = {
    blue: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300',
  };
  const body = (
    <div className="card flex h-full items-start gap-4 p-5 transition hover:border-slate-300 dark:hover:border-white/15">
      <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('h-5 w-5 animate-spin text-slate-400', className)} />;
}

export function PageLoader() {
  return <div className="flex h-64 items-center justify-center"><Spinner className="h-6 w-6" /></div>;
}

export function Tabs<T extends string>({ value, onChange, tabs }: {
  value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode; count?: number }[];
}) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-white/[0.04]">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={clsx(
            'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition',
            value === t.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white',
          )}
        >
          {t.label}
          {!!t.count && (
            <span className="rounded-full bg-accent-500 px-1.5 text-[10px] font-semibold leading-4 text-white">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function DefinitionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-slate-100 text-sm dark:divide-white/[0.06]">
      {items.map((it) => (
        <div key={it.label} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-slate-500 dark:text-slate-400">{it.label}</dt>
          <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}
