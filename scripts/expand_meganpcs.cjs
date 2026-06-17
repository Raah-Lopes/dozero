const fs = require('fs');
const path = 'D:/wikidozero/MegaNPCs.md';

let content = fs.readFileSync(path, 'utf8');

// Function to generate standard 1d100 table from an array
function generateTable(name, array) {
  let table = `## ${name}\ndados: 1d100\n\n| Dado | Resultado |\n|---|---|\n`;
  const step = Math.max(1, Math.floor(100 / array.length));
  
  for (let i = 0; i < array.length; i++) {
    const minVal = (i * step) + 1;
    let maxVal = minVal + step - 1;
    if (i === array.length - 1) maxVal = 100;

    if (maxVal > minVal) {
      table += `| ${minVal}-${maxVal} | ${array[i]} |\n`;
    } else {
      table += `| ${minVal} | ${array[i]} |\n`;
    }
  }
  return table + '\n';
}

// ARRAYS
const nomesHumano = ['Kaelen', 'Aria', 'Thorne', 'Elara', 'Bram', 'Lyra', 'Valerius', 'Seraphina', 'Draven', 'Isolde', 'Garrick', 'Nia', 'Caelum', 'Vesper', 'Kael', 'Rowan', 'Sylas', 'Mara', 'Ronan', 'Kira'];
const nomesElfo = ['Aelrindel', 'Faenor', 'Iluven', 'Sariel', 'Thranduil', 'Vaalyun', 'Galad', 'Faelar', 'Elrohir', 'Celeborn', 'Alatar', 'Arwen', 'Elora', 'Ithil', 'Luthien', 'Melian', 'Narya', 'Serein', 'Tauriel', 'Vilya'];
const nomesAnao = ['Thorin', 'Gimli', 'Balin', 'Dwalin', 'Oin', 'Gloin', 'Bofur', 'Bombur', 'Fili', 'Kili', 'Dis', 'Helga', 'Sigrid', 'Brunhild', 'Thora', 'Barda', 'Dagmar', 'Freya', 'Gerta', 'Hilda'];
const nomesFada = ['Puck', 'Ariel', 'Titania', 'Oberon', 'Navi', 'Tinker', 'Flora', 'Fauna', 'Merryweather', 'Luna', 'Stella', 'Aura', 'Brisa', 'Clover', 'Daisy', 'Fern', 'Hazel', 'Ivy', 'Lily', 'Rose'];
const nomesSintetico = ['Unit-01', 'CX-99', 'Nexus-6', 'Ash', 'Bishop', 'David', 'Walter', 'HAL', 'GLaDOS', 'SHODAN', 'R2-D2', 'C-3PO', 'BB-8', 'K-2SO', 'IG-11', 'T-800', 'T-1000', 'Bender', 'Wall-E', 'EVE'];
const nomesDragao = ['Smaug', 'Glaurung', 'Ancalagon', 'Balerion', 'Vhagar', 'Meraxes', 'Syrax', 'Caraxes', 'Meleys', 'Seasmoke', 'Tessarion', 'Vermithor', 'Silverwing', 'Dreamfyre', 'Sunfyre', 'Moondancer', 'Vermax', 'Arrax', 'Tyraxes', 'Stormcloud'];
const nomesMonstro = ['Grok', 'Mug', 'Snaga', 'Ugluk', 'Shagrat', 'Gorbag', 'Grishnakh', 'Lurtz', 'Gothmog', 'Azog', 'Bolg', 'Golfimbul', 'Mauhur', 'Lugdush', 'Ufthak', 'Lagduf', 'Muzgash', 'Radbug', 'Snar', 'Gorgu'];
const nomesDemonio = ['Azazel', 'Belial', 'Leviathan', 'Lucifer', 'Satan', 'Beelzebub', 'Asmodeus', 'Mammon', 'Belphegor', 'Mephistopheles', 'Baphomet', 'Paimon', 'Astaroth', 'Baal', 'Lillith', 'Samael', 'Abaddon', 'Moloch', 'Dagon', 'Pazuzu'];
const nomesAnjo = ['Michael', 'Gabriel', 'Raphael', 'Uriel', 'Sariel', 'Raguel', 'Remiel', 'Jophiel', 'Zadkiel', 'Chamuel', 'Metatron', 'Sandalphon', 'Raziel', 'Tzaphqiel', 'Tzadkiel', 'Kamael', 'Haniel', 'Mikael', 'Gavriel', 'Rafael'];

