# Roadmap para portar ferramentas completas ao DOZERO com outra IA

Este documento orienta a integração de uma ferramenta externa ao DOZERO sem reduzi-la a referência visual, demonstração ou versão simplificada. Ele deve ser usado junto com o código real da ferramenta de origem e atualizado pela IA durante o trabalho.

## Resultado esperado

Ao final, a ferramenta deve funcionar dentro da mesa como um módulo nativo do DOZERO, preservando suas funções relevantes, identidade visual e fluxos de uso. Ela também deve respeitar autenticação, campanhas, estado local-first, colaboração, persistência Supabase, responsividade e segurança do projeto.

Portar significa:

- compreender tudo que a ferramenta de origem faz antes de alterar o DOZERO;
- transportar os fluxos completos, não apenas copiar a aparência;
- integrar a ferramenta aos pontos de entrada reais da mesa;
- adaptar persistência, identidade, permissões e colaboração à arquitetura do DOZERO;
- preservar módulos existentes, salvo autorização explícita para substituí-los;
- verificar o resultado na aplicação em execução.

## Informações que o usuário deve fornecer

Preencha antes de iniciar:

| Campo | Valor |
|---|---|
| Nome da ferramenta | `[NOME]` |
| Pasta da ferramenta original | `[CAMINHO_ABSOLUTO]` |
| Nome desejado dentro do DOZERO | `[NOME_NO_DOZERO]` |
| Onde deve aparecer | `[BARRA/HUB/PALETA/OUTRO]` |
| Quem pode usar | `[MESTRE/JOGADORES/AMBOS]` |
| Módulo atual relacionado | `[MÓDULO OU NENHUM]` |
| Relação com o módulo atual | `[COMPLEMENTA/SUBSTITUI/INTEGRA]` |
| Dados que precisam ser persistidos | `[DADOS]` |
| Referências visuais adicionais | `[CAMINHOS OU NENHUMA]` |

## Regras obrigatórias para a IA

1. Ler `AGENTS.md`, `docs/AI_CONTEXT.md`, `docs/ROADMAP_STATUS.md` e `DECISIONS.md` antes de propor arquitetura.
2. Tratar o código atual, as migrations e as versões instaladas como fontes de verdade.
3. Inspecionar integralmente a ferramenta de origem sem editar ou apagar seus arquivos.
4. Não começar a implementação antes de produzir o inventário e a matriz de paridade funcional.
5. Não chamar uma entrega de completa enquanto houver funções da origem omitidas sem decisão explícita do usuário.
6. Não transformar a ferramenta em uma sombra, mock, iframe isolado ou tela apenas estética.
7. Não excluir módulos atuais. Quando houver sobreposição, integrar ou manter como suplemento conforme a decisão do usuário.
8. Usar Ponytail apenas em modo leve: reduzir duplicação e dependências, nunca escopo, segurança, acessibilidade ou qualidade.
9. Reutilizar React, Vite, Yjs, Zustand, D3, PixiJS, Supabase e utilitários já instalados quando forem adequados.
10. Não instalar dependências sem demonstrar uma lacuna real que a stack atual não resolve bem.
11. Não gravar segredos, tokens ou senhas. Nunca adicionar `.env.local` ao Git.
12. Alterações no Supabase devem usar migrations versionadas. Aplicação remota exige autorização explícita.
13. RLS deve proteger dados persistentes; ocultar um botão no cliente não é autorização.
14. Preservar alterações não relacionadas, `stats.html`, `desktop.ini`, `supabase/.temp/` e arquivos pessoais da wiki.
15. Não criar commit ou fazer push sem pedido explícito.

## Fase 0 — estabelecer o estado inicial

Objetivo: entender o ambiente antes de tocar no código.

Tarefas:

- registrar branch atual, alterações existentes e arquivos que não pertencem à tarefa;
- confirmar como o DOZERO é iniciado, testado e compilado;
- identificar os componentes, stores, serviços e migrations próximos do novo domínio;
- confirmar se o módulo será exclusivo do Mestre, compartilhado ou individual;
- executar uma verificação inicial pequena quando necessário para distinguir falhas anteriores de regressões novas.

