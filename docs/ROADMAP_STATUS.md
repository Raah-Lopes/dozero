# Status operacional do roadmap DOZERO 360°

Atualizado em 25 de agosto de 2026, após o commit `c3ba1814`.

Estados: `Concluído`, `Parcial`, `Próximo`, `Planejado`.

## Próxima ordem de execução

1. **D.4 Genealogia** — derivar árvore familiar das conexões semânticas existentes.
2. **C.2 Editor visual de fichas** — completar fluxo por abas e histórico sem depender de YAML cru.
3. **F.3 Offline aprimorado** — fila visível de sync e recuperação de conflitos.
4. **F.2 Macros condicionais** — builder condicional e contexto automático.

## Trilha A — comunicação e áudio

| Item | Estado | Evidência/pendência |
|---|---|---|
| A.1 Voz WebRTC e screen share | Parcial | Voz, câmera/screen share, presença e limpeza estão em `webrtcVoiceManager.ts` e painéis de chat. Ainda validar TURN/rede restrita, permissão granular do mestre e volume individual em sessão real. |
| A.2 Soundboard e cenas sonoras | Parcial | `AudioDirectorWidget`, `AudioEngine` e store de áudio existem. Falta auditoria contra o grid configurável, atalhos e biblioteca de presets do roadmap. |
| A.3 Rádio ambiente | Parcial | Soundscape e players existem; falta consolidar rádio flutuante com presets e crossfade como fluxo único. |

## Trilha B — nuvem, auth e multi-mesa

| Item | Estado | Evidência/pendência |
|---|---|---|
| B.1 Supabase Cloud e RLS | Parcial | Auth, campanhas, cenas, snapshots, presença, Storage e Realtime estão integrados. RLS de campanhas e cenas foi endurecido nas migrations de 25/08. Falta versionar/auditar todo o schema remoto e demais policies. |
| B.2 Player Vault | Parcial | `PlayerVaultModal` e `characterRepository` existem. Falta confirmar envio/clonagem entre todas as campanhas e histórico de versões. |
| B.3 Command Palette | Concluído | Palette global, busca de tokens/wiki e ações rápidas implementadas. Manter índice e acessibilidade. |

## Trilha C — fichas e identidade

| Item | Estado | Evidência/pendência |
|---|---|---|
| C.1 Theme Packs | Concluído | Registro com dez temas, troca e overrides em Settings. Auditar consistência visual gradualmente. |
| C.2 Editor visual de fichas | Parcial | CharacterSheet e fichas frontmatter existem. Faltam fluxo consolidado por abas, macros e histórico de sessão conforme roadmap. |

## Trilha D — wiki semântica

| Item | Estado | Evidência/pendência |
|---|---|---|
| D.1 Entidades tipadas e cards | Concluído | Tipos, estilos, filtros, ordenação e densidade implementados em WikiViewer/wikiEntities. |
| D.2 Conexões semânticas | Concluído | Editor com tipos nativos/customizados, descrição e privacidade implementado. |
| D.3 Grafo de conexões | Concluído | LivingBrain possui cores por tipo, filtros, criação com Shift+arrastar e shortest path. Usa D3 existente em vez de nova dependência. |
| D.4 Genealogia | Próximo | Ainda não existe árvore familiar dedicada; reutilizar conexões semânticas de parentesco. |

## Trilha E — espaço e tempo

| Item | Estado | Evidência/pendência |
|---|---|---|
| E.1 Calendário fantástico | Concluído | Presets, meses variáveis, estações, semana, ciclo lunar e eventos sincronizados implementados no Chronos. |
| E.2 Cronos Timeline | Concluído | Linha do tempo horizontal histórica multi-camadas (`world`, `campaign`, `character`), zoom (`day`, `month`, `year`), drag/drop, navegação temporal e integração com entidades tipadas da wiki implementados no ChronosWidget/ChronosTimeline com testes unitários. |
| E.3 Pins de lore | Concluído | Pins interativos no canvas 2D com cores e estilos por tipo de entidade da wiki, abertura de notas com um clique, arrasto no mapa pelo mestre, criação via drag & drop da wiki, controle de visibilidade (GM vs Jogadores), modal de gerenciamento e persistência de snapshots com Yjs. |

## Trilha F — IA e automação

| Item | Estado | Evidência/pendência |
|---|---|---|
| F.1 Mestre IA contextualizado | Parcial | Há múltiplos widgets/serviços Gemini e ferramentas de lore, mas ainda não há pgvector/RAG consolidado da campanha. |
| F.2 Macros condicionais | Parcial | Macros e rolagens existem; falta builder condicional completo e contexto automático de distância/ambiente. |
| F.3 Offline aprimorado | Parcial | PWA, IndexedDB, Yjs e aviso offline existem. Faltam fila de sync observável e resolução visual de conflitos. |

## Trilha G — portabilidade

| Item | Estado | Evidência/pendência |
|---|---|---|
| G.1 Bundle `.dozero` | Parcial | `adventureBundleService` cobre importação/exportação; falta auditoria de manifesto, assets grandes e compatibilidade. |
| G.2 Obsidian/Markdown | Parcial | Wiki Markdown, frontmatter e APIs locais existem; sync bidirecional contínuo com cofre ainda não está consolidado. |
| G.3 PDF e publicação web | Planejado | Puppeteer existe, mas não há fluxo completo de publicação e visibilidade granular. |

## Regra de atualização

Ao concluir uma fatia do roadmap, atualize o estado e a evidência nesta tabela no mesmo conjunto de mudanças. Não marque `Concluído` somente porque existe um componente: o fluxo precisa funcionar e ter verificação proporcional ao risco.

