const fs = require('fs');
const path = 'D:/DOZERO/wikidozero/MegaOraculo.md';

let content = fs.readFileSync(path, 'utf8');

// The tables we want to extract
const tablesToExtract = [
  '## Pague o preo (Expandido)',
  '## Confrontar o Caos (Expandido)',
  '## Ao de combate',
  '## Complicao da histria',
  '## Ciclo do Dia',
  '## Temperatura',
  '## Clima Atual'
];

const extractedContent = [];

// Since there are encoding issues with the strings (e.g., 'Ao'), 
// we will use a more robust regex-based extraction.
// We'll split the content by "## " and filter.

const blocks = content.split('\n## ');

let newBlocks = [];
let extractedBlocks = [];

for (let i = 0; i < blocks.length; i++) {
  let block = blocks[i];
  if (i > 0) block = '## ' + block; // restore prefix

  let matched = false;
  
  if (block.includes('## Pague o pre')) { extractedBlocks.push({title: 'Pague o preço', content: block}); matched = true; }
  else if (block.includes('## Confrontar o Caos')) { extractedBlocks.push({title: 'Confrontar o Caos', content: block}); matched = true; }
  else if (block.includes('## A') && block.includes('o de combate')) { extractedBlocks.push({title: 'Ação de combate', content: block}); matched = true; }
  else if (block.includes('## Complica') && block.includes('o da hist')) { extractedBlocks.push({title: 'Complicação da história', content: block}); matched = true; }
  else if (block.includes('## Ciclo do Dia')) { extractedBlocks.push({title: 'Ciclo do Dia', content: block}); matched = true; }
  else if (block.includes('## Temperatura')) { extractedBlocks.push({title: 'Temperatura', content: block}); matched = true; }
  else if (block.includes('## Clima Atual')) { extractedBlocks.push({title: 'Clima Atual', content: block}); matched = true; }

  // Special check to remove `# YO? Essenciais de Jogo (Clima & Tempo)` empty headers
  if (!matched && !block.includes('# YO? Essenciais de Jogo')) {
    // wait, # headers are not split by \n## unless they happen to be inside a block
    // We should clean up `# YO? Essenciais de Jogo (Clima & Tempo)` later
    newBlocks.push(block);
  }
}

// Reassemble the remaining content
content = newBlocks.join('\n');

// Remove the old Category Header if it exists
content = content.replace(/# [^\n]*Essenciais de Jogo \(Clima & Tempo\)\n*/g, '');

// Build the new GM Tools Category
let gmCategory = `# 👑 Ferramentas do Mestre\n\n`;

gmCategory += `## Oráculo de Probabilidade
dados: 1d100

| Dado | Resultado |
|---|---|
| 1-10 | Não, e algo terrível acontece (Pague o Preço) |
| 11-35 | Não. |
| 36-50 | Não, mas há um lado positivo. |
| 51-65 | Sim, mas há uma complicação ou custo. |
| 66-90 | Sim. |
| 91-100 | Sim, e você recebe uma vantagem inesperada! |

`;

gmCategory += `## Mudança de Comportamento de NPC
dados: 1d100

| Dado | Resultado |
|---|---|
| 1-15 | Fica agressivo / Hostil. |
| 16-30 | Exige um favor / Pagamento antes de continuar. |
| 31-45 | Fica assustado / Tenta fugir. |
| 46-60 | Fica desconfiado / Pede provas. |
| 61-75 | Se ofende profundamente com algo dito. |
| 76-85 | Fica curioso / Faz muitas perguntas. |
| 86-95 | Fica extremamente amigável / Prestativo. |
| 96-100 | Revela um segredo acidentalmente. |

`;

gmCategory += `## Súbito Pico de Tensão
dados: 1d100

| Dado | Resultado |
|---|---|
| 1-10 | Um inimigo poderoso descobre a localização de vocês. |
| 11-20 | Uma armadilha ou perigo ambiental é ativado de repente. |
| 21-30 | O tempo se esgota para uma tarefa crucial. |
| 31-40 | Uma fonte de luz / energia se apaga. |
| 41-50 | Alguém grita ou um barulho alto atrai atenção. |
| 51-60 | Um aliado (NPC) é capturado, some ou é ferido gravemente. |
| 61-70 | O terreno muda (chão cede, porta tranca, água sobe). |
| 71-80 | Um equipamento essencial quebra ou é perdido. |
| 81-90 | Reforços inimigos chegam. |
| 91-100 | O clima/ambiente piora drasticamente (tempestade forte, nevasca, fumaça). |

`;

gmCategory += `## Sentidos Imediatos
dados: 1d100

| Dado | Resultado |
|---|---|
| 1-15 | Cheiro forte e repulsivo (podridão, enxofre). |
| 16-30 | Cheiro adocicado ou metálico (sangue, ozônio). |
| 31-45 | Som de gotejamento constante ou passos arrastados. |
| 46-60 | Um frio súbito que arrepia a espinha. |
| 61-75 | Um calor abafado e sufocante. |
| 76-85 | Som de respiração ou sussurros onde não deveria haver ninguém. |
| 86-95 | Visão periférica capta movimento rápido (uma sombra). |
| 96-100 | Sensação de estar sendo observado intensamente. |

`;

// Append extracted blocks
const blockOrder = ['Ação de combate', 'Confrontar o Caos', 'Pague o preço', 'Complicação da história', 'Clima Atual', 'Temperatura', 'Ciclo do Dia'];

for (const title of blockOrder) {
  const found = extractedBlocks.find(b => b.title === title);
  if (found) {
    // Fix encoding of title in the block
    let cleanedContent = found.content;
    if (title === 'Ação de combate') cleanedContent = cleanedContent.replace(/## A.*o de combate/, '## Ação de combate');
    if (title === 'Complicação da história') cleanedContent = cleanedContent.replace(/## Complica.*o da hist.*ria/, '## Complicação da história');
    if (title === 'Pague o preço') cleanedContent = cleanedContent.replace(/## Pague o pre.*o \(Expandido\)/, '## Pague o Preço (Expandido)');
    
    gmCategory += cleanedContent + '\n\n';
  }
}

// The original content might have started with `# ` so we just prepend our new master category.
// However, the very first line of newBlocks is probably not empty.
content = gmCategory + '\n' + content;

fs.writeFileSync(path, content, 'utf8');
console.log('Refatoração concluída com sucesso!');
