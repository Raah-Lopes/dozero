// ─── Theme Definition Interface ───────────────────────────────────────────────
// Each theme maps 1-to-1 with the CSS custom properties defined in index.css.
// To create a community theme, implement this interface and register it below.

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  author: string;
  /** A representative accent hex color for the preview swatch */
  preview: string;

  // ── Core backgrounds ──
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;

  // ── Text ──
  textPrimary: string;
  textSecondary: string;

  // ── Accent ──
  accentPrimary: string;
  accentHover: string;
  accentGlow: string;

  // ── Status ──
  danger: string;
  success: string;
  warning: string;
  mana: string;

  // ── Glassmorphism ──
  glassBg: string;
  glassBorder: string;
  glassBorderHighlight: string;
  glassShadow: string;

  // ── Typography (Google Fonts names) ──
  fontBody: string;
  fontDisplay: string;

  // ── Text gradient (CSS gradient string) ──
  gradientText: string;

  // ── Scrollbar thumb colour ──
  scrollbarThumb: string;
}

// ─── Theme Registry ───────────────────────────────────────────────────────────
// Import and register new themes here. Order determines display order in picker.

import { defaultTheme } from './default';
import { eldritchTheme } from './eldritch';
import { codexTheme } from './codex';

export const THEMES: ThemeDefinition[] = [
  defaultTheme,
  eldritchTheme,
  codexTheme,
];

export const DEFAULT_THEME_ID = 'purple-void';
