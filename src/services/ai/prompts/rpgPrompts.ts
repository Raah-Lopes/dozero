// src/services/ai/prompts/rpgPrompts.ts
// Biblioteca de prompts especializados para geração de conteúdo RPG no DOZERO.
// Todos os prompts conhecem o sistema 4DET/D&D e o formato YAML da wiki.

export type RPGContentType =
  | 'pc'
  | 'npc'
  | 'monstro'
  | 'local'
  | 'item_magico'
  | 'resumo_sessao'
  | 'sessao_zero'
  | 'quest'
  | 'encontro'
  | 'dlc_expand'
  | 'dlc_factory'
  | 'chat';

export interface RPGPromptParams {
  type: RPGContentType;
  nome?: string;
  nivel?: number;
  conceito?: string;
  contextoWiki?: string;  // Resumo do índice da wiki para contexto
  textoExtra?: string;    // Texto para auditar/resumir (sessão, DLC)
  grupoNivel?: number;    // Nível médio do grupo (para encontros)
  categorias_dlc?: string[]; // Categorias a gerar na Fábrica de DLCs
  dlcMode?: 'basico' | 'expandido' | 'modular'; // Modo de geração da DLC Factory
  tipoEspecifico?: string; // ex: "Elfo Arqueiro", "Cidade Costeira", "Espada Lendária"
}

const BASE_SYSTEM = `Você é o Mestre-IA do sistema DOZERO VTT — um VTT (Virtual Tabletop) de RPG tabletop brasileiro. 
Você conhece profundamente o sistema Pathfinder 2e.
Sempre gere conteúdo em PORTUGUÊS BRASILEIRO, rico em detalhes e ambientação.
Quando solicitado a gerar fichas, use o formato YAML frontmatter compatível com Obsidian.
Seja criativo, evite clichês, e crie conteúdo que surpreenda o Mestre.`;

