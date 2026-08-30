# Relatório de persistência e Realtime

## Motivo da intervenção

Foi relatado que conteúdos da mesa apareciam em uma sessão e depois sumiam, especialmente tokens com imagem. O mesmo tipo de inconsistência afetava a confiança em fichas, Cérebro, Códice, Chronica, linhagem e demais dados criados na campanha.

O problema não era uma única falha visual. Existiam caminhos de inicialização, sincronização, backup e mídia que podiam usar estados diferentes ou permitir que um estado mais antigo substituísse um estado novo.

## Resultado buscado

- A mesa ativa usa Yjs como estado compartilhado entre participantes.
- O navegador preserva a cópia local no IndexedDB.
- O Supabase Realtime propaga atualizações entre participantes.
- O snapshot da campanha conserva os dados no Supabase/Storage e pode ser restaurado.
- Imagens compartilhadas são URLs duráveis do Storage, nunca `base64`, `blob:` ou arquivos locais que só existem em uma máquina.

## Alterações realizadas

### 1. Um único formato de backup para a campanha

Arquivo principal: `src/services/roomPersistenceService.ts`.

- O `RoomBundle` passou da versão 2 para a versão 3.
- O bundle agora inclui, além do estado da mesa, `theater`, `chronos`, `lineage` e `world`.
- As fichas (`sheets`), o Códice/Wiki (`wiki`), cenas e metadados de cena já fazem parte do mesmo bundle e continuam incluídos.
- Foi criada a normalização de snapshots antigos. Um snapshot legado é convertido para o formato atual antes de tocar no documento compartilhado.
- Snapshots sem estrutura válida são rejeitados, em vez de limpar a mesa.
- A restauração automática identifica se já há conteúdo de mesa ativo e não o substitui.
- A restauração automática passa a **mesclar** dados do backup: ela não executa `clear()` em mapas existentes. Assim, uma alteração que chegou pelo Realtime enquanto o backup estava carregando não é apagada.
- Uma restauração manual continua substitutiva, como deve ser para recuperar deliberadamente um ponto da campanha.

### 2. Salvamento de campanha e fila offline coerentes

Arquivos: `src/services/roomPersistenceService.ts`, `src/services/offlineSyncService.ts`, `src/services/sessionSnapshotManager.ts` e `src/services/useAutoSaveSession.ts`.

- O backup manual, o autosave e a fila offline agora usam o mesmo `RoomBundle`; não há mais formatos concorrentes de snapshot.
- O bundle é salvo primeiro no IndexedDB local.
- A campanha existente é atualizada por `room_code`; o código da sala não é mais usado como se fosse o `id` da campanha em um `upsert`.
- Se a campanha não existir ou a conta não tiver permissão, a operação falha de forma explícita e pode ficar na fila offline. Não é criado um registro inconsistente.
- Apenas o Mestre autenticado executa o autosave periódico da campanha.
- O ponto manual de restauração usa o mesmo mecanismo de backup/restauração de sala, e não outro snapshot parcial.

### 3. Ordem segura de inicialização e sincronização

Arquivos: `src/services/yjs.ts` e `src/services/supabaseRealtimeProvider.ts`.

- IndexedDB é carregado antes de abrir os provedores Realtime. Isso evita que dados antigos locais sejam emitidos como se fossem uma edição nova para outros jogadores.
- Após conectar ao Realtime, a aplicação aguarda uma curta janela para que um participante já conectado responda à sincronização. O backup da campanha é usado apenas como fallback quando a mesa continua vazia.
- Atualizações aplicadas por hidratação automática de backup não são retransmitidas para os pares; isso elimina uma fonte de sobrescrita em cascata.
- Broadcasts do Supabase agora pedem confirmação (`ack`) e erros de envio passam a ser registrados.
- A resposta de sincronização inicial considera tokens, fundos, desenhos, paredes, névoa, textos, props e pins de lore, e não apenas tokens e backgrounds.
- O provedor remove seu listener do documento Yjs ao ser destruído, evitando listeners acumulados.
- O ciclo de hot reload de desenvolvimento encerra os canais anteriores. Também há proteção contra registrar novamente um callback de presença em um canal que já está inscrito.

