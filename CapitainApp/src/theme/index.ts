// ─── Design System "Prism" — Volta Capitaine ─────────────────────────────────
// Palette: Deep Violet + Electric Teal — 100% distinct from ClientApp (blue/navy)

export const C = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  primary:    '#7C3AED',   // deep violet
  primaryLt:  '#A78BFA',   // soft violet
  primaryDk:  '#5B21B6',   // darkened violet

  // ── Accent (online / success) ──────────────────────────────────────────────
  accent:     '#10D4A0',   // electric teal
  accentDk:   '#0EB88A',   // darker teal

  // ── Danger / Offline ───────────────────────────────────────────────────────
  danger:     '#FF3366',   // vivid rose-red
  dangerDk:   '#D42050',   // darker

  // ── Warning ────────────────────────────────────────────────────────────────
  warning:    '#FF9F43',
  warningDk:  '#E08A2E',

  // ── Backgrounds ────────────────────────────────────────────────────────────
  bg:         '#F8F5FF',   // barely-lavender white
  surface:    '#FFFFFF',
  surfaceAlt: '#F0ECFF',   // card hover / alt

  // ── Dark (drawer, hero) ────────────────────────────────────────────────────
  dark:       '#1A0B3B',   // deep purple-black
  darkMid:    '#2D1265',
  darkLt:     '#3D1A88',

  // ── Text ───────────────────────────────────────────────────────────────────
  text:       '#1A0B3B',
  sub:        '#7C72A8',
  muted:      '#B5ADCC',

  // ── Utility ────────────────────────────────────────────────────────────────
  border:     '#EDE8FF',
  borderLt:   '#F5F2FF',
  white:      '#FFFFFF',
};

// Gradient definitions
export const G = {
  hero:    [C.dark, C.darkMid, C.darkLt]     as const,
  primary: [C.primary, C.primaryLt]           as const,
  accent:  [C.accentDk, C.accent]             as const,
  danger:  [C.dangerDk, C.danger]             as const,
  dark:    [C.dark, C.darkMid]                as const,
  card:    [C.primaryLt, C.primary, C.darkLt] as const,
};

// Shadow presets (colored — premium feel)
export const SH = {
  sm: {
    shadowColor:   C.primary,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius:  8,
    elevation:     3,
  },
  md: {
    shadowColor:   C.primary,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius:  16,
    elevation:     6,
  },
  lg: {
    shadowColor:   C.primary,
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius:  24,
    elevation:     12,
  },
  dark: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius:  20,
    elevation:     14,
  },
  green: {
    shadowColor:   C.accent,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  16,
    elevation:     8,
  },
  red: {
    shadowColor:   C.danger,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius:  16,
    elevation:     8,
  },
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  pill: 999,
};