const YAML_PC_TEMPLATE = `
O frontmatter YAML e o corpo Markdown da ficha de PC devem seguir EXATAMENTE este template:

---
inventario: []
tipo: PC
status: vivo
ativo: true
imagens: []
magias: []
macros:
  - nome: "Ataque Básico"
    formula: "1d20+7"
    dano: "1d8+4"
    tipo: "ataque"
    descricao: "Ataque padrão do personagem"
ficha_personagem:
  cabecalho:
    nome_personagem: "NOME AQUI"
    genero: ""
    alinhamento: ""
    nivel: 1
    nome_jogador: ""
    xp: 0
  ancestralidade:
    heranca: ""
    habilidade: ""
  biografia:
    habilidade: ""
  classe:
    habilidades_nivel: []
  atributos:
    for: 10
    des: 10
    con: 10
    int: 10
    sab: 10
    car: 10
  pontos_vida:
    maximo: 10
    atuais: 10
    anotacoes: ""
  velocidade_metros: 9
  pericias:
    acrobatismo: 0
    arcanismo: 0
    atletismo: 0
    diplomacia: 0
    dissimulacao: 0
    furtividade: 0
    intimidacao: 0
    ladroagem: 0
    manufatura: 0
    medicina: 0
    natureza: 0
    ocultismo: 0
    performance: 0
    religiao: 0
    saber: 0
    sociedade: 0
    sobrevivencia: 0
  percepcao:
    total: 0
    sab: 0
    prof: 0
    sentidos_anotacoes: ""
  jogadas_salvamento:
    fortitude: 0
    reflexos: 0
    vontade: 0
  defesas:
    proficiencia_armadura:
      sem_armadura: 0
      leve: 0
      media: 0
      pesada: 0
    ca: 10
    anotacoes: ""
  ataques_armas:
    proficiencia:
      simples: 0
      marcial: 0
      desarmado: 0
      outra: 0
    corpo_a_corpo:
      - nome: "Espada"
        dano: "1d8"
        tracos: ""
    a_distancia:
      - nome: "Arco"
        dano: "1d6"
        tracos: ""
        municao: ""
---

<div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: start;">
<div style="flex: 1; min-width: 300px;">

:::note[Interpretação e Lore]
**Nome Completo:** \`INPUT[text:ficha_personagem.cabecalho.nome_personagem\]\`
**Ancestralidade:** \`INPUT[text:ficha_personagem.ancestralidade.heranca\]\`
**Classe:** \`INPUT[textArea:ficha_personagem.classe.habilidades_nivel\]\`
:::

:::tip[🌟 PROGRESSO]
**Nível:** \`INPUT[number:ficha_personagem.cabecalho.nivel\]\`
**XP Atual:** \`INPUT[number:ficha_personagem.cabecalho.xp\]\`
:::
</div>

<div style="flex: 1; min-width: 300px;">

:::danger[⚔️ COMBATE, STATUS E SOBREVIVÊNCIA]
**Ativo no Combate:** \`INPUT[toggle:ativo\]\` 
**HP:** \`INPUT[number:ficha_personagem.pontos_vida.atuais\]\` / \`VIEW[{ficha_personagem.pontos_vida.maximo}\]\`

**Atributos (Pathfinder 2e)**
**FOR:** \`INPUT[number:ficha_personagem.atributos.for\]\` | **DES:** \`INPUT[number:ficha_personagem.atributos.des\]\` | **CON:** \`INPUT[number:ficha_personagem.atributos.con\]\` 
**INT:** \`INPUT[number:ficha_personagem.atributos.int\]\` | **SAB:** \`INPUT[number:ficha_personagem.atributos.sab\]\` | **CAR:** \`INPUT[number:ficha_personagem.atributos.car\]\`

**Defesa e Movimento**
**CA:** \`INPUT[number:ficha_personagem.defesas.ca\]\` | **Deslocamento:** \`INPUT[number:ficha_personagem.velocidade_metros\]\`m

**Salvamentos:**
**Fortitude:** \`INPUT[number:ficha_personagem.jogadas_salvamento.fortitude\]\` | **Reflexos:** \`INPUT[number:ficha_personagem.jogadas_salvamento.reflexos\]\` | **Vontade:** \`INPUT[number:ficha_personagem.jogadas_salvamento.vontade\]\`
:::
</div>
</div>
`;


