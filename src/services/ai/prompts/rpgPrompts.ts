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
Você conhece profundamente os sistemas 4DET (Quatro Dados e Talentos), D&D 5e e sistemas narrativos.
Sempre gere conteúdo em PORTUGUÊS BRASILEIRO, rico em detalhes e ambientação.
Quando solicitado a gerar fichas, use o formato YAML frontmatter compatível com Obsidian.
Seja criativo, evite clichês, e crie conteúdo que surpreenda o Mestre.`;

const YAML_PC_TEMPLATE = `
O frontmatter YAML e o corpo Markdown da ficha de PC devem seguir EXATAMENTE este template, preenchendo os valores:

---
inventario: []
tipo: PC
status: vivo
nome: "NOME DO PERSONAGEM AQUI"
nivel: 1
XP: 0
Ouro: 0
imagem: ""
tags:
  - personagem
ativo: true
origem: ""
Localizacao: ""
HP: 10
HP_max: 10
PM: 10
PM_max: 10
Energia: 100
Energia_max: 100
Sanidade: 10
Sanidade_max: 10
Fome: 0
Sede: 0
FOR: 10
DES: 10
CON: 10
INT: 10
SAB: 10
CAR: 10
F: 1
H: 1
R: 1
A: 1
PdF: 1
CA: 10
Deslocamento: "9m"
Acrobacia: 0
Furtividade: 0
Intimidacao: 0
Investigacao: 0
Medicina: 0
Percepcao: 0
Sobrevivencia: 0
status_efeitos: []
imagens: []
magias: []
macros:
  - nome: "Ataque Básico"
    formula: "1d20+2"
    tipo: "ataque"
    descricao: "Ataque corpo-a-corpo"
---

