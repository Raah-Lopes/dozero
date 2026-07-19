import { ThemeDefinition } from './index';

export const chroniclesParchmentTheme: ThemeDefinition = {
  id: 'chronicles-parchment',
  name: 'Crônicas: Pergaminho',
  description: 'Mesa forrada com um mapa antigo em tons aquarelados claros.',
  author: 'DOZERO',
  preview: '#e8d8c3', // Light Parchment

  // Cores de Fundo (Aquarela e Madeira Contrastante)
  bgPrimary: '#e8d8c3',      // Fundo principal: Pergaminho base de mapa
  bgSecondary: '#fdf6e3',    // Fundo de Painéis: Pergaminho mais claro
  bgTertiary: '#d9c6a5',     // Fundo de Títulos: Pergaminho escuro

  // Textos
  textPrimary: '#3e2723',    // Tinta Nanquim/Marrom muito escuro
  textSecondary: '#5d4037',  // Tinta marrom desbotada

  // Destaques e Cores Semânticas (Aquarelados)
  accentPrimary: '#4a5d23',  // Verde Musgo
  accentHover: '#6b8e23',    // Verde Oliva (Hover)
  accentGlow: 'rgba(74, 93, 35, 0.4)', // Brilho musgo sutil
  
  danger: '#8b0000',         // Vermelho Aquarela/Sangue escuro
  success: '#388e3c',        // Verde folha
  warning: '#d2691e',        // Terracota / Laranja escuro
  mana: '#194370',           // Azul marinho/profundo

  // Efeito "Glass" (Pergaminho Sólido com bordas nítidas)
  glassBg: 'rgba(253, 246, 227, 0.95)', 
  glassBorder: '#cbb593',    // Borda do pergaminho
  glassBorderHighlight: '#a6855d', 
  glassShadow: '0 8px 32px 0 rgba(62, 39, 35, 0.2)', // Sombra mais leve sobre o fundo claro

  // Tipografia Clássica de Fantasia
  fontBody: '"Crimson Text", "Times New Roman", serif',
  fontDisplay: '"Cinzel", "Times New Roman", serif',

  // Texto Gradiente (Títulos em destaque: Ouro/Marrom antigo)
  gradientText: 'linear-gradient(135deg, #3e2723 0%, #8b5a2b 100%)',

  // Barra de Rolagem
  scrollbarThumb: '#8b5a2b', // Marrom Couro
};
