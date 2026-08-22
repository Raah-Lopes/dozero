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

  textPrimary: '#0f172a', // slate-900 (legibilidade excelente)
  textSecondary: '#475569', // slate-600

  accentPrimary: '#2563eb', // blue-600
  accentHover: '#1d4ed8', // blue-700
  accentGlow: 'rgba(37, 99, 235, 0.25)',

  danger: '#dc2626', // red-600
  success: '#16a34a', // emerald-600
  warning: '#d97706', // amber-600
  mana: '#2563eb', // blue-600

  glassBg: 'rgba(255, 255, 255, 0.95)', // superfície sólida, limpa e de alto contraste
  glassBorder: 'rgba(0, 0, 0, 0.12)', // sutil e limpo
  glassBorderHighlight: 'rgba(37, 99, 235, 0.4)',
  glassShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.08)', // sombra suave minimalista

  fontBody: "'Inter', sans-serif",
  fontDisplay: "'Outfit', sans-serif",

  gradientText: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
  scrollbarThumb: '#cbd5e1', // slate-300
};
