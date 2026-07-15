# 📜 DOZERO - Documentação de Handoff (Relatório Completo)

## 1. Visão Geral do Projeto
O **DOZERO** é uma plataforma inovadora de Virtual Tabletop (VTT) desenvolvida para jogar RPG de mesa online. O foco do projeto é proporcionar uma experiência rica, imersiva e altamente modularizada, que unifica mapa de grade interativo (Canvas), visualização em Teatro da Mente, banco de dados (Wiki) integrado e ferramentas automatizadas com suporte de Inteligência Artificial (Gemini para texto, Pollinations/Google TTS para áudio e imagens). 

Possui uma arquitetura "Glassmorphism" para os menus flutuantes que se sobrepõem ao Canvas, proporcionando um design moderno onde o tabuleiro do jogo é sempre o elemento principal em tela. Conta com suporte a sessões colaborativas P2P e multi-jogador via Yjs (CRDT).

---

## 2. Tecnologias e Linguagens Utilizadas
O projeto é uma **Single Page Application (SPA)** no frontend, construída com o ecosistema React/Vite.

**Core:**
- **TypeScript**: Linguagem principal para garantir tipagem estática e segurança no desenvolvimento.
- **React (v19)**: Biblioteca base para a construção das interfaces de usuário (HUD, Modais, Widgets).
- **Vite**: Ferramenta de build e bundler ultrarrápida.

**Motores Gráficos e de Canvas:**
- **PixiJS & @pixi/react**: Utilizados pesadamente no `GameCanvas` para renderização WebGL do mapa (tabuleiro de batalha), tokens, neblina de guerra e elementos gráficos em alta performance.
- **@xyflow/react**: Usado para criação de gráficos nodais (árvores de talentos, mapas mentais, diagramas da campanha).
- **D3.js (d3-force, d3-zoom, d3-drag) / mermaid**: Usados para visualizações interativas da Wiki (O motor do Cérebro Gráfico foi reescrito 100% em D3 e Canvas nativo para performance e correção de bugs de eventos no Windows).

**Gerenciamento de Estado e Colaboração:**
- **Zustand**: Gerenciador de estados globais leve e rápido (localizado na pasta `src/store/`).
- **Yjs** (`yjs`, `y-websocket`, `y-indexeddb`): Framework de sincronização CRDT utilizado para multijogador em tempo real e persistência local off-line no navegador.

**Ferramentas e Integrações:**
- **Lucide React**: Biblioteca de ícones (SVG).
- **@dice-roller/rpg-dice-roller**: Motor robusto de rolagem e parser de dados matemáticos de RPG.
- **@google/generative-ai**: SDK para o robô assistente e geradores de lore/NPCs via IA (Gemini).
- **React Markdown & MDXEditor**: Para visualização e edição rica de artigos da Wiki do mundo.

---

## 3. Arquitetura e Caminhos Principais

O código fonte está localizado dentro do diretório `/src`. A divisão lógica é altamente baseada em "features" ou "widgets":

### `/src/App.tsx` (Orquestrador Principal)
O ponto de entrada da aplicação. Este arquivo controla as "camadas" principais:
- **`canvas-layer`**: O fundo onde o PixiJS renderiza o mapa e os tokens.
- **`hud-layer`**: A interface de usuário React em "Glassmorphism" que flutua acima do mapa. Possui menus de ferramentas no topo e nas laterais. Controla o estado de `viewMode` (Canvas, Wiki, Theater).

### `/src/store/` (Estados Globais / Zustand)
Contém os módulos independentes de dados da sessão:
- `audioStore.ts`: Estado do Audio Mixer, trilhas carregadas e controle de volume.
- `combat.ts`: Lista de iniciativa, turnos, e atores em combate.
- `campaign.ts`, `world.ts`, `wiki.ts`: Dados de campanha, locais e documentos de lore.

### `/src/components/HUD/`
Componentes fixos da tela principal:
- `CombatTracker.tsx`: Janela arrastável que exibe a ordem de iniciativa atual.
- `NPCPanel.tsx`: Lista rápida de personagens do mestre e monstros.

