# DOZERO — Virtual Tabletop RPG

Plataforma local-first para jogar RPG de mesa online, organizar campanhas e construir mundos. O DOZERO reúne mapa tático, Teatro da Mente, wiki Markdown semântica, ferramentas do mestre, áudio/voz e colaboração em tempo real.

## Funcionalidades

- Mapa WebGL com PixiJS, tokens, grades, fog of war, desenho e medição.
- Wiki colaborativa com Markdown, frontmatter, cards tipados e grafo de relações.
- Teatro da Mente com elenco, cenas, diálogos, props, som e crônica.
- Combate, iniciativa, condições, rolagens e macros.
- Calendário fantástico configurável com estações, luas e eventos.
- Voz WebRTC e compartilhamento de tela integrados ao chat.
- Campanhas, personagens, cenas, snapshots e presença no Supabase.
- Estado local-first com Yjs e IndexedDB, sincronizado via Supabase Realtime.
- Temas visuais para diferentes estilos e sistemas de RPG.

## Stack

- React 19 canary, TypeScript 6 e Vite 8.
- PixiJS 8, D3 e Mermaid.
- Yjs, Zustand, IndexedDB e Supabase.
- Tailwind CSS 4 e CSS próprio.
- Vitest, Testing Library, JSDOM e Puppeteer.
- Deploy na Vercel, com Node.js 24.x.

## Como executar

Pré-requisitos: Node.js 24.x e npm.

```bash
git clone https://github.com/Raah-Lopes/dozero.git
cd dozero
npm install
```

Copie `.env.example` para `.env.local`, preencha apenas as chaves necessárias e inicie:

```bash
npm run dev
```

A aplicação local usa `http://localhost:5174`.

## Comandos

| Comando | Função |
|---|---|
| `npm run dev` | Servidor Vite de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest em modo interativo |
| `npm run test -- --run` | Testes em execução única |

## Estrutura principal

```text
src/
├── components/      UI, HUD, modais, widgets, wiki e teatro
├── engine/          mesa PixiJS e renderizadores
├── services/        Supabase, Yjs, áudio, IA e persistência
├── store/           estado compartilhado por domínio
├── themes/          temas visuais
└── utils/           parsers e utilitários testáveis
supabase/migrations/ migrations versionadas e políticas RLS
vite-plugins/        APIs locais usadas no desenvolvimento
wikidozero/          conteúdo Markdown da wiki
```

## Documentação operacional

- [Contexto técnico](docs/AI_CONTEXT.md)
- [Status do roadmap](docs/ROADMAP_STATUS.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Decisões](DECISIONS.md)
- [Como contribuir](CONTRIBUTING.md)
- [Especificação de plugins](PLUGIN_SPEC.md)
- [Pesquisa de skills e contexto](docs/CODEX_SKILLS_RESEARCH_2026-08-25.md)

## Segurança

- Nunca envie `.env.local`, senhas ou service-role keys ao Git.
- Alterações de banco devem entrar como migrations revisáveis.
- Conteúdo privado depende de RLS; esconder um botão na interface não é autorização.
- Trabalhe com dados de desenvolvimento ou anonimizados ao usar ferramentas de IA/MCP.

## Contribuição

Use Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `test:`) e verifique a mudança antes de publicar. Consulte [CONTRIBUTING.md](CONTRIBUTING.md).

Licença MIT.
