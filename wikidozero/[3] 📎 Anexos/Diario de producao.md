# Diario de producao

minhas atualizações devem ser salvas usando esse githup para termos várias versões dele [https://github.com/Raah-Lopes/dozero](https://github.com/Raah-Lopes/dozero)

Atue como um Engenheiro de Software Sênior especialista em desenvolvimento frontend e arquitetura de dados estáticos/locais.&#x20;

Estou desenvolvendo um Virtual Tabletop (VTT) para RPG de mesa chamado \*\*Dozero\*\*. O projeto utiliza \*\*Vite\*\* como ferramenta de build. Tenho uma seção no sistema chamada \*\*Wiki\*\*, que consome uma base de dados local de notas sincronizada com o Git.

\*\*O Objetivo Principal:\*\*
Preciso criar uma funcionalidade na Wiki inspirada no sistema de "Propriedades" e no plugin "Dataview" do Obsidian. Quero que minhas notas de texto deixem de ser estáticas e passem a funcionar como um banco de dados relacional e consultável.

\*\*Requisitos da Funcionalidade:\*\*
1\. \*\*Sistema de Metadados (Frontmatter):\*\* Precisamos de uma forma de adicionar pares de chave-valor (ex: \`tipo: monstro\`, \`hp: 50\`, \`tags: \[fogo, chefe]\`) aos arquivos da Wiki, provavelmente usando YAML no topo de arquivos Markdown, ou uma estrutura JSON equivalente.
2\. \*\*Indexação na Memória:\*\* Quando a Wiki for carregada, o sistema precisa ler todos esses arquivos locais, extrair os metadados e criar um Índice (Index) global no frontend para buscas instantâneas.
3\. \*\*Motor de Busca (Querying):\*\* Preciso de uma função utilitária onde eu possa passar filtros dinâmicos. Exemplo: buscar todos os itens onde \`tipo \=\=\= 'arma'\` e \`dano \=\=\= '1d8'\`.
4\. \*\*Renderização Dinâmica:\*\* Componentes de interface que recebam os resultados dessas consultas e os renderizem automaticamente em formatos de tabelas, galerias ou listas.

\*\*Restrições e Contexto:\*\*
\* Os dados são locais e vinculados ao Git. Considere que os arquivos são lidos localmente pelo sistema.
\* Estamos rodando sob o ecossistema Vite. Se você precisar saber qual framework de UI eu uso (React, Vue, Svelte, etc.) ou se é Vanilla JS/TS, por favor, me pergunte antes de escrever o código final dos componentes visuais.

\*\*Ação Esperada (Sua Primeira Tarefa):\*\*
Por favor, descreva a arquitetura inicial para essa solução.&#x20;
\- Quais bibliotecas você recomenda para fazer o "parse" dos arquivos (ex: \`gray-matter\` se for Markdown)?&#x20;
\- Como devemos estruturar a lógica de extração e indexação para que a performance não caia quando a Wiki tiver centenas de arquivos?
\- Apresente um esboço estrutural do código de como essa função de "Query" funcionaria por debaixo dos panos.

\----------------

Esboço Estrutural do Código (Query Engine)

Aqui está um rascunho de como essa API de queries funcionaria "por debaixo dos panos", usando um padrão de interface encadeável (fluent API), muito similar a ferramentas de banco de dados.

typescript

// 1. Tipagem Básica do Índice

export interface WikiEntry {

&#x20; path: string;       // ex: "/wiki/bestiario/dragao.md"

&#x20; slug: string;       // ex: "dragao"

&#x20; metadata: Record\<string, any>; // O JSON gerado pelo gray-matter

}

// 2. Motor de Busca (Query Engine)

export class WikiQuery {

&#x20; private results: WikiEntry\[];

&#x20; constructor(private index: WikiEntry\[]) {

&#x20;   this.results \= \[...index]; // Inicializa com todos os arquivos

&#x20; }

&#x20; // Filtra por propriedades exatas (ex: tipo \=\=\= 'arma')

&#x20; where(key: string, value: any): WikiQuery {

&#x20;   this.results \= this.results.filter(entry \=> entry.metadata\[key] \=\=\= value);

&#x20;   return this; // Retorna "this" para permitir encadeamento

&#x20; }

&#x20; // Filtra usando uma função customizada para lógicas complexas

&#x20; filter(predicate: (meta: Record\<string, any>) \=> boolean): WikiQuery {

&#x20;   this.results \= this.results.filter(entry \=> predicate(entry.metadata));

&#x20;   return this;

&#x20; }

&#x20; // Busca dentro de arrays de tags

&#x20; containsTag(tag: string): WikiQuery {

&#x20;   this.results \= this.results.filter(entry \=> {

&#x20;     const tags \= entry.metadata.tags;

&#x20;     return Array.isArray(tags) && tags.includes(tag);

&#x20;   });

&#x20;   return this;

&#x20; }

&#x20; // Ordenação de resultados

&#x20; sortBy(key: string, order: 'asc' | 'desc' \= 'asc'): WikiQuery {

&#x20;   this.results.sort((a, b) \=> {

&#x20;     const valA \= a.metadata\[key];

&#x20;     const valB \= b.metadata\[key];

&#x20;     if (valA \< valB) return order \=\=\= 'asc' ? -1 : 1;

&#x20;     if (valA > valB) return order \=\=\= 'asc' ? 1 : -1;

&#x20;     return 0;

&#x20;   });

&#x20;   return this;

&#x20; }

&#x20; // Executa a busca e retorna os dados

&#x20; get(): WikiEntry\[] {

&#x20;   return this.results;

&#x20; }

}

// 3. Exemplo de Uso Prático em um Componente React

/\*

&#x20; const queryEngine \= new WikiQuery(globalWikiIndex);

&#x20;&#x20;

&#x20; const chefesDeFogo \= queryEngine

&#x20;   .where('tipo', 'monstro')

&#x20;   .containsTag('chefe')

&#x20;   .containsTag('fogo')

&#x20;   .sortBy('hp', 'desc')

&#x20;   .get();

\*/

## Próximos Passos

1. Instalar a biblioteca `gray-matter`.
2. Criar a estrutura e a função que fará a leitura em lote com `import.meta.glob` no Vite.
3. Criar a store (usando Zustand, Context, etc) para guardar o índice global na memória assim que a aplicação iniciar.
4. Implementar a classe `WikiQuery` detalhada acima.

IMPORTANT

Gostaria de aprovar essa arquitetura para que eu comece a criar o serviço de indexação e as implementações em TypeScript? Já percebi pelo projeto que vocês usam React, então usaremos ganchos do React (`hooks`) para entregar esses dados facilmente aos seus componentes visuais depois!

\---

# Arquitetura para Sistema de Queries na Wiki (Estilo Dataview)

Abaixo está o plano arquitetural para transformar as notas estáticas da Wiki do **Dozero** em um banco de dados relacional e consultável. Como notei pelo `package.json` que o projeto utiliza **React** e **TypeScript** com **Vite**, toda a solução será moldada para tirar o máximo de proveito desse ecossistema.

## Bibliotecas Recomendadas (Parsing)

Para extrair os metadados dos arquivos Markdown, a biblioteca mais recomendada, sólida e performática no ecossistema JavaScript/TypeScript é o **`gray-matter`**.

Ela permite definir metadados YAML no topo de qualquer arquivo `.md` (Frontmatter) e separa facilmente esses dados do conteúdo de texto puro.

TIP

**Exemplo de Frontmatter:**

yaml

\---

tipo: monstro

hp: 50

tags: \[fogo, chefe]

\---

\# Dragão Vermelho

Aqui começa o texto...

## Estratégia de Indexação (Performance)

Quando a Wiki tiver centenas ou até milhares de arquivos, não podemos carregar o conteúdo de texto inteiro de todos os arquivos na memória de uma vez, senão a aplicação travará.

**A solução otimizada possui dois passos:**

1. **Importação em Lote via Vite (`import.meta.glob`):** O Vite possui uma função nativa maravilhosa chamada `import.meta.glob`. Podemos usá-la para listar todos os arquivos `.md` na pasta da Wiki.
2. **Índice Leve (Lightweight Index):** No momento em que o VTT inicializar, rodaremos um "Indexer". Ele lerá todos os arquivos usando `gray-matter`, mas **guardará na memória apenas os Metadados e o Caminho (Path)** de cada arquivo. O conteúdo do texto (`content`) será descartado do índice. O texto só será carregado da rede/disco sob demanda, quando o usuário clicar para ler aquela página específica.

Isso garante que um índice de 10.000 arquivos ocupe apenas poucos megabytes de memória RAM e as buscas sejam milissegundos.

## Esboço Estrutural do Código (Query Engine)

Aqui está um rascunho de como essa API de queries funcionaria "por debaixo dos panos", usando um padrão de interface encadeável (fluent API), muito similar a ferramentas de banco de dados.

typescript

// 1. Tipagem Básica do Índice

export interface WikiEntry {

&#x20; path: string;       // ex: "/wiki/bestiario/dragao.md"

&#x20; slug: string;       // ex: "dragao"

&#x20; metadata: Record\<string, any>; // O JSON gerado pelo gray-matter

}

// 2. Motor de Busca (Query Engine)

export class WikiQuery {

&#x20; private results: WikiEntry\[];

&#x20; constructor(private index: WikiEntry\[]) {

&#x20;   this.results \= \[...index]; // Inicializa com todos os arquivos

&#x20; }

&#x20; // Filtra por propriedades exatas (ex: tipo \=\=\= 'arma')

&#x20; where(key: string, value: any): WikiQuery {

&#x20;   this.results \= this.results.filter(entry \=> entry.metadata\[key] \=\=\= value);

&#x20;   return this; // Retorna "this" para permitir encadeamento

&#x20; }

&#x20; // Filtra usando uma função customizada para lógicas complexas

&#x20; filter(predicate: (meta: Record\<string, any>) \=> boolean): WikiQuery {

&#x20;   this.results \= this.results.filter(entry \=> predicate(entry.metadata));

&#x20;   return this;

&#x20; }

&#x20; // Busca dentro de arrays de tags

&#x20; containsTag(tag: string): WikiQuery {

&#x20;   this.results \= this.results.filter(entry \=> {

&#x20;     const tags \= entry.metadata.tags;

&#x20;     return Array.isArray(tags) && tags.includes(tag);

&#x20;   });

&#x20;   return this;

&#x20; }

&#x20; // Ordenação de resultados

&#x20; sortBy(key: string, order: 'asc' | 'desc' \= 'asc'): WikiQuery {

&#x20;   this.results.sort((a, b) \=> {

&#x20;     const valA \= a.metadata\[key];

&#x20;     const valB \= b.metadata\[key];

&#x20;     if (valA \< valB) return order \=\=\= 'asc' ? -1 : 1;

&#x20;     if (valA > valB) return order \=\=\= 'asc' ? 1 : -1;

&#x20;     return 0;

&#x20;   });

&#x20;   return this;

&#x20; }

&#x20; // Executa a busca e retorna os dados

&#x20; get(): WikiEntry\[] {

&#x20;   return this.results;

&#x20; }

}

// 3. Exemplo de Uso Prático em um Componente React

/\*

&#x20; const queryEngine \= new WikiQuery(globalWikiIndex);

&#x20;&#x20;

&#x20; const chefesDeFogo \= queryEngine

&#x20;   .where('tipo', 'monstro')

&#x20;   .containsTag('chefe')

&#x20;   .containsTag('fogo')

&#x20;   .sortBy('hp', 'desc')

&#x20;   .get();

\*/

## Próximos Passos

1. Instalar a biblioteca `gray-matter`.
2. Criar a estrutura e a função que fará a leitura em lote com `import.meta.glob` no Vite.
3. Criar a store (usando Zustand, Context, etc) para guardar o índice global na memória assim que a aplicação iniciar.
4. Implementar a classe `WikiQuery` detalhada acima.

IMPORTANT

Gostaria de aprovar essa arquitetura para que eu comece a criar o serviço de indexação e as implementações em TypeScript? Já percebi pelo projeto que vocês usam React, então usaremos ganchos do React (`hooks`) para entregar esses dados facilmente aos seus componentes visuais depois!

\---

# Walkthrough: Sistema Dataview da Wiki

Finalizei a implementação da infraestrutura que transforma as anotações do seu VTT em um "banco de dados" consultável, muito semelhante ao Dataview do Obsidian.

## O Que Foi Feito

1. **Instalação do Parser:**
   * O pacote `gray-matter` foi instalado no seu projeto para garantir a extração segura do Frontmatter (YAML) dos seus arquivos Markdown.
2. **Serviço de Indexação Otimizada (`src/services/wiki/WikiIndexer.ts`):**
   * Criei uma classe estática capaz de carregar *em lote* todos os arquivos Markdown presentes no seu projeto (tanto usando `/wiki/**/*.md` quanto na raiz `/*.md` como fallback).
   * O processo de indexação **extrai apenas os metadados** e descarta o conteúdo massivo do texto, mantendo a memória leve (Lightweight Index) mesmo com centenas de arquivos.
   * O arquivo em si só é carregado inteiramente sob demanda pela função `WikiIndexer.loadFileContent(path)`.
3. **Motor de Queries Fluente (`src/services/wiki/WikiQuery.ts`):**
   * Construída a classe `WikiQuery` permitindo buscas encadeadas fáceis:
     typescript
     // Exemplo prático de chaining
     const monstros \= engine
     &#x20; .where('tipo', 'monstro')
     &#x20; .containsTag('fogo')
     &#x20; .sortBy('hp', 'desc')
     &#x20; .get();
4. **Hook React para a UI (`src/hooks/useWiki.ts`):**
   * Foram expostos os hooks `useWiki` e `useWikiFile`.
   * O `useWiki` roda o motor e te entrega tanto o índice bruto (`index`) quanto a construtora da query.

## Exemplo de Uso (Seu Próximo Passo!)

Agora você pode criar um componente na sua Interface Visual (no painel da Wiki ou em Painéis Dinâmicos) dessa maneira:

tsx

import React, { useMemo } from 'react';

import { useWiki } from '../hooks/useWiki';

export function ListaDeMonstros() {

&#x20; const { query, isLoading, error } \= useWiki();

&#x20; // O React memoiza o resultado da busca para não recalcular à toa

&#x20; const monstrosDeFogo \= useMemo(() \=> {

&#x20;   return query()

&#x20;     .where('tipo', 'monstro')

&#x20;     .containsTag('fogo')

&#x20;     .sortBy('hp', 'desc')

&#x20;     .get();

&#x20; }, \[query]);

&#x20; if (isLoading) return \<div>Carregando Banco de Dados da Wiki...\</div>;

&#x20; if (error) return \<div>Erro: {error}\</div>;

&#x20; return (

&#x20;   \<div className\="grid grid-cols-2 gap-4">

&#x20;     {monstrosDeFogo.map(monstro \=> (

&#x20;       \<div key\={monstro.slug} className\="card p-4 border rounded shadow">

&#x20;         \<h3>{monstro.metadata.titulo || monstro.slug}\</h3>

&#x20;         \<p>HP: {monstro.metadata.hp}\</p>

&#x20;         \<button onClick\={() \=> console.log('Abrir', monstro.path)}>

&#x20;           Ler Documento Completo

&#x20;         \</button>

&#x20;       \</div>

&#x20;     ))}

&#x20;   \</div>

&#x20; );

}

## Como Testar

Para ver isso rodando localmente, recomendo criar um arquivo Markdown qualquer em `d:/DOZERO/wiki/teste.md` com o seguinte cabeçalho (Frontmatter):

yaml

\---

tipo: monstro

hp: 50

tags: \[fogo, chefe]

\---

\# Dragão

Corpo do dragão...

Em seguida importe o Hook onde quiser exibir essa informação. Tudo será cacheado via React de modo instantâneo.

TIP

Qualquer erro na tipagem com o TypeScript que encontrar com `gray-matter`, lembre-se que separamos os `import type` na estrutura final garantindo que o compilador rigoroso do `DOZERO` ficasse feliz! Tudo está compilando adequadamente.

***

\# Objetivo: Linkar Personagens do Mapa (Tokens) com as Propriedades da Wiki

Esse plano descreve como vamos adicionar o recurso de vincular fichas de personagens e monstros no mapa com as propriedades estáticas salvas nos arquivos Markdown da Wiki.

\## Open Questions

\- Você quer que as propriedades da Wiki apenas "apareçam" (como leitura/consulta) na ficha, ou deseja que as Macros/Ataques da ficha consigam \*ler\* automaticamente esses atributos (ex: usar a propriedade \`força\` do markdown na rolagem de dados)? \*Para esta primeira versão, focaremos apenas em renderizar os dados na caixinha visual de consulta como solicitado.\*

\## Proposed Changes

Vamos modificar a "Ficha de Personagem" nativa que abre quando clicamos nos tokens no mapa (\`TargetTerminal.tsx\`) para incluir a integração com o hook que criamos no passo anterior.

\### Componentes de UI e Estado

\#### \[MODIFY] \[TargetTerminal.tsx]\(file:///d:/DOZERO/src/components/HUD/TargetTerminal.tsx)

\- Importar o hook \`useWiki()\` e o ícone \`BookOpen\` e \`ChevronDown/Up\`.

\- \*\*Modo GM (Mestre):\*\* Adicionar um campo de "Link com a Wiki" (um select listando os arquivos da wiki indexados) na edição do Personagem. O mestre poderá selecionar qual página do Obsidian/Wiki representa este Token.

\- \*\*Salvar o Link:\*\* A seleção será salva em \`tokenData.wikiSlug\` usando o sistema CRDT/Yjs já existente, sincronizando com todos os jogadores.

\- \*\*Renderização da Caixinha (Atributos):\*\*

&#x20; \- Se o Token tiver um \`wikiSlug\` vinculado, procuraremos os metadados no índice da Wiki.

&#x20; \- Criar um botão "Atributos da Wiki" que, ao ser clicado, expande uma caixinha estilo painel de vidro (glassmorphism).

&#x20; \- Dentro da caixinha, iteraremos sobre todos os metadados (Frontmatter) retornados do Markdown, exibindo-os numa grade (ex: Força: 18, Classe: Bárbaro, etc).

\## Verification Plan

\### Manual Verification

\- Testar o painel GM no \`TargetTerminal\`.

\- Validar se o dropdown lista os arquivos da Wiki.

\- Validar se, ao vincular, a aba de atributos aparece.

\- Clicar na aba para testar se a caixinha com propriedades abre/fecha e exibe o JSON do Frontmatter corretamente formatado.

***

\# Walkthrough: Integração Wiki & Ficha de Personagens (TargetTerminal)

Finalizamos a implementação que conecta os Tokens do seu mapa com a vasta biblioteca da Wiki (Atores, Monstros, NPCs, etc)!

\## O Que Foi Feito

A ficha de personagem (que abre ao clicar num Token no mapa) foi modificada para exibir e gerenciar a conexão com os arquivos Markdown da Wiki.

\### 1. Sistema de "Linkagem" para o Mestre

\- \*\*Seletor Inteligente:\*\* Quando o GM clica numa ficha no mapa, ele agora vê uma seção "Propriedades da Wiki". Lá, existe um menu Dropdown (Select) populado automaticamente com todos os documentos Markdown disponíveis na raiz ou na pasta \`/wiki/\`.

\- \*\*Sincronização em Tempo Real:\*\* A seleção é armazenada na propriedade \`wikiSlug\` do Token e roteada via CRDT (Yjs) nativo do \*\*Dozero\*\*. Isso significa que assim que o Mestre escolhe uma página da Wiki para aquele monstro, todos os jogadores já começam a enxergar as informações apropriadas.

\### 2. A Caixinha Mágica (Glassmorphism UI)

\- \*\*Expansível e Limpa:\*\* Para não poluir o painel do jogo, criamos um botão "Ver Atributos" que, ao ser clicado, desliza suavemente mostrando as propriedades.

\- \*\*Renderização Dinâmica:\*\* Todo e qualquer dado presente no Frontmatter YAML do seu arquivo Markdown (como Força, Percepção, Classes, Tags, etc.) é renderizado de forma automática na caixinha, utilizando um belo layout grid no padrão Glassmorphism, que herda as cores nativas do VTT (bordas do \`var(--glass-border)\`, destaques do \`var(--accent-primary)\`).

\## Como Testar Agora Mesmo

1\. Crie um arquivo Markdown de exemplo (\`/wiki/Boss.md\`).

&#x20;  \`\`\`yaml

&#x20;  \---

&#x20;  titulo: Lich Rei

&#x20;  força: 12

&#x20;  magia: 99

&#x20;  resistencia: Fogo, Gelo

&#x20;  \---

&#x20;  \# Texto do Lich...

&#x20;  \`\`\`

2\. Abra a plataforma do VTT.

3\. Arraste ou crie um Token no mapa.

4\. Clique no Token para abrir o \*TargetTerminal\* (a ficha lateral).

5\. Vá em \*\*Propriedades da Wiki\*\* e selecione "Lich Rei" no menu.

6\. Clique em \*\*Ver Atributos\*\*!

\> \[!TIP]

\> Por padrão, a caixinha foi desenhada para ignorar de maneira limpa variáveis puramente visuais ou arranjos em arrays pesados (focamos em strings e números diretos, que são a maior parte das características do RPG), mantendo o painel bem rápido.

***

\# Plano de Implementação: Redesign do Oráculo (Modo Compacto)

\## Objetivo

Atender ao seu pedido de transformar o Oráculo massivo em uma "caixinha mágica" super elegante e minimalista. Chega de ver tabelas gigantes na tela! O Oráculo será focado em \*\*Ação e Mistério\*\*: você escolhe o que quer rolar, aperta o botão e a resposta cai direto no chat.

\## Proposed Changes

\### Redesign da Interface (\`OracleWidget.tsx\`)

\- \*\*Tamanho e Layout:\*\* A janela passará de 750px (gigante) para cerca de \*\*300px x 250px\*\* (super compacta).

\- \*\*Navegação em Cascata (Dropdowns Inteligentes):\*\*

&#x20; \- No lugar da barra lateral gigantesca, usaremos dois campos de seleção elegantes estilizados em \*glassmorphism\*.

&#x20; \- \*\*Passo 1:\*\* Você escolhe a Categoria maior (Ex: \`Ironsmith\`, \`Ask the Oracle\`).

&#x20; \- \*\*Passo 2:\*\* Você escolhe a Pergunta exata (Ex: \`Type of Evidence of Corruption\`, \`Fifty Fifty\`).

\- \*\*Botão de Ação Massivo:\*\* Um grande botão central \`\[ 🎲 Rolar 1d100 ]\` vai brilhar esperando o seu clique.

\- \*\*Ocultação de Tabelas:\*\* O código das tabelas de resultados será completamente removido da parte visual. Você só saberá a resposta quando rolar o dado.

\- \*\*Feedback Imediato:\*\* O resultado será "cuspido" no Chat Global instantaneamente, mas eu também colocarei um pequeno painel na própria caixinha de "Último Resultado" para você não se perder.

\### Alças e Arrastabilidade

\- \*\*Draggable Window:\*\* A janela já suporta ser arrastada e redimensionada livremente, mas adicionarei um indicador visual extra com o ícone de alças (\`GripHorizontal\`) no topo e nas bordas, deixando óbvio que você pode puxar a janela para qualquer canto do mapa.

\> \[!TIP]

\> \*\*User Review Required\*\*

\> Este novo modelo é muito mais imersivo para o jogo, escondendo o funcionamento interno. Acha que essa estrutura com \*\*duas listas suspensas (Categoria -> Tabela)\*\* e um botão grandão de rolar atende perfeitamente ao que você imaginou para a UX?

\## Verification Plan

1\. Validar se a janela agora é pequena e elegante.

2\. Garantir que as tabelas sumiram e os Dropdowns funcionam em cascata.

3\. Testar a rolagem enviando perfeitamente para o Chat e aparecendo no minipainel do Widget.

***

\# Plano de Implementação: Redesign do Oráculo (Modo Compacto)

\## Objetivo

Atender ao seu pedido de transformar o Oráculo massivo em uma "caixinha mágica" super elegante e minimalista. Chega de ver tabelas gigantes na tela! O Oráculo será focado em \*\*Ação e Mistério\*\*: você escolhe o que quer rolar, aperta o botão e a resposta cai direto no chat.

\## Proposed Changes

\### Redesign da Interface (\`OracleWidget.tsx\`)

\- \*\*Tamanho e Layout:\*\* A janela passará de 750px (gigante) para cerca de \*\*300px x 250px\*\* (super compacta).

\- \*\*Navegação em Cascata (Dropdowns Inteligentes):\*\*

&#x20; \- No lugar da barra lateral gigantesca, usaremos dois campos de seleção elegantes estilizados em \*glassmorphism\*.

&#x20; \- \*\*Passo 1:\*\* Você escolhe a Categoria maior (Ex: \`Ironsmith\`, \`Ask the Oracle\`).

&#x20; \- \*\*Passo 2:\*\* Você escolhe a Pergunta exata (Ex: \`Type of Evidence of Corruption\`, \`Fifty Fifty\`).

\- \*\*Botão de Ação Massivo:\*\* Um grande botão central \`\[ 🎲 Rolar 1d100 ]\` vai brilhar esperando o seu clique.

\- \*\*Ocultação de Tabelas:\*\* O código das tabelas de resultados será completamente removido da parte visual. Você só saberá a resposta quando rolar o dado.

\- \*\*Feedback Imediato:\*\* O resultado será "cuspido" no Chat Global instantaneamente, mas eu também colocarei um pequeno painel na própria caixinha de "Último Resultado" para você não se perder.

\### Alças e Arrastabilidade

\- \*\*Draggable Window:\*\* A janela já suporta ser arrastada e redimensionada livremente, mas adicionarei um indicador visual extra com o ícone de alças (\`GripHorizontal\`) no topo e nas bordas, deixando óbvio que você pode puxar a janela para qualquer canto do mapa.

\> \[!TIP]

\> \*\*User Review Required\*\*

\> Este novo modelo é muito mais imersivo para o jogo, escondendo o funcionamento interno. Acha que essa estrutura com \*\*duas listas suspensas (Categoria -> Tabela)\*\* e um botão grandão de rolar atende perfeitamente ao que você imaginou para a UX?

\## Verification Plan

1\. Validar se a janela agora é pequena e elegante.

2\. Garantir que as tabelas sumiram e os Dropdowns funcionam em cascata.

3\. Testar a rolagem enviando perfeitamente para o Chat e aparecendo no minipainel do Widget.

\-----

\# Implementação do Gestor de Campanhas (Campaign Manager)

Este documento descreve o plano técnico para construir o \*\*Gestor de Campanhas\*\* ("Campaign Manager"), uma central unificada para organizar campanhas, arcos narrativos e sessões.

\## Visão Geral

O objetivo é criar uma interface premium e intuitiva onde o mestre possa ter uma visão de pássaro (bird's-eye view) de todas as suas campanhas. O Gestor de Campanhas será um Widget grande e imersivo, acessível pelo menu do Hub de Ferramentas.

\## User Review Required

\> \[!IMPORTANT]

\> \*\*Modelo de Dados (Armazenamento na Nuvem Yjs):\*\*

\> A estrutura de dados proposta atenderá todas as suas necessidades de organização?

\> \* \*\*Campanha\*\*: Nome, Descrição, Capa (Imagem), Status (Ativa/Pausada/Concluída).

\> \* \*\*Arcos Narrativos\*\*: Cada arco pertence a uma campanha e tem Nome, Descrição e Status (Planejado/Ativo/Concluído).

\> \* \*\*Sessões\*\*: Cada sessão tem Data, Resumo dos acontecimentos, e Status (Futura/Realizada).

\> \[!WARNING]

\> \*\*Tamanho da Interface:\*\*

\> Por lidar com muita informação (textos de resumo, múltiplos arcos e sessões), o ideal é que este widget tenha um tamanho considerável (maior que os widgets de rolagem de dados ou de combate). Você prefere que ele seja um \*\*Widget Arrastável (Draggable)\*\* como os outros, ou uma \*\*Tela Cheia (Modal Fullscreen)\*\* que cobre o mapa enquanto você planeja? Minha recomendação inicial é um Widget Arrastável grande, para permitir consultar o mapa simultaneamente.

\## Proposed Changes

\### Armazenamento e Estado Central

\#### \[MODIFY] \[store/index.ts]\(file:///d:/DOZERO/src/store/index.ts)

\- Adicionar o mapa \`state.campaigns\` no Yjs doc para sincronização multiplayer e persistência local.

\- Criar funções CRUD (Create, Read, Update, Delete) para Campanhas.

\- Criar funções utilitárias para gerenciar Arcos Narrativos (adicionar, remover, alterar status).

\- Criar funções utilitárias para gerenciar Sessões (agendar, registrar resumo, concluir).

\### Interface do Usuário (UI)

\#### \[NEW] \[src/components/HUD/CampaignManagerWidget.tsx]\(file:///d:/DOZERO/src/components/HUD/CampaignManagerWidget.tsx)

\- Criar o componente visual principal.

\- \*\*Estética Premium\*\*: Uso de Glassmorphism, paleta escura elegante (Slate/Blue), e tipografia moderna.

\- \*\*Layout dividido\*\*:

&#x20; \- \*Esquerda (Sidebar)\*: Lista de Campanhas com miniaturas ou ícones indicativos de status.

&#x20; \- \*Direita (Painel Principal)\*: Detalhes da campanha selecionada, divididos em abas (Tabs):

&#x20;   \- \*\*Visão Geral\*\*: Descrição geral e metas da campanha.

&#x20;   \- \*\*Arcos\*\*: Uma linha do tempo visual ou kanban simplificado (Planejado → Ativo → Concluído).

&#x20;   \- \*\*Sessões\*\*: Um diário de sessões no formato de lista, onde você pode ler resumos de sessões passadas e ver as datas das próximas.

\#### \[MODIFY] \[src/components/HUD/WidgetHubModal.tsx]\(file:///d:/DOZERO/src/components/HUD/WidgetHubModal.tsx)

\- Adicionar o botão "Gestor de Campanhas" com ícone padronizado.

\- Conectar o botão ao sistema de Widgets flutuantes da tela principal (\`App.tsx\`).

\#### \[MODIFY] \[src/App.tsx]\(file:///d:/DOZERO/src/App.tsx)

\- Adicionar o estado de renderização para o \`CampaignManagerWidget\` (abrir/fechar/posição inicial).

\## Verification Plan

\### Testes Manuais

\- Abrir o Hub de Ferramentas e lançar o Gestor de Campanhas.

\- Criar duas campanhas distintas.

\- Em uma das campanhas, adicionar dois Arcos Narrativos e trocar o status deles.

\- Agendar uma Sessão futura e registrar o resumo de uma Sessão passada.

\- Fechar o widget e recarregar a página (F5) para confirmar se todos os dados foram persistidos no IndexedDB.

\- Avaliar se a interface responde de forma fluida (micro-interações) e se as cores seguem a estética "WOW" do projeto.

***





Ótima ideia! Deixa eu explorar o sistema de notas existente antes de planejar a integração:



Listed directory wiki

Listed directory Wiki

Viewed WikiViewer.tsx:1-550

Listed directory utils

Viewed WikiEditor.tsx:1-133

Viewed githubApi.ts:1-129



Agora entendi completamente o sistema. O wiki usa uma API local (\`/api/wiki/\*\`) que lê/escreve arquivos Markdown no disco. Vou criar um plano antes de executar:



Edited implementation\_plan.md



Entendi perfeitamente a ideia. Antes de executar, preciso de duas decisões suas:



\### 📐 Arquitetura da Integração



O plano é: \*\*Yjs guarda metadados\*\* (nome, data, status, caminho do arquivo) e \*\*os arquivos \`.md\` no disco guardam o conteúdo\*\* (notas de sessão, descrição de arco, sinopse da campanha). A estrutura de pastas na sua wiki ficaria assim:



\`\`\`

Campanhas/

&#x20; Minha Campanha/

&#x20;   \_campanha.md          ← sinopse/visão geral

&#x20;   Arcos/

&#x20;     O Conclave das Sombras.md

&#x20;     A Queda de Varos.md

&#x20;   Sessoes/

&#x20;     2026-06-17\_Sessao-01.md

&#x20;     2026-06-20\_Sessao-02.md

\`\`\`



Preciso de resposta para duas perguntas abertas do plano:



\*\*Pergunta 1 — Editor dentro do widget:\*\*

\- \*\*Opção A \*(Recomendada)\*:\*\* Textarea simples para rascunhos rápidos + botão \*\*"Abrir na Wiki"\*\* que leva ao WikiViewer com o editor rico completo

\- \*\*Opção B:\*\* WikiEditor (MDXEditor) embutido mini direto no widget — edição rica sem sair, mas mais pesado



\*\*Pergunta 2 — Pasta raiz das campanhas:\*\*

\- Criar sempre dentro de uma pasta fixa chamada \`Campanhas/\` na raiz da wiki?

\- Ou o usuário escolhe a pasta no momento de criar a campanha?



\------



\# Integração: Gestor de Campanhas ↔ Wiki (Arquivos Markdown)



\## Visão Geral



O Gestor de Campanhas passa a ser a \*\*interface visual\*\* das notas. Cada \*\*sessão\*\* e cada \*\*arco narrativo\*\* terá um arquivo \`.md\` correspondente na pasta da wiki do usuário. O Yjs deixa de ser o único repositório dos dados — passa a ser o \*\*índice/metadados\*\* (nome, data, status), enquanto o \*\*conteúdo\*\* (o texto de resumo/notas) vive como arquivo Markdown no disco.



\## Arquitetura da Integração



\`\`\`

Yjs (state.campaigns)          Disco Local (/api/wiki/\*)

┌─────────────────────┐        ┌──────────────────────────────────┐

│ Campaign { id,      │        │ Campanhas/                       │

│   name, status,    │◄──────►│   \[nome-campanha]/               │

│   arcs: \[          │  bind  │     \_campanha.md  (overview)     │

│     { id, name,    │        │     Arcos/                       │

│       status,      │        │       \[nome-arco].md             │

│       filePath }   │        │     Sessoes/                     │

│   ],               │        │       2026-06-17\_Sessao-01.md    │

│   sessions: \[      │        │       2026-06-20\_Sessao-02.md    │

│     { id, date,    │        └──────────────────────────────────┘

│       status,      │

│       filePath }   │

│   ]                │

│ }                  │

└─────────────────────┘

\`\`\`



\*\*Regra simples:\*\* \`filePath\` no Yjs aponta para o caminho relativo do arquivo dentro da wiki. O conteúdo textual SEMPRE vem do arquivo. O Yjs só guarda metadados estruturais.



\## Mudanças Propostas



\---



\### Modelo de Dados



\#### \[MODIFY] \[store/index.ts]\(file:///d:/DOZERO/src/store/index.ts)

\- Adicionar campo \`filePath?: string\` nas interfaces \`CampaignArc\` e \`CampaignSession\` (o \`CampaignData\` também ganha \`folderPath?\` para a pasta raiz da campanha).

\- Adicionar campo \`overviewPath?: string\` em \`CampaignData\` para o arquivo \`\_campanha.md\`.



\---



\### Gestor de Campanhas (Widget)



\#### \[MODIFY] \[src/components/HUD/CampaignManagerWidget.tsx]\(file:///d:/DOZERO/src/components/HUD/CampaignManagerWidget.tsx)



\*\*Aba "Visão Geral":\*\*

\- Ao criar uma campanha, gera automaticamente a pasta \`Campanhas/\[nome]/\` e o arquivo \`\_campanha.md\` na wiki.

\- O textarea de sinopse é substituído pelo \*\*\`WikiEditor\`\*\* embutido (o mesmo editor rico da WikiViewer).

\- Auto-save de 1 segundo salva o conteúdo no arquivo \`.md\` via \`/api/wiki/save\`.



\*\*Aba "Arcos Narrativos":\*\*

\- Ao criar um arco, gera \`Campanhas/\[nome]/Arcos/\[nome-arco].md\`.

\- O textarea de descrição de cada arco é substituído pelo \*\*\`WikiEditor\`\*\* (compacto).

\- Edição salva diretamente no arquivo \`.md\`.



\*\*Aba "Sessões":\*\*

\- Ao criar uma sessão, gera \`Campanhas/\[nome]/Sessoes/YYYY-MM-DD\_Sessao-NN.md\` com template inicial.

\- O textarea de resumo é substituído pelo \*\*\`WikiEditor\`\*\* (modo compacto).

\- Edição salva diretamente no arquivo \`.md\`.



\*\*Botão "Abrir na Wiki":\*\*

\- Um botão ≡ em cada sessão/arco que abre o arquivo correspondente no \`WikiViewer\` principal.



\---



\## Open Questions



\> \[!IMPORTANT]

\> \*\*Pasta raiz das campanhas na wiki:\*\* As campanhas serão criadas dentro de uma subpasta fixa (ex: \`Campanhas/\`) na raiz da wiki. Isso é aceitável? Ou prefere que o usuário escolha a pasta no momento de criar a campanha?



\> \[!IMPORTANT]

\> \*\*Editor rico vs. textarea simples:\*\* O \`WikiEditor\` (MDXEditor) é pesado e foi feito para tela cheia. Dentro do widget compacto, pode ser lento ou ter problemas de layout. A alternativa é usar um \*\*textarea\*\* simples com suporte a Markdown preview, que é mais leve e integra melhor no widget. Qual prefere?

\> - \*\*Opção A (Recomendada):\*\* Textarea simples + botão "Abrir na Wiki" para edição rica — mais leve, o usuário vai para a wiki para formatar.

\> - \*\*Opção B:\*\* WikiEditor embutido mini — edição rica direto no widget, mais complexo de implementar.



\> \[!WARNING]

\> \*\*Dados existentes:\*\* Campanhas que já foram criadas (e estão no Yjs sem \`filePath\`) serão tratadas como "legadas" — o widget vai exibir um botão para "Vincular à Wiki" e criar os arquivos manualmente.