### `/src/components/Widgets/`
A grande sacada do DOZERO é sua modularidade. Ferramentas são Widgets que podem ser abertos pelo Menu Principal:
- **`System/AudioDirectorWidget.tsx`**: Painel complexo de áudio. Permite o upload de arquivos locais, além de geração de voz por IA (Google TTS, 100% gratuito nativo) e Geração de Músicas/SFX (Pollinations, requer API Key). Trata erros de limite de chave (HTTP 401/402).
- **`PlayerTools/DiceRollerWidget.tsx`**: Interface para a rolagem de dados e exibição do histórico de combate.
- **`World/LoreMachineWidget.tsx` & `WorldEngineWidget.tsx`**: Ferramentas de mestre para criar conteúdo massivo e dinâmico com ajuda da IA Generativa (Gemini).

### `/src/components/Theater/`
- Componentes responsáveis pelo modo "Teatro da Mente" (`viewMode === 'theater'`), focados em destacar imagens, avatares e texto sem usar a grade de batalha tática.

---

## 4. Detalhamento de Funcionalidades Chave

### A. Interface Glassmorphism e Z-Index
- Toda a UI principal usa a classe `.glass-panel` (presente no `index.css`), o que confere o visual translúcido esmerilhado. 
- *Atenção Técnica:* A camada `hud-layer` utiliza `pointer-events: none` por padrão para permitir que o usuário clique através da UI no Canvas do mapa. No entanto, os painéis internos (onde ficam os botões) obrigatoriamente declaram `pointer-events: auto` no `style` inline para interceptar os cliques do mouse. Se um menu deixar de funcionar, verifique esta hierarquia.

### B. Integração de Áudio e IA (Audio Director)
- A plataforma mistura áudios locais e gerados por IA via URLs.
- **TTS Gratuito:** Integração com a API do Google Translate (`translate.google.com/translate_tts`) que retorna blobs de MP3 em tempo real baseados em texto. Não requer chaves e cai perfeitamente para falas de NPCs.
- **SFX / Música IA:** Realizado via `gen.pollinations.ai`. Exige uma API Key fornecida pelo usuário salva localmente (localStorage `pollinations_api_key`). Foi imbuído de tratamento de erro robusto (`status 402 - Payment Required`) para evitar quebras do React.

### C. Múltiplos Modos de Visão (`viewMode`)
O estado `viewMode` alterna entre 3 componentes macro:
1. **Canvas**: O tabuleiro de jogo (grade) com interação via mouse (PixiJS).
2. **Wiki**: Um banco de dados enciclopédico de regras e universo. Renderiza markdown e diagramas.
3. **Theater**: Uma interface imersiva, ocultando a malha quadriculada, ideal para explorações narrativas e diálogos interpretativos.

### D. Motor do Cérebro Gráfico (Wiki Graph)
- Inicialmente o gráfico de relações da Wiki (Cérebro) utilizava a biblioteca `react-force-graph-2d`. Devido a problemas sistêmicos de compatibilidade com o React 19 em Strict Mode e conflitos de eventos de mouse (pointercancel) no Windows/Chrome, o componente `WikiGraph.tsx` foi **reescrito do zero em D3.js e Canvas puro**.
- **Vantagens Atuais:** Interceptação perfeita de zoom e arrasto sem bloqueios de UI flutuante; filtro preventivo anti-crash (descarta links `.md` órfãos sem quebrar o laço de renderização). O motor customizado mantém o exato mesmo "look and feel" (Glassmorphism e física orgânica) sem overhead de wrappers do React.

---

## 5. Próximos Passos (Para novos Desenvolvedores)
Se você for continuar este projeto em outra plataforma (Cursor, Windsurf, Devin, etc.), sugerimos:
1. **Sincronização P2P:** Revisar a estabilidade do servidor Y-Websocket/WebRTC (`yjs`). Caso seja para produção, configure um provedor Hocuspocus ou Y-Websocket rodando em Node dedicado.
2. **Sistema de Tokens no PixiJS:** O arquivo do Canvas é denso. Se houver queda de frames, a melhoria passa pela refatoração da forma que o PixiJS trata os *sprites* com *culling* (ocultar do render o que estiver fora da tela).
3. **Gerador de Fichas Customizadas:** A integração do banco de dados (IndexDB via `y-indexeddb`) é perfeita para começar a guardar os templates de atributos dos personagens baseados no RPG que o grupo escolher.
4. **Dependências IA:** Fique de olho nos limites dos tokens do Gemini AI. A chave da IA de texto e o banco de imagens estão rodando suave, mas requisições excessivas (como atualizar NPCs a cada turno) podem causar bloqueios por limite de uso (*Rate Limits*).