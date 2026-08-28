# Decisões do DOZERO

Registros curtos de escolhas que afetam trabalhos futuros. Isto não substitui o changelog.

## 2026-08-27 — Arcanum como padrão visual da mesa

**Status:** Ativa

**Decisão:** usar a linguagem visual da Forja de Fichas Arcanum como padrão das janelas, menus e superfícies do VTT: tinta escura, texto de pergaminho, âmbar/cobre, tipografia serifada e painéis opacos sem glassmorfismo. Temas alternativos continuam disponíveis como variações intencionais.

**Motivo:** unificar a experiência entre mesa, Códice, fichas, calendário e ferramentas, substituindo o padrão cyberpunk/neon por uma identidade coerente com o worldbuilding do DOZERO.

## 2026-08-26 — Códice por campanha como fonte do ecossistema

**Status:** Ativa

**Decisão:** a Wiki Nova será portada como Códice estruturado e isolado por campanha. Cérebro Gráfico, Linhagem e futuras fichas referenciam as entidades desse documento. A Wiki Markdown empacotada permanece somente como acervo de migração da Mesa 0 e nunca como seed de novas mesas. O estado usa Yjs/IndexedDB e integra o snapshot Supabase da campanha.

**Motivo:** impedir vazamento de conteúdo pessoal/teste entre mesas e estabelecer uma identidade comum entre os módulos de worldbuilding sem apagar o acervo atual.

## 2026-08-26 — Linhagem como atlas dinástico completo

**Status:** Ativa

**Decisão:** portar a ferramenta Linhagem como workspace completo do DOZERO, preservando todas as operações autorais; manter a genealogia contextual da Wiki como visão complementar, sem substituí-la. O atlas usa Yjs/IndexedDB durante a sessão e um documento JSONB por campanha no Supabase para persistência durável.

**Motivo:** árvores dinásticas exigem edição e navegação próprias, enquanto a Wiki continua adequada para consulta contextual de uma entidade.

## 2026-08-25 — Chronica como núcleo histórico

**Status:** Ativa  
**Decisão:** usar o Chronica como espaço principal para eras e acontecimentos históricos; manter o Chronos como suplemento operacional para calendário, passagem do tempo, clima, lua, estações e eventos datados da sessão.  
**Motivo:** a história do mundo precisa aceitar escalas longas, anos negativos e ano zero sem comprometer os cálculos de calendário usados durante o jogo. Os dois módulos compartilham eventos sincronizados, mas apresentam fluxos próprios.

## 2026-08-25 — Funções antes de polimento isolado

**Status:** Ativa  
**Decisão:** priorizar fatias funcionais completas; aplicar estética quando melhora clareza, imersão ou faz parte do pedido.  
**Motivo:** preferência explícita do usuário e foco do roadmap.

## 2026-08-25 — Ponytail em modo leve

**Status:** Ativa  
**Decisão:** usar Ponytail para reduzir duplicação e dependências, nunca para limitar uma boa implementação, segurança, acessibilidade ou testes.  
**Motivo:** o modo integral estava influenciando demais o escopo das soluções.

## 2026-08-25 — Estado local-first com persistência Supabase

**Status:** Ativa  
**Decisão:** manter Yjs/IndexedDB como caminho responsivo da sessão e Supabase como autenticação, persistência, presença e sync universal.  
**Motivo:** preserva funcionamento offline e adiciona acesso multi-dispositivo sem transformar toda interação em round-trip de banco.

## 2026-08-28 — Cenas operacionais no documento Yjs

**Status:** Ativa

**Decisão:** cada cena operacional da mesa guarda um snapshot dos mapas que compõem o tabuleiro (tokens, fundos, props, desenhos, fog, textos, combate e configurações) no mesmo documento Yjs da sala. A cena ativa é materializada nos mapas legados para preservar o Canvas e as ferramentas atuais; a primeira abertura do gestor migra a mesa existente para uma cena inicial.

**Motivo:** permite trocar e duplicar cenários sem reescrever o VTT, sem perder mesas já existentes e mantendo o sync local-first e colaborativo.