### 4. Imagens só entram na mesa quando são duráveis

Arquivos afetados:

- `src/utils/githubApi.ts`
- `src/components/Chat/ChatWindow.tsx`
- `src/components/HUD/MapSettingsPanel.tsx`
- `src/components/UI/GridToolbar.tsx`
- `src/engine/GameCanvas.tsx`
- `src/components/Theater/SceneCluesModal.tsx`
- `src/components/Theater/StageProjectorDropzone.tsx`
- `src/components/Theater/TheaterAssetVault.tsx`
- `src/components/Widgets/GameMaster/ChronicleWidget.tsx`
- `src/components/Wiki/Codex/CodexWorkspace.tsx`

Mudança de regra: se o upload para o Supabase Storage falhar, a imagem não é gravada no estado compartilhado.

Antes, alguns fluxos aceitavam uma queda para `base64`, arquivo local ou URL temporária. Isso fazia a imagem aparecer na máquina que a enviou, mas não necessariamente para outra pessoa nem após recarregar a página. Agora o usuário recebe uma mensagem de erro e pode tentar novamente, sem contaminar a campanha com uma referência que os demais não conseguem acessar.

O `GameCanvas` também recusa fontes `data:` e `blob:` ao inserir uma imagem diretamente no mapa.

### 4.1. Assets organizados por sala, sem sobrescrita

Arquivo: `src/services/storageService.ts`.

- O bucket remoto `campaign-assets` foi conferido no Supabase: ele já é público, permitindo que os participantes da mesa abram a mesma URL de imagem.
- As policies existentes cobrem leitura, inserção, atualização e remoção do bucket. Como a configuração já atende à leitura compartilhada, não foi necessário alterar o banco.
- Cada upload novo usa uma pasta identificada pelo código da sala e um nome único; não há sobrescrita de um asset anterior.
- O upload usa `upsert: false`, portanto não depende de permissão de atualização para substituir arquivos.

### 5. Cérebro livre persistente e compartilhado

Arquivos: `src/components/Wiki/LivingBrain.tsx` e `src/components/Wiki/Graph/ArcanumGraph.tsx`.

- O grafo livre do Cérebro deixou de depender exclusivamente do Vault em `localStorage`.
- Nós, conexões, tipos personalizados e vistas salvas passam a ser armazenados em `state.wiki` com a chave `__arcanum_graph_v1__`.
- Como `state.wiki` pertence ao documento Yjs, o grafo agora é enviado pelo Realtime e incluído no `RoomBundle` da campanha.
- O Cérebro reage a alterações recebidas da outra sessão sem criar um ciclo de gravação.
- O Vault local foi preservado apenas como fallback para outros possíveis consumidores isolados do componente; a mesa usa a persistência compartilhada.

### 6. Limpeza de uma correção destrutiva antiga

Arquivo: `src/hooks/useAppEventListeners.ts`.

- Foi removido o sanitizador de token que, em produção, apagava periodicamente URLs que continham `/api/wiki/media`.
- Um processo que altera tokens automaticamente não é aceitável como forma de lidar com uma URL inválida: ele pode causar exatamente o efeito de token/imagem desaparecerem relatado inicialmente.

## Persistência por domínio após a mudança

