const fs = require('fs');
const path = require('path');
const base = 'd:/DOZERO/template_wiki';
const dirs = [
  '[1] 🏕️ Campanha Principal',
  '[2] 🛡️ Regras',
  '[3] 🧙‍♂️ Personagens',
  '[4] 🗺️ Locais',
  'Fichas'
];
dirs.forEach(d => fs.mkdirSync(path.join(base, d), {recursive: true}));

fs.writeFileSync(path.join(base, dirs[0], 'Introdução.md'), '# Introdução à Campanha\n\nEscreva aqui a premissa da sua aventura.');
fs.writeFileSync(path.join(base, dirs[1], 'Mecânicas.md'), '# Regras da Casa\n\nAnote aqui as regras customizadas do seu grupo.');
fs.writeFileSync(path.join(base, dirs[2], 'Heróis.md'), '# Os Heróis\n\nOs protagonistas desta história.');
fs.writeFileSync(path.join(base, dirs[3], 'Mapa-Múndi.md'), '# O Mundo\n\nDescreva o cenário geral.');

const fichaMonstro = `---
tipo: Monstro
pv: 50
mana: 0
defesa: 15
ataque: 1d20+5
dano: 2d6+3
---
# Exemplo de Monstro
Este é um goblin cruel.`;

const fichaHeroi = `---
tipo: Personagem
pv: 30
mana: 20
defesa: 12
classe: Guerreiro
---
# Exemplo de Herói
O herói destemido.`;

fs.writeFileSync(path.join(base, 'Fichas', 'Exemplo de Monstro.md'), fichaMonstro);
fs.writeFileSync(path.join(base, 'Fichas', 'Exemplo de Herói.md'), fichaHeroi);
