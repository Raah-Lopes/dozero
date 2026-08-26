# Portabilidade — Wiki Nova / Códice Arcanum

Fonte analisada integralmente: `D:\IMPLEMENTACOES DOZERO\WIKI NOVA`.

Destino: workspace **Wiki** do DOZERO, isolado por campanha. A Wiki Markdown atual permanece disponível como acervo legado da Mesa 0 durante a migração; não será usada como conteúdo inicial de novas mesas.

## Contrato de integração

- Cada campanha possui um Códice próprio: notas, tipos, campos, pastas, relações e vistas salvas.
- Mesas novas recebem somente os tipos estruturais padrão. Não recebem a campanha de demonstração “A Queda de Valdris”, fichas, mídia ou notas pessoais.
- O Cérebro Gráfico lê as entidades e relações do Códice; a Linhagem pode referenciar entidades do mesmo Códice. Fichas entrarão nesse contrato em uma etapa futura.
- Estado é local-first via Yjs/IndexedDB e sincronizado por campanha. A persistência Supabase usa RLS da campanha.
- Jogadores podem consultar; criação e edição respeitam o papel de Mestre/gerente já usado pelo DOZERO.
- Preferências puramente visuais ficam locais ao usuário; conteúdo e estrutura são compartilhados.

## Matriz de paridade

| Capacidade da origem | Integração DOZERO | Estado |
|---|---|---|
| Grade responsiva e densidade 3–6 colunas | Vista do Códice | Validado — grade responsiva com seletor 3..6 colunas e persistência em `localStorage` (`dozero:codex-columns`) |
| Lista pesquisável | Vista do Códice | Validado |
| Grafo SVG e inspeção | Encaminhar ao Cérebro Gráfico existente | Validado — entidades e relações do Códice alimentam diretamente o Cérebro Gráfico Arcanum com inspeção completa |
| Painel estatístico | Vista do Códice | Validado — totais, tipos, tags, favoritos, relações e pastas |
| CRUD de notas | Documento por campanha | Validado |
| CRUD de pastas e arrastar notas | Documento por campanha | Validado — criação, edição com paleta de cores, dissolução com preservação de notas (`deleteCodexFolder`), arrastar/soltar com realce visual em pastas e "Sem pasta" |
| Tipos personalizados e campos tipados | Schema do Códice | Validado — tipos, campos, seleção/lista/número/URL |
| Busca em nome, descrição, tags e campos | Índice local do Códice | Validado |
| Filtros por tipo, tag, pasta e favorito | Vista do Códice | Validado — múltiplas tags incluídas |
| Vistas filtradas salvas | Documento por campanha | Validado — salvar, aplicar e remover |
| Editor com imagem e links externos | Editor do Códice + Storage | Validado — conversão WebP e upload Storage com fallback local, link externo e prévia |
| Relações dirigidas/bidirecionais | Contrato comum Wiki/Cérebro/Linhagem | Validado — criação, validação, listagem e exclusão |
| Estatísticas, centralidade e recentes | Derivadas do documento | Validado — visualização dedicada no painel com "Coração da Teia" (grau de conexão e abertura direta), ranking "Mais conectadas", "Revisões recentes", barras por tipo/pasta e constelação de tags |
| Exportar cartão WebP | Exportação de entidade | Validado — cartão nativo 1280×920 em WebP |
| Forja de criatura em quatro passos | Cria nota tipada no Códice | Validado — identidade, ameaça, tática e revisão |
| Atalhos e fechamento por Escape | Workspace DOZERO | Validado — Escape fecha note editor, type manager, relation manager, stats drawer, folder modal e migration modal |
| Persistência local | Yjs + IndexedDB por sala | Validado |
| Persistência colaborativa | Supabase/Realtime por campanha | Validado — incluída no snapshot/Realtime por sala |
| Importar/exportar Códice completo | Bundle versionado | Validado — JSON versionado com normalização e validação |
| Migração da Wiki Markdown da Mesa 0 | Importador explícito, sem seed global | Validado — importação assistida por seleção, tipagem, tags, imagens e relações; fonte permanece intacta |

## Adaptações necessárias (sem perda funcional)

- Imagens em `data:` da origem serão migradas para Storage; URLs externas continuam aceitas.
- A simulação permanente O(n²) da origem não será copiada: o Cérebro Arcanum existente é o renderizador de relações.
- O reset para a campanha de exemplo será substituído por “limpar Códice”, com confirmação e sem recriar dados fictícios.
- Tipos padrão são recriados na leitura quando faltarem, mas nunca sobrescrevem tipos personalizados.
- Exclusões removem relações órfãs e referências de pasta no mesmo documento.

## Critério de conclusão

Uma linha só muda para `Validado` após existir no DOZERO, funcionar na Mesa 0, permanecer vazia em uma sala nova e passar por teste proporcional ao risco. Nenhuma capacidade será silenciosamente descartada.