const YAML_NPC_TEMPLATE = `
O frontmatter YAML e o corpo Markdown da ficha de NPC devem seguir EXATAMENTE este template (mesma base do PC):

---
inventario: []
tipo: NPC
status: vivo
ativo: true
imagens: []
magias: []
macros:
  - nome: "Ataque Básico"
    formula: "1d20+7"
    dano: "1d8+4"
    tipo: "ataque"
    descricao: "Ataque padrão do personagem"
ficha_personagem:
  cabecalho:
    nome_personagem: "NOME AQUI"
    genero: ""
    alinhamento: ""
    nivel: 1
    nome_jogador: ""
    xp: 0
  ancestralidade:
    heranca: ""
    habilidade: ""
  biografia:
    habilidade: ""
  classe:
    habilidades_nivel: []
  atributos:
    for: 10
    des: 10
    con: 10
    int: 10
    sab: 10
    car: 10
  pontos_vida:
    maximo: 10
    atuais: 10
    anotacoes: ""
  velocidade_metros: 9
  pericias:
    acrobatismo: 0
    arcanismo: 0
    atletismo: 0
    diplomacia: 0
    dissimulacao: 0
    furtividade: 0
    intimidacao: 0
    ladroagem: 0
    manufatura: 0
    medicina: 0
    natureza: 0
    ocultismo: 0
    performance: 0
    religiao: 0
    saber: 0
    sociedade: 0
    sobrevivencia: 0
  percepcao:
    total: 0
    sab: 0
    prof: 0
    sentidos_anotacoes: ""
  jogadas_salvamento:
    fortitude: 0
    reflexos: 0
    vontade: 0
  defesas:
    proficiencia_armadura:
      sem_armadura: 0
      leve: 0
      media: 0
      pesada: 0
    ca: 10
    anotacoes: ""
  ataques_armas:
    proficiencia:
      simples: 0
      marcial: 0
      desarmado: 0
      outra: 0
    corpo_a_corpo:
      - nome: "Espada"
        dano: "1d8"
        tracos: ""
    a_distancia:
      - nome: "Arco"
        dano: "1d6"
        tracos: ""
        municao: ""
---

<div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: start;">
<div style="flex: 1; min-width: 300px;">

:::note[Interpretação e Lore]
**Nome Completo:** \`INPUT[text:ficha_personagem.cabecalho.nome_personagem\]\`
**Ancestralidade:** \`INPUT[text:ficha_personagem.ancestralidade.heranca\]\`
**Classe:** \`INPUT[textArea:ficha_personagem.classe.habilidades_nivel\]\`
:::

:::tip[🌟 PROGRESSO]
**Nível:** \`INPUT[number:ficha_personagem.cabecalho.nivel\]\`
**XP Atual:** \`INPUT[number:ficha_personagem.cabecalho.xp\]\`
:::
</div>

<div style="flex: 1; min-width: 300px;">

:::danger[⚔️ COMBATE, STATUS E SOBREVIVÊNCIA]
**Ativo no Combate:** \`INPUT[toggle:ativo\]\` 
**HP:** \`INPUT[number:ficha_personagem.pontos_vida.atuais\]\` / \`VIEW[{ficha_personagem.pontos_vida.maximo}\]\`

**Atributos (Pathfinder 2e)**
**FOR:** \`INPUT[number:ficha_personagem.atributos.for\]\` | **DES:** \`INPUT[number:ficha_personagem.atributos.des\]\` | **CON:** \`INPUT[number:ficha_personagem.atributos.con\]\` 
**INT:** \`INPUT[number:ficha_personagem.atributos.int\]\` | **SAB:** \`INPUT[number:ficha_personagem.atributos.sab\]\` | **CAR:** \`INPUT[number:ficha_personagem.atributos.car\]\`

**Defesa e Movimento**
**CA:** \`INPUT[number:ficha_personagem.defesas.ca\]\` | **Deslocamento:** \`INPUT[number:ficha_personagem.velocidade_metros\]\`m

**Salvamentos:**
**Fortitude:** \`INPUT[number:ficha_personagem.jogadas_salvamento.fortitude\]\` | **Reflexos:** \`INPUT[number:ficha_personagem.jogadas_salvamento.reflexos\]\` | **Vontade:** \`INPUT[number:ficha_personagem.jogadas_salvamento.vontade\]\`
:::
</div>
</div>
`;


const YAML_LOCAL_TEMPLATE = `
O frontmatter YAML e o corpo Markdown do Local devem seguir EXATAMENTE este template, preenchendo os valores:

---
tipo: Local
nome: "Nome do Local"
tags:
  - local
imagem: ""
clima: ""
nivel_perigo: 1
---

# \`INPUT[text:nome]\`

:::note[Visão Geral]
**Clima / Ambiente:** \`INPUT[text:clima]\`
**Nível de Perigo:** \`INPUT[number:nivel_perigo]\`
**Imagem:** \`INPUT[text:imagem]\`

:::
## Descrição
\`INPUT[textArea:descricao]\`

## Pontos de Interesse
\`INPUT[textArea:pontos_interesse]\`

## Encontros Possíveis
\`INPUT[textArea:encontros]\`
`;

const YAML_QUEST_TEMPLATE = `
O frontmatter YAML e o corpo Markdown da Quest/Missão devem seguir EXATAMENTE este template, preenchendo os valores:

---
tipo: Quest
nome: "Nome da Missão"
status: "Não Iniciada"
tags:
  - quest
recompensa_ouro: 0
recompensa_xp: 0
nivel_minimo: 1
---

# 📜 Missão: \`INPUT[text:nome]\`

:::note[Status da Missão]
**Status:** \`INPUT[text:status]\`
**Nível Recomendado:** \`INPUT[number:nivel_minimo]\`
**Recompensa Ouro:** \`INPUT[number:recompensa_ouro]\` MO
**Recompensa XP:** \`INPUT[number:recompensa_xp]\` XP

:::
## Resumo e Gancho
\`INPUT[textArea:resumo]\`

## Objetivos
\`\`\`meta-bind
INPUT[list:objetivos]
\`\`\`

## Atos e Complicações
\`INPUT[textArea:atos]\`

## NPCs Relacionados
\`INPUT[textArea:npcs]\`
`;

