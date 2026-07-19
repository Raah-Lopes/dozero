import type { ThemeDefinition } from './index';

export const nextGenTheme: ThemeDefinition = {
  id: 'nextgen-red',
  name: 'Next-Gen Core',
  description: 'O equilíbrio perfeito entre o clássico e o tech. Tons escuros, grade cyberpunk e detalhes em vermelho e âmbar.',
  author: 'DOZERO Team',
  preview: '#dc2626',

  bgPrimary: '#050505',
  bgSecondary: '#0a0a0a',
  bgTertiary: '#171717',

  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',

  accentPrimary: '#ef4444',
  accentHover: '#f59e0b',
  accentGlow: 'rgba(239, 68, 68, 0.6)',

  danger: '#ef4444',
  success: '#10b981',
  warning: '#fbbf24',
  mana: '#3b82f6',

  glassBg: 'rgba(5, 5, 5, 0.85)',
  glassBorder: 'rgba(239, 68, 68, 0.25)',
  glassBorderHighlight: 'rgba(239, 68, 68, 0.8)',
  glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(239, 68, 68, 0.05)',

  fontBody: "'Outfit', sans-serif",
  fontDisplay: "'JetBrains Mono', monospace",

  gradientText: 'linear-gradient(135deg, #fde047 0%, #f59e0b 50%, #d97706 100%)',
  scrollbarThumb: '#27272a',
};