Critério de saída:

- nenhuma alteração do usuário foi perdida;
- os limites da tarefa e os arquivos protegidos estão registrados;
- a IA sabe onde a integração deve entrar.

## Fase 1 — engenharia reversa da ferramenta original

Objetivo: transformar a ferramenta de origem em uma especificação verificável.

A IA deve inspecionar:

- estrutura de pastas, dependências e comandos;
- todas as telas, painéis, modais e estados vazios;
- modelos de dados, identificadores e formatos de importação/exportação;
- criação, leitura, edição, exclusão, duplicação e reordenação;
- busca, filtros, seleção, atalhos, histórico, desfazer/refazer e navegação;
- upload, transformação e exibição de imagens ou arquivos;
- responsividade, teclado, mouse, touch, foco e zoom;
- persistência local, APIs, banco e sincronização;
- exemplos, dados iniciais e comportamentos implícitos;
- bugs da origem que não devem ser reproduzidos.

### Matriz obrigatória de paridade

A IA deve criar e manter esta tabela antes da implementação:

| Capacidade da origem | Evidência/arquivo | Destino no DOZERO | Adaptação necessária | Estado | Teste de aceite |
|---|---|---|---|---|---|
| Exemplo | `src/...` | `src/components/...` | Usar campanha ativa | Pendente | Criar e recarregar item |

Estados permitidos: `Pendente`, `Em implementação`, `Validado`, `Omitido com aprovação`.

Critério de saída:

- todas as capacidades encontradas aparecem na matriz;
- a IA consegue explicar os fluxos principais da origem;
- qualquer omissão foi apresentada ao usuário, não decidida silenciosamente.

## Fase 2 — desenho da integração

Objetivo: definir como a ferramenta viverá dentro do DOZERO sem perder capacidades.

A proposta deve responder:

1. Qual componente será o workspace principal?
2. Como ele será aberto pela barra do Mestre, Hub, paleta ou fluxo solicitado?
3. Que partes podem ser portadas diretamente e quais precisam ser adaptadas?
4. Qual será a fonte de estado durante a sessão?
5. Que dados pertencem à campanha, ao usuário ou à sessão temporária?
6. Como o módulo se relaciona com Wiki, mapa, personagens, Chronica, Chronos e demais recursos relevantes?
7. Que papéis podem visualizar e editar?
8. Como importação/exportação permanecerá compatível?
9. Como falhas de rede serão apresentadas sem apagar o estado local?
10. Quais testes provam que o porte é completo?

### Arquitetura padrão do DOZERO

Use como ponto de partida, não como dogma:

```text
Interação imediata
  -> estado React/store do domínio
  -> Yjs + IndexedDB para sessão colaborativa/local-first
  -> serviço de persistência por campanha
  -> Supabase Postgres/Storage com RLS
```

Imagens grandes devem ir para Storage quando precisarem de persistência remota; metadados e documentos estruturados vão para Postgres. Não armazenar blobs grandes em Yjs ou JSONB sem justificar.

Critério de saída:

- há um plano vertical do clique de entrada até o dado persistido;
- integrações e permissões estão explícitas;
- nenhuma função importante depende de scaffold futuro para ser utilizável.

## Fase 3 — portar o núcleo funcional

Objetivo: colocar a ferramenta completa dentro da aplicação por fatias utilizáveis.

Ordem recomendada:

1. portar modelos, validações e utilitários puros;
2. adicionar testes unitários para regras críticas;
3. portar o workspace e a navegação principal;
4. portar CRUD e relações entre entidades;
5. portar busca, filtros, seleção, zoom, atalhos e histórico;
6. portar importação/exportação e compatibilidade com dados existentes;
7. portar mídia, imagens e transformações;
8. conectar ao registro de widgets, barra solicitada e paleta de comandos;
9. integrar com os módulos do DOZERO previstos na fase anterior.

Cada fatia deve terminar com um fluxo utilizável. Não entregar botões sem ação, serviços sem interface ou telas que só exibem dados de exemplo.

Critério de saída:

- todas as funções locais da matriz estão implementadas;
- a ferramenta pode ser usada do início ao fim sem depender ainda do banco;
- erros e estados vazios oferecem uma próxima ação clara.

## Fase 4 — estado, colaboração e Supabase

Objetivo: tornar a ferramenta persistente e segura por campanha.

Tarefas:

- definir o documento Yjs ou store compartilhado sem duplicar fontes conflitantes;
- preservar IndexedDB/local-first e tratar indisponibilidade da nuvem;
- criar serviço de carregamento e salvamento com feedback de `salvando`, `sincronizado`, `offline` e `erro`;
- criar migrations reaplicáveis em `supabase/migrations/`;
- adicionar chaves estrangeiras, constraints, índices e timestamps adequados;
- ativar RLS e criar policies por papel e participação na campanha;
- usar Storage privado e policies próprias quando houver mídia;
- testar usuário Mestre, membro, usuário externo e acesso anônimo quando aplicável;
- testar retry/conflito sem sobrescrever silenciosamente dados válidos;
- aplicar remotamente somente após autorização explícita.

Critério de saída:

- recarregar a aplicação preserva os dados;
- duas sessões autorizadas enxergam o estado esperado;
- usuário sem permissão não consegue ler ou alterar pela API;
- falha remota não destrói o estado local;
- nenhum dado de teste permanece no banco.

## Fase 5 — fidelidade visual e experiência

Objetivo: preservar a identidade útil da origem dentro da linguagem do DOZERO.

Regras:

- manter o conteúdo como plano focal em um workspace escuro e denso;
- adaptar cores e componentes sem apagar a personalidade da ferramenta;
- usar verde esmeralda para ações principais e estados ativos quando adequado;
- reservar brilho e animação para feedback, conexão ou foco;
- garantir nomes acessíveis, foco visível e tooltip em ações somente com ícone;
- oferecer touch targets adequados e funcionamento em telas estreitas;
- respeitar `prefers-reduced-motion`;
- diferenciar claramente carregamento, salvamento, sincronizado, offline e erro;
- não sacrificar área útil com decoração excessiva.

Critério de saída:

- o módulo parece parte do DOZERO sem perder a estética e ergonomia essenciais da origem;
- teclado, mouse e touch cobrem as ações principais;
- o fluxo continua legível em desktop e celular.

## Fase 6 — QA e prova de conclusão

Objetivo: demonstrar funcionamento, não apenas ausência de erros de compilação.

Verificações mínimas:

1. executar os testes focados do domínio;
2. executar checagem TypeScript e lint dos arquivos alterados;
3. executar `npm run build`;
4. abrir a aplicação real no navegador;
5. entrar em uma campanha e abrir a ferramenta pelo ponto solicitado;
6. criar, editar, relacionar, buscar, navegar, desfazer/refazer e excluir conforme a matriz;
7. recarregar e confirmar persistência;
8. validar importação/exportação com round-trip;
9. testar viewport móvel e interação por teclado;
10. verificar erros no console e requisições com falha;
11. validar RLS com os papéis relevantes;
12. confirmar que não ficaram dados, uploads ou scripts temporários.

### Definição de pronto

O porte só pode ser marcado como concluído quando:

- a matriz de paridade não possui itens `Pendente`;
- o fluxo principal funciona na aplicação em execução;
- persistência e autorização foram verificadas de ponta a ponta;
- build e testes relevantes passam;
- não há regressões conhecidas introduzidas pela integração;
- documentação reflete o estado real;
- omissões, se existirem, foram aprovadas pelo usuário.

## Fase 7 — documentação e entrega Git

Objetivo: deixar o trabalho compreensível e seguro para a próxima tarefa.

Tarefas:

- atualizar `docs/ROADMAP_STATUS.md` com evidências verificadas;
- adicionar uma entrada curta em `DECISIONS.md` somente se houve decisão estrutural duradoura;
- executar `git diff --check` e revisar todos os arquivos do commit;
- procurar credenciais e artefatos acidentais;
- manter fora do commit arquivos pessoais e mudanças não relacionadas;
- somente após pedido do usuário, criar commit descritivo e fazer push;
- confirmar que o commit remoto corresponde ao commit local.

