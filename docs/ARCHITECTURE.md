# Arquitetura do Dozero VTT

O **Dozero** é uma Virtual Tabletop (VTT) colaborativa desenvolvida em React, TypeScript e Vite. Seu diferencial é rodar grande parte do seu poder através de P2P via WebRTC, eliminando a necessidade de servidores pesados de banco de dados para gerenciar o estado da sessão em andamento, mantendo escalabilidade e performance.

## Principais Tecnologias

- **Frontend:** React 19, TypeScript
- **Build & Bundle:** Vite (Code Splitting e Lazy Loading agressivo de vendors pesados)
- **Sincronização de Estado (Multiplayer):** Yjs, y-webrtc, y-websocket (Sync descentralizado e fallback)
- **Renderização Gráfica (Mapa):** PixiJS + @pixi/react
- **Processamento de IA:** Google Generative AI (Gemini Flash e Pro) embutidos no cliente via Prompting estruturado.
- **Gerenciamento de Estado Local/UI:** Zustand e Hooks Locais (React Context API)

## Estrutura de Camadas (Views)

A interface do aplicativo não usa rotas (React Router) para navegar entre as partes do VTT porque o usuário sempre se mantém na mesa. Ao invés disso, utilizamos a injeção do componente de View apropriado através do Hook `useWindowManager` (Variável `viewMode`):

1. **Canvas (`GameCanvas`):** A camada nativa em PixiJS (WebGL) que exibe as matrizes/imagens do mapa e processa tokens, arrastes e linha de visão (FOW).
2. **Wiki (`WikiView`):** Um sistema modular que usa Markdown para que os jogadores anotem o universo em tempo real.
3. **Teatro (`TheaterView`):** Utiliza layouts imersivos, vídeos do YouTube, sons do ambiente e ilustrações geradas para focar a visão na narrativa em vez de posicionamento estratégico no grid.

## Gerenciamento de UI Dinâmica (HUD e Janelas)

Acima do ViewLayer, o jogo sobrepõe as interfaces (`HUDLayer` e `WidgetLayer`):

- **`useWindowManager`:** O cérebro da interface. Define quais janelas flutuantes (`DraggableWindow`) estão ativas na tela (ex: Chat, CombatTracker, Configurador de IA) e gerencia modos de layout.
- **`DraggableWindow`:** Componente chave. Fornece movimento livre e estado ancorado na tela do computador. Em ambiente mobile (`max-width: 768px`), ele age como um Fullscreen Modal para preservar UX e Touch Events no VTT.

## Multiplayer e `Yjs`

O projeto não adota Redux ou API Rest tradicional para a rolagem de dados e sincronia do grid. Tudo está conectado à engine `Yjs`.

- `Y.Doc` representa a sala.
- Quando o mestre arrasta o Boss (Y.Map de tokens), a delta da alteração viaja por WebRTC diretamente ao jogador.
- Dados duráveis do usuário criador (Lore, imagens uploadadas via Cloud) são backupeados no localStorage/IndexedDB.

## Inteligência Artificial (IA)

O Dozero injeta contextos para NPCs e Mestre Automatizado direto pelo Frontend chamando as APIs do Gemini, com `System Instructions` pesadamente refinados contidos nos arquivos de prompts em `src/services/ai`.
