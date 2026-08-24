import type { ThemeDefinition } from './index';

// ─── Sci-Fi / Cyber / Star Wars Theme ───────────────────────────────────────
// HUD holográfico, interfaces espaciais, tons escuros e âmbar/ciano tático.
export const sciFiTheme: ThemeDefinition = {
  id: 'scifi-galaxy',
  name: 'Galáxia Sci-Fi & Cyber',
  description: 'HUD holográfico espacial, tons táticos e terminais estelares de alta tecnologia.',
  author: 'DOZERO Community',
  preview: '#38bdf8',

  bgPrimary: '#05070d',
  bgSecondary: '#0b111e',
  bgTertiary: '#131e33',

  textPrimary: '#e0f2fe',
  textSecondary: '#7dd3fc',

  accentPrimary: '#38bdf8',     // Ciano Holográfico
  accentHover: '#0ea5e9',
  accentGlow: 'rgba(56, 189, 248, 0.5)',

  danger: '#f43f5e',
  success: '#10b981',
  warning: '#f59e0b',           // Âmbar tático
  mana: '#6366f1',

  glassBg: 'rgba(11, 17, 30, 0.85)',
  glassBorder: 'rgba(56, 189, 248, 0.25)',
  glassBorderHighlight: 'rgba(245, 158, 11, 0.4)',
  glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.8)',

  fontBody: "'Space Grotesk', 'Inter', monospace",
  fontDisplay: "'Orbitron', monospace",

  gradientText: 'linear-gradient(135deg, #38bdf8 0%, #f59e0b 100%)',
  scrollbarThumb: '#1a2944',
};
