# Contribuindo para o DOZERO

## Ambiente

- Node.js 24.x.
- npm.
- Um `.env.local` criado a partir de `.env.example`; nunca envie credenciais ao Git.

```bash
npm install
npm run dev
```

A aplicação usa `http://localhost:5174` e o Vite aceita conexões da rede local para testes mobile.

## Verificação

Rode o menor teste que cobre a mudança e, para integrações, o build de produção:

```bash
npm run test -- --run
npm run build
```

Mudanças de interface devem ser exercitadas no navegador. Confira o fluxo afetado, console, teclado/foco e uma largura mobile quando aplicável.

## Banco e migrations

- Versione mudanças em `supabase/migrations/`.
- Não dependa somente de checks na UI: autorização persistente pertence às policies RLS.
- Não use dados reais ou sensíveis em testes de ferramentas de IA.

## Commits

Use Conventional Commits:

- `feat:` funcionalidade;
- `fix:` correção;
- `docs:` documentação;
- `refactor:` mudança interna sem alterar comportamento;
- `perf:` performance;
- `test:` testes.

Preserve alterações não relacionadas no worktree. Não inclua artefatos de build, arquivos temporários ou conteúdo pessoal da wiki por acidente.
