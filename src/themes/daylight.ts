import type { ThemeDefinition } from './index';

export const daylightTheme: ThemeDefinition = {
  id: 'daylight-clean',
  name: 'Daylight (Claro)',
  description: 'Um tema claro, limpo e moderno. Focado em alta nitidez, superfícies sólidas e contraste impecável.',
  author: 'DOZERO Team',
  preview: '#ffffff',

  bgPrimary: '#f1f5f9', // slate-100 base
  bgSecondary: '#ffffff', // white surfaces
  bgTertiary: '#e2e8f0', // slate-200 headers & cards

  textPrimary: '#0f172a', // slate-900 (ultra crisp 17:1 contrast)
  textSecondary: '#334155', // slate-700 (solid 9:1 contrast)

  accentPrimary: '#1d4ed8', // blue-700 vibrant royal blue
  accentHover: '#1e40af', // blue-800
  accentGlow: 'rgba(29, 78, 216, 0.2)',

  danger: '#b91c1c', // red-700
  success: '#15803d', // green-700
  warning: '#b45309', // amber-700
  mana: '#1d4ed8', // blue-700

  glassBg: 'rgba(255, 255, 255, 0.98)', // Superfície sólida e limpa
  glassBorder: '#cbd5e1', // slate-300 borda nítida
  glassBorderHighlight: '#1d4ed8',
  glassShadow: '0 10px 30px 0 rgba(15, 23, 42, 0.12)',

  fontBody: "'Inter', sans-serif",
  fontDisplay: "'Outfit', sans-serif",

  gradientText: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
  scrollbarThumb: '#94a3b8',
};
