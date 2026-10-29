import { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeTone = 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'violet';

const tones: Record<BadgeTone, string> = {
  gray: 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  blue: 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
};

const dots: Record<BadgeTone, string> = {
  gray: 'bg-slate-400', green: 'bg-emerald-500', red: 'bg-red-500',
  amber: 'bg-amber-500', blue: 'bg-accent-500', violet: 'bg-violet-500',
};

export function Badge({ tone = 'gray', dot, children, className }: {
  tone?: BadgeTone; dot?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}>
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', dots[tone])} />}
      {children}
    </span>
  );
}

// Badge piloté par un dictionnaire de libellés (lib/labels.ts)
export function StatusBadge({ map, value, dot = true }: {
  map: Record<string, { label: string; tone: BadgeTone }>; value: string | null | undefined; dot?: boolean;
}) {
  if (!value) return null;
  const entry = map[value] ?? { label: value, tone: 'gray' as BadgeTone };
  return <Badge tone={entry.tone} dot={dot}>{entry.label}</Badge>;
}
