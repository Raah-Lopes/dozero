# Pesquisa aprofundada: skills e contexto para o DOZERO

**Data:** 25 de agosto de 2026  
**Projeto:** DOZERO VTT  
**Objetivo:** melhorar a qualidade de programação, UX, visual, testes e continuidade de contexto do Codex sem criar excesso de regras ou dependências.

## Resposta executiva

O principal problema atual não é falta de "inteligência" do modelo. É falta de uma fonte curta, confiável e persistente sobre o DOZERO.

O repositório não tem `AGENTS.md`, uma skill própria do projeto, um status operacional do roadmap ou um registro de decisões. Além disso, os documentos existentes têm trechos desatualizados, conflitos de versão e caracteres corrompidos. O `README.md`, por exemplo, contém marcadores de diff; `CONTRIBUTING.md` pede Node 20 enquanto `package.json` exige Node 24; e a arquitetura ainda descreve o projeto como predominantemente P2P apesar da evolução para Supabase.

Também foi verificado com `codex mcp list` que **nenhum servidor MCP está configurado nesta instalação do Codex**. Portanto, hoje o agente não tem acesso direto e persistente ao schema, migrations, logs ou advisors do Supabase.

A melhor solução é uma pilha pequena:

1. `AGENTS.md` curto e uma skill `dozero-context` feita para este projeto.
2. Skills oficiais do Supabase.
3. Duas skills oficiais da Vercel, usadas seletivamente.
4. Supabase MCP em modo seguro e Context7 para documentação atual.
5. Um fluxo obrigatório de teste funcional no navegador para mudanças de interface.

