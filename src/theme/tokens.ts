// Semantic design tokens. Every screen references these by name; each theme
// maps them to concrete hex values. To add a new theme, implement the full
// ThemeTokens interface in src/theme/themes.ts.

export type ThemeTokens = {
  name: string;
  nameHe: string;
  mode: 'dark' | 'light';

  bg: {
    app: string;        // main screen background
    runner: string;     // runner screen (slightly darker for glare readability)
    card: string;       // card / section background
    input: string;      // text input background
    modal: string;      // full-screen modal background
    subtle: string;     // slightly elevated container background
    overlay: string;    // rgba backdrop for modals/sheets
  };

  border: {
    default: string;
    subtle: string;
  };

  text: {
    primary: string;    // main body text
    secondary: string;  // supporting body text
    muted: string;      // labels, metadata
    faint: string;      // placeholders, timestamps
    onAccent: string;   // text over accent bg (e.g. on a blue button)
  };

  accent: {
    primary: string;        // CTA buttons, selected chip bg
    primaryText: string;    // text colour over primary (usually white)
    link: string;           // inline tappable text
  };

  status: {
    success: string;        // block cues, "ok" markers
    successStrong: string;  // big "start" button background
    warning: string;        // safety notes, amber
    warningBg: string;      // warn banner bg
    warningText: string;    // warn banner text
    danger: string;         // destructive text/border
    dangerBorder: string;   // destructive button border
  };

  header: {
    bg: string;
    tint: string;
  };
};
