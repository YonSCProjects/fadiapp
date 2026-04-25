import type { ThemeTokens } from './tokens';

// Six soft / pastel palettes (slate, daylight, mediterranean, forest,
// lavender, sunset) plus three vivid / saturated palettes (neon, citrus,
// royal). The bg.* values are intentionally separated enough that a teacher
// can see the difference between app / card / input in the swatch preview on
// the settings screen.

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

// === Vivid palettes ========================================================
// High-saturation alternatives for teachers who want a louder UI than the
// pastels above. Built to keep AA contrast for body text.

// Neon — near-black canvas with electric cyan accent. Cyberpunk feel.
export const neon: ThemeTokens = {
  name: 'neon',
  nameHe: 'ניאון',
  mode: 'dark',
  bg: {
    app: '#0a0e14',
    runner: '#06090d',
    card: '#161b25',
    input: '#1f2632',
    modal: '#0a0e14',
    subtle: '#11151c',
    overlay: 'rgba(0,0,0,0.6)',
  },
  border: {
    default: '#3d4960',
    subtle: '#1f2632',
  },
  text: {
    primary: '#e0f7ff',
    secondary: '#a8d4e8',
    muted: '#7a98ad',
    faint: '#4d6473',
    onAccent: '#0a0e14',
  },
  accent: {
    primary: '#00e5ff',     // electric cyan
    primaryText: '#0a0e14',
    link: '#4dd2ff',
  },
  status: {
    success: '#00ff88',
    successStrong: '#00cc6a',
    warning: '#ffd60a',
    warningBg: '#3a3010',
    warningText: '#ffe066',
    danger: '#ff3b6b',
    dangerBorder: '#5c1a2d',
  },
  header: {
    bg: '#11151c',
    tint: '#e0f7ff',
  },
};

// Citrus — vivid orange on warm white. Energetic, daytime-loud.
export const citrus: ThemeTokens = {
  name: 'citrus',
  nameHe: 'הדרים',
  mode: 'light',
  bg: {
    app: '#fff8e7',
    runner: '#ffffff',
    card: '#ffffff',
    input: '#fde9bb',
    modal: '#fff8e7',
    subtle: '#fff0c9',
    overlay: 'rgba(80,40,10,0.3)',
  },
  border: {
    default: '#e3b56b',
    subtle: '#f0d7a3',
  },
  text: {
    primary: '#2d1810',
    secondary: '#5c3818',
    muted: '#8a6841',
    faint: '#b89c7a',
    onAccent: '#ffffff',
  },
  accent: {
    primary: '#ff6b35',     // vivid orange
    primaryText: '#ffffff',
    link: '#d94f1a',
  },
  status: {
    success: '#5fb83d',
    successStrong: '#3d9920',
    warning: '#ffaa00',
    warningBg: '#fff0c9',
    warningText: '#7a4a00',
    danger: '#e63946',
    dangerBorder: '#f7c4c8',
  },
  header: {
    bg: '#ffffff',
    tint: '#2d1810',
  },
};

// Royal Crimson — deep aubergine with saturated magenta + gold. Bold and
// rich, leans regal rather than playful.
export const royal: ThemeTokens = {
  name: 'royal',
  nameHe: 'ארגמן',
  mode: 'dark',
  bg: {
    app: '#1a0d2e',
    runner: '#0f0820',
    card: '#2d1a4a',
    input: '#3a2257',
    modal: '#1a0d2e',
    subtle: '#221037',
    overlay: 'rgba(10,5,20,0.6)',
  },
  border: {
    default: '#5a3a7a',
    subtle: '#2d1a4a',
  },
  text: {
    primary: '#f5e9ff',
    secondary: '#d4c0e8',
    muted: '#a692b8',
    faint: '#6d5a82',
    onAccent: '#1a0d2e',
  },
  accent: {
    primary: '#d946ef',     // saturated magenta
    primaryText: '#ffffff',
    link: '#e879f9',
  },
  status: {
    success: '#10e070',     // emerald
    successStrong: '#0fb058',
    warning: '#fbbf24',     // gold
    warningBg: '#3a2d10',
    warningText: '#fde68a',
    danger: '#f43f5e',
    dangerBorder: '#5c1828',
  },
  header: {
    bg: '#0f0820',
    tint: '#f5e9ff',
  },
};

// Tropical — neutral dark canvas where vivid orange (primary buttons) and
// turquoise (input fields, links) both show off. The settings-screen
// swatch preview lands on bg / card / input / primary / text, so input is
// turquoise-tinted to make sure both signature colors appear in the chip.
export const tropical: ThemeTokens = {
  name: 'tropical',
  nameHe: 'טרופי',
  mode: 'dark',
  bg: {
    app: '#16191f',
    runner: '#0e1115',
    card: '#1f242d',
    input: '#1a3a48',         // light-blue-tinted, visible in the swatch row
    modal: '#16191f',
    subtle: '#1a1d23',
    overlay: 'rgba(0,4,8,0.6)',
  },
  border: {
    default: '#3a4250',
    subtle: '#252a35',
  },
  text: {
    primary: '#f0f3f7',
    secondary: '#c2c8d2',
    muted: '#8a9099',
    faint: '#5a6068',
    onAccent: '#1a0f08',
  },
  accent: {
    primary: '#ff8c42',       // vivid orange — primary buttons + swatch
    primaryText: '#1a0f08',
    link: '#1ee5ff',          // vivid pure cyan, near #00ffff
  },
  status: {
    success: '#26d9b0',
    successStrong: '#1aa68a',
    warning: '#ffb84d',
    warningBg: '#3a2c10',
    warningText: '#ffd07d',
    danger: '#ff4757',
    dangerBorder: '#5c1a22',
  },
  header: {
    bg: '#1a3a48',            // light-blue band along the top
    tint: '#f0f3f7',
  },
};

export const THEMES: ThemeTokens[] = [
  slate,
  daylight,
  mediterranean,
  forest,
  lavender,
  sunset,
  neon,
  citrus,
  royal,
  tropical,
];

export function getThemeByName(name: string | null | undefined): ThemeTokens {
  if (!name) return slate;
  return THEMES.find((t) => t.name === name) ?? slate;
}
