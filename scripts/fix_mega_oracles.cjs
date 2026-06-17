const fs = require('fs');

const path = 'D:/wikidozero/MegaOraculo.md';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let currentCat = '';
let currentTable = '';
let tableLineIndex = -1;

const tableDice = {}; // "Category|Table" -> [{lineIndex, dice, name}]

for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  
  // Categorias
  if (t.startsWith('# ') && !t.startsWith('## ')) {
    currentCat = t.replace('# ', '');
  } 
  // Tabelas
  else if (t.startsWith('## ')) {
    currentTable = t.replace('## ', '');
    // Fix bad translation on the fly
    if (currentTable === 'Aula' && currentCat === 'Planetas') {
      currentTable = 'Classe';
      lines[i] = t.replace('Aula', 'Classe');
    }

    tableLineIndex = i;
  }
  // Dice
  else if (t.startsWith('dados:') || t.startsWith('dice:')) {
    if (currentCat && currentTable && tableLineIndex !== -1) {
      const dice = t.replace(/^(dice|dados):/i, '').trim();
      const key = `${currentCat}|${currentTable}`;
      if (!tableDice[key]) tableDice[key] = [];
      tableDice[key].push({ lineIndex: tableLineIndex, dice: dice, name: currentTable });
      tableLineIndex = -1;
    }
  }
}

// Rename duplicates
for (const key in tableDice) {
  const tables = tableDice[key];
  if (tables.length > 1) {
    console.log(`Fixing duplicate: ${key} (${tables.length} occurences)`);
    
    // Sort by dice to identify expanded
    tables.forEach((t, idx) => {
      let newName = t.name;
      if (tables.length === 2) {
        if (t.dice.includes('300')) newName += ' (Expandido)';
        else newName += ' (Clássico)';
      } else {
        newName += ` (Parte ${idx + 1})`;
      }
      lines[t.lineIndex] = `## ${newName}`;
      console.log(`   Renamed line ${t.lineIndex} to: ## ${newName}`);
    });
  }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('MegaOraculo.md deduplication and fixes complete!');
