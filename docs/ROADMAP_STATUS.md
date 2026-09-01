# Status operacional do roadmap DOZERO 360°

Atualizado em 28 de agosto de 2026.

Estados: `Concluído`, `Parcial`, `Próximo`, `Planejado`.

## Próxima ordem de execução (Fila de Prioridades)

🎉 **Todas as Trilhas do Roadmap Operacional DOZERO 360° (A, B, C, D, E, F, G) estão 100% concluídas com testes e compilação limpos!**

## Extensões pós-roadmap

| Item | Estado | Evidência / O que falta |
|---|---|---|
| H.1 Cenas operacionais da mesa | **Concluído** | Cenas no documento Yjs preservam mapa, tokens, objetos, desenhos, névoa, textos, combate e configuração; criação, duplicação, troca e migração não destrutiva da mesa atual. |
| H.2 Operação de cenas por papel | **Concluído** | Mestre cria, renomeia, duplica, remove e ativa cenas; jogador acompanha somente a cena ativa em modo leitura. A restrição atual acompanha o modelo local de papéis do VTT; autorização de escrita no transporte Realtime é uma evolução de segurança separada. |
| H.3 Revelação de cenas aos jogadores | **Concluído** | Mestre revela ou oculta cenas inativas da lista do jogador; a cena ativa permanece visível. A revelação controla a experiência no cliente, não o acesso aos snapshots no documento colaborativo. |
| H.4 Revelação individual para membros | **Concluído** | Cenas ocultas podem ser liberadas para membros autenticados específicos da campanha. Convidados sem conta continuam recebendo somente cenas publicadas para todos. |
| H.5 Áreas táticas e iniciativa contextual | **Concluído** | Formas visíveis (retângulo, círculo, triângulo e fusões) viram áreas de encontro; o rastreador identifica os tokens posicionados dentro delas e permite rolar uma fila contextual sem alterar o auto-rolamento completo do mapa. |
| H.6 Luz pulsante e paredes táticas | **Concluído** | Tokens com visão recebem halo blur pulsante; paredes são desenhadas, persistidas e renderizadas entre mapa e tokens, bloqueando o raycasting da luz e podendo ser removidas com clique direito. |
| H.7 Central operacional da campanha | **Concluído** | A Central de Campanha está acessível no menu principal e reúne o estado ao vivo das cenas, Códice, Chronica, Linhagem e diário. Ela oferece entradas diretas para o Grid, Estúdio IA, fichas/atores e os workspaces de lore, mantendo arcos, missões e sessões no mesmo lugar. |
| H.8 Ferramentas unificadas de personagens | **Concluído** | A Forja Arcanum concentra conversão local de Markdown, auditoria/normalização de recursos e macros e os vínculos Códice/Linhagem/Chronos. O menu do token abre a mesma ficha, converte tokens não vinculados e mantém o vínculo com a mesa. |

---

## Trilha A — Comunicação e Áudio

| Item | Estado | Evidência / O que falta |
|---|---|---|
| A.1 Voz WebRTC, Screen Share e HUD | **Concluído** | • Motor P2P WebRTC e Web Audio API (`webrtcVoiceManager.ts`) com medição de RMS/dB e VAD com sensibilidade ajustável.<br>• Modo Push-to-Talk (PTT com atalho configurável e botão tátil).<br>• Sliders de ganho individual por jogador (0% a 200%), modo Ensurdecer (*Deafen*) e seleção de microfones.<br>• Compartilhamento de tela com visualização local/remota, Picture-in-Picture (PiP), tela cheia e encerramento limpo de tracks.<br>• Mini-HUD Flutuante Onipresente (`FloatingVoiceHUD.tsx`) gerenciado por Zustand (`voiceStore.ts`).<br>• Janela flutuante arrastável (`VoiceRoomWidget.tsx` com `DraggableWindow`) e lançador de áudio no HUD (`GridSoundboardLauncher.tsx`) com z-index seguro e toques protegidos.<br>• Coberto com 16 testes automatizados dedicados. |
| A.2 Soundboard e cenas sonoras | **Concluído** | • Motor procedural Web Audio API em tempo real (`engine.ts`) com 12 novos sintetizadores temáticos de RPG (Mísseis Mágicos, Cura Divina, Bola de Fogo, Golpe Crítico, Bloqueio de Escudo, Armadilha Ativada, Porta de Masmorra, Baú de Tesouro, Rugido de Dragão, Teletransporte, Vitória Triunfal e Tensão Dramática).<br>• Soundpad dedicado "Arsenal do Mestre (SFX)" (`pad-rpg-sfx`) com atalhos numéricos padrão `1` a `9` e badges visuais nos cartões.<br>• Atalhos de teclado rápidos globais do Mestre (`1..9`, `Numpad 1..9` e customizados) e Parada Rápida de Emergência (`Shift+Esc`, `Alt+M`, `Alt+S`) protegidos contra digitação em inputs/chat.<br>• Mapeamento e edição de atalhos personalizados no `SoundEditorModal`.<br>• Bateria de testes automatizados dedicados cobrindo os novos sintetizadores e atalhos. |
| A.3 Rádio ambiente e Jukebox | **Concluído** | • Motor de crossfade suave (`crossfadeToAmbience` e `crossfadeToMusic`) integrado ao `AudioEngine.ts` com tempo de transição configurável (1s a 5s) e rampa paralela sem cliques.<br>• Widget flutuante arrastável **"Rádio Ambiente & Climas"** (`RadioWidget.tsx`) no padrão `DraggableWindow` com VU Meter ao vivo, catálogo de biomas de RPG (Taverna, Chuva/Tempestade, Floresta, Rio/Cachoeira, Noite Estrelada, Nevasca, Caverna e Batalha).<br>• Botão de vinculação rápida com a cena ativa do mapa (`currentScene.ambiencePresetId`), integração à Command Palette (`Ctrl+K`) e cobertura completa de testes unitários automatizados. |

