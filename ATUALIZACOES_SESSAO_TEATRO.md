# 🎭 Atualizações da Sessão: Teatro da Mente & Sistema Cinematográfico

**Data**: 17 de Agosto de 2026  
**Repositório**: DOZERO VTT  
**Módulos Afetados**: `src/components/Theater/`, `src/store/theater.ts`, `src/services/`

---

## 📋 Resumo Executivo das Implementações

Nesta sessão, foi realizada uma grande evolução no **Modo Teatro da Mente**, transformando-o em um ambiente de narrativa cinematográfica interativa e dinâmica, com cards de personagens com estilo RPG clássico/vintage, menus inteligentes com contenção de bordas, correção de fluxo de interação e o novo **Estúdio de Mini-Roteiros e Diálogos Interativos com IA**.

---

## 1. 🎴 Cards Antigos de RPG para Heróis e Personagens (`HeroBadge.tsx` / `Theater.css`)
- **Estética Vintage / Pergaminho Escuro**: Cards no estilo RPG clássico com moldura metálica, runas ornamentadas, barra de PV responsiva e nome do personagem em destaque.
- **Movimentação Livre no Palco (Drag & Drop Seguro)**:
  - Arraste livre pelo palco com cálculo de delta mouse e trava de mouse pressionado (`isMouseDownRef`).
  - Threshold de movimento de 8px para evitar conflitos entre cliques simples e início de arraste.
  - O card nunca persegue o ponteiro acidentalmente e respeita os limites da tela.
- **3 Escalas de Tamanho Dinâmicas**: Opções de tamanho **Pequeno**, **Médio** e **Grande**, persistidas no estado do teatro.
- **Estados & Condições com Filtros Visuais Exclusivos**:
  - ☠️ **Abatido / Morto**: Overlay vermelho escuro + ícone de caveira + banner de status *"ABATIDO"*.
  - 💫 **Desacordado**: Overlay âmbar/sépia + símbolo de inconsciência + banner *"DESACORDADO"*.
  - 🧪 **Envenenado**: Aura tóxica roxa pulsante + frasco de veneno com bolhas.
  - 🔥 **Queimando** / 🛡️ **Protegido** / ✨ **Inspirado**: Efeitos visuais táteis com partículas e bordas temáticas.

---

## 2. 🛡️ Menu de Contexto Inteligente com Contenção de Bordas
- **Renderização via Portal Global (`ReactDOM.createPortal`)**:
  - O menu de clique direito agora renderiza diretamente no topo do DOM (`document.body`) com `z-index: 999999`, garantindo que nunca fique preso atrás de contêineres com `transform` ou `backdrop-filter`.
- **Auto-Alinhamento Dinâmico**:
  - Cálculo geométrico em tempo real (`getBoundingClientRect`).
  - Se aberto próximo ao canto direito da tela, o menu se desloca para a esquerda.
  - Se aberto próximo ao rodapé, o menu se desloca para cima da posição do clique.
  - Margem mínima de segurança de 12px em todas as extremidades.
  - Altura máxima com barra de rolagem fina (`max-height: calc(100vh - 24px)`), garantindo que nunca seja cortado em telas menores ou com zoom.

---

## 3. 🎬 Sistema de Diálogos Cinematográficos Estilo Visual Novel (`VisualNovelOverlay.tsx`)
- **Centralização & Responsividade Total**:
  - Apresentação centralizada no meio da tela com desfoque de fundo cinematográfico (`backdrop-filter: blur(12px)`).
  - Retrato do personagem à esquerda com aura temática (`glow`) e caixa de fala com glassmorphism à direita.
  - **Layout Mobile (< 768px)**: Adaptação vertical automática com avatar circular de 84px no topo, texto adaptado e botões de escolha empilhados em 1 coluna legível sem transbordar.
- **Correção de Fluxo e Destravamento de Tela**:
  - Resolução do problema onde a camada de diálogo interceptava cliques após o término do texto.
  - Qualquer clique na tela ou na caixa fecha o diálogo instantaneamente.
  - Botão `X` dedicado diretamente no card de fala.
  - Atalhos de teclado: tecla `ESC` para fechar, teclas `Espaço` e `Enter` para avançar falas.
- **Tratamento de Autoplay de Áudio (Web Audio API)**:
  - Verificação de estado do `AudioContext` para que os bipes de digitação só executem após o primeiro gesto do usuário, eliminando avisos de autoplay no console.

---

## 4. 📜 Novo Estúdio de Mini-Roteiros & Diálogos Interativos (`CinematicDialogueStudio.tsx`)
- **Duas Abas de Produção**:
  1. **⚡ Fala Rápida (1 Cena)**: Transmissão instantânea de falas pontuais para reações rápidas do mestre.
  2. **📜 Mini-Roteiro Interativo**: Criação de sequências dramáticas multi-passo com perguntas e ramificações.
- **Editor de Linha do Tempo (Passos do Roteiro)**:
  - Adição, reordenação (⬆️ ⬇️) e exclusão de passos da cena.
  - Seleção de interlocutor por passo com 1 clique (Presets Narrativos, Heróis do Grupo e NPCs do Acervo).
  - Emoções/tons de fala por passo (Neutro, Fúria, Místico, Tensão, Triunfo, Solene).
  - **Perguntas e Escolhas dos Jogadores com Resposta Imediata (`outcomeText`)**:
    - Adição de até 4 opções de escolha por passo.
    - Configuração opcional de fala de resposta direta do NPC ao clicar na opção.
- **🪄 Gerador de Roteiros com Inteligência Artificial**:
  - Analisa o cenário ativo na mesa (título, clima, atmosfera, descrição) e gera um mini-roteiro de 3 a 4 passos dramáticos com perguntas e respostas em segundos.
- **Biblioteca de Modelos Prontos de RPG**:
  - *Interrogatório nas Sombras* (Intimidação / Persuasão / Revelação).
  - *O Enigma do Guardião Místico* (Charada ancestral com respostas corretas/erradas).
  - *Desafio do Vilão Principal* (Discurso dramático pré-batalha).
- **Execução na Mesa**:
  - Indicador de progresso no topo do card (`📜 Roteiro • Passo 1 de 3`).
  - Botão `Avançar ❯` e registro automático de todas as decisões dos jogadores no chat da mesa.

---

## 5. 🗄️ Integração com Fichas e Armazenamento (`useCastData.ts` / `src/store/theater.ts`)
- Sincronização automática com a Wiki e Roster de Personagens do VTT.
- Novas interfaces `DialogueScriptStep`, `SavedDialogueScript` e campos de controle de roteiro em `TheaterDialogue`.
- Métodos auxiliares `advanceDialogueScript`, `saveDialogueScript` e `deleteDialogueScript` persistidos via Yjs e `localStorage`.

---

## 🚀 Status da Compilação
- **TypeScript**: 0 erros.
- **Build de Produção (Vite)**: Sucesso total (PWA gerada).
