# Status operacional do roadmap DOZERO 360°

Atualizado em 27 de agosto de 2026.

Estados: `Concluído`, `Parcial`, `Próximo`, `Planejado`.

## Próxima ordem de execução

1. **F.2 Macros condicionais** — builder condicional e contexto automático.
2. **A.1 Voz WebRTC e screen share** — auditoria de permissões granulares e áudio TURN.
3. **A.2 Soundboard e cenas sonoras** — grid configurável de sons e presets.
4. **A.3 Rádio ambiente** — rádio flutuante com presets e crossfade.

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
| C.1 Theme Packs | Concluído | Registro com dez temas, troca e overrides em Settings. Arcanum é o padrão global da mesa; os demais temas permanecem como variações intencionais. |
| C.2 Editor visual de fichas | Concluído | Painel unificado em 4 abas operacionais (Visão Geral & Combate com ações rápidas de ataque, Magias & Poderes com consumo automático de PM, Mochila & Inventário com controle de quantidade/peso e Biografia com Diário de Sessão) sem depender de edição direta de YAML cru. |
| C.3 Forja de fichas Arcanum | Concluído | Gerador de `D:\DOZERO\FICHAS SISTEMA` integrado como workspace sob demanda com biblioteca Mesa/Vault, modelo discriminado `arcanum` extensível, presets de sistema, autosave no `characterRepository`, estado de fichas da mesa em Yjs/snapshot, rolagens no chat, vínculo com Códice, criação e atualização de tokens e importação/exportação JSON preservadas. Fluxos de criação, edição, reabertura, vínculo e token verificados no navegador. |

## Trilha D — wiki semântica

| Item | Estado | Evidência/pendência |
|---|---|---|
| D.1 Entidades tipadas e cards | Concluído | Tipos, estilos, filtros, ordenação e densidade implementados em WikiViewer/wikiEntities. |
| D.2 Conexões semânticas | Concluído | Editor com tipos nativos/customizados, descrição e privacidade implementado. |
| D.3 Grafo de conexões (Arcanum) | Concluído | A ferramenta `D:\IMPLEMENTACOES DOZERO\GRAFO` foi portada integralmente, substituindo o antigo grafo D3 pelo moderno Arcanum Cérebro-Grafo RPG com `@xyflow/react`. Oferece nós com formas geométricas nítidas (círculo, losango, hexágono, escudo, quadrado), 11 camadas nativas de RPG com templates automáticos, física orgânica ativável, constelações por camada, modo Foco Radial, Pathfinder com BFS iluminando rotas, Ficha Completa RPG no duplo clique, Inspector instantâneo no 1 clique, suporte a links e menções bidirecionais `[[Wiki]]`, busca com auto-foco, filtros por camada e `#tags`, vistas salvas, radiografia estatística e exportação em alta definição (.webp) e cofre JSON. Totalmente integrado à Wiki e com fallback na sessão da campanha ativa. |
| D.4 Genealogia | Concluído | Utilitário de inferência semântica e bidirecional de parentesco (`genealogy.ts`), componente visual hierárquico multi-geracional (`GenealogyTree.tsx`) com navegação focal e cards informativos integrado ao WikiViewer com testes unitários. |
| D.5 Linhagem — atlas dinástico | Concluído | A ferramenta `D:\IMPLEMENTACOES DOZERO\LINHAGEM` foi portada integralmente como workspace em tela cheia: árvore navegável com pan/zoom/foco, casas, retratos e brasões WebP, editor, vínculos familiares e sociais, relações estendidas, criação de elos intermediários, busca, desfazer/refazer, atalhos e importação/exportação JSON. Acesso pela barra do Mestre, Hub e paleta; estado local-first via Yjs/IndexedDB e tabela `lineage_atlases` com RLS aplicada no Supabase. A recursão preexistente entre as policies de `campaigns`/`players` foi corrigida; as campanhas legadas `mesa-1` e `mesa-2` foram atribuídas ao perfil `raphaell.lops`; e a gravação/leitura do atlas pelo Mestre foi validada sob RLS em uma transação revertida, sem deixar dados de teste. |
| D.6 Códice Arcanum — Wiki Nova | Concluído | Integração integral e finalizada com fidelidade visual completa ao design original Arcanum (paleta dark fantasy tinta/âmbar, Cinzel, Alegreya Sans, bordas ornadas, partículas de brasa e hover com brilho na cor de cada tipo de nota). Inclui os 12 tipos completos com campos predefinidos em português (Personagem, Local, Evento, Item, Criatura, Entidade, Organização, Divindade, Raça, Resumo de Sessão, Rota, Conceito) e modal "Que página abrir no códice?", Forja de Criaturas em 4 rituais, Forja de Tipos Personalizados (`CodexTypeModal`), drag & drop de notas com feedback dourado para pastas e "Sem pasta", conversão automática de capas e mini-galeria múltipla em WebP, teia semântica com setas direcionais e editor inline integrada ao Cérebro Grafo, Calendário Chronos e Árvore Genealógica (Linhagem), exportação de cards WebP em alta definição (1280x920) com moldura dourada e monograma ornamental, exportação/importação individual de notas `.dozero-note.json`, 4 vistas (Grade com 3-6 colunas, Lista, Grafo de forças D3 e Estatísticas com Coração da Teia) e sincronização colaborativa em tempo real com Yjs/IndexedDB/Supabase. |