export function buildSystemPrompt(type: RPGContentType, activeDLCs?: string[]): string {
  let template = '';
  if (type === 'pc') template = YAML_PC_TEMPLATE;
  else if (type === 'npc' || type === 'monstro') template = YAML_NPC_TEMPLATE;
  else if (type === 'local') template = YAML_LOCAL_TEMPLATE;
  else if (type === 'quest') template = YAML_QUEST_TEMPLATE;

  else if (type === 'dlc_factory') template = `
=== FORMATO DE RESPOSTA DA FÁBRICA DE DLCS ===
Você deve gerar o conteúdo solicitado dividido em múltiplos blocos. 
Cada bloco representará um arquivo de wiki independente.
Você DEVE separar cada bloco (arquivo) usando EXATAMENTE este delimitador numa linha vazia:
---DLC_ASSET_SEPARATOR---

Para cada bloco, a PRIMEIRA linha DEVE ser o nome do arquivo que será criado (ex: "nome_do_npc.md" ou "itens/loot.md"), seguido de uma quebra de linha, e então o conteúdo do arquivo (que na maioria dos casos deve ser o padrão com YAML Frontmatter que você já conhece, ou Markdown simples).

Exemplo de estrutura:
Lampião Místico.md
---
(yaml do NPC)
---
(conteúdo)

---DLC_ASSET_SEPARATOR---

Peixeira Amaldiçoada.md
---
(yaml do item)
---
(conteúdo)
`;

  let dlcModifiers = '';
  if (activeDLCs && activeDLCs.length > 0) {
    dlcModifiers = '\n\n=== COMPLEMENTOS DE CENÁRIO ATIVOS ===\n';
    if (activeDLCs.includes('dlc_cyberpunk')) {
      dlcModifiers += '> [CYBERPUNK]: O cenário atual está com modificador futurista. Substitua armas de fogo por lasers, espadas por katanas térmicas, magias por hacks/implantes cibernéticos, e insira corporações gananciosas na lore.\n';
    }
    if (activeDLCs.includes('dlc_horror')) {
      dlcModifiers += '> [HORROR GÓTICO/CÓSMICO]: Atmosfera pesada de pavor. Insira lógicas de sanidade, horrores ancestrais, nevoeiros misteriosos, loucura progressiva e descrições perturbadoras.\n';
    }
    if (activeDLCs.includes('dlc_pirates')) {
      dlcModifiers += '> [PIRATAS E MARES]: Tema náutico profundo. Navios, bucaneiros, maldições dos mares, ilhas de tesouro e combate em alto mar.\n';
    }
  }

  return `${BASE_SYSTEM}${dlcModifiers}

${template}

Responda SOMENTE com o conteúdo solicitado, sem explicações adicionais antes ou depois.
Para fichas normais: comece diretamente com --- (frontmatter YAML) seguido do corpo Markdown.
Para a Fábrica de DLCs: Siga ESTRITAMENTE as regras de separação com ---DLC_ASSET_SEPARATOR--- e a primeira linha de cada bloco sendo o nome do arquivo.
Para outros conteúdos: use Markdown bem estruturado com headers, listas e formatação rica.`;
}

