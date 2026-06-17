const fs = require('fs');
const path = require('path');
const translate = require('@vitalets/google-translate-api');

const WIKI_DIR = 'D:/wikidozero';
const ORACLES_DIR = path.join(WIKI_DIR, 'Oracles');
const JSON_FILES = ['Ironsmith-Expanded-Oracles.JSON', 'Starsmith-Expanded-Oracles.json'];

// Helper for delays to prevent IP ban
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function translateText(text) {
  if (!text || text.trim() === '' || !/[a-zA-Z]/.test(text)) return text;
  try {
    const res = await translate.translate(text, { to: 'pt' });
    await sleep(300); // 300ms delay between translates to avoid ban
    return res.text;
  } catch (e) {
    console.error(`Erro ao traduzir: "${text.substring(0, 30)}..." - ${e.message}`);
    await sleep(2000); // Wait longer on error
    return text;
  }
}

async function translateMarkdownFile(filePath) {
  console.log('Traduzindo Markdown:', filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Traduzir Título
    if (line.startsWith('# ')) {
      const originalTitle = line.replace('# ', '').trim();
      const translatedTitle = await translateText(originalTitle);
      lines[i] = `# ${translatedTitle}`;
      modified = true;
      continue;
    }

    // Traduzir células de tabela
    const rowRegex = /^(\|\s*\d+(?:-\d+)?\s*\|\s*)(.+?)(\s*\|)$/;
    const match = line.match(rowRegex);
    
    if (match) {
      const prefix = match[1];
      const textToTranslate = match[2];
      const suffix = match[3];
      
      // Ignora se já estiver parecendo em português ou se for muito curto
      if (textToTranslate.length > 2) {
        const translated = await translateText(textToTranslate);
        lines[i] = `${prefix}${translated}${suffix}`;
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }
}

async function processMarkdownDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await processMarkdownDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.md')) {
      await translateMarkdownFile(fullPath);
    }
  }
}

async function translateJsonFile(filePath) {
  console.log('Traduzindo JSON:', filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch(e) {
    console.error('JSON inválido:', filePath);
    return;
  }

  const oracles = data.Oracles || [];
  let translatedCount = 0;

  for (const orc of oracles) {
    if (orc.Name) {
      // orc.Name = await translateText(orc.Name);
    }
    const table = orc['Oracle Table'] || orc.Table || [];
    for (const row of table) {
      if (row.Description && !row._translated) {
        row.Description = await translateText(row.Description);
        row._translated = true;
        translatedCount++;
        if (translatedCount % 50 === 0) {
          console.log(`Progresso no JSON: ${translatedCount} itens traduzidos em ${path.basename(filePath)}... Salvando backup.`);
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        }
      }
      if (row.Result && !row._translated) {
        row.Result = await translateText(row.Result);
        row._translated = true;
        translatedCount++;
        if (translatedCount % 50 === 0) {
          console.log(`Progresso no JSON: ${translatedCount} itens traduzidos em ${path.basename(filePath)}... Salvando backup.`);
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        }
      }
    }
  }

  console.log(`JSON ${path.basename(filePath)} finalizado. Salvando...`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function start() {
  console.log('==================================================');
  console.log(' INICIANDO TRADUÇÃO MASSIVA DO ORÁCULO PARA PT-BR');
  console.log('==================================================');
  
  // 1. Processar Markdowns
  if (fs.existsSync(ORACLES_DIR)) {
    console.log('Verificando diretório de Markdown...');
    await processMarkdownDirectory(ORACLES_DIR);
  }

  // 2. Processar JSONs
  for (const file of JSON_FILES) {
    const fullPath = path.join(WIKI_DIR, file);
    if (fs.existsSync(fullPath)) {
      await translateJsonFile(fullPath);
    }
  }
  
  console.log('==================================================');
  console.log(' TRADUÇÃO CONCLUÍDA!');
  console.log('==================================================');
}

start().catch(err => console.error('Erro Fatal:', err));
