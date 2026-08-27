import type { ThemeDefinition } from './index';

export const defaultTheme: ThemeDefinition = {
  id: 'purple-void',
  name: 'Arcanum',
  description: 'A linguagem visual padrão da mesa: tinta, pergaminho, metal e brasa.',
  author: 'DOZERO Team',
  preview: '#cd973c',

  bgPrimary: '#0c0911',
  bgSecondary: '#120e19',
  bgTertiary: '#1d1729',

  textPrimary: '#f3ead6',
  textSecondary: '#a99e88',

  accentPrimary: '#cd973c',
  accentHover: '#e0b054',
  accentGlow: 'rgba(205, 151, 60, 0.24)',

  danger: '#c14e39',
  success: '#4c9470',
  warning: '#e0b054',
  mana: '#6b87b3',

  glassBg: '#171221',
  glassBorder: 'rgba(205, 151, 60, 0.26)',
  glassBorderHighlight: 'rgba(224, 176, 84, 0.62)',
  glassShadow: '0 14px 40px rgba(5, 3, 10, 0.6), inset 0 1px 0 rgba(233, 223, 198, 0.05)',

  fontBody: "'Alegreya Sans', 'Segoe UI', sans-serif",
  fontDisplay: "'Cinzel', 'Times New Roman', serif",

  gradientText: 'linear-gradient(90deg, #e0b054, #cd973c)',
  scrollbarThumb: '#3b3154',
};
