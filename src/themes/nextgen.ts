import type { ThemeDefinition } from './index';

export const nextGenTheme: ThemeDefinition = {
  id: 'nextgen-red',
  name: 'Next-Gen Core',
  description: 'O equilíbrio perfeito entre o clássico e o tech. Tons escuros, grade cyberpunk e detalhes em vermelho e âmbar.',
  author: 'DOZERO Team',
  preview: '#dc2626',

  bgPrimary: '#09090b',
  bgSecondary: '#18181b',
  bgTertiary: '#27272a',

  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',

  accentPrimary: '#dc2626',
  accentHover: '#f59e0b',
  accentGlow: 'rgba(239, 68, 68, 0.4)',

  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  mana: '#3b82f6',

  glassBg: 'rgba(9, 9, 11, 0.85)',
  glassBorder: 'rgba(39, 39, 42, 0.5)',
  glassBorderHighlight: 'rgba(239, 68, 68, 0.3)',
  glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',

  fontBody: "'Outfit', sans-serif",
  fontDisplay: "'JetBrains Mono', monospace",

  gradientText: 'linear-gradient(to right, #ef4444, #f59e0b)',
  scrollbarThumb: '#27272a',
};
