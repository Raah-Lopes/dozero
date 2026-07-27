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
