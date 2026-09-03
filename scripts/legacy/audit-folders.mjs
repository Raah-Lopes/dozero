import fs from 'fs';
import path from 'path';

const wikiDir = 'D:/DOZERO/wikidozero';

function scanFolders(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const subdirs = entries.filter(e => e.isDirectory());
  const files = entries.filter(e => !e.isDirectory());

  const rel = path.relative(wikiDir, dir).replace(/\\/g, '/');
  
  // Contar arquivos recursivamente
  function countAllFiles(d) {
    let count = 0;
    const ents = fs.readdirSync(d, { withFileTypes: true });
    for (const ent of ents) {
      if (ent.isDirectory()) {
        count += countAllFiles(path.join(d, ent.name));
      } else {
        count++;
      }
    }
    return count;
  }

  const totalFiles = countAllFiles(dir);

  results.push({
    path: rel || '.',
    directFiles: files.map(f => f.name),
    directSubdirs: subdirs.map(s => s.name),
    totalFilesRecursive: totalFiles,
    isEmpty: totalFiles === 0
  });

  for (const s of subdirs) {
    results = results.concat(scanFolders(path.join(dir, s.name)));
  }

  return results;
}

const folders = scanFolders(wikiDir);

console.log(`Total de pastas encontradas: ${folders.length}`);
console.log('\n--- PASTAS TOTALMENTE VAZIAS ---');
const emptyFolders = folders.filter(f => f.isEmpty);
emptyFolders.forEach(f => console.log(`- ${f.path}`));

console.log('\n--- TODAS AS PASTAS E CONTAGEM DE ARQUIVOS ---');
folders.forEach(f => {
  console.log(`[${f.totalFilesRecursive} arquivos] ${f.path} (diretos: ${f.directFiles.length}, subpastas: ${f.directSubdirs.length})`);
});

fs.writeFileSync('D:/DOZERO/scripts/folders-analysis.json', JSON.stringify(folders, null, 2), 'utf8');
