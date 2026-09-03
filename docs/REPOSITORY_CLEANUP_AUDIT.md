# Auditoria de organização do repositório

Atualizada em 02 de setembro de 2026. Esta auditoria separa o código e os
recursos necessários ao VTT de arquivos locais, conteúdo pessoal e histórico
Git. Nenhum conteúdo de campanha foi apagado.

## Etapa segura concluída

- A pasta `.archive/` (42 backups, logs e scripts experimentais; cerca de
  13 MB) deixou de ser rastreada pelo Git e permaneceu preservada no disco.
- `.obsidian/workspace.json` deixou de ser rastreado. É uma preferência local
  do Obsidian, não uma configuração compartilhada do produto.
- O `.gitignore` agora impede o retorno de `tmp/`, `PAINEL DE CONTROLE NOVO/`,
  arquivos `.7z` de skills e preferências locais do Obsidian.
- O `.vercelignore` mantém instaladores do Dungeondraft fora dos deployments;
  eles continuam no computador e não são enviados à Vercel.

## Inventário atual

| Área | Tamanho local aproximado | Tratamento |
| --- | ---: | --- |
| `src/` | 5 MB | Código do produto; manter. |
| `public/` | 99 MB | Recursos publicados; revisar imagens-fonte sem uso antes de mover. |
| `wikidozero/` | 96 MB | Acervo e importadores atuais usam esta pasta; não mover sem migração. |
| `node_modules/` | 912 MB | Dependências locais, já ignoradas. |
| `dist/` | 111 MB | Resultado de build, já ignorado. |
| `SOUND/` | 985 MB | Biblioteca local, já ignorada e excluída do deploy. |
| `PAINEL DE CONTROLE NOVO/` | 137 MB | Projeto/rascunho local, agora ignorado. |
| `tmp/` | 27 MB | Frames temporários de processamento, agora ignorados. |

## Acervo removido em 03 de setembro de 2026

Com confirmação do responsável e cópia externa já preservada, foram excluídos
do workspace e marcados para remoção do Git:

- `[1] 🏕️ Campanha Principal/`;
- `[3] 📎 Anexos/`;
- `[99] 🗑️ Descartaveis & Stubs/`, incluindo os metadados de Git que haviam sido
  copiados para dentro da wiki;
- `Campanhas/`, que continha rascunhos locais de campanha.

As matrizes do VTT, DLCs, mapas mentais e modelos permanecem no projeto.

## Próxima limpeza recomendada

1. **Separar arte-fonte de mídia publicada.** Há uma pasta `public/mascot/GEMINI NAO ACESSE/` com um PSD de 12,57 MB e imagens de trabalho. Ela é enviada
   pela Vercel por estar dentro de `public/`, mas não possui referência no
   código. Após uma cópia de segurança, deve migrar para uma pasta local fora
   de `public/` e ignorada pelo Git.
2. **Desinflar o histórico remoto.** O histórico Git ocupa aproximadamente
   296 MB compactados e contém um anexo `projector_*.webp` de 77,48 MB, além de
   versões antigas de `node_modules`. Remover esses objetos de verdade exige
   reescrever o histórico e fazer force-push; isso demanda uma etapa separada,
   backup e que todos façam um novo clone.
3. **Normalizar recursos grandes.** Mídia de campanha e anexos acima de 10 MB
   devem ir para Supabase Storage ou Git LFS, não para o histórico Git comum.

## Estrutura alvo

```text
DOZERO/
  src/                 # aplicação React/Vite
  public/              # somente recursos usados em produção
  api/                 # funções Vercel
  supabase/            # migrations e configuração versionada
  docs/                # documentação técnica e produto
  scripts/             # automações reproduzíveis
  template_wiki/       # modelos distribuíveis
  wikidozero/          # acervo local/migrável, com descartáveis excluídos
  local-assets/        # artes-fonte e instaladores, ignorado pelo Git
```

`node_modules/`, `dist/`, `tmp/`, `.archive/`, preferências de editor e
painéis experimentais permanecem locais e nunca devem ser enviados ao GitHub
ou à Vercel.

## Levantamento adicional — 03 de setembro de 2026

### Manter no repositório

| Grupo | Motivo |
| --- | --- |
| `src/`, `api/`, `supabase/`, `vite-plugins/` | Núcleo da SPA, API Vercel, migrations e integrações locais de desenvolvimento. |
| `public/audio/` e imagens de tokens em uso | Referenciados por soundboard, teatro, rádio, Canvas e encontros. |
| `template_wiki/`, `wikidozero/[2] 🔮 Matrizes do VTT/`, `DLCs/`, `MapasMentais/` | Modelos e matrizes consumidos pelos geradores e oráculos. |
| `.github/workflows/` | CI e publicação em GitHub Pages. |
| `README.md`, `AGENTS.md`, `DECISIONS.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/AI_CONTEXT.md`, `docs/ROADMAP_STATUS.md`, `docs/API.md` | Documentação operacional atual. |
| `signaling-server/` | Serviço opcional de colaboração WebRTC; não é chamado pelo deploy Vercel, mas é um componente reutilizável para hospedagem própria. |

### Organizar antes de qualquer remoção

| Grupo | Ação recomendada |
| --- | --- |
| 38 imagens de `public/mascot/` sem referência no código (aprox. 31 MB) e 15 imagens em `public/assets/` sem referência direta (aprox. 13 MB) | Revisar visualmente e mover os aprovados para `local-assets/`; manter apenas as imagens usadas pela landing e pela mesa. Não apagar automaticamente, pois Markdown externo pode usar URLs diretas. |
| Scripts auxiliares | Organizados em `scripts/qa/`, `scripts/docs/` e `scripts/legacy/`; somente os comandos de `package.json` são fluxo oficial. |
| Arquivos de raiz de planejamento e handoff | Movidos para `docs/archive/`, fora da raiz operacional. |
| `.obsidian/` | Preferências de ferramenta local; retiradas do versionamento. |

### Removíveis após confirmação específica

| Item | Justificativa |
| --- | --- |
| `Nunca` | Removido: arquivo vazio, sem função de produto. |
| `tsconfig.app.tsbuildinfo` e `vite.config.d.ts` | Removidos e ignorados: artefatos gerados sem referência. |
| `fix-trade.cjs`, `fixConfig.cjs`, `refactor.cjs`, `update_npcpanel.cjs`, `update_npcpanel.py` | Removidos: transformações pontuais antigas, sem chamada automatizada. |
| `scripts/fix_ts_all.cjs` e `scripts/fix_ts_all.js` | Removidos: duplicidade de correção já incorporada. |
| Branch local `test-merge-b1bec` | Removida: já estava incorporada em `main`. |

### Requer decisão de produto

- A branch remota `origin/lack-of-real-time-consistency-779a0` **não** está
  incorporada em `main`; ela deve ser revisada antes de apagar ou mesclar.
- As branches locais `agents/encontrar-erros` e
  `agents/verificacao-erros-programa` estão incorporadas em `main`, mas seguem
  anexadas a worktrees ativos; devem ser removidas somente quando esses
  worktrees forem encerrados.
- A limpeza real do histórico Git continua exigindo reescrita e force-push.
  Isso deve acontecer isoladamente, com backup e aviso a qualquer outro clone.
