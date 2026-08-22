import { ThemeDefinition } from './index';

export const chroniclesParchmentTheme: ThemeDefinition = {
  id: 'chronicles-parchment',
  name: 'Crônicas: Pergaminho',
  description: 'Mesa forrada com um mapa antigo em tons aquarelados claros com alta nitidez.',
  author: 'DOZERO',
  preview: '#e8d8c3',

  // Cores de Fundo (Aquarela e Madeira Contrastante)
  bgPrimary: '#d8c2a4',      // Fundo principal: Pergaminho mapa texturizado
  bgSecondary: '#fbf5e6',    // Fundo de Painéis: Pergaminho claro e nítido
  bgTertiary: '#e4cdad',     // Fundo de Títulos/Subpainéis: Pergaminho quente

  // Textos (Nanquim e Tinta Élfica de altíssimo contraste)
  textPrimary: '#20120b',    // Tinta Nanquim ultra escura (Contraste 15:1)
  textSecondary: '#4e3324',  // Tinta marrom quente nítida (Contraste 9:1)

  // Destaques e Cores Semânticas
  accentPrimary: '#5c3a21',  // Marrom Couro Nobre
  accentHover: '#3b2210',    // Marrom Nanquim Hover
  accentGlow: 'rgba(92, 58, 33, 0.25)',
  
  danger: '#8b0000',         // Sangue Escuro
  success: '#2d6a4f',        // Verde Floresta Profundo
  warning: '#b45309',        // Âmbar Queimado
  mana: '#1e3a8a',           // Azul Índigo Profundo

  // Efeito "Glass" (Superfície Sólida com Bordas Fortes de Pergaminho)
  glassBg: 'rgba(251, 245, 230, 0.98)', 
  glassBorder: '#a98765',    // Borda nítida de pergaminho
  glassBorderHighlight: '#5c3a21', 
  glassShadow: '0 10px 35px 0 rgba(44, 24, 16, 0.3)',

  // Tipografia Clássica de Fantasia
  fontBody: '"Crimson Text", "Times New Roman", serif',
  fontDisplay: '"Cinzel", "Times New Roman", serif',

  // Texto Gradiente (Títulos em destaque: Nanquim / Marrom Nobre)
  gradientText: 'linear-gradient(135deg, #20120b 0%, #78350f 100%)',

  // Barra de Rolagem
  scrollbarThumb: '#8b5a2b',
};