\`\`\`dataviewjs
const file = app.workspace.getActiveFile();
const meta = app.metadataCache.getFileCache(file)?.frontmatter || {};
const resolveImg = (img) => {
    if(!img) return "https://via.placeholder.com/150/333333/FFFFFF?text=👤";
    let linkStr = "";
    if (typeof img === "string") linkStr = String(img);
    else if (img.path) linkStr = String(img.path);
    else if (Array.isArray(img) && img.length > 0) linkStr = img[0].path ? String(img[0].path) : String(img[0]);
    else return "https://via.placeholder.com/150/333333/FFFFFF?text=👤";
    if(linkStr.startsWith("http")) return linkStr;
    let linkText = linkStr.replace(/[\\[\\]!]/g, "").split("|")[0].trim();
    let target = app.metadataCache.getFirstLinkpathDest(linkText, "");
    return target ? app.vault.getResourcePath(target) : "https://via.placeholder.com/150/333333/FFFFFF?text=👤";
};
const div = this.container.createDiv({ attr: { style: "display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 20px;" }});
div.createEl("img", { attr: { src: resolveImg(meta.imagem), style: "width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--text-success); box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-bottom: 10px;" }});
div.createEl("h1", { text: \`👤 \${meta.nome || file.basename}\`, attr: { style: "margin: 0; font-size: 2.2em; font-weight: bold;" }});
\`\`\`

<div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: start;">
<div style="flex: 1; min-width: 300px;">

> [!quote]- Interpretação e Lore
> **Nome Completo:** \`INPUT[text:nome_completo]\` | **Imagem:** \`INPUT[text:imagem]\`
> **Resumo:** 
> \`INPUT[textArea:resumo]\`
> 
> **Títulos e Apelidos:** \`INPUT[text:titulos]\`
> **Facção / Ocupação:** \`INPUT[text:faccao]\`
> **Raça / Espécie:** \`INPUT[text:raca]\`
> **Origem / Nacionalidade:** \`INPUT[text:origem]\`
> **Idade / Gênero:** \`INPUT[text:idade_genero]\`
> **Alinhamento:** \`INPUT[text:alinhamento]\`
> **Nível:** \`INPUT[number:nivel]\`
> **Altura / Peso:** \`INPUT[text:altura_peso]\`
> 
> **🧠 PERSONALIDADE & CITAÇÕES**
> - **Traços Dominantes:** \`INPUT[textArea:tracos_dominantes]\`
> - **Virtudes:** \`INPUT[textArea:virtudes]\`
> - **Defeitos / Vícios / Medos:** \`INPUT[textArea:defeitos]\`
> - **Sonhos e Objetivos:** \`INPUT[textArea:sonhos]\`
> 
> **📜 HISTÓRIA & RELACIONAMENTOS**
> - **Infância:** \`INPUT[textArea:historia_infancia]\`
> - **Adolescência / Vida Adulta:** \`INPUT[textArea:historia_adulta]\`
> - **Eventos Marcantes:** \`INPUT[textArea:historia_eventos]\`
> - **Relacionamentos:** \`INPUT[textArea:relacionamentos]\`

> [!warning]- ✨ PODERES, VANTAGENS & MAGIAS
> ## Vantagens e Desvantagens (Passivas/Ativas)
> \`INPUT[textArea:vantagens]\`
> 
> ## Magias Conhecidas
> \`INPUT[textArea:magias]\`

> [!info]- 🗺️ MAPA MENTAL & REFERÊNCIAS
> \`\`\`mermaid
> mindmap
> root((NOME))
>   Família
>   Aliados
>   Rivais
>   Objetivos
> \`\`\`

> [!success] 🌟 PROGRESSO: Nível \`INPUT[number:nivel]\`
> **XP Atual:** \`INPUT[number:XP]\` / Próximo Nível: \`VIEW[{nivel} * 1000]\`

</div>

<div style="flex: 1; min-width: 300px;">

> [!danger] ⚔️ COMBATE, STATUS E SOBREVIVÊNCIA
> **Ativo no Combate:** \`INPUT[toggle:ativo]\` | **Localização:** \`INPUT[text:Localizacao]\`
> 
> **Barras de Vida e Combate**
> **HP:** \`INPUT[number:HP]\` / \`VIEW[{HP_max}]\` | **PM:** \`INPUT[number:PM]\` / \`VIEW[{PM_max}]\`
> 
> **Sobrevivência & Sanidade**
> **Energia:** \`INPUT[number:Energia]\` / \`VIEW[{Energia_max}]\` | **Sanidade:** \`INPUT[number:Sanidade]\` / \`VIEW[{Sanidade_max}]\`
> **Fome (%):** \`INPUT[number:Fome]\` | **Sede (%):** \`INPUT[number:Sede]\`
> 
> **Atributos Principais (D&D)**
> **FOR:** \`INPUT[number:FOR]\` | **DES:** \`INPUT[number:DES]\` | **CON:** \`INPUT[number:CON]\` 
> **INT:** \`INPUT[number:INT]\` | **SAB:** \`INPUT[number:SAB]\` | **CAR:** \`INPUT[number:CAR]\`
> 
> **Atributos Clássicos (4DeT)**
> **F:** \`INPUT[number:F]\` | **H:** \`INPUT[number:H]\` | **R:** \`INPUT[number:R]\` | **A:** \`INPUT[number:A]\` | **PdF:** \`INPUT[number:PdF]\`
> 
> **Defesa e Movimento**
> **CA:** \`INPUT[number:CA]\` | **Deslocamento:** \`INPUT[text:Deslocamento]\`
> 
> **Perícias Básicas:**
> **Acrobacia:** \`INPUT[number:Acrobacia]\` | **Furtividade:** \`INPUT[number:Furtividade]\`
> **Intimidação:** \`INPUT[number:Intimidacao]\` | **Investigação:** \`INPUT[number:Investigacao]\`
> **Medicina:** \`INPUT[number:Medicina]\` | **Percepção:** \`INPUT[number:Percepcao]\`
> **Sobrevivência:** \`INPUT[number:Sobrevivencia]\`
> 
> **Condições:**
> \`\`\`meta-bind
> INPUT[list:status_efeitos]
> \`\`\`

> [!tip]- 💰 RIQUEZAS E TESOUROS
> - Ouro atual: \`INPUT[number:Ouro]\` MO

</div>
</div>

---
### ⚙️ INVENTÁRIO & ARMAS
\`\`\`dataviewjs
const meta = app.metadataCache.getFileCache(app.workspace.getActiveFile())?.frontmatter || {};
if(!meta.inventario || meta.inventario.length === 0) {
    dv.paragraph("Inventário vazio.");
} else {
    // Tabela simples de inventário
    dv.table(["Item", "Descrição"], meta.inventario.map(i => [i.nome, i.desc]));
}
\`\`\`
`;

