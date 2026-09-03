import fs from 'fs';

const data = JSON.parse(fs.readFileSync('D:/DOZERO/scripts/detailed-wiki-analysis.json', 'utf8'));

const markdownFiles = data.filter(d => d.type === 'markdown');

console.log(`Total de arquivos Markdown: ${markdownFiles.length}`);

const emptyOrStub = [];
const characters = [];
const locations = [];
const campaignsAndMissions = [];
const worldLoreAndNotes = [];

for (const f of markdownFiles) {
  const isStub = f.charCount < 80 || f.meaningfulLineCount === 0;
  const isQuarantineStub = f.path.includes('Quarentena') && (f.charCount < 150 || f.meaningfulLineCount <= 2);
  
  if (isStub || isQuarantineStub) {
    emptyOrStub.push(f);
  } else {
    const low = (f.path + ' ' + f.contentSnippet).toLowerCase();
    if (low.includes('personagem') || low.includes('npc') || low.includes('ficha') || low.includes('atributos') || low.includes('força') || low.includes('pv') || low.includes('gorath') || low.includes('jubbaer') || low.includes('lyra') || low.includes('sentinela') || low.includes('jacir') || low.includes('thalion') || low.includes('kael')) {
      characters.push(f);
    } else if (low.includes('local') || low.includes('locais') || low.includes('reino') || low.includes('cidade') || low.includes('masmorra') || low.includes('torre') || low.includes('taverna') || low.includes('floresta')) {
      locations.push(f);
    } else if (low.includes('campanha') || low.includes('missao') || low.includes('missoes') || low.includes('sessao')) {
      campaignsAndMissions.push(f);
    } else {
      worldLoreAndNotes.push(f);
    }
  }
}

console.log('\n=== 1. VAZIOS OU DESCARTÁVEIS (Stubs / Sem conteúdo útil) ===', emptyOrStub.length);
emptyOrStub.forEach(f => console.log(`- [${f.size} bytes / ${f.charCount} chars] ${f.path}`));

console.log('\n=== 2. PERSONAGENS (Fichas, NPCs, Heróis, Criaturas) ===', characters.length);
characters.forEach(f => console.log(`- [${f.size} bytes] ${f.path}`));

console.log('\n=== 3. LOCAIS & CENÁRIOS ===', locations.length);
locations.forEach(f => console.log(`- [${f.size} bytes] ${f.path}`));

console.log('\n=== 4. CAMPANHAS & MISSÕES ===', campaignsAndMissions.length);
campaignsAndMissions.forEach(f => console.log(`- [${f.size} bytes] ${f.path}`));

console.log('\n=== 5. OUTRAS NOTAS & LORE ===', worldLoreAndNotes.length);
worldLoreAndNotes.forEach(f => console.log(`- [${f.size} bytes] ${f.path}`));