Instalar dezenas de skills não é recomendado. Um benchmark recente encontrou ganho médio de apenas 1,2% em tarefas de engenharia; 39 de 49 skills não melhoraram a taxa de sucesso, e algumas pioraram o resultado por incompatibilidade de versão. A conclusão útil é: skills especializadas e compatíveis ajudam; pacotes genéricos em massa ocupam contexto e introduzem conflitos. [SWE-Skills-Bench](https://arxiv.org/abs/2603.15401)

## Diagnóstico do ambiente atual

| Área | Estado observado | Consequência |
|---|---|---|
| Instruções persistentes | Não existe `AGENTS.md` | Cada tarefa depende demais da conversa atual |
| Contexto do projeto | Não existe skill própria do DOZERO | "Continue" não aponta de forma determinística para o próximo trabalho |
| Roadmap operacional | Roadmap detalhado está fora do repositório | Ele não é carregado automaticamente e não registra claramente o concluído |
| Decisões | Não existe `DECISIONS.md`/ADR atualizado | O código mostra o que mudou, mas não preserva bem o motivo |
| Documentação | Arquivos conflitantes e com mojibake | O agente pode seguir informação antiga ou incorreta |
| Supabase MCP | Nenhum servidor configurado | Sem contexto vivo de schema, RLS, logs e migrations |
| QA visual | Browser está disponível, mas não há protocolo do projeto | Builds podem passar sem validar o fluxo real do usuário |
| Skills existentes | Ponytail, MarkItDown, transições e ferramentas de mídia | Boas capacidades pontuais, mas sem coordenação específica do DOZERO |

Segundo a documentação oficial do Codex, `AGENTS.md` é lido antes do trabalho e pode ser dividido por escopo; arquivos mais próximos do diretório atual têm precedência. O limite combinado padrão é 32 KiB, então o arquivo raiz deve ser curto e apontar para referências sob demanda. [OpenAI Docs: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

As skills usam divulgação progressiva: inicialmente entram apenas nome e descrição; o `SKILL.md` completo é carregado quando necessário. Ainda assim, listas muito grandes podem ser truncadas ou competir por ativação, reforçando a necessidade de uma seleção pequena. [OpenAI Docs: Build skills](https://learn.chatgpt.com/docs/build-skills)

## Recomendação priorizada

| Prioridade | Skill ou integração | Origem | Benefício para o DOZERO | Decisão |
|---|---|---|---|---|
| P0 | `dozero-context` + `AGENTS.md` | Própria | Continuidade do roadmap, preferências do usuário, arquitetura e fluxo de trabalho | **Criar** |
| P0 | `supabase` | Supabase oficial | Auth, RLS, Realtime, Storage, Functions e migrations | **Instalar** |
| P0 | `supabase-postgres-best-practices` | Supabase oficial | Segurança RLS, índices, schema, concorrência e performance | **Instalar** |
| P0 | Supabase MCP com escopo do projeto | Supabase oficial | Schema, migrations, logs, advisors e tipos reais | **Configurar com segurança** |
| P0 | Context7 MCP | Exemplo recomendado na documentação do Codex | Documentação atual de React, Vite, PixiJS, Yjs e bibliotecas | **Configurar** |
| P1 | `web-design-guidelines` | Vercel oficial | UX, teclado, foco, formulários, touch, dark mode e performance visual | **Instalar** |
| P1 | `vercel-react-best-practices` | Vercel oficial | Waterfalls, bundle, renderizações e performance React | **Instalar seletivamente** |
| P1 | `dozero-functional-qa` | Própria | Smoke tests reais de login, mesa, wiki, calendário, áudio e multiplayer | **Criar** |
| P1 | GitHub plugin | GitHub/OpenAI plugin | Issues, PRs e contexto remoto que não está no clone local | **Conectar** |
| P2 | `accessibility`/`web-quality-audit` | Addy Osmani, comunidade reconhecida | WCAG 2.2, Lighthouse e Core Web Vitals | **Usar em auditorias** |
| P2 | `frontend-design` | Anthropic oficial | Direção estética menos genérica | **Somente em sprints visuais** |
| P3 | Playwright CLI + skill | Microsoft oficial | Automação E2E eficiente em tokens | **Adicionar se o browser atual for insuficiente** |

## 1. Programação e backend

### Supabase Agent Skills — instalar

O repositório oficial oferece duas skills relevantes. A skill geral cobre Database, Auth, Edge Functions, Realtime, Storage, Vectors, CLI e MCP. A skill de Postgres cobre performance, schema, concorrência, segurança e RLS. [Supabase Agent Skills](https://github.com/supabase/agent-skills)

```powershell
npx skills add supabase/agent-skills --skill supabase
npx skills add supabase/agent-skills --skill supabase-postgres-best-practices
```

Elas são altamente aderentes ao roadmap e têm baixo risco de orientação incompatível, pois vêm do próprio fornecedor.

### Vercel React Best Practices — instalar com escopo

A coleção oficial da Vercel cobre otimização React, waterfalls, bundle, renderizações e custo de JavaScript. [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills)

```powershell
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices
```

Restrição importante: o material também contém regras de Next.js/RSC, enquanto o DOZERO é uma SPA Vite. A skill própria do projeto deve ordenar que apenas regras de React cliente, bundle e renderização sejam aplicadas, ignorando recomendações exclusivas de Next.js.

Não recomendo instalar agora skills genéricas de React que exigem TanStack Query, SSR ou uma estrutura específica. Elas poderiam reorientar a arquitetura atual sem necessidade.

## 2. UX e acessibilidade

### Web Design Guidelines — instalar

A skill oficial da Vercel audita mais de cem decisões de interface: teclado, foco, formulários, feedback de erro, touch, animação reduzida, tipografia, imagens, estado na URL, dark mode e internacionalização. [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)

```powershell
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
```

Ela combina bem com a preferência por funcionalidade: funciona como revisão e não obriga uma reformulação visual em toda tarefa.

### Web Quality Skills — instalar apenas para auditorias

O pacote de Addy Osmani separa evidência de campo, Lighthouse, trace e inspeção estática, além de cobrir WCAG 2.2 e Core Web Vitals. [Web Quality Skills](https://github.com/addyosmani/web-quality-skills)

Recomendação: começar apenas por `accessibility` ou usar o plugin durante uma auditoria dedicada, em vez de carregar todas as seis skills permanentemente.

```powershell
npx skills add addyosmani/web-quality-skills --skill accessibility
```

## 3. Visual

### Frontend Design — opcional e explícita

A skill oficial da Anthropic orienta interfaces com direção estética deliberada e menos aparência de template. [Anthropic Frontend Design](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)

Ela não deve ficar responsável por toda mudança do DOZERO. O texto incentiva riscos estéticos e layouts marcantes, o que pode conflitar com a prioridade do usuário por funções. Se instalada, deve ser acionada apenas quando a tarefa for explicitamente redesign, identidade visual ou acabamento.

Para este projeto, uma referência própria baseada nos screenshots enviados é melhor: fundo azul-esverdeado quase preto, painéis densos, verde esmeralda como ação, tipografia legível, brilho reservado a estados ativos e hierarquia voltada à mesa. Essa referência deve viver dentro de `dozero-context/references/design-language.md`.

## 4. Testes funcionais e QA visual

O projeto já tem Vitest, Testing Library, Puppeteer e controle de navegador disponível no Codex. Portanto, adicionar outro framework agora seria duplicação.

A Microsoft mantém Playwright CLI e uma skill própria. A documentação afirma que CLI + skills tende a consumir menos contexto que MCP para agentes de programação. O requisito é Node 18+, compatível com o Node 24 do projeto. [Microsoft Playwright CLI](https://github.com/microsoft/playwright-cli)

Porém, o passo inicial mais eficiente é criar `dozero-functional-qa`, reutilizando o browser existente e definindo os fluxos que toda mudança deve verificar:

1. aplicação inicia sem erro de console;
2. login/logout e recuperação de sessão;
3. entrada/criação de campanha;
4. abertura da mesa e interação com token;
5. wiki, busca, cards e grafo;
6. calendário e eventos;
7. estados mobile e teclado;
8. build, testes focados e captura de evidência quando houver UI.

Playwright CLI só deve ser instalado quando precisarmos transformar esses fluxos em regressão E2E persistente ou rodá-los no CI.

## 5. Mais contexto e comportamento melhor

### A skill `dozero-context`

Esta é a mudança de maior impacto. Ela deve ser um roteador curto e carregar referências apenas quando relevantes:

```text
.agents/skills/dozero-context/
├── SKILL.md
└── references/
    ├── architecture.md
    ├── roadmap-status.md
    ├── design-language.md
    ├── data-and-security.md
    └── verification.md
```

Regras comportamentais propostas:

- "continue" significa: ler o status do roadmap, escolher a próxima fatia funcional de maior impacto ainda incompleta, implementar, testar e atualizar o status;
- funções têm prioridade sobre polimento visual, salvo pedido explícito;
- Ponytail opera em modo leve e nunca remove segurança, validação, acessibilidade ou uma função pedida;
- não inventar estado do Supabase: consultar MCP/schema/migrations;
- preservar arquivos pessoais, temporários e alterações não relacionadas;
- não fazer commit/push sem pedido explícito;
- registrar decisões estruturais, não cada pequena alteração;
- terminar com resultado, verificações e próximo item concreto do roadmap.

### `AGENTS.md` curto

O arquivo raiz deve conter somente regras sempre válidas e apontar para a skill. Não deve copiar o roadmap inteiro nem manuais de React. A documentação oficial do Codex alerta que instruções têm limite combinado; conteúdo específico deve ficar em referências carregadas sob demanda. [OpenAI Docs: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

### Status e decisões versionados

Criar:

- `docs/ROADMAP_STATUS.md`: concluído, parcial, próximo e bloqueios por item;
- `docs/AI_CONTEXT.md`: arquitetura atual confirmada pelo código;
- `DECISIONS.md`: decisões significativas e razões, em registros curtos.

O padrão de decision log comunitário é útil como referência porque cria um ciclo de ler decisões anteriores, trabalhar e registrar somente escolhas relevantes. Não é necessário instalar a skill de terceiros; podemos implementar a parte valiosa dentro da skill própria. [Agent Decision Log](https://github.com/jonocbell/agent-decision-log)

### Context7 MCP

A documentação oficial do Codex usa Context7 como exemplo de MCP gratuito para documentação de desenvolvimento. [OpenAI Docs: MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)

```powershell
codex mcp add context7 -- npx -y @upstash/context7-mcp
```

Isso não dá memória do DOZERO, mas reduz respostas desatualizadas sobre bibliotecas, algo importante porque o projeto usa React canary, Vite 8, TypeScript 6 e versões recentes de PixiJS/Yjs.

### Supabase MCP seguro

Para uso diário, configurar um servidor limitado ao projeto e somente leitura:

```powershell
codex mcp add supabase-ro --url "https://mcp.supabase.com/mcp?project_ref=pgyvtcgpaqzqqwwawixf&read_only=true&features=docs%2Cdatabase%2Cdebugging%2Cdevelopment"
codex mcp login supabase-ro
codex mcp list
```

O Supabase recomenda escopo por projeto, modo somente leitura, grupos mínimos de ferramentas e revisão humana das operações. Também recomenda não conectar o MCP a dados de produção; para alterações, o ideal é usar branch de banco ou habilitar acesso de escrita somente durante uma tarefa autorizada. [Supabase MCP Security](https://supabase.com/docs/guides/ai-tools/mcp)

Um perfil separado de escrita pode ser configurado depois, desabilitado por padrão e usado apenas quando o usuário pedir migrations, Functions ou mudanças de schema.

### GitHub e Figma

- **GitHub plugin:** recomendado para contexto de Issues, PRs, Actions e decisões fora do clone local. O `git` local continua suficiente para commits e diffs.
- **Figma plugin:** útil apenas se a linguagem visual do DOZERO for consolidada em arquivo Figma. Não vale instalar apenas para trabalhar com screenshots.

## O que não instalar agora

### Pacotes gigantes de skills

Não instalar coleções com dezenas ou centenas de skills sem seleção. Skills são texto operacional, não documentação passiva. Pesquisa recente demonstra ataques de cadeia de suprimentos por descrições e instruções maliciosas, além de scripts tradicionais. [Semantic Supply-chain Attacks on Agent Skills](https://arxiv.org/abs/2605.11418)

### Superpowers completo

O pacote tem bons módulos de debugging e revisão, mas seu fluxo é rígido, exige subagentes/revisões frequentes e pode tornar o comportamento ainda mais cerimonial. Isso conflita com o pedido por autonomia, continuidade e Ponytail com parcimônia. Podemos aproveitar ideias específicas sem instalar o pacote inteiro.

### Skills Vite/Vitest geradas sem pin de versão

Há skills comunitárias bem estruturadas, mas a skill Vitest encontrada está baseada no Vitest 5 beta, enquanto o projeto usa Vitest 4.1.9. O benchmark de skills mostra que incompatibilidade de versão pode reduzir a qualidade. Context7 e documentação oficial são opções melhores neste momento.

### MCP de navegador duplicado

O Codex já possui controle de browser e Chrome. Playwright MCP/CLI deve entrar apenas quando existir um caso não coberto ou quando os fluxos E2E forem persistidos no CI.

## Plano de adoção recomendado

### Etapa 1 — corrigir memória e comportamento

1. Criar `AGENTS.md` curto.
2. Criar a skill `dozero-context` com referências progressivas.
3. Criar `docs/AI_CONTEXT.md`, `docs/ROADMAP_STATUS.md` e `DECISIONS.md`.
4. Corrigir mojibake, marcadores de diff e versões conflitantes na documentação atual.
5. Migrar o roadmap externo para uma versão operacional dentro do repositório.

### Etapa 2 — especialização técnica

1. Instalar as duas skills oficiais do Supabase.
2. Instalar `web-design-guidelines`.
3. Instalar `vercel-react-best-practices` com limites para SPA Vite.
4. Configurar Context7 MCP.

### Etapa 3 — contexto vivo

1. Configurar `supabase-ro` com escopo de projeto.
2. Validar autenticação e listar schema/migrations/advisors.
3. Conectar GitHub plugin.
4. Criar um perfil Supabase de escrita apenas se necessário e com aprovação.

### Etapa 4 — qualidade de experiência

1. Criar `dozero-functional-qa` usando o browser já disponível.
2. Definir smoke tests dos fluxos críticos.
3. Instalar a skill de acessibilidade durante a primeira auditoria dedicada.
4. Avaliar `frontend-design` somente em um sprint visual específico.

## Critério de sucesso

Depois da adoção, um pedido simples como "continue" deve produzir sempre:

1. leitura do estado atual e das decisões relevantes;
2. seleção explícita do próximo item funcional do roadmap;
3. implementação coerente com arquitetura e estética do DOZERO;
4. teste unitário/integrado proporcional ao risco;
5. teste real no browser quando houver interface;
6. atualização do status e registro de decisão quando necessário;
7. resposta curta informando resultado, evidência e próximo passo.

## Limitações da pesquisa

- A qualidade de uma skill não é garantida por estrelas ou popularidade.
- Skills de terceiros podem mudar depois da análise; instalações devem ser fixadas ou revisadas antes da atualização.
- Skills não aumentam magicamente a janela de contexto. Elas melhoram seleção e recuperação de informação. A memória real do projeto deve permanecer em arquivos versionados e fontes vivas como GitHub/Supabase.
- O Supabase MCP não deve receber acesso irrestrito a produção. A senha de banco compartilhada anteriormente na conversa deve ser rotacionada; `.env.local` está corretamente ignorado pelo Git, mas isso não desfaz a exposição original.

## Fontes principais consultadas

- [OpenAI Docs — Build skills](https://learn.chatgpt.com/docs/build-skills)
- [OpenAI Docs — AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [OpenAI Docs — MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Supabase Agent Skills](https://github.com/supabase/agent-skills)
- [Supabase MCP Server e segurança](https://supabase.com/docs/guides/ai-tools/mcp)
- [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills)
- [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)
- [Addy Osmani Web Quality Skills](https://github.com/addyosmani/web-quality-skills)
- [Anthropic Frontend Design](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)
- [Microsoft Playwright CLI](https://github.com/microsoft/playwright-cli)
- [SWE-Skills-Bench](https://arxiv.org/abs/2603.15401)
- [Semantic Supply-chain Attacks on Agent Skills](https://arxiv.org/abs/2605.11418)
