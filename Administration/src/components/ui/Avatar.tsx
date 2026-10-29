import { useState } from 'react';
import clsx from 'clsx';
import { mediaUrl } from '@/lib/config';
import { initials } from '@/lib/format';

const palette = [
  'bg-accent-100 text-accent-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, photoUrl, seed, size = 36, className }: {
  name?: string | null; photoUrl?: string | null; seed?: string; size?: number; className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = mediaUrl(photoUrl);
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.36) };

  if (src && !broken) {
    return (
      <img src={src} alt="" style={style} onError={() => setBroken(true)}
        className={clsx('shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-[#13131F]', className)} />
    );
  }
  return (
    <span style={style} className={clsx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
      palette[hash(seed ?? name ?? '?') % palette.length], className)}>
      {initials(name)}
    </span>
  );
}