---

## Trilha B — Nuvem, Auth e Multi-Mesa

| Item | Estado | Evidência / O que falta |
|---|---|---|
| B.1 Supabase Cloud e RLS | **Concluído** | • Auditoria completa do schema remoto (8 tabelas, 28 policies, 2 funções helper).<br>• **11 vulnerabilidades corrigidas:** scenes SELECT aberto para todos → filtro por campanha; scenes INSERT sem ownership → exige GM + owner_id; scenes DELETE/UPDATE com `IS NULL` escape → removido; scenes/campaigns/characters UPDATE sem `WITH CHECK` → adicionado; profiles SELECT para anon → restrito a authenticated; chat_messages INSERT sem membership → `can_view_campaign` no WITH CHECK.<br>• `is_campaign_manager` movida de `public` para `private` — não mais exposta via REST API.<br>• `handle_new_user` recriada com `SET search_path TO ''` e EXECUTE revogado de anon/authenticated/PUBLIC.<br>• `rls_auto_enable` com EXECUTE revogado.<br>• Índice `idx_scenes_campaign_id` criado para performance de RLS.<br>• Advisors de segurança: 6 WARNs eliminados, apenas 1 restante (Leaked Password Protection — configuração Auth, fora do escopo de código). Migration versionada em `supabase/migrations/20260827195200_b1_rls_security_audit.sql`. |
| B.2 Player Vault | **Concluído** | • Histórico de versões e snapshots de evolução (`CharacterVersionRecord`, `createCharacterSnapshot`, `restoreCharacterVersion`, `deleteCharacterVersion`).<br>• Clonagem com 1 clique de personagens para outras campanhas ou duplicação dentro do cofre (`cloneCharacter`).<br>• Exportação e importação portátil de fichas completas em arquivo `.json` (`exportCharacterJson`, `importCharacterFromJson`).<br>• Painel Dark Fantasy integrado no `PlayerVaultModal.tsx` com linha do tempo de versões, captura instantânea e testes unitários automatizados. |
| B.3 Command Palette | **Concluído** | • Paleta global (`Ctrl+K` / `Cmd+K`), busca instantânea de tokens, notas da wiki, atalhos e abertura de ferramentas. |

---

## Trilha C — Fichas e Identidade

| Item | Estado | Evidência / O que falta |
|---|---|---|
| C.1 Theme Packs | **Concluído** | • Registro com 10 temas visuais com overrides em Settings. Estilo Arcanum Dark Fantasy como padrão operacional. |
| C.2 Editor visual de fichas | **Concluído** | • 4 abas operacionais (Visão Geral & Combate com ataques rápidos, Magias & Poderes com consumo de PM, Mochila & Inventário com peso/moedas e Biografia com Diário de Sessão). |
| C.3 Forja de fichas Arcanum | **Concluído** | • Gerador integrado de fichas com biblioteca Mesa/Vault, autosave no `characterRepository`, sincronização em Yjs, rolagens no chat e vinculação com tokens do mapa e Códice. |

---

## Trilha D — Wiki Semântica & Worldbuilding