const marcasHumano = ['Nenhuma', 'Cicatriz de batalha', 'Tatuagem de guilda', 'Acento estrangeiro', 'Sarda', 'Olhar cansado', 'Postura ereta', 'Cabelo tingido', 'Mancha de nascença', 'Roupa puída'];
const marcasElfo = ['Orelhas pontudas longas', 'Olhos brilhantes (sem pupila)', 'Pele que reflete a luz lunar', 'Cabelo esvoaçante sem vento', 'Cheiro de floresta fresca', 'Passos inaudíveis', 'Voz hipnótica', 'Marcas arcanas na pele', 'Sombra que se move sutilmente', 'Sempre imaculadamente limpo'];
const marcasAnao = ['Barba colossal', 'Cheiro de forja e fuligem', 'Mãos grossas como pedra', 'Olhar severo e avaliador', 'Roupas com cota de malha embutida', 'Tatuagens rúnicas', 'Braços desproporcionalmente fortes', 'Sempre segurando um machado ou caneca', 'Voz trovejante', 'Suor constante de calor interno'];
const marcasSintetico = ['Luz LED pulsante no olho', 'Pele de silicone levemente rasgada revelando metal', 'Voz robótica/glitchy', 'Cheiro de ozônio', 'Articulações com servos aparentes', 'Movimentos perfeitamente calculados', 'Ausência de piscar', 'Código de barras no pescoço', 'Temperatura corporal gelada', 'Sons de estática sutis'];
const marcasDragao = ['Pupilas em fenda verticais', 'Pele com micro-escamas nas bordas', 'Cheiro de enxofre ou fumaça', 'Presas afiadas', 'Temperatura corporal extremamente alta', 'Voz retumbante que vibra o peito', 'Unhas que lembram garras', 'Sombra com forma alada sutil', 'Olhos que parecem fogo vivo', 'Arrogância dracônica inata'];
const marcasMonstro = ['Caninos desproporcionais', 'Pele verde ou acinzentada grossa', 'Cheiro de sangue e lama', 'Postura encurvada e agressiva', 'Olhos vermelhos injetados', 'Múltiplas cicatrizes de garras', 'Grunhidos entre as palavras', 'Falta de higiene extrema', 'Armadura feita de ossos/sucata', 'Músculos deformados de pura força'];
const marcasVampiro = ['Presas alongadas', 'Pele pálida como mármore', 'Ausência de reflexo sutil', 'Olhar que atrai', 'Aversão sutil à luz solar direta', 'Elegância predatória', 'Lábios sempre avermelhados', 'Cheiro de sangue antigo e perfume caro', 'Unhas impecáveis e afiadas', 'Movimento sem emitir nenhum som'];
const marcasFada = ['Asas translúcidas de inseto', 'Glitter sutil caindo da pele', 'Tamanho minúsculo ou mutável', 'Risada cristalina', 'Cheiro de flores doces', 'Brilho bioluminescente sutil', 'Orelhas em formato de folha', 'Roupas feitas de elementos da natureza', 'Atitude travessa e caótica', 'Rastro de luz fraco ao se mover'];

let newSection = `# 🧬 Genoma Avançado (Filtros Especiais)\n\n`;
newSection += generateTable('Nome (Humano)', nomesHumano);
newSection += generateTable('Nome (Elfo)', nomesElfo);
newSection += generateTable('Nome (Anão)', nomesAnao);
newSection += generateTable('Nome (Fada)', nomesFada);
newSection += generateTable('Nome (Sintético)', nomesSintetico);
newSection += generateTable('Nome (Dragão)', nomesDragao);
newSection += generateTable('Nome (Monstro/Orc)', nomesMonstro);
newSection += generateTable('Nome (Demônio)', nomesDemonio);
newSection += generateTable('Nome (Anjo)', nomesAnjo);

newSection += generateTable('Marca Racial (Humano)', marcasHumano);
newSection += generateTable('Marca Racial (Elfo)', marcasElfo);
newSection += generateTable('Marca Racial (Anão)', marcasAnao);
newSection += generateTable('Marca Racial (Sintético)', marcasSintetico);
newSection += generateTable('Marca Racial (Dragão)', marcasDragao);
newSection += generateTable('Marca Racial (Monstro/Orc)', marcasMonstro);
newSection += generateTable('Marca Racial (Vampiro)', marcasVampiro);
newSection += generateTable('Marca Racial (Fada)', marcasFada);
newSection += generateTable('Marca Racial (Genérica)', ['Olhos brilhantes', 'Pele colorida', 'Chifres pequenos', 'Cauda sutil', 'Cheiro estranho', 'Voz inatural', 'Tatuagem tribal', 'Asas escondidas', 'Fumaça saindo da boca', 'Sombra viva']);

// Replace old "## Nome" with new tables
content = content.replace(/## Nome\ndados: 1d100\n\n\| Dado \| Resultado \|.*?(?=\n## Sexo)/s, newSection);

fs.writeFileSync(path, content, 'utf8');
console.log('MegaNPCs expanded!');