## Formato de acompanhamento da IA

Durante o trabalho, a IA deve informar de forma curta:

- o que está sendo analisado;
- capacidades encontradas que alteram o plano;
- qual fatia utilizável está sendo implementada;
- verificações concluídas e falhas reais;
- qualquer decisão que dependa do usuário.

Ao final de cada rodada, responder:

```text
Resultado funcional:
- ...

Paridade:
- X de Y capacidades validadas
- Pendências reais: ...

Verificações:
- testes: ...
- build: ...
- navegador: ...
- banco/RLS: ...

Arquivos e dados:
- migrations: ...
- dados de teste removidos: sim/não
- arquivos locais preservados: ...

Próxima fatia concreta:
- ...
```

## Prompt mestre para colar na outra IA

Substitua os campos entre colchetes:

```text
Você vai portar integralmente a ferramenta [NOME], localizada em [CAMINHO_ABSOLUTO], para dentro do projeto DOZERO em D:\DOZERO.

Não trate essa pasta como mera referência ou inspiração. Quero transportar suas funções e experiência para um módulo nativo e utilizável dentro da mesa. Não exclua nem enfraqueça módulos existentes. O relacionamento com o módulo atual será: [COMPLEMENTA/SUBSTITUI/INTEGRA], conforme estas regras: [DETALHES].

Antes de alterar código:
1. Leia D:\DOZERO\AGENTS.md, docs/AI_CONTEXT.md, docs/ROADMAP_STATUS.md, DECISIONS.md e docs/AI_TOOL_PORTING_ROADMAP.md.
2. Inspecione integralmente a ferramenta de origem sem editá-la.
3. Produza uma matriz de paridade com cada tela, função, modelo de dados, interação, atalho, importação/exportação, mídia e persistência encontrados.
4. Mapeie cada capacidade para o destino concreto no DOZERO.
5. Explique apenas decisões que mudariam produto, dados ou permissões. Para escolhas locais seguras, avance com autonomia.

Requisitos desta integração:
- nome no DOZERO: [NOME_NO_DOZERO];
- ponto de entrada: [BARRA/HUB/PALETA/OUTRO];
- usuários autorizados: [MESTRE/JOGADORES/AMBOS];
- dados persistidos: [DADOS];
- integrações obrigatórias: [WIKI/MAPA/PERSONAGENS/CHRONICA/OUTRAS];
- referências visuais: [CAMINHOS OU NENHUMA].

Implemente por fatias verticais utilizáveis, mas não reduza o escopo final. Reutilize a stack atual. Mantenha Yjs/IndexedDB como caminho local-first quando houver estado de sessão e use Supabase com migrations e RLS para persistência por campanha. Nunca confie apenas em bloqueios visuais para autorização.

Preserve a estética funcional da origem e adapte-a à linguagem visual escura do DOZERO. Garanta teclado, foco, touch, responsividade, feedback de sync e estados de erro. Não entregue scaffold, mock, iframe ou botões sem função.

Após implementar, execute testes focados, TypeScript, lint, build e QA no navegador. Valide persistência e RLS com papéis reais, reverta dados de teste e atualize a matriz de paridade e o roadmap. Não faça commit nem push até eu pedir.

Comece pela Fase 0 e Fase 1. Mostre o inventário e a matriz de paridade antes de implementar.
```

## Comandos curtos para continuar com a outra IA

Depois do prompt mestre, use mensagens objetivas:

- `Implemente agora a primeira fatia vertical da matriz, sem reduzir o escopo final.`
- `Continue pela próxima capacidade pendente de maior impacto e atualize a matriz.`
- `Compare novamente com a origem e liste qualquer função ainda ausente antes de prosseguir.`
- `Faça o QA completo da definição de pronto e corrija as falhas encontradas.`
- `Aplique as migrations no Supabase autorizado, valide RLS e remova os dados de teste.`
- `Revise o diff, preserve meus arquivos locais e envie somente esta integração ao GitHub.`

Evite usar apenas `continue` enquanto a matriz ainda não existir. Depois que ela estiver atualizada, `continue` deve significar implementar e validar a próxima capacidade pendente de maior impacto.
