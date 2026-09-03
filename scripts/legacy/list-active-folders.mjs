import fs from 'fs';

const folders = JSON.parse(fs.readFileSync('D:/DOZERO/scripts/folders-analysis.json', 'utf8'));
const filtered = folders.filter(f => !f.path.includes('Git_Desativado'));

console.log('=== 1. PASTAS TOTALMENTE VAZIAS (CANDIDATAS A REMOÇÃO) ===');
const empty = filtered.filter(f => f.totalFilesRecursive === 0);
console.log(`Total de pastas vazias: ${empty.length}`);
empty.forEach(f => console.log(`- ${f.path}`));

console.log('\n=== 2. PASTAS ATIVAS (COM ARQUIVOS) ===');
const active = filtered.filter(f => f.totalFilesRecursive > 0);
active.forEach(f => {
  console.log(`\n📁 ${f.path} (${f.totalFilesRecursive} arquivos no total)`);
  if (f.directFiles.length > 0) {
    console.log(`   └─ Arquivos: ${f.directFiles.join(', ')}`);
  }
});