## 2026-08-28 — Mestre como operador das cenas

**Status:** Ativa

**Decisão:** operações de criar, renomear, duplicar, excluir e ativar cenas ficam disponíveis apenas para o estado de Mestre; jogadores recebem a cena ativa compartilhada em modo leitura.

**Motivo:** preserva a condução da sessão sem duplicar o gestor de cenas ou alterar as ferramentas legadas do Canvas.

**Limite:** essa proteção acompanha o modelo atual de papéis no cliente. O canal Yjs/Realtime ainda precisará de autorização no servidor antes de ser tratado como fronteira de segurança.

## 2026-08-28 — Revelação de cenas como controle de experiência

**Status:** Ativa

**Decisão:** o Mestre pode revelar ou ocultar cenas inativas da lista exibida aos jogadores; a cena ativa é sempre revelada para manter a mesa compartilhada compreensível.

**Motivo:** evita antecipar nomes de locais e material preparado durante a sessão, sem introduzir uma segunda visualização do Canvas.

**Limite:** os snapshots continuam no documento Yjs compartilhado. A revelação reduz descoberta na interface, mas não substitui filtros de dados e autorização no servidor.

## 2026-08-28 — Revelação individual usa membros autenticados existentes

**Status:** Ativa

**Decisão:** cenas ocultas podem conter uma lista de IDs de membros da campanha autorizados a vê-las. A interface usa a associação já protegida por RLS em `players`; convidados sem autenticação só enxergam cenas publicadas para todos.

**Motivo:** entrega personalização por jogador sem novo schema, migração ou cadastro paralelo de participantes.

**Limite:** a lista de IDs e os snapshots ainda trafegam no documento Yjs. Ela controla a interface do cliente e não substitui uma autorização de conteúdo no servidor.

## 2026-08-28 — Formas desenhadas como áreas de encontro

**Status:** Ativa

**Decisão:** formas táticas visíveis do Canvas (incluindo formas fundidas) são tratadas como áreas semânticas para localizar tokens e oferecer uma rolagem contextual de iniciativa. O auto-rolamento completo do mapa permanece disponível para manter o fluxo anterior intacto.

**Motivo:** aproveita o desenho que o Mestre já faz na cena para iniciar combates locais, sem exigir cadastro paralelo de encontros ou alterar a posição dos tokens.

## 2026-08-28 — Paredes compartilhadas alimentam renderização e visão

**Status:** Ativa

**Decisão:** paredes táticas são segmentos persistidos no mapa Yjs `walls`, renderizados entre fundos e tokens e enviados ao mesmo raycasting da névoa de guerra. A ferramenta mantém uma aparência legível (faixa laranja com realce) e permite remoção contextual por clique direito.

**Motivo:** mantém a leitura visual do Grid 1 e garante que o bloqueio de luz acompanhe a mesma fonte colaborativa da cena, sem duplicar geometria em fog ops.

**Limite:** o modelo atual de papéis do cliente continua sendo a fronteira de operação; a autorização definitiva precisa ser reforçada no transporte/servidor.

## 2026-08-25 — Reutilizar D3 no cérebro semântico

**Status:** Ativa  
**Decisão:** implementar filtros, criação de conexão e shortest path sobre o grafo D3 existente, sem adicionar XY Flow somente para cumprir o nome do roadmap.  
**Motivo:** a capacidade necessária já era atendida pela stack instalada com menor bundle e menor migração.

## 2026-08-25 — Contexto persistente com divulgação progressiva

**Status:** Ativa  
**Decisão:** manter `AGENTS.md` curto e carregar arquitetura, roadmap, design e QA por uma skill própria e documentos versionados.  
**Motivo:** melhora consistência entre tarefas sem ocupar o contexto de toda solicitação com manuais extensos.

## 2026-08-25 — Supabase MCP limitado por padrão

**Status:** Ativa  
**Decisão:** usar MCP com `project_ref`, grupos mínimos e modo somente leitura no trabalho cotidiano; escrita apenas em tarefa explicitamente autorizada.  
**Motivo:** reduz superfície de ataque e evita alterações acidentais em dados hospedados.
