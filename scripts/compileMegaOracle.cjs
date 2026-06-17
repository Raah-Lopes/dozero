const fs = require('fs');
const path = require('path');

const WIKI_DIR = 'D:/wikidozero';
const ORACLES_DIR = path.join(WIKI_DIR, 'Oracles');
const JSON_FILES = ['Ironsmith-Expanded-Oracles.JSON', 'Starsmith-Expanded-Oracles.json'];
const OUTPUT_FILE = path.join(WIKI_DIR, 'MegaOraculo.md');

let outputMarkdown = `# Mega Oráculo Mestre\n\nEste arquivo contém todas as tabelas de oráculo do sistema compiladas para carregamento ultra-rápido no VTT.\n\n`;

const categories = {};

// Função auxiliar para adicionar dados na estrutura
function addTableToCategory(categoryName, tableName, dice, rows) {
  if (!categories[categoryName]) {
    categories[categoryName] = [];
  }
  categories[categoryName].push({ name: tableName, dice, rows });
}

// 1. Processar Markdowns
function processMarkdownDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processMarkdownDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      const parts = fullPath.replace(/\\/g, '/').split('/');
      // Pega o nome da pasta imediatamente acima do arquivo
      const catName = parts[parts.length - 2].replace(/_/g, ' ');
      
      let tableName = entry.name.replace('.md', '').replace(/_/g, ' ');
      let dice = '1d100';
      const rows = [];

      for (const line of lines) {
        if (line.startsWith('# ')) {
          tableName = line.replace('# ', '').trim();
        }
        
        const rowRegex = /^\|\s*(\d+)(?:-(\d+))?\s*\|\s*(.+?)\s*\|$/;
        const match = line.match(rowRegex);
        if (match) {
          const min = match[1];
          const max = match[2] || min;
          const result = match[3].trim();
          rows.push({ min, max, result });
        }
      }

      if (rows.length > 0) {
        addTableToCategory(catName, tableName, dice, rows);
      }
    }
  }
}

// 2. Processar JSONs
function processJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const jfName = path.basename(filePath);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const oracles = data.Oracles || [];
  
  for (const orc of oracles) {
    const categoryName = orc.Category || (jfName.includes('Ironsmith') ? 'Ironsmith' : 'Starsmith');
    const tableName = orc.Name || 'Sem Nome';
    const dice = orc.d ? `1d${orc.d}` : (orc.Dice ? `1d${orc.Dice}` : '1d100');
    const rows = [];
    
    const sourceTable = orc['Oracle Table'] || orc.Table || [];
    let lastMax = 0;
    
    for (const row of sourceTable) {
      const min = row.Floor !== undefined ? row.Floor : (lastMax + 1);
      const max = row.Chance !== undefined ? row.Chance : (row.Ceiling !== undefined ? row.Ceiling : min);
      const result = row.Description || row.Result || row.Text || 'Sem resultado';
      
      rows.push({ min, max, result });
      lastMax = max;
    }

    if (rows.length > 0) {
      addTableToCategory(categoryName, tableName, dice, rows);
    }
  }
}

function start() {
  console.log('Compilando Markdowns legados...');
  processMarkdownDirectory(ORACLES_DIR);
  
  console.log('Compilando JSONs massivos...');
  for (const file of JSON_FILES) {
    processJsonFile(path.join(WIKI_DIR, file));
  }
  
  console.log('Gerando arquivo final...');
  
  // Escrever de forma padronizada
  for (const catName in categories) {
    outputMarkdown += `\n# ${catName}\n\n`;
    for (const table of categories[catName]) {
      outputMarkdown += `## ${table.name}\n`;
      outputMarkdown += `dice: ${table.dice}\n\n`;
      outputMarkdown += `| Dado | Resultado |\n`;
      outputMarkdown += `|---|---|\n`;
      
      for (const row of table.rows) {
        const dadoText = row.min === row.max ? `${row.min}` : `${row.min}-${row.max}`;
        outputMarkdown += `| ${dadoText} | ${row.result} |\n`;
      }
      outputMarkdown += `\n`;
    }
  }
  
  fs.writeFileSync(OUTPUT_FILE, outputMarkdown, 'utf8');
  console.log(`Mega Oráculo criado com sucesso em: ${OUTPUT_FILE}`);
}

start();
