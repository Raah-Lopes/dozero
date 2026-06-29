import type { ThemeDefinition } from './index';

export const defaultTheme: ThemeDefinition = {
  id: 'purple-void',
  name: 'Purple Void',
  description: 'O tema padrão. Escuridão cósmica com neon roxo e glassmorphism.',
  author: 'DOZERO Team',
  preview: '#a855f7',

  bgPrimary: '#020617',
  bgSecondary: '#0f172a',
  bgTertiary: '#1e293b',

  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',

  accentPrimary: '#a855f7',
  accentHover: '#9333ea',
  accentGlow: 'rgba(168, 85, 247, 0.5)',

  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  mana: '#3b82f6',

  glassBg: 'rgba(15, 23, 42, 0.65)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderHighlight: 'rgba(168, 85, 247, 0.3)',
  glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',

  fontBody: "'Inter', sans-serif",
  fontDisplay: "'Outfit', sans-serif",

  gradientText: 'linear-gradient(to right, #a855f7, #ec4899)',
  scrollbarThumb: '#1e293b',
};
