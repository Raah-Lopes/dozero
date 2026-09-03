const fs = require('fs');

const nomes = [
  'Kaelen', 'Aria', 'Thorne', 'Elara', 'Bram', 'Lyra', 'Valerius', 'Seraphina', 'Draven', 'Isolde',
  'Garrick', 'Nia', 'Caelum', 'Vesper', 'Kael', 'Rowan', 'Sylas', 'Elara', 'Lucian', 'Mara',
  'Ronan', 'Kira', 'Vane', 'Eira', 'Gideon', 'Lyra', 'Cassian', 'Freya', 'Orion', 'Sienna',
  'Talon', 'Nova', 'Jax', 'Luna', 'Kael', 'Astra', 'Zane', 'Lyra', 'Dax', 'Nova',
  'Finn', 'Cleo', 'Rex', 'Zoe', 'Leo', 'Mia', 'Max', 'Ava', 'Sam', 'Ivy'
];

const profissoes = [
  'Mercenário', 'Comerciante', 'Nobre', 'Fazendeiro', 'Guarda', 'Ladrão', 'Mago/Erudito', 'Sacerdote/Cultista',
  'Ferreiro', 'Taberneiro', 'Caçador', 'Assassino', 'Marinheiro/Piloto', 'Mendigo', 'Artista/Bardo', 'Soldado',
  'Artesão', 'Alquimista/Médico', 'Escravo/Prisioneiro', 'Líder/Chefe'
];

const disposicoes = [
  'Amigável', 'Prestativo', 'Curioso', 'Indiferente', 'Ocupado', 'Desconfiado', 'Medroso', 'Hostil',
  'Agressivo', 'Sádico', 'Manipulador', 'Desesperado', 'Ganancioso', 'Arrogante', 'Submisso', 'Confuso',
  'Bêbado/Incapacitado', 'Invejoso', 'Leal', 'Traiçoeiro'
];

const fisico = [
  'Cicatriz no rosto', 'Falta um membro/olho', 'Tatuagens tribais/místicas', 'Muito alto/musculoso', 'Muito magro/esquelético',
  'Cabelos coloridos/exóticos', 'Sempre suado/sujo', 'Roupas muito finas/caras', 'Roupas em trapos', 'Usa um tapa-olho',
  'Voz extremamente grossa', 'Voz fina/estranha', 'Cheira a álcool/especiarias', 'Careca reluzente', 'Barba/Cabelo muito longos',
  'Usa joias exageradas', 'Carrega uma arma gigante', 'Manchas na pele', 'Olhos de cores diferentes', 'Sempre mastigando algo'
];

const psico = [
  'Paranoico com traição', 'Acredita em teorias da conspiração', 'Depressivo crônico', 'Otimista irritante', 'Viciado em jogo/drogas',
  'Religioso fanático', 'Cleptomaníaco', 'Mentiroso compulsivo', 'Covarde ao extremo', 'Corajoso imprudente',
  'Gosta de falar em enigmas', 'Acha que é um nobre perdido', 'Odeia uma raça/facção específica', 'Gago quando nervoso', 'Sempre rindo sem motivo',
  'Extremamente educado/formal', 'Sempre xingando', 'Acha que consegue falar com espíritos', 'Fobia de sujeira/sangue', 'Protetor/Paternal'
];

function generateTable(name, dice, array, isRange = false) {
  let table = `## ${name}\ndados: ${dice}\n\n| Dado | Resultado |\n|---|---|\n`;
  const max = parseInt(dice.split('d')[1]);
  const step = Math.max(1, Math.floor(max / array.length));
  
  for (let i = 0; i < array.length; i++) {
    const minVal = (i * step) + 1;
    let maxVal = minVal + step - 1;
    if (i === array.length - 1) maxVal = max; // ensure last item covers the rest

    if (maxVal > minVal) {
      table += `| ${minVal}-${maxVal} | ${array[i]} |\n`;
    } else {
      table += `| ${minVal} | ${array[i]} |\n`;
    }
  }
  return table + '\n';
}

let content = `# 🧬 Identidade Básica\n\n`;
content += generateTable('Nome', '1d100', nomes);
content += `## Sexo\ndados: 1d100\n\n| Dado | Resultado |\n|---|---|\n| 1-45 | Masculino |\n| 46-90 | Feminino |\n| 91-100 | Andrógino/Outro |\n\n`;
content += `## Idade\ndados: 1d100\n\n| Dado | Resultado |\n|---|---|\n| 1-20 | Jovem (15-25) |\n| 21-60 | Adulto (26-45) |\n| 61-90 | Maduro (46-65) |\n| 91-100 | Idoso (66+) |\n\n`;
content += generateTable('Papel ou Profissão', '1d100', profissoes);
content += generateTable('Disposição', '1d100', disposicoes);

content += `# 👁️ Perfil Visual & Psicológico\n\n`;
content += generateTable('Descritor Físico', '1d100', fisico);
content += generateTable('Descritor Psicológico', '1d100', psico);

content += `# 📊 Estatísticas e Combate\n\n`;
content += `## Nível de Ameaça\ndados: 1d100\n\n| Dado | Resultado |\n|---|---|\n| 1-30 | Nv 1 (Minion/Aldeão) |\n| 31-60 | Nv 2 (Capanga/Soldado) |\n| 61-80 | Nv 3 (Veterano/Ameaça Real) |\n| 81-95 | Nv 4 (Elite/Chefe Menor) |\n| 96-100 | Nv 5 (Chefe Absoluto) |\n\n`;
content += `## Estilo de Combate (Atributos)\ndados: 1d100\n\n| Dado | Resultado |\n|---|---|\n| 1-20 | Brutamontes (+FOR, -INT) |\n| 21-40 | Furtivo/Ágil (+DES, -FOR) |\n| 41-60 | Estrategista/Mago (+INT, -FOR) |\n| 61-80 | Diplomata/Líder (+CAR, -DES) |\n| 81-100 | Equilibrado (Médio em tudo) |\n\n`;

fs.writeFileSync('D:/DOZERO/wikidozero/MegaNPCs.md', content, 'utf8');
console.log('MegaNPCs.md generated!');
