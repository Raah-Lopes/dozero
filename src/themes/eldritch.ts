import type { ThemeDefinition } from './index';

// ─── Eldritch Horror ──────────────────────────────────────────────────────────
// Inspired by Lovecraftian cosmic horror, gothic investigations, and cursed ruins.
// Palette: near-black mossy greens as backgrounds, deep blood-red accent,
// rusted amber highlights, and antique serif typography.

export const eldritchTheme: ThemeDefinition = {
  id: 'eldritch-horror',
  name: 'Eldritch Horror',
  description: 'Horror cósmico lovecraftiano. Vermelho sangue, verde podre e segredos proibidos.',
  author: 'DOZERO Team',
  preview: '#b91c1c',

  // Dark mossed-stone blacks and greens
  bgPrimary: '#040906',
  bgSecondary: '#0c1410',
  bgTertiary: '#162118',

  textPrimary: '#e8e0d4',       // parchment white
  textSecondary: '#8a9e89',     // mossy muted green

  accentPrimary: '#b91c1c',     // blood red
  accentHover: '#991b1b',       // deeper crimson
  accentGlow: 'rgba(185, 28, 28, 0.5)',

  danger: '#dc2626',
  success: '#4d7c4d',           // sickly dark green
  warning: '#b45309',           // rust amber
  mana: '#1d4ed8',

  // Glassmorphism with a dark mossy tint
  glassBg: 'rgba(12, 20, 16, 0.75)',
  glassBorder: 'rgba(180, 83, 9, 0.12)',       // amber-tinted border
  glassBorderHighlight: 'rgba(185, 28, 28, 0.4)',
  glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.7)',

  // Crimson Text: a gothic serif available on Google Fonts
  fontBody: "'Crimson Text', serif",
  fontDisplay: "'Cinzel', serif",

  gradientText: 'linear-gradient(to right, #b91c1c, #b45309)',
  scrollbarThumb: '#162118',
};