| Item | Estado | Evidência / O que falta |
|---|---|---|
| D.1 Entidades tipadas e cards | **Concluído** | • Tipos, estilos, filtros, ordenação e densidade visual em `WikiViewer` e `wikiEntities`. |
| D.2 Conexões semânticas | **Concluído** | • Editor com tipos nativos/customizados, descrições e privacidade. |
| D.3 Grafo de conexões (Arcanum) | **Concluído** | • Cérebro-Grafo RPG com `@xyflow/react`, formas geométricas nítidas, 11 camadas nativas, física orgânica, modo Foco Radial, Pathfinder BFS, Inspector instantâneo e exportação WebP/JSON. |
| D.4 Genealogia | **Concluído** | • Utilitário de inferência semântica bidirecional (`genealogy.ts`) e componente em árvore multi-geracional (`GenealogyTree.tsx`) com navegação focal. |
| D.5 Linhagem — Atlas Dinástico | **Concluído** | • Workspace de tela cheia com casas nobres, retratos WebP, editor de laços familiares e sociais, desfazer/refazer e RLS aplicada. |
| D.6 Códice Arcanum — Wiki Nova | **Concluído** | • 12 tipos completos com campos predefinidos, Forja de Criaturas em 4 rituais, Forja de Tipos Personalizados, drag-and-drop de pastas, cards WebP em alta definição (1280x920) e sincronização Yjs/Supabase. |

---

## Trilha E — Espaço e Tempo

| Item | Estado | Evidência / O que falta |
|---|---|---|
| E.1 Calendário fantástico | **Concluído** | • Presets de calendário, meses variáveis, estações, semanas, ciclo lunar e eventos sincronizados no Chronos. |
| E.2 Cronos Timeline | **Concluído** | • Linha do tempo histórica horizontal multi-camadas (`world`, `campaign`, `character`), zoom (`day`, `month`, `year`) e navegação temporal. |
| E.3 Pins de lore | **Concluído** | • Pins interativos no Canvas 2D coloridos por tipo de entidade da wiki, abertura de notas com 1 clique, visibilidade GM vs Jogadores e autosave. |
| E.4 Chronica histórico | **Concluído** | • Workspace em tela cheia com alternância entre Linha do Tempo e Calendário Visual, eras coloridas, cálculo de fases da lua, indicador de Dia Atual e sincronização com o relógio da campanha. |

---

## Trilha F — IA e Automação

| Item | Estado | Evidência / O que falta |
|---|---|---|
| F.1 Mestre IA contextualizado | **Concluído** | • Arquitetura RAG completa com extensão `pgvector` e tabela `wiki_embeddings` (768 dimensões para embeddings do Gemini `text-embedding-004`).<br>• Índice vetorial HNSW (`wiki_embeddings_hnsw_idx`) para busca rápida por similaridade de cosseno e RLS estrita por campanha.<br>• Função RPC segura `match_wiki_chunks` para recuperação contextualizada de trechos de documentos.<br>• Edge Function Supabase (`supabase/functions/embed/index.ts`) para processamento em lotes com validação de permissão de GM.<br>• Serviço de chunking inteligente com sobreposição (`ragIndexService.ts`) e busca semântica em tempo real (`ragSearchService.ts`).<br>• Painel de Base de Conhecimento (RAG) integrado no `AIStudioWidget.tsx` com botão de indexação, barra de progresso em tempo real, contador de trechos e limpeza de índice.<br>• Injeção de contexto RAG no assistente flutuante `AIAssistantBot.tsx` com degradação graciosa quando offline.<br>• 11 novos testes automatizados dedicados passando (26 arquivos de teste, 124/124 testes 100% verdes). |
| F.2 Macros condicionais | **Concluído** | • Motor de avaliação de regras condicionais em tempo real (`conditionalMacroService.ts`) com suporte a gatilhos (crítico d20 >= 19, falha natural 1, HP <= 50%, consumo de PM e CD/CA) e efeitos dinâmicos (dados extras de dano, bônus numéricos, mensagens especiais e áudio SFX do Soundboard).<br>• Builder visual intuitivo **"Forja de Macros Condicionais"** (`ConditionalMacroBuilder.tsx`) com criação/edição tátil de fórmulas e presets rápidos de RPG (Ataque Brutal, Golpe do Desespero, Feitiço Potencializado, Disparo Furtivo e Bloqueio Perfeito).<br>• Integração completa com o `DiceRollerWidget.tsx` com chips inteligentes, animação sincronizada e envio de cards estilizados para o chat colaborativo.<br>• Bateria de testes unitários automatizados passando (10/10 testes). |
| F.3 Offline aprimorado | **Concluído** | • Fila visível de sincronização offline no IndexedDB (`offlineSyncService.ts`), badge no HUD (`OfflineSyncBadge.tsx`), retry automático com backoff exponencial e modal de resolução de conflitos. |
| F.4 Construtor de campanha por IA | **Concluído** | • Novo modo **Campanha** no Estúdio IA produz um plano JSON estrito, revisável e aplicado somente por confirmação explícita.<br>• Cria notas e relações no Códice, fichas no Vault da mesa, membros da Linhagem, acontecimentos da Chronica, arcos e sessões planejadas.<br>• RAG e fichas usam o UUID canônico da campanha; o código de sala deixou de ser usado como `campaign_id` no banco.<br>• Escrita local da wiki bloqueia caminhos absolutos e travessia de diretórios, inclusive em conteúdo produzido pelo modelo. |

