import { CURRENCY } from './config';
import type { Decimal } from './types';

export const num = (v: Decimal | null | undefined): number => (v === null || v === undefined ? 0 : Number(v));

const moneyFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat('fr-FR');

export function money(v: Decimal | null | undefined, opts: { sign?: boolean } = {}): string {
  const n = num(v);
  const s = moneyFmt.format(Math.abs(n));
  const prefix = n < 0 ? '−' : opts.sign && n > 0 ? '+' : '';
  return `${prefix}${s} ${CURRENCY}`;
}

export const int = (v: number | null | undefined) => intFmt.format(v ?? 0);

export function compact(v: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export const date = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const dateTime = (iso?: string | null) => (iso ? dateTimeFmt.format(new Date(iso)) : '—');
export const fullDateTime = (iso?: string | null) => (iso ? fullFmt.format(new Date(iso)) : '—');

export function relative(iso?: string | null): string {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  if (Math.abs(diff) < 60) return "à l'instant";
  if (Math.abs(diff) < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (Math.abs(diff) < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  if (Math.abs(diff) < 86400 * 30) return rtf.format(-Math.round(diff / 86400), 'day');
  return date(iso);
}

export function initials(name?: string | null, fallback = '?'): string {
  if (!name) return fallback;
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback;
}

export const shortId = (id?: string | null) => (id ? id.slice(0, 8) : '—');

// Normalise une saisie libre vers le format E.164 attendu par le serveur (@IsPhoneNumber)
export function toE164(raw: string, countryCode: string): string {
  const cleaned = raw.replace(/[\s.\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  return `${countryCode}${cleaned.replace(/^0+/, '')}`;
}

// Date locale « YYYY-MM-DD » → ISO début/fin de journée pour les filtres from/to
export function dayStartIso(day: string) { return new Date(`${day}T00:00:00`).toISOString(); }
export function dayEndIso(day: string) { return new Date(`${day}T23:59:59.999`).toISOString(); }