export function buildUserPrompt(params: RPGPromptParams): string {
  const ctx = params.contextoWiki
    ? `\n\n## Contexto do Mundo (Wiki da Campanha):\n${params.contextoWiki}`
    : '';

  switch (params.type) {
    // ─── Personagem Jogador ─────────────────────────────────────────────────
    case 'pc':
      return `Crie uma ficha completa de PERSONAGEM JOGADOR (PC) para RPG no formato YAML frontmatter + Markdown (siga o template).

**Dados fornecidos pelo Mestre:**
- Nome: ${params.nome || 'Aleatório (crie um nome único)'}
- Nível: ${params.nivel || 1}
- Tipo/Conceito: ${params.tipoEspecifico || 'Humano Aventureiro'}
- Conceito e ideias: ${params.conceito || 'Personagem interessante com motivações únicas'}
${ctx}

**Inclua obrigatoriamente no corpo Markdown (preenchendo os valores do template):**
1. O Frontmatter YAML preenchido (HP/PM, atributos coerentes)
2. As seções de Lore completas no template
3. Pelo menos 2 macros de ataque no frontmatter
4. Inventário com 3 itens legais

Distribua os atributos de forma coerente com o conceito do personagem.`;

    // ─── NPC ────────────────────────────────────────────────────────────────
    case 'npc':
      return `Crie uma ficha de NPC (personagem não-jogador) completa para uso em cena. Siga rigorosamente o template YAML e as marcações de Markdown (meta-bind, callouts).

**Dados fornecidos pelo Mestre:**
- Nome: ${params.nome || 'Aleatório'}
- Nível de Ameaça: ${params.nivel || 1} (1=coadjuvante, 3=ameaça séria, 5=chefe)
- Tipo/Arquétipo: ${params.tipoEspecifico || 'NPC Genérico'}
- Conceito: ${params.conceito || 'Personagem interessante'}
${ctx}

**Inclua:**
1. Frontmatter YAML completo com stats e inventário
2. Personalidade em 1 parágrafo
3. Táticas de combate (se for hostil)
4. Ganchos de roleplay (como o grupo pode interagir)
5. Motivações e segredos
6. Loot ou recompensas possíveis`;

    // ─── Monstro ────────────────────────────────────────────────────────────
    case 'monstro':
      return `Crie uma ficha de MONSTRO/CRIATURA para combate. Siga rigorosamente o template YAML e as marcações de Markdown (meta-bind, callouts).

**Dados:**
- Nome: ${params.nome || 'Criatura Desconhecida'}
- Nível de Ameaça: ${params.nivel || 2}
- Tipo de Criatura: ${params.tipoEspecifico || 'Aberração / Besta'}
- Conceito: ${params.conceito || 'Monstro ameaçador e único'}
${ctx}

**Inclua:**
1. Frontmatter YAML com stats de combate balanceados para o nível
2. Descrição física vívida e assustadora
3. Habilidades especiais (1-3 poderes únicos)
4. Táticas de combate detalhadas
5. Lore: origem, habitat, comportamento
6. Loot table: o que o grupo encontra ao derrotá-lo`;

    // ─── Local ──────────────────────────────────────────────────────────────
    case 'local':
      return `Crie um LOCAL/CENÁRIO detalhado para uso em jogo. Siga rigorosamente o template YAML fornecido e o corpo em Markdown.

**Dados:**
- Nome: ${params.nome || 'Local Misterioso'}
- Tipo: ${params.tipoEspecifico || 'Masmorras / Cidade / Floresta'}
- Conceito: ${params.conceito || 'Local único e memorável'}
${ctx}

**Inclua no formato Markdown:**
1. Frontmatter YAML básico com campos: tipo (Local), nome, tags, imagem
2. Descrição atmosférica (o que o grupo vê, ouve, cheira ao chegar)
3. Pontos de interesse (5-8 áreas/pontos de interesse)
4. Encontros possíveis
5. Fauna, flora ou ameaças ambientais únicas`;

    // ─── Item Mágico ────────────────────────────────────────────────────────
    case 'item_magico':
      return `Crie um ITEM MÁGICO/ARTEFATO único e memorável.

**Dados:**
- Nome: ${params.nome || 'Artefato Misterioso'}
- Raridade/Nível: ${params.nivel || 2} (1=comum, 3=raro, 5=lendário)
- Tipo: ${params.tipoEspecifico || 'Arma / Armadura / Acessório / Consumível'}
- Conceito: ${params.conceito || 'Item interessante e com história'}
${ctx}

**Inclua:**
1. Frontmatter YAML (tipo: Item, campos: nome, raridade, valor_em_ouro, equipavel)
2. Aparência física (descrição sensorial vívida)
3. Propriedades mecânicas (bônus, efeitos especiais, fórmulas se arma: dano em formato NdN)
4. Lore: quem criou, história, lendas ao redor
5. Quirk: comportamento peculiar ou efeito aleatório
6. Se maldito: a maldição e como removê-la`;

    // ─── Resumo de Sessão ───────────────────────────────────────────────────
    case 'resumo_sessao':
      return `Transforme as notas brutas abaixo em um RESUMO OFICIAL DE SESSÃO para a wiki da campanha.

**Notas brutas da sessão:**
${params.textoExtra || params.conceito || '(sem notas fornecidas)'}
${ctx}

**Gere um documento Markdown com:**
1. Frontmatter YAML: tipo (Sessão), data (hoje), numero_sessao, titulo
2. Resumo narrativo em 3° pessoa (2-3 parágrafos)
3. Eventos-chave (lista bullet)
4. Decisões importantes tomadas
5. XP sugerido por personagem (baseado nos eventos)
6. Hooks para próxima sessão (2-3 ganchos)
7. "Momento Épico" da sessão (a cena mais marcante)`;

    // ─── Sessão Zero ────────────────────────────────────────────────────────
    case 'sessao_zero':
      return `Crie um documento de SESSÃO ZERO completo para uma nova campanha.

**Conceito da campanha:**
- Nome: ${params.nome || 'Nova Campanha'}
- Premissa: ${params.conceito || 'Aventura épica de fantasia'}
${ctx}

**Inclua:**
1. Frontmatter YAML da campanha (nome, sistema, mestre, jogadores, inicio)
2. Contrato de jogo (linhas e véus — o que é ok e o que não é)
3. Tom e atmosfera da campanha
4. Criação de personagem: restrições, classes/raças permitidas, pontos de bônus
5. Regras da casa (house rules)
6. Como funciona XP, nível e progressão
7. Mapa inicial do mundo (em texto/mermaid)
8. Ganchos iniciais para cada jogador`;

    // ─── Quest ──────────────────────────────────────────────────────────────
    case 'quest':
      return `Crie uma QUEST/MISSÃO completa com estrutura de 3 atos. Siga rigorosamente o template YAML fornecido e o corpo em Markdown.

**Dados:**
- Nome: ${params.nome || 'A Missão'}
- Nível do Grupo: ${params.nivel || 3}
- Tipo: ${params.tipoEspecifico || 'Exploração / Resgate / Investigação / Assalto'}
- Conceito: ${params.conceito || 'Missão interessante com reviravoltas'}
${ctx}

**Estrutura obrigatória:**
1. Frontmatter YAML (tipo: Quest, status, recompensa_ouro, recompensa_xp, nivel_minimo)
2. **Resumo e Gancho**: Como o grupo é chamado, o problema inicial
3. **Objetivos**: Lista de passos ou metas (em bullet points simples)
4. **Atos e Complicações**: O obstáculo real, a reviravolta que muda tudo, Clímax, confronto final, escolhas morais
5. **NPCs Relacionados**: Pessoas envolvidas na missão e suas motivações
6. Recompensas: XP, Ouro, Item especial, e recompensa narrativa`;

    // ─── Encontro ───────────────────────────────────────────────────────────
    case 'encontro':
      return `Crie um ENCONTRO DE COMBATE tático e interessante.

**Dados:**
- Nome: ${params.nome || 'Encontro Aleatório'}
- Nível médio do grupo: ${params.grupoNivel || params.nivel || 3}
- Tamanho do grupo: ${params.tipoEspecifico || '4 jogadores'}
- Conceito: ${params.conceito || 'Encontro tático com ambiente dinâmico'}
${ctx}

**Inclua:**
1. Frontmatter YAML (tipo: Encontro, nivel_desafio, xp_total, ambiente)
2. Descrição do local de combate (elementos do ambiente que podem ser usados)
3. Lista de inimigos com stats simplificados
4. Mapa tático em ASCII art ou texto estruturado
5. Táticas dos inimigos (rodada por rodada, como escalam)
6. Elementos ambientais interativos (5 features do mapa)
7. Condição de vitória alternativa (além de matar tudo)
8. Consequências: o que muda no mundo após o encontro`;

    // ─── Expandir DLC ───────────────────────────────────────────────────────
    case 'dlc_expand':
      return `Analise e EXPANDA/AUDITE o seguinte conteúdo de DLC de RPG:

**Conteúdo para auditar/expandir:**
${params.textoExtra || params.conceito || '(sem conteúdo fornecido)'}
${ctx}

**Faça:**
1. Análise de consistência (há contradições ou problemas mecânicos?)
2. Sugestões de melhoria
3. Expansão: adicione 2-3 novos itens/regras coerentes com o conteúdo
4. Balanceamento: avalie se está justo para o nível indicado
5. Gere uma versão revisada e expandida do conteúdo em YAML/Markdown`;

    case 'dlc_factory': {
      const isBasico = params.dlcMode === 'basico';
      const isExpandido = params.dlcMode === 'expandido';
      
      let scaleInstruction = '';
      if (isBasico) {
        scaleInstruction = '- MODO BÁSICO: Crie os elementos de forma muito resumida. Apenas nomes, status fundamentais e uma linha de descrição. Não crie lore profunda.';
      } else if (isExpandido) {
        scaleInstruction = '- MODO EXPANDIDO: Crie lore extremamente profunda, interligações de tramas (personagens se conhecem, loots pertencem a locais específicos), facções e segredos ocultos.';
      } else {
        scaleInstruction = '- MODO MODULAR: Crie elementos completos, mas mantendo-os independentes e fáceis de plugar em qualquer campanha.';
      }

      return `Crie os elementos para uma nova DLC / Expansão para a campanha atual.
      
**Tema / Cenário / Ideia Principal da DLC:** 
${params.conceito || 'Módulo misterioso sem tema definido.'}

**Categorias de elementos que você DEVE gerar (gerar pelo menos 2 a 3 arquivos distintos para cada categoria marcada):**
${params.categorias_dlc?.length ? params.categorias_dlc.join(', ') : 'Nenhuma (Crie um pacote balanceado aleatório)'}

**Instruções Especiais:**
- Dê nomes criativos e temáticos aos arquivos gerados (ex: "Criaturas/Besta das Areias.md").
- Use o seu vasto conhecimento de mecânicas de RPG para criar tabelas de loot inovadoras, NPCs interativos, mistérios e missões prontas para jogar.
- O formato de cada arquivo gerado deve seguir o padrão do DOZERO VTT (Frontmatter com YAML detalhado no início e Markdown para a lore/descrição abaixo).
${scaleInstruction}

**IMPORTANTE (MANIFESTO):**
Você DEVE gerar o primeiro bloco de arquivo como "_Manifesto.md". 
O conteúdo dele DEVE conter o Frontmatter YAML com a seguinte estrutura:
---
type: dlc_manifest
id: "nome_unico_dlc_sem_espacos"
name: "Nome Bonito da DLC"
category: "cenario"
description: "Descrição curta"
version: "1.0"
author: "Gerado por IA"
tags: ["Tag1", "Tag2"]
---
E logo depois o corpo da mensagem com uma descrição detalhada da Expansão.

${ctx}`;
    }

    // ─── Chat Livre ─────────────────────────────────────────────────────────
    case 'chat':
    default:
      return `${params.conceito || params.textoExtra || 'Olá, como posso ajudar?'}
${ctx}`;
  }
}