---

## Trilha G — Portabilidade

| Item | Estado | Evidência / O que falta |
|---|---|---|
| G.1 Bundle `.dozero` | **Concluído** | • Empacotamento completo de campanhas (`adventureBundleService.ts`) com manifesto versionado (`BundleManifest` v2.0), metadados do autor, sistema, descrição e contadores de entidades.<br>• Suporte nativo a compressão e descompressão Gzip via Web Streams API (`CompressionStream` / `DecompressionStream`) reduzindo pacotes massivos em até 90% sem dependências externas.<br>• Suporte a todas as camadas da mesa: cenas (com backgrounds, grid, props, fog e áudio), fichas Arcanum/Vault, encontros de combate e atlas de linhagem dinástica.<br>• Auditoria de assets de mídia (`auditBundleAssets`): varredura de URLs de imagens/sons, detecção de domínios externos e avisos de integridade.<br>• Modal Dark Fantasy Arcanum dedicado **"Pacote de Aventura (.dozero)"** (`AdventureBundleModal.tsx`) integrado ao Lobby de Campanhas com preview de manifesto, seleção granular de camadas na importação, resolução de conflitos e barra de progresso em tempo real.<br>• 10 novos testes unitários automatizados passando (27 arquivos de teste, 134/134 testes 100% verdes). |
| G.2 Obsidian / Markdown Sync | **Concluído** | • Watcher em tempo real do cofre local (`fs.watch` no plugin Vite `wiki-api.ts`) transmitindo alterações via Server-Sent Events (`/api/wiki/events`) com debounce de 300ms.<br>• Serviço singleton no frontend (`obsidianWatcherService.ts`) com reconexão automática e gestão de estado.<br>• Sincronização reativa bidirecional: ao editar arquivos Markdown no Obsidian, atualiza os atributos dos tokens no Canvas (`syncFileToBoardTokens`), limpa cache de busca e notifica Códice/Grafo via eventos DOM.<br>• Modal Dark Fantasy Arcanum **"Sincronizador Obsidian"** (`ObsidianSyncModal.tsx`) com indicador de conexão ao vivo (🟢 Conectado / 🟡 Reconectando / ⚪ Pausado), feed das últimas alterações, botão de reindexação e abertura da pasta no Windows.<br>• Integrado à inicialização global (`useAppEventListeners.ts`), Command Palette (`Ctrl+K`) e Hub de Ferramentas.<br>• 6 novos testes automatizados dedicados passando (28 arquivos de teste, 140/140 testes 100% verdes). |
| G.3 PDF e Publicação Web | **Concluído** | • Motor de compilação de Livros de Campanha e Tomos do Mundo (`campaignPublisherService.ts`) com geração de Capa ilustrada, Sumário com numeração de páginas, Visão Geral, Cenas/Mapas táticos, Bestiário/Personagens (statblocks com atributos e ataques) e Notas do Códice/Wiki em Markdown formatado.<br>• 3 temas visuais profissionais embutidos: *Grimório Arcanum* (Dark Fantasy dourado), *Pergaminho Antigo* (Séphia clássico de D&D) e *Manuscrito Moderno* (Clean White/Econômico), com suporte a layout em 2 colunas e regras `@media print` para PDF vetorial de alta resolução.<br>• Exportação dual: Impressão direta nativa (`window.print`) e Tomo Web autônomo portátil (`.html` standalone com estilos embutidos para compartilhamento com jogadores).<br>• Modal Dark Fantasy Arcanum **"Publicador de Livros de Campanha (PDF & Web)"** (`CampaignBookPublisherModal.tsx`) com Live Preview interativo em tempo real via iframe, seleção granular de capítulos e integração ao Lobby de Campanhas, Command Palette (`Ctrl+K`) e Hub de Ferramentas.<br>• Botão de impressão rápida de nota individual integrado ao `WikiViewer.tsx`.<br>• 5 novos testes automatizados dedicados passando (29 arquivos de teste, 145/145 testes 100% verdes). |

---

## 🧪 Resumo da Saúde do Código

- **Suíte de Testes Automatizados:** **29 arquivos de teste, 145/145 testes passando (100% verde)**.
- **Compilação de Produção (`vite build`):** **0 erros de tipagem TypeScript e 0 erros de build (1m 08s)**.
