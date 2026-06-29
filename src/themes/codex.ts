import type { ThemeDefinition } from './index';

// ─── Ancient Codex ────────────────────────────────────────────────────────────
// Inspired by illuminated manuscripts, antique maps, and high fantasy tomes.
// Palette: deep sepia browns as backgrounds, aged gold accent, warm cream text,
// with Cinzel display font (already loaded in project) for a medieval-epic feel.

export const codexTheme: ThemeDefinition = {
  id: 'ancient-codex',
  name: 'Ancient Codex',
  description: 'Manuscritos medievais e mapas antigos. Ouro envelhecido e sépia profundo.',
  author: 'DOZERO Team',
  preview: '#d4af37',

  // Deep sepia, parchment-dark backgrounds
  bgPrimary: '#100a03',
  bgSecondary: '#1a1006',
  bgTertiary: '#261709',

  textPrimary: '#f0e6cc',       // warm cream parchment
  textSecondary: '#a8916c',     // aged leather muted text

  accentPrimary: '#d4af37',     // antique gold
  accentHover: '#b8952a',       // deeper burnished gold
  accentGlow: 'rgba(212, 175, 55, 0.45)',

  danger: '#c0392b',            // dark vermillion
  success: '#4a7c59',           // forest green
  warning: '#c97c1a',           // amber orange
  mana: '#2e6da4',              // lapis lazuli blue

  // Glassmorphism with warm sepia tint
  glassBg: 'rgba(26, 16, 6, 0.78)',
  glassBorder: 'rgba(212, 175, 55, 0.14)',      // gold-tinted border
  glassBorderHighlight: 'rgba(212, 175, 55, 0.45)',
  glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.65)',

  // Cinzel is already loaded via Google Fonts in index.css
  fontBody: "'Crimson Text', serif",
  fontDisplay: "'Cinzel', serif",

  gradientText: 'linear-gradient(to right, #d4af37, #c0873a)',
  scrollbarThumb: '#261709',
};