| Domínio | Realtime da mesa | Backup da campanha | Persistência específica |
| --- | --- | --- | --- |
| Tokens, fundos, desenhos, paredes, névoa, textos, props e pins | Yjs/Supabase Realtime | RoomBundle | IndexedDB local |
| Imagens dos domínios acima | URL compartilhada | URL dentro do RoomBundle | Supabase Storage |
| Fichas | `state.sheets` | RoomBundle | Repositório de personagens quando autenticado |
| Códice e nós | `state.wiki` | RoomBundle | Códice/Wiki |
| Cérebro livre | `state.wiki.__arcanum_graph_v1__` | RoomBundle | Yjs + IndexedDB |
| Chronica/Chronos | `state.chronos` | RoomBundle | IndexedDB; serviços existentes quando aplicáveis |
| Linhagem | `state.lineage` | RoomBundle | Serviço de atlas quando autenticado |
| Mundo | `state.world` | RoomBundle | IndexedDB e snapshot |
| Teatro | `state.theater` | RoomBundle | IndexedDB e snapshot |

## Verificações executadas

### Testes automatizados

Foi executado:

```powershell
npx vitest run src/services/roomPersistenceService.test.ts src/store/tableScenes.test.ts src/store/world.test.ts --reporter=verbose
```

Resultado: **19 testes aprovados**.

Os testes de persistência cobrem:

- normalização de snapshots legados;
- rejeição de snapshots inválidos;
- proteção de conteúdo vivo da mesa;
- inclusão de Chronica, linhagem e mundo no bundle;
- mesclagem segura durante hidratação automática;
- preservação do grafo livre compartilhado.

### Build de produção

Foi executado:

```powershell
npm run build
```

Resultado: build concluído com sucesso. Permanecem somente avisos já conhecidos de chunks grandes e imports dinâmicos que não geram divisão de bundle.

### Teste funcional em duas sessões

Em uma sala isolada de QA, foram abertas duas sessões da aplicação.

1. Foi criado um nó chamado `Nó QA sincronizado 20260830` na sessão A.
2. O nó apareceu na sessão B.
3. A sessão B foi recarregada e o nó continuou presente.
4. O nó foi excluído na sessão A e a remoção apareceu na sessão B.
5. O dado de teste foi removido ao final.

Também foi provocada uma recarga quente de desenvolvimento para confirmar que o ajuste do ciclo de vida do canal Realtime não deixa erro de callback de presença.

## Limites desta validação

O bucket `campaign-assets` e suas policies foram inspecionados no painel autenticado do Supabase. Ele já está público e possui regras de leitura, inserção, atualização e remoção; nenhuma alteração remota de banco foi necessária para esta correção.

O teste de duas sessões validou o documento compartilhado, a propagação Realtime, a recarga e o novo caminho de persistência do Cérebro. Ele não substitui a validação com duas contas autenticadas reais, porque permissões RLS, acesso à campanha e uploads no Storage dependem do usuário e da configuração publicada.

## Roteiro de aceitação em ambiente publicado

Use uma campanha descartável, por exemplo `qa-sync-agosto`, e duas contas distintas: Mestre e Jogador.

1. O Mestre cria/abre a campanha e compartilha o mesmo código ou link da sala com o Jogador.
2. Confirme que as duas telas indicam conexão com a sala.
3. O Mestre cria um token com imagem; o Jogador deve vê-lo.
4. Mova o token conforme as permissões do papel; a outra tela deve refletir a mudança em poucos segundos.
5. Crie uma ficha, um nó no Cérebro, um evento da Chronica e um registro de linhagem; confira cada mudança no outro dispositivo.
6. Recarregue as duas páginas, entre novamente na mesma sala e confirme que todos os dados continuam presentes.
7. Faça alterações quase simultâneas e confirme que nenhuma delas é revertida ou some.

Critério de aprovação: as alterações aparecem no outro participante e sobrevivem ao recarregamento; imagens aparecem usando URL do Storage, não referências locais.

## Controle de alterações

- Nenhum commit ou push foi criado.
- Nenhuma migration ou alteração remota de banco foi necessária.
- A alteração pessoal já existente em `wikidozero/[1] 🏕️ Campanha Principal/Personagens/Jogadores/Kael Ironfist.md` não foi modificada por este trabalho.
