import type { ThemeTokens } from './tokens';

// Three soft / pastel palettes. The bg.* values are intentionally separated
// enough that a teacher can see the difference between app / card / input in
// the swatch preview on the settings screen — previous pass had three near-
// whites on the light theme that read as identical.

// Soft dark — charcoal with a faint blue lift, pastel-blue accent.
export const slate: ThemeTokens = {
  name: 'slate',
  nameHe: 'כהה רך',
  mode: 'dark',
  bg: {
    app: '#15171e',
    runner: '#0f1117',
    card: '#20232d',
    input: '#2a2e3a',
    modal: '#15171e',
    subtle: '#1a1d26',
    overlay: 'rgba(0,0,0,0.55)',
  },
  border: {
    default: '#323644',
    subtle: '#1f222c',
  },
  text: {
    primary: '#e8eaf2',
    secondary: '#c2c7d4',
    muted: '#9297a7',
    faint: '#686d7d',
    onAccent: '#0f1117',
  },
  accent: {
    primary: '#88a8ef', // soft periwinkle blue, not saturated
    primaryText: '#0f1117',
    link: '#a3bdf3',
  },
  status: {
    success: '#9fd6b0',
    successStrong: '#6eb584',
    warning: '#f0cd86',
    warningBg: '#3a2e1c',
    warningText: '#f5d99a',
    danger: '#ed9b9b',
    dangerBorder: '#5c3434',
  },
  header: {
    bg: '#1a1d26',
    tint: '#e8eaf2',
  },
};

// Warm cream — off-white with peach and terracotta. No cool grays; no pure
// black text. bg.app is cream, bg.card is white (lifts above the bg), bg.input
// is visibly peach-tinted so the three backgrounds look like three things.
export const daylight: ThemeTokens = {
  name: 'daylight',
  nameHe: 'קרם בהיר',
  mode: 'light',
  bg: {
    app: '#fbf3e6',     // warm cream
    runner: '#ffffff',
    card: '#ffffff',    // white floats above cream
    input: '#f2e3c7',   // clearly peach-tinted
    modal: '#fbf3e6',
    subtle: '#f6ebd4',
    overlay: 'rgba(60,40,20,0.28)',
  },
  border: {
    default: '#d9c7a3',
    subtle: '#ebd9b8',
  },
  text: {
    primary: '#3f2f1c',  // warm dark brown
    secondary: '#6e5a3e',
    muted: '#96805f',
    faint: '#b8a582',
    onAccent: '#ffffff',
  },
  accent: {
    primary: '#c97a52', // soft terracotta
    primaryText: '#ffffff',
    link: '#a66035',
  },
  status: {
    success: '#7fa66c',      // sage
    successStrong: '#6c8f5a',
    warning: '#d49644',      // soft amber
    warningBg: '#f7e4bb',
    warningText: '#7a4f14',
    danger: '#c26a6a',       // dusty rose
    dangerBorder: '#eac4c4',
  },
  header: {
    bg: '#ffffff',
    tint: '#3f2f1c',
  },
};

// Mediterranean — softer navy (not black) with pastel sand and mint accents.
export const mediterranean: ThemeTokens = {
  name: 'mediterranean',
  nameHe: 'ים תיכוני',
  mode: 'dark',
  bg: {
    app: '#1f3954',     // softer navy
    runner: '#183049',
    card: '#2f4e70',
    input: '#3c6389',
    modal: '#1f3954',
    subtle: '#284566',
    overlay: 'rgba(8,16,28,0.5)',
  },
  border: {
    default: '#4a6e94',
    subtle: '#294768',
  },
  text: {
    primary: '#ebf0f7',
    secondary: '#c9d4e2',
    muted: '#9bafc6',
    faint: '#6e829a',
    onAccent: '#1f3954',
  },
  accent: {
    primary: '#f5c791',   // pastel sand, less saturated than the previous f5a623
    primaryText: '#1f3954',
    link: '#f5c791',
  },
  status: {
    success: '#a9dabe',       // pastel mint
    successStrong: '#85b89b',
    warning: '#f2b380',       // pastel peach
    warningBg: '#3a281a',
    warningText: '#f5c791',
    danger: '#ed9b9b',
    dangerBorder: '#5c3434',
  },
  header: {
    bg: '#183049',
    tint: '#ebf0f7',
  },
};

export const THEMES: ThemeTokens[] = [slate, daylight, mediterranean];

export function getThemeByName(name: string | null | undefined): ThemeTokens {
  if (!name) return slate;
  return THEMES.find((t) => t.name === name) ?? slate;
}
