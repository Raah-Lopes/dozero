import type { ThemeDefinition } from './index';

export const daylightTheme: ThemeDefinition = {
  id: 'daylight-clean',
  name: 'Daylight (Claro)',
  description: 'Um tema claro e minimalista. Ideal para leitura prolongada, focado em alto contraste e leveza.',
  author: 'DOZERO Team',
  preview: '#f8fafc', // Light gray/white preview

  bgPrimary: '#e2e8f0', // slate-200 (fundo mais distinto das janelas)
  bgSecondary: '#ffffff', // white
  bgTertiary: '#cbd5e1', // slate-300

  textPrimary: '#000000', // pure black
  textSecondary: '#334155', // slate-700

  accentPrimary: '#1d4ed8', // blue-700
  accentHover: '#1e3a8a', // blue-900
  accentGlow: 'rgba(29, 78, 216, 0.3)',

  danger: '#b91c1c', // red-700
  success: '#047857', // emerald-700
  warning: '#b45309', // amber-700
  mana: '#1d4ed8', // blue-700

  glassBg: 'rgba(255, 255, 255, 0.95)', // quase sólido para destacar do fundo
  glassBorder: 'rgba(0, 0, 0, 0.4)', // bordas mais visíveis e escuras
  glassBorderHighlight: 'rgba(0, 0, 0, 0.8)',
  glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)', // sombra ligeiramente mais forte

  fontBody: "'Inter', sans-serif",
  fontDisplay: "'Outfit', sans-serif",

  gradientText: 'linear-gradient(to right, #4f46e5, #0ea5e9)',
  scrollbarThumb: '#cbd5e1', // slate-300
};
