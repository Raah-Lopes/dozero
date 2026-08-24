import type { ThemeDefinition } from './index';

// ─── Tormenta 20 Theme ───────────────────────────────────────────────────────
// Inspirado no universo de Arton: Rubro vivo, Dourado de Deheon e acabamento heroico.
export const tormentaTheme: ThemeDefinition = {
  id: 'tormenta-20',
  name: 'Tormenta 20',
  description: 'O épico mundo de Arton. Vermelho Rubro tempestuoso e dourado majestoso de Valkaria.',
  author: 'DOZERO Community',
  preview: '#dc2626',

  bgPrimary: '#0f0505',
  bgSecondary: '#1c0b0b',
  bgTertiary: '#2e1212',

  textPrimary: '#fef2f2',
  textSecondary: '#fca5a5',

  accentPrimary: '#e11d48',     // Rubro tempestade
  accentHover: '#f43f5e',
  accentGlow: 'rgba(225, 29, 72, 0.55)',

  danger: '#ef4444',
  success: '#22c55e',
  warning: '#eab308',           // Ouro nobre
  mana: '#3b82f6',

  glassBg: 'rgba(28, 11, 11, 0.85)',
  glassBorder: 'rgba(225, 29, 72, 0.25)',
  glassBorderHighlight: 'rgba(234, 179, 8, 0.5)',
  glassShadow: '0 8px 32px 0 rgba(225, 29, 72, 0.25)',

  fontBody: "'Cinzel', serif",
  fontDisplay: "'Cinzel Decorative', serif",

  gradientText: 'linear-gradient(135deg, #f43f5e 0%, #eab308 100%)',
  scrollbarThumb: '#3f1717',
};
