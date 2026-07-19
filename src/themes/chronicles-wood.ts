import { ThemeDefinition } from './index';

export const chroniclesWoodTheme: ThemeDefinition = {
  id: 'chronicles-wood',
  name: 'Crônicas: Taverna',
  description: 'Um tema imersivo de mesa rústica, simulando uma taverna de madeira escura com pergaminhos.',
  author: 'DOZERO',
  preview: '#3e2723', // Dark Wood

  // Cores de Fundo (A Madeira e o Pergaminho)
  bgPrimary: '#2d1f11',      // Fundo principal: Madeira escura
  bgSecondary: '#fdf6e3',    // Fundo de Painéis: Pergaminho claro
  bgTertiary: '#f4e4c1',     // Fundo de Títulos/Elementos Internos: Pergaminho envelhecido

  // Textos
  textPrimary: '#f4e4c1',    // Pergaminho claro (Alto contraste com madeira escura)
  textSecondary: '#d1bfae',  // Madeira/Pergaminho médio

  // Destaques e Cores Semânticas (Aquarelados)
  accentPrimary: '#4a5d23',  // Verde Musgo
  accentHover: '#6b8e23',    // Verde Oliva (Hover)
  accentGlow: 'rgba(74, 93, 35, 0.4)', // Brilho musgo sutil
  
  danger: '#8b0000',         // Vermelho Aquarela/Sangue escuro
  success: '#388e3c',        // Verde folha
  warning: '#d2691e',        // Terracota / Laranja escuro
  mana: '#194370',           // Azul marinho/profundo

  // Efeito "Glass" (Neste tema, o vidro é anulado e substituído por Pergaminho Sólido)
  glassBg: 'rgba(253, 246, 227, 0.98)', 
  glassBorder: '#cbb593',    // Borda do pergaminho (suave e amarelada)
  glassBorderHighlight: '#a6855d', // Bordas mais fortes (simulando dobras ou cortes)
  glassShadow: '0 8px 32px 0 rgba(20, 10, 0, 0.6)', // Sombra escura e dramática na madeira

  // Tipografia Clássica de Fantasia
  fontBody: '"Crimson Text", "Times New Roman", serif',
  fontDisplay: '"Cinzel", "Times New Roman", serif',

  // Texto Gradiente (Títulos em destaque: Ouro/Marrom antigo)
  gradientText: 'linear-gradient(135deg, #3e2723 0%, #8b5a2b 100%)',

  // Barra de Rolagem
  scrollbarThumb: '#8b5a2b', // Marrom Couro
};
