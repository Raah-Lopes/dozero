import type { ThemeDefinition } from './index';

export const daylightTheme: ThemeDefinition = {
  id: 'daylight-clean',
  name: 'Daylight (Claro)',
  description: 'Um tema claro e minimalista. Ideal para leitura prolongada, focado em alto contraste e leveza.',
  author: 'DOZERO Team',
  preview: '#f8fafc', // Light gray/white preview

  bgPrimary: '#f1f5f9', // slate-100
  bgSecondary: '#ffffff', // white
  bgTertiary: '#e2e8f0', // slate-200

  textPrimary: '#0f172a', // slate-900
  textSecondary: '#475569', // slate-600

  accentPrimary: '#4f46e5', // indigo-600
  accentHover: '#4338ca', // indigo-700
  accentGlow: 'rgba(79, 70, 229, 0.3)',

  danger: '#dc2626', // red-600
  success: '#059669', // emerald-600
  warning: '#d97706', // amber-600
  mana: '#2563eb', // blue-600

  glassBg: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassBorderHighlight: 'rgba(79, 70, 229, 0.3)',
  glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.06)',

  fontBody: "'Inter', sans-serif",
  fontDisplay: "'Outfit', sans-serif",

  gradientText: 'linear-gradient(to right, #4f46e5, #0ea5e9)',
  scrollbarThumb: '#cbd5e1', // slate-300
};
