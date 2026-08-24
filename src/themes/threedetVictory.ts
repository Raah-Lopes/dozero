import type { ThemeDefinition } from './index';

// ─── 3DeT Victory Theme ─────────────────────────────────────────────────────
// Inspirado em animes, tokusatsu, ação dinâmica e cores neon vibrantes.
export const threedetVictoryTheme: ThemeDefinition = {
  id: '3det-victory',
  name: '3DeT Victory',
  description: 'Defensores de Tóquio! Cores pop-neon, anime vibrante e energia shonen ilimitada.',
  author: 'DOZERO Community',
  preview: '#06b6d4',

  bgPrimary: '#08091a',
  bgSecondary: '#12142f',
  bgTertiary: '#1d214a',

  textPrimary: '#ffffff',
  textSecondary: '#93c5fd',

  accentPrimary: '#06b6d4',     // Cyan Shonen
  accentHover: '#38bdf8',
  accentGlow: 'rgba(6, 182, 212, 0.6)',

  danger: '#ff0055',
  success: '#00ffaa',
  warning: '#fbbf24',
  mana: '#8b5cf6',

  glassBg: 'rgba(18, 20, 47, 0.85)',
  glassBorder: 'rgba(6, 182, 212, 0.3)',
  glassBorderHighlight: 'rgba(255, 0, 85, 0.6)',
  glassShadow: '0 8px 32px 0 rgba(6, 182, 212, 0.3)',

  fontBody: "'Outfit', 'Inter', sans-serif",
  fontDisplay: "'Chakra Petch', 'Orbitron', sans-serif",

  gradientText: 'linear-gradient(135deg, #06b6d4 0%, #ff0055 100%)',
  scrollbarThumb: '#262d66',
};
