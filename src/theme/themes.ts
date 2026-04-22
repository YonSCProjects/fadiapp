import type { ThemeTokens } from './tokens';

// Current dark scheme preserved as the default. Matches every hex literal
// that was inline across the app before the theming refactor.
export const slate: ThemeTokens = {
  name: 'slate',
  nameHe: 'כהה',
  mode: 'dark',
  bg: {
    app: '#0f0f10',
    runner: '#0a0a10',
    card: '#1a1a20',
    input: '#23232a',
    modal: '#0f0f10',
    subtle: '#16161c',
    overlay: 'rgba(0,0,0,0.6)',
  },
  border: {
    default: '#2a2a32',
    subtle: '#1a1a20',
  },
  text: {
    primary: '#f5f5f5',
    secondary: '#c0c0c8',
    muted: '#a0a0a8',
    faint: '#6a6a72',
    onAccent: '#ffffff',
  },
  accent: {
    primary: '#3b82f6',
    primaryText: '#ffffff',
    link: '#3b82f6',
  },
  status: {
    success: '#86efac',
    successStrong: '#16a34a',
    warning: '#fbbf24',
    warningBg: '#3a2a18',
    warningText: '#f5d094',
    danger: '#ff8a8a',
    dangerBorder: '#4a1a1a',
  },
  header: {
    bg: '#1a1a1a',
    tint: '#f5f5f5',
  },
};

// Classic light — professional, high readability indoors.
export const daylight: ThemeTokens = {
  name: 'daylight',
  nameHe: 'בהיר',
  mode: 'light',
  bg: {
    app: '#fafafa',
    runner: '#ffffff',
    card: '#ffffff',
    input: '#f0f0f3',
    modal: '#fafafa',
    subtle: '#f4f4f5',
    overlay: 'rgba(0,0,0,0.35)',
  },
  border: {
    default: '#d6d6da',
    subtle: '#ececf0',
  },
  text: {
    primary: '#18181b',
    secondary: '#3f3f46',
    muted: '#6a6a72',
    faint: '#9a9aa2',
    onAccent: '#ffffff',
  },
  accent: {
    primary: '#2563eb',
    primaryText: '#ffffff',
    link: '#1d4ed8',
  },
  status: {
    success: '#16a34a',
    successStrong: '#15803d',
    warning: '#d97706',
    warningBg: '#fef3c7',
    warningText: '#92400e',
    danger: '#dc2626',
    dangerBorder: '#fecaca',
  },
  header: {
    bg: '#ffffff',
    tint: '#18181b',
  },
};

// Mediterranean — evokes Israeli coast. Deep navy with warm sand accents.
export const mediterranean: ThemeTokens = {
  name: 'mediterranean',
  nameHe: 'ים תיכוני',
  mode: 'dark',
  bg: {
    app: '#0b1e33',
    runner: '#081423',
    card: '#132e4b',
    input: '#1c3f63',
    modal: '#0b1e33',
    subtle: '#0f263f',
    overlay: 'rgba(0,0,0,0.5)',
  },
  border: {
    default: '#234a73',
    subtle: '#133050',
  },
  text: {
    primary: '#eef3fa',
    secondary: '#c3d0e1',
    muted: '#8ca1bd',
    faint: '#5e7899',
    onAccent: '#0b1e33',
  },
  accent: {
    primary: '#f5a623', // warm sand against navy
    primaryText: '#0b1e33',
    link: '#f5a623',
  },
  status: {
    success: '#4ade80',
    successStrong: '#22c55e',
    warning: '#fb923c',
    warningBg: '#3a2614',
    warningText: '#fdba74',
    danger: '#f87171',
    dangerBorder: '#7f1d1d',
  },
  header: {
    bg: '#081423',
    tint: '#eef3fa',
  },
};

export const THEMES: ThemeTokens[] = [slate, daylight, mediterranean];

export function getThemeByName(name: string | null | undefined): ThemeTokens {
  if (!name) return slate;
  return THEMES.find((t) => t.name === name) ?? slate;
}
