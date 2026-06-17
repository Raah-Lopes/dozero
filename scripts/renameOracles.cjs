const fs = require('fs');
const path = require('path');
const translate = require('@vitalets/google-translate-api');

const ORACLES_DIR = 'D:/wikidozero/Oracles';

const folderTranslations = {
  'Ask_the_Oracle': 'Pergunte_ao_Oraculo',
  'Campaign': 'Campanha',
  'Characters': 'Personagens',
  'Core': 'Essencial',
  'Creatures': 'Criaturas',
  'Derelicts': 'Naves_Abandonadas',
  'Districts': 'Distritos',
  'Factions': 'Faccoes',
  'Location_Themes': 'Temas_de_Localizacao',
  'Misc': 'Diversos',
  'Moves': 'Movimentos',
  'Planets': 'Planetas',
  'Settlements': 'Assentamentos',
  'Space': 'Espaco',
  'Starships': 'Naves_Estelares',
  'Vaults': 'Cofres'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function sanitizeName(name) {
  // Remove special chars that windows hates, keep alphanumeric and spaces/underscores
  return name.replace(/[<>:"/\\|?*]+/g, '').replace(/ /g, '_');
}

async function translateNameSafe(originalName) {
  if (!originalName || !/[a-zA-Z]/.test(originalName)) return originalName;
  try {
    const res = await translate.translate(originalName.replace(/_/g, ' '), { to: 'pt' });
    await sleep(400); // Prevent IP Block
    let translated = res.text;
    // Remove acentos
    translated = translated.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return sanitizeName(translated);
  } catch (e) {
    console.error(`Erro rate-limit ao traduzir nome do arquivo: "${originalName}"`);
    await sleep(2000);
    return originalName;
  }
}

async function renameFilesInDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const oldPath = path.join(dirPath, entry.name);
    if (entry.isFile() && oldPath.endsWith('.md')) {
      const oldNameWithoutExt = path.basename(entry.name, '.md');
      const newNameWithoutExt = await translateNameSafe(oldNameWithoutExt);
      const newName = `${newNameWithoutExt}.md`;
      const newPath = path.join(dirPath, newName);
      if (oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
        console.log(`Renomeado: ${entry.name} -> ${newName}`);
      }
    }
  }
}

async function start() {
  console.log('Iniciando Tradução e Renomeação de Arquivos e Pastas...');
  
  if (!fs.existsSync(ORACLES_DIR)) return;

  const folders = fs.readdirSync(ORACLES_DIR, { withFileTypes: true });
  
  // 1. Iterar em cada pasta
  for (const folder of folders) {
    if (folder.isDirectory()) {
      const oldFolderPath = path.join(ORACLES_DIR, folder.name);
      const translatedFolderName = folderTranslations[folder.name] || await translateNameSafe(folder.name);
      
      const newFolderPath = path.join(ORACLES_DIR, translatedFolderName);
      
      let currentPathToProcess = oldFolderPath;

      // 2. Renomear a pasta se necessário
      if (oldFolderPath !== newFolderPath) {
        fs.renameSync(oldFolderPath, newFolderPath);
        console.log(`[PASTA] Renomeada: ${folder.name} -> ${translatedFolderName}`);
        currentPathToProcess = newFolderPath;
      }

      // 3. Renomear os arquivos dentro da pasta
      await renameFilesInDirectory(currentPathToProcess);
    }
  }

  console.log('Renomeação Concluída!');
}

start().catch(e => console.error(e));
