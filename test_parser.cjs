const fs = require('fs');

const content = fs.readFileSync('D:/wikidozero/MegaOraculo.md', 'utf-8');
const lines = content.split('\n');

const categoriesMap = {};
let currentCategory = null;
let currentTable = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  if (line.startsWith('# ')) {
    const catName = line.replace('# ', '').trim();
    if (!categoriesMap[catName]) {
      categoriesMap[catName] = { id: catName, name: catName, tables: [] };
    }
    currentCategory = categoriesMap[catName];
    currentTable = null;
  } 
  else if (line.startsWith('## ') && currentCategory) {
    const tableName = line.replace('## ', '').trim();
    currentTable = { id: tableName, name: tableName, dice: '1d100', rows: [] };
    currentCategory.tables.push(currentTable);
  }
  else if ((line.startsWith('dice:') || line.startsWith('dados:')) && currentTable) {
    currentTable.dice = line.replace(/^(dice|dados):/i, '').trim();
  }
  else if (line.startsWith('|') && currentTable) {
    if (line.includes('Dado') || line.includes('Resultado') || line.includes('---')) {
      continue;
    }

    const rowRegex = /^\|\s*(\d+)(?:-(\d+))?\s*\|\s*(.+?)\s*\|$/;
    const match = line.match(rowRegex);
    if (match) {
      const min = parseInt(match[1]);
      const max = match[2] ? parseInt(match[2]) : min;
      const result = match[3].trim();
      currentTable.rows.push({ min, max, result });
    } else {
      console.log('REGEX FAIL ON LINE:', line);
    }
  }
}

const c = Object.values(categoriesMap).filter(c => c.tables.length > 0);
for (const cat of c) {
  for (const t of cat.tables) {
    if (t.name.includes('Nome')) {
      console.log(`Categoria: ${cat.name} | Tabela: ${t.name} | Dice: ${t.dice} | Linhas: ${t.rows.length}`);
    }
  }
}
