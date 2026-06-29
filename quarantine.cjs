const fs = require('fs');
const path = require('path');

const WIKI_DIR = 'd:/DOZERO/wikidozero';
const ARCHIVE_DIR = path.join(WIKI_DIR, '[0] 📦 Arquivo (Quarentena)');

// Pastas protegidas inteiras
const PROTECTED_DIRS = [
  '[2] 🔮 Matrizes do VTT',
  '[3] 📎 Anexos',
  '[0] 📦 Arquivo (Quarentena)' // não mexer no arquivo se rodarmos de novo
];

// Arquivos protegidos (por nome ou caminho exato)
const PROTECTED_FILES = [
  'Jacir Malemog.md',
  'Sentinela__mega_1781993595406.md',
  '_MODELO_INIMIGO.md',
  '_MODELO_JOGADOR.md',
  'README.md',
  'GraphSettings.md',
  'Quadro_Principal.md'
];

function isProtected(fullPath) {
  const relPath = path.relative(WIKI_DIR, fullPath);
  
  // Check protected dirs
  for(const dir of PROTECTED_DIRS) {
    if(relPath.startsWith(dir)) return true;
  }

  // Check protected files
  const baseName = path.basename(fullPath);
  if(PROTECTED_FILES.includes(baseName)) return true;

  return false;
}

function walk(dir, fileList=[]) {
  const files = fs.readdirSync(dir);
  for(const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if(stat.isDirectory()) {
      walk(fullPath, fileList);
    } else if(fullPath.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = walk(WIKI_DIR);
let movedCount = 0;

for(const file of allFiles) {
  if(!isProtected(file)) {
    const relPath = path.relative(WIKI_DIR, file);
    const destPath = path.join(ARCHIVE_DIR, relPath);
    const destDir = path.dirname(destPath);
    
    // Garantir que a pasta de destino exista
    if(!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Mover o arquivo
    fs.renameSync(file, destPath);
    movedCount++;
    console.log(`Movido: ${relPath}`);
  }
}

console.log(`\n\nOperação concluída. ${movedCount} arquivos foram para a Quarentena.`);
