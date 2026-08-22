--- README.md (原始)
# 🎲 Dozero - Virtual Tabletop RPG

Uma plataforma completa para jogar RPG de mesa online com suporte para mapa interativo, wiki colaborativa, IA generativa e sincronização P2P.

## 🚀 Quick Start

```bash
# 1. Instale as dependências
npm install

# 2. Configure o ambiente
cp .env.example .env.local
# (Edite .env.local com suas chaves)

# 3. Inicie o servidor de desenvolvimento
npm run dev

# Acesse http://localhost:5174
```

## 📚 Documentação

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guia de boas práticas e como contribuir
- [PLUGIN_SPEC.md](./PLUGIN_SPEC.md) - Documentação para criar seus próprios widgets e extensões
- [handoff.md](./handoff.md) - Visão técnica completa da arquitetura do projeto e stack
- [CHANGELOG.md](./CHANGELOG.md) - Histórico de versões e melhorias implementadas

## ⚙️ Configuração de Ambiente

1. Copie `.env.example` para `.env.local`
2. Preencha as chaves de API:
   - Gemini: [obtenha em ai.google.dev](https://ai.google.dev)
   - Pollinations: [obtenha em pollinations.ai](https://pollinations.ai)

## 🗺️ Roadmap

Veja [UX_IMPROVEMENTS.md](./UX_IMPROVEMENTS.md) para detalhes de melhorias planejadas de interface.

### Próximos Sprints Planejados
- [ ] Offline-first melhorado (service workers robustos)
- [ ] Suporte nativo para múltiplos temas de sistema RPG
- [ ] API GraphQL ou WebRTC aprimorado para sincronização em redes restritas

## 🏗️ Tecnologias Principais

- **React 19** + **TypeScript** + **Vite 8**
- **PixiJS** para renderização WebGL do mapa (canvas 2d performático)
- **Yjs + IndexedDB** para sincronização multijogador colaborativa e cache local
- **Gemini AI** para geração de conteúdo dinâmico na partida (oráculo, NPCs, imagens)
- **D3.js** para visualização da wiki de relacionamentos de personagens (Brain View)

## 📁 Estrutura de Diretórios

```
src/
  components/   # Componentes React (HUD, Modais, Widgets, Theater)
  engine/       # Motor PixiJS do mapa e tokens
  hooks/        # Hooks customizados para gerenciamento de UI e Eventos globais
  services/     # Integrações (API wiki, webhook, sync via Yjs, Gemini)
  store/        # Estado global e configurações do Yjs
  utils/        # Helpers e parsers matemáticos/dice rollers
  themes/       # Temas visuais padronizados
vite-plugins/   # Plugins customizados do Vite
template_wiki/  # Templates padrão para criação de documentos de campanha da Wiki
scripts/        # Utilitários de desenvolvimento e CI
```


+++ README.md (修改后)
# 🎲 Dozero - Virtual Tabletop RPG

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite 8](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev/)

**Uma plataforma completa e open-source para jogar RPG de mesa online** com suporte para mapa interativo, wiki colaborativa, IA generativa e sincronização P2P em tempo real.

![Status do Projeto](https://img.shields.io/badge/status-em%20desenvolvimento-green)
![Versão](https://img.shields.io/badge/versão-0.1.0-orange)

---

## ✨ Funcionalidades Principais

### 🗺️ Mapa Interativo (Canvas Mode)
- **Renderização WebGL** com PixiJS para alta performance
- Sistema de tokens arrastáveis com suporte a grades
- Neblina de guerra dinâmica
- Ferramentas de medição e desenho tático

### 📚 Wiki Colaborativa
- Banco de dados integrado de campanha em Markdown
- **Cérebro Gráfico** visualizando relacionamentos entre personagens (D3.js)
- Editor rich-text com MDXEditor
- Diagramas Mermaid e mapas mentais interativos

### 🎭 Teatro da Mente
- Modo imersivo sem grade para foco narrativo
- Destaque para avatares, imagens e descrições
- Ideal para diálogos e exploração narrativa

### 🤖 IA Generativa Integrada
- **Gemini AI**: Geração de NPCs, lore, oráculos e conteúdo dinâmico
- **Google TTS Gratuito**: Vozes para NPCs via API do Google Translate
- **Pollinations AI**: Geração de músicas e efeitos sonoros sob demanda

### 🔊 Audio Director
- Mixer de áudio com múltiplas trilhas
- Upload de arquivos locais + geração por IA
- Controle individual de volume por canal

### ⚔️ Sistema de Combate
- Tracker de iniciativa automático
- Gerenciamento de turnos e condições
- Histórico de rolagens integrado
- Suporte a ataques em massa

### 🔄 Sincronização Multiplayer
- **Yjs CRDT**: Sincronização em tempo real entre jogadores
- **Offline-first**: Funciona sem internet com IndexedDB
- WebRTC + WebSocket para redes restritas

### 🧩 Arquitetura Modular
- **Widgets expansíveis**: Crie suas próprias ferramentas
- Sistema de plugins documentado
- 139+ componentes TypeScript reutilizáveis

---

## 🚀 Quick Start

### Pré-requisitos
- **Node.js 24.x** (obrigatório)
- npm ou yarn
- Git

### Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/Raah-Lopes/dozero.git
cd dozero

# 2. Instale as dependências
npm install

# 3. Configure o ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves de API (veja abaixo)

# 4. Inicie o servidor de desenvolvimento
npm run dev

# Acesse http://localhost:5174
```

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento Vite |
| `npm run build` | Build de produção otimizado |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Executa ESLint no código |
| `npm run test` | Roda suite de testes com Vitest |

---

## ⚙️ Configuração de Ambiente

### Chaves de API Necessárias

1. **Copie o arquivo de exemplo:**
   ```bash
   cp .env.example .env.local
   ```

2. **Preencha as seguintes variáveis:**

| Variável | Descrição | Como Obter |
|----------|-----------|------------|
| `VITE_GEMINI_API_KEY` | IA para geração de conteúdo | [ai.google.dev](https://ai.google.dev) |
| `VITE_POLLINATIONS_API_KEY` | Geração de áudio/música IA | [pollinations.ai](https://pollinations.ai) |

> 💡 **Nota:** O TTS do Google Translate é gratuito e não requer chave!

---

## 🏗️ Stack Tecnológico

### Core
- **React 19** (Canary) + **TypeScript 5** + **Vite 8**
- **TailwindCSS 4** para estilização utilitária

### Renderização & Visualização
- **PixiJS 8** + **@pixi/react**: Motor WebGL para mapa e tokens
- **D3.js 7**: Visualizações interativas (gráficos de relacionamento)
- **Mermaid**: Diagramas automáticos na Wiki
- **@xyflow/react**: Grafos nodais para árvores de talento

### Estado & Sincronização
- **Zustand 5**: Gerenciamento de estado global leve
- **Yjs 13** + **y-websocket** + **y-indexeddb**: CRDT para multiplayer
- **PartyKit**: Sincronização em tempo real alternativa

### Integrações
- **@google/generative-ai**: SDK Gemini para IA
- **@dice-roller/rpg-dice-roller**: Parser de rolagens de dados
- **@mdxeditor/editor**: Editor Markdown rich-text
- **Lucide React**: Biblioteca de ícones SVG
- **React Router 7**: Navegação e rotas

### Testes & Qualidade
- **Vitest**: Framework de testes unitários
- **Testing Library**: Testes de componentes React
- **ESLint 10**: Linting de código
- **Sentry**: Monitoramento de erros em produção

### PWA & Offline
- **vite-plugin-pwa**: Service workers para offline
- **idb-keyval**: Armazenamento IndexedDB simplificado

---

## 📁 Estrutura do Projeto

```
dozero/
├── src/
│   ├── components/       # Componentes React organizados por feature
│   │   ├── Audio/        # Players, mixer, controles de som
│   │   ├── Auth/         # Login, registro, gestão de usuários
│   │   ├── Chat/         # Sistema de mensagens P2P
│   │   ├── HUD/          # Interface heads-up (combate, overlays)
│   │   ├── Modals/       # Diálogos e janelas modais
│   │   ├── System/       # Componentes centrais do sistema
│   │   ├── Theater/      # Modo Teatro da Mente
│   │   ├── UI/           # Componentes de UI reutilizáveis
│   │   ├── Widgets/      # Ferramentas modais expansíveis
│   │   │   ├── GameMaster/   # Ferramentas exclusivas do mestre
│   │   │   ├── PlayerTools/  # Ferramentas dos jogadores
│   │   │   ├── System/       # Widgets de sistema
│   │   │   └── Generators/   # Geradores de conteúdo IA
│   │   └── Wiki/         # Visualização e edição da Wiki
│   ├── engine/           # Motor PixiJS (mapa, tokens, canvas)
│   ├── hooks/            # Hooks customizados (estado, eventos)
│   ├── store/            # Stores Zustand (estado global)
│   ├── services/         # Integrações externas (APIs, Yjs, IA)
│   ├── utils/            # Helpers, parsers, dice rollers
│   ├── themes/           # Temas visuais e configurações CSS
│   ├── constants/        # Constantes e configurações fixas
│   ├── rules/            # Regras de sistemas RPG suportados
│   └── ai/               # Serviços de IA (Gemini, TTS, Pollinations)
├── vite-plugins/         # Plugins customizados do Vite
│   ├── yjs-server.ts     # Servidor Yjs embutido para dev
│   ├── wiki-api.ts       # API local da Wiki
│   └── pollinations-proxy.ts  # Proxy para Pollinations AI
├── template_wiki/        # Templates para documentos de campanha
├── scripts/              # Utilitários de desenvolvimento e CI
├── public/               # Assets estáticos (ícones, áudios)
└── signaling-server/     # Servidor WebSocket para WebRTC
```

### Contagem de Componentes

| Categoria | Quantidade |
|-----------|------------|
| **Total de componentes TSX** | 139 |
| Widgets | 33 |
| Theater | 27 |
| UI | 18 |
| HUD | 20 |
| Chat | 10 |
| Modals | 13 |

---

## 📚 Documentação

### Guias Principais
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Como contribuir e rodar o projeto localmente
- **[PLUGIN_SPEC.md](./PLUGIN_SPEC.md)** - Guia para criar widgets e extensões customizadas
- **[handoff.md](./handoff.md)** - Documentação técnica completa da arquitetura
- **[CHANGELOG.md](./CHANGELOG.md)** - Histórico de versões e mudanças
- **[POO_ANALYSIS.md](./POO_ANALYSIS.md)** - Análise dos padrões de POO no projeto

### Documentação Técnica
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Detalhes da arquitetura do sistema
- **[CENTRALIZATION_PLAN.md](./CENTRALIZATION_PLAN.md)** - Plano de centralização de dados
- **[patch_pathfinder_2e_cleanup.md](./patch_pathfinder_2e_cleanup.md)** - Ajustes para Pathfinder 2E

### Wiki do Projeto
- **[wikidozero/README.md](./wikidozero/README.md)** - Wiki interna de desenvolvimento
- **[template_wiki/](./template_wiki/)** - Templates para criação de campanhas

---

## 🗺️ Roadmap

### ✅ Concluído (v0.1.0)
- ErrorBoundary em componentes críticos
- Hooks centralizados para gerenciamento de estado
- Limpeza automática de cache Yjs no IndexedDB
- Code splitting e otimizações de performance
- Pipeline CI/CD com testes automatizados
- Suíte de testes unitários com Vitest

### 🚧 Em Desenvolvimento
- [ ] Offline-first aprimorado com service workers robustos
- [ ] Suporte nativo a múltiplos sistemas de RPG (D&D 5E, Pathfinder 2E, etc.)
- [ ] API GraphQL para consultas complexas à Wiki
- [ ] WebRTC melhorado para sincronização em redes restritas
- [ ] Sistema de permissões granular para mestres/jogadores

### 📋 Planejados
- [ ] Marketplace de widgets da comunidade
- [ ] Importação/exportação de campanhas em formato padrão
- [ ] Integração com Discord bot
- [ ] Gravação e replay de sessões
- [ ] Tradução multi-idioma (i18n)

Veja mais detalhes em **[UX_IMPROVEMENTS.md](./UX_IMPROVEMENTS.md)**.

---

## 🧪 Testes

```bash
# Rodar todos os testes
npm run test

# Rodar testes em modo watch (desenvolvimento)
npm run test -- --watch

# Rodar testes com coverage
npm run test -- --coverage
```

### Cobertura de Testes Atual
- Hooks de gerenciamento de janela (`useWindowManager`)
- Componentes críticos do Canvas
- Parsers de dados e rolagem de dados
- Serviços de sincronização Yjs

---

## 🤝 Como Contribuir

1. **Fork** o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'feat: add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### Padrões de Commit
Seguimos o **Conventional Commits**:
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Mudanças na documentação
- `style:` Formatação (sem mudança de lógica)
- `refactor:` Refatoração de código
- `perf:` Melhorias de performance
- `test:` Adição/refatoração de testes

Exemplo: `git commit -m "feat: adicionado gerador de nomes para guildas"`

Veja mais em **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

---

## 🌟 Casos de Uso

### Para Mesas de RPG
- **Mestre**: Gerencie NPCs, gere conteúdo com IA, controle áudio e combate
- **Jogadores**: Role dados, acompanhe iniciativa, acesse a Wiki da campanha
- **Todos**: Chat integrado, sincronização em tempo real, experiência imersiva

### Para Desenvolvedores
- **Estude**: Arquitetura moderna React + TypeScript + Vite
- **Contribua**: Sistema modular com 139+ componentes
- **Extenda**: Crie widgets customizados seguindo nossa spec de plugins

---

## 📸 Screenshots

> *Adicionar screenshots do mapa, wiki, teatro da mente e widgets*

---

## 🤝 Comunidade & Suporte

- **GitHub Issues**: Reporte bugs ou sugira features
- **Discord**: [Link para servidor da comunidade]
- **Documentação**: Explore os arquivos `.md` no repositório

---

## 📄 Licença

Este projeto está licenciado sob a licença **MIT** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🙏 Agradecimentos

- **PixiJS Team** pelo motor WebGL incrível
- **Yjs Team** pela solução de sincronização CRDT
- **Google** pela API Gemini e TTS gratuito
- **Comunidade React/TypeScript** pelo suporte contínuo
- **Todos os contribuidores** do Dozero

---

## 📬 Contato

- **Repositório**: [github.com/Raah-Lopes/dozero](https://github.com/Raah-Lopes/dozero)
- **Autor**: Raah Lopes

---

<div align="center">

**Feito com ❤️ para a comunidade de RPG de mesa**

[⬆ Topo](#-dozero---virtual-tabletop-rpg)

</div>
