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

// Soft forest — nature palette, dark mode. Muted greens + sage accent.
export const forest: ThemeTokens = {
  name: 'forest',
  nameHe: 'יער',
  mode: 'dark',
  bg: {
    app: '#1a2821',
    runner: '#121a15',
    card: '#253a31',
    input: '#2f4a3d',
    modal: '#1a2821',
    subtle: '#1f3128',
    overlay: 'rgba(0,8,4,0.55)',
  },
  border: {
    default: '#3b5546',
    subtle: '#223328',
  },
  text: {
    primary: '#eaf2ec',
    secondary: '#c8d6cc',
    muted: '#97a89d',
    faint: '#6a7c70',
    onAccent: '#121a15',
  },
  accent: {
    primary: '#a5cfa2',     // sage
    primaryText: '#121a15',
    link: '#c2e0bf',
  },
  status: {
    success: '#a5cfa2',
    successStrong: '#7bb17a',
    warning: '#e8c583',
    warningBg: '#36301c',
    warningText: '#f0d89b',
    danger: '#e69b94',
    dangerBorder: '#5a3330',
  },
  header: {
    bg: '#1f3128',
    tint: '#eaf2ec',
  },
};

// Lavender — light mode, dusty purple. Different personality from Daylight's
// warm cream; cooler and calmer.
export const lavender: ThemeTokens = {
  name: 'lavender',
  nameHe: 'לבנדר',
  mode: 'light',
  bg: {
    app: '#f3eef8',        // lavender mist
    runner: '#ffffff',
    card: '#ffffff',
    input: '#e3d7ef',       // dustier lavender
    modal: '#f3eef8',
    subtle: '#ebe3f3',
    overlay: 'rgba(50,35,65,0.28)',
  },
  border: {
    default: '#cbb9dc',
    subtle: '#ddcde9',
  },
  text: {
    primary: '#2e1f40',     // deep plum-brown
    secondary: '#5a4770',
    muted: '#8c7aa0',
    faint: '#b3a5c0',
    onAccent: '#ffffff',
  },
  accent: {
    primary: '#9575b8',     // warm purple
    primaryText: '#ffffff',
    link: '#7859a0',
  },
  status: {
    success: '#7ea580',
    successStrong: '#6a8d6b',
    warning: '#c48a52',
    warningBg: '#f3dfc0',
    warningText: '#7d521f',
    danger: '#b86a78',
    dangerBorder: '#e5c3c9',
  },
  header: {
    bg: '#ffffff',
    tint: '#2e1f40',
  },
};

// Sunset — warm dusk palette, dark mode. Plum background + peach accent.
export const sunset: ThemeTokens = {
  name: 'sunset',
  nameHe: 'שקיעה',
  mode: 'dark',
  bg: {
    app: '#2b1d2c',        // deep plum
    runner: '#1d1320',
    card: '#3d2a3e',
    input: '#4d3850',
    modal: '#2b1d2c',
    subtle: '#322334',
    overlay: 'rgba(20,8,20,0.55)',
  },
  border: {
    default: '#5a4258',
    subtle: '#382a3a',
  },
  text: {
    primary: '#f7e7ea',
    secondary: '#d9c6d0',
    muted: '#a69099',
    faint: '#735e6a',
    onAccent: '#2b1d2c',
  },
  accent: {
    primary: '#f5a68b',     // peach
    primaryText: '#2b1d2c',
    link: '#f5a68b',
  },
  status: {
    success: '#b9d4a6',
    successStrong: '#8db379',
    warning: '#f0c278',
    warningBg: '#3a2a18',
    warningText: '#f5d094',
    danger: '#ed9b9b',
    dangerBorder: '#5a3434',
  },
  header: {
    bg: '#1d1320',
    tint: '#f7e7ea',
  },
};

export const THEMES: ThemeTokens[] = [slate, daylight, mediterranean, forest, lavender, sunset];

export function getThemeByName(name: string | null | undefined): ThemeTokens {
  if (!name) return slate;
  return THEMES.find((t) => t.name === name) ?? slate;
}
