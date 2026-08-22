import { ThemeDefinition } from './index';

export const chroniclesWoodTheme: ThemeDefinition = {
  id: 'chronicles-wood',
  name: 'Crônicas: Taverna',
  description: 'Um tema imersivo de mesa rústica, simulando uma taverna de madeira escura com pergaminhos.',
  author: 'DOZERO',
  preview: '#3e2723', // Dark Wood

  // Cores de Fundo (A Madeira Escura e Painéis Coesos)
  bgPrimary: '#1a120b',      // Fundo principal: Madeira muito escura
  bgSecondary: '#3e2723',    // Fundo de Painéis: Madeira nobre escura
  bgTertiary: '#2d1f11',     // Fundo de Títulos/Elementos Internos: Madeira rústica

  // Textos (Alto contraste sobre fundos escuros de madeira)
  textPrimary: '#f4e4c1',    // Pergaminho claro iluminado
  textSecondary: '#d1bfae',  // Madeira/Pergaminho médio

  // Destaques e Cores Semânticas (Aquarelados & Couro)
  accentPrimary: '#d4a373',  // Âmbar / Ouro Envelhecido
  accentHover: '#faedcd',    // Pergaminho Dourado (Hover)
  accentGlow: 'rgba(212, 163, 115, 0.4)', // Brilho âmbar sutil
  
  danger: '#e63946',         // Vermelho Sangue / Lacre
  success: '#2a9d8f',        // Verde Floresta
  warning: '#e76f51',        // Terracota / Fogueira
  mana: '#457b9d',           // Azul profundo

  // Efeito "Glass" (Madeira nobre translúcida com textura)
  glassBg: 'rgba(62, 39, 35, 0.85)', 
  glassBorder: '#5d4037',    // Borda madeira entalhada
  glassBorderHighlight: '#8d6e63', // Borda iluminada
  glassShadow: '0 8px 32px 0 rgba(10, 5, 0, 0.65)', // Sombra dramática de taverna

  // Tipografia Clássica de Fantasia
  fontBody: '"Crimson Text", "Times New Roman", serif',
  fontDisplay: '"Cinzel", "Times New Roman", serif',

  // Texto Gradiente (Títulos em destaque: Ouro/Pergaminho iluminado)
  gradientText: 'linear-gradient(135deg, #faedcd 0%, #d4a373 100%)',

  // Barra de Rolagem
  scrollbarThumb: '#5d4037', // Madeira esculpida
};