const YAML_NPC_TEMPLATE = `
O frontmatter YAML e o corpo Markdown da ficha de NPC/Monstro devem seguir EXATAMENTE este template, preenchendo os valores:

---
inventario: []
tipo: NPC
status: vivo
nome: "NOME DO NPC AQUI"
nivel: 1
XP: 100
Ouro: 0
imagem: ""
tags:
  - npc
ativo: true
origem: ""
Localizacao: ""
HP: 20
HP_max: 20
PM: 10
PM_max: 10
Energia: 100
Energia_max: 100
Sanidade: 10
Sanidade_max: 10
Fome: 0
Sede: 0
FOR: 10
DES: 10
CON: 10
INT: 10
SAB: 10
CAR: 10
F: 1
H: 1
R: 1
A: 1
PdF: 1
CA: 10
Deslocamento: "9m"
Acrobacia: 0
Furtividade: 0
Intimidacao: 0
Investigacao: 0
Medicina: 0
Percepcao: 0
Sobrevivencia: 0
status_efeitos: []
imagens: []
magias: []
macros:
  - nome: "Ataque Básico"
    formula: "1d20+2"
    tipo: "ataque"
    descricao: "Ataque corpo-a-corpo"
---

\`\`\`dataviewjs
const file = app.workspace.getActiveFile();
const meta = app.metadataCache.getFileCache(file)?.frontmatter || {};
const resolveImg = (img) => {
    if(!img) return "https://via.placeholder.com/150/333333/FFFFFF?text=👤";
    let linkStr = "";
    if (typeof img === "string") linkStr = String(img);
    else if (img.path) linkStr = String(img.path);
    else if (Array.isArray(img) && img.length > 0) linkStr = img[0].path ? String(img[0].path) : String(img[0]);
    else return "https://via.placeholder.com/150/333333/FFFFFF?text=👤";
    if(linkStr.startsWith("http")) return linkStr;
    let linkText = linkStr.replace(/[\\[\\]!]/g, "").split("|")[0].trim();
    let target = app.metadataCache.getFirstLinkpathDest(linkText, "");
    return target ? app.vault.getResourcePath(target) : "https://via.placeholder.com/150/333333/FFFFFF?text=👤";
};
const div = this.container.createDiv({ attr: { style: "display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 20px;" }});
div.createEl("img", { attr: { src: resolveImg(meta.imagem), style: "width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--text-success); box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-bottom: 10px;" }});
div.createEl("h1", { text: \`👤 \${meta.nome || file.basename}\`, attr: { style: "margin: 0; font-size: 2.2em; font-weight: bold;" }});
\`\`\`

<div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: start;">
<div style="flex: 1; min-width: 300px;">

> [!quote]- Interpretação e Lore
> **Nome Completo:** \`INPUT[text:nome_completo]\` | **Imagem:** \`INPUT[text:imagem]\`
> **Resumo:** 
> \`INPUT[textArea:resumo]\`
> 
> **Facção / Ocupação:** \`INPUT[text:faccao]\`
> **Raça / Espécie:** \`INPUT[text:raca]\`
> **Origem / Nacionalidade:** \`INPUT[text:origem]\`
> **Alinhamento:** \`INPUT[text:alinhamento]\`
> **Nível:** \`INPUT[number:nivel]\`
> 
> **🧠 PERSONALIDADE & TÁTICAS**
> - **Comportamento:** \`INPUT[textArea:tracos_dominantes]\`
> - **Táticas de Combate:** \`INPUT[textArea:taticas]\`
> - **Motivações:** \`INPUT[textArea:motivacoes]\`

> [!warning]- ✨ PODERES, VANTAGENS & MAGIAS
> ## Vantagens e Desvantagens
> \`INPUT[textArea:vantagens]\`
> 
> ## Magias Conhecidas
> \`INPUT[textArea:magias]\`

> [!success] 🌟 RECOMPENSAS
> **XP Recompensa:** \`INPUT[number:XP]\`
> **Ouro Recompensa:** \`INPUT[number:Ouro]\`

</div>

<div style="flex: 1; min-width: 300px;">

> [!danger] ⚔️ COMBATE E STATUS
> **Ativo no Combate:** \`INPUT[toggle:ativo]\` | **Localização:** \`INPUT[text:Localizacao]\`
> 
> **Barras de Vida e Magia**
> **HP:** \`INPUT[number:HP]\` / \`VIEW[{HP_max}]\` | **PM:** \`INPUT[number:PM]\` / \`VIEW[{PM_max}]\`
> 
> **Atributos Principais (D&D)**
> **FOR:** \`INPUT[number:FOR]\` | **DES:** \`INPUT[number:DES]\` | **CON:** \`INPUT[number:CON]\` 
> **INT:** \`INPUT[number:INT]\` | **SAB:** \`INPUT[number:SAB]\` | **CAR:** \`INPUT[number:CAR]\`
> 
> **Atributos Clássicos (4DeT)**
> **F:** \`INPUT[number:F]\` | **H:** \`INPUT[number:H]\` | **R:** \`INPUT[number:R]\` | **A:** \`INPUT[number:A]\` | **PdF:** \`INPUT[number:PdF]\`
> 
> **Defesa e Movimento**
> **CA:** \`INPUT[number:CA]\` | **Deslocamento:** \`INPUT[text:Deslocamento]\`
> 
> **Condições:**
> \`\`\`meta-bind
> INPUT[list:status_efeitos]
> \`\`\`

</div>
</div>

---
### ⚙️ INVENTÁRIO / LOOT
\`\`\`dataviewjs
const meta = app.metadataCache.getFileCache(app.workspace.getActiveFile())?.frontmatter || {};
if(!meta.inventario || meta.inventario.length === 0) {
    dv.paragraph("Loot vazio.");
} else {
    dv.table(["Item", "Descrição"], meta.inventario.map(i => [i.nome, i.desc]));
}
\`\`\`
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

> [!info] Visão Geral
> **Clima / Ambiente:** \`INPUT[text:clima]\`
> **Nível de Perigo:** \`INPUT[number:nivel_perigo]\`
> **Imagem:** \`INPUT[text:imagem]\`

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

> [!quote] Status da Missão
> **Status:** \`INPUT[text:status]\`
> **Nível Recomendado:** \`INPUT[number:nivel_minimo]\`
> **Recompensa Ouro:** \`INPUT[number:recompensa_ouro]\` MO
> **Recompensa XP:** \`INPUT[number:recompensa_xp]\` XP

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