## Trilha E — espaço e tempo

| Item | Estado | Evidência/pendência |
|---|---|---|
| E.1 Calendário fantástico | Concluído | Presets, meses variáveis, estações, semana, ciclo lunar e eventos sincronizados implementados no Chronos. |
| E.2 Cronos Timeline | Concluído | Linha do tempo horizontal histórica multi-camadas (`world`, `campaign`, `character`), zoom (`day`, `month`, `year`), drag/drop, navegação temporal e integração com entidades tipadas da wiki implementados no ChronosWidget/ChronosTimeline com testes unitários. |
| E.3 Pins de lore | Concluído | Pins interativos no canvas 2D com cores e estilos por tipo de entidade da wiki, abertura de notas com um clique, arrasto no mapa pelo mestre, criação via drag & drop da wiki, controle de visibilidade (GM vs Jogadores), modal de gerenciamento e persistência de snapshots com Yjs. |
| E.4 Chronica histórico | Concluído | Workspace principal em tela cheia com alternância fluida entre "Linha do Tempo" e "Calendário Visual" integrado: identidade visual do mundo, mapa proporcional, eras coloridas com reordenação/duplicação/recolhimento/drag-and-drop, registros tipados com suporte a dia/mês/ano e tags; visualização mensal e visão anual (12 meses com contagem de acontecimentos e estações), cálculo em tempo real das fases da lua por dia, indicador radiante de "Dia Atual da Campanha", suporte a anos negativos e ano zero, criação direta de acontecimentos em células diárias, sincronização bidirecional com o relógio operacional `state.chronos` (ajuste e avanço de dia pelo Mestre com cálculo de consequências e estações), upload de imagens no Supabase Storage com fallback local, importação/exportação JSON compatível e cobertura de testes automatizados. |

## Trilha F — IA e automação

| Item | Estado | Evidência/pendência |
|---|---|---|
| F.1 Mestre IA contextualizado | Parcial | Há múltiplos widgets/serviços Gemini e ferramentas de lore, mas ainda não há pgvector/RAG consolidado da campanha. |
| F.2 Macros condicionais | Parcial | Macros e rolagens existem; falta builder condicional completo e contexto automático de distância/ambiente. |
| F.3 Offline aprimorado | Concluído | Fila visível de sincronização offline com persistência no IndexedDB (`offlineSyncService.ts`), badge no HUD (`OfflineSyncBadge.tsx`) com contagem de pendências, retry automático com backoff exponencial e modal de resolução de conflitos (`ConflictResolutionModal.tsx`) integrado com testes unitários. |

## Trilha G — portabilidade

| Item | Estado | Evidência/pendência |
|---|---|---|
| G.1 Bundle `.dozero` | Parcial | `adventureBundleService` cobre importação/exportação; falta auditoria de manifesto, assets grandes e compatibilidade. |
| G.2 Obsidian/Markdown | Parcial | Wiki Markdown, frontmatter e APIs locais existem; sync bidirecional contínuo com cofre ainda não está consolidado. |
| G.3 PDF e publicação web | Planejado | Puppeteer existe, mas não há fluxo completo de publicação e visibilidade granular. |

## Regra de atualização

Ao concluir uma fatia do roadmap, atualize o estado e a evidência nesta tabela no mesmo conjunto de mudanças. Não marque `Concluído` somente porque existe um componente: o fluxo precisa funcionar e ter verificação proporcional ao risco.
