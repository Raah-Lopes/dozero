/**
 * Script para substituir alert() por toast() em todos os arquivos src/
 * Adiciona o import do toast onde necessário.
 * Roda: node scripts/replace_alerts.cjs
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// Mapeamento de padrões de alert para variantes de toast
// alert('sucesso') → toast.success()
// alert('erro/falha') → toast.error()
// alert('mana/recursos/saldo/ouro/riqueza') → toast.warn()
// resto → toast.info()
function inferVariant(msg) {
  const lower = msg.toLowerCase();
  if (/sucesso|criada|salva|distribuíd|sincronizad|vinculada/.test(lower)) return 'success';
  if (/erro|falha|inválid|exception/.test(lower)) return 'error';
  if (/insuficiente|faltam|não tem|não possui|não há|aguarde/.test(lower)) return 'warn';
  return 'info';
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  if (!content.includes('alert(')) return false;

  // Find all alert() calls and replace
  // Handles single and multi-line alert calls (up to reasonable length)
  // We replace alert("...") and alert(`...`) and alert('...')
  let changed = false;
  
  content = content.replace(/\balert\(([^)]+)\)/g, (match, inner) => {
    changed = true;
    inner = inner.trim();
    
    // Determine variant from string content if possible
    const strContent = inner.replace(/[`'"]/g, '').toLowerCase();
    let variant = inferVariant(strContent);
    
    return `toast.${variant}(${inner})`;
  });

  if (!changed) return false;

  // Add toast import if not already present
  if (!content.includes("from '../../components/UI/Toast'") && 
      !content.includes("from '../components/UI/Toast'") &&
      !content.includes("from './Toast'") &&
      !content.includes("from '../../UI/Toast'") &&
      !content.includes("from '../UI/Toast'") &&
      !content.includes("from 'src/components/UI/Toast'")) {
    
    // Calculate relative path from file to Toast.tsx
    const toastPath = path.join(SRC_DIR, 'components/UI/Toast.tsx');
    const fileDir = path.dirname(filePath);
    let relPath = path.relative(fileDir, toastPath)
      .replace(/\\/g, '/')
      .replace(/\.tsx$/, '');
    if (!relPath.startsWith('.')) relPath = './' + relPath;
    
    // Insert after last existing import
    const importStatement = `import { toast } from '${relPath}';\n`;
    
    // Find the last import line
    const lastImportMatch = [...content.matchAll(/^import\s+.+from\s+['"].+['"];?\s*$/gm)];
    if (lastImportMatch.length > 0) {
      const lastMatch = lastImportMatch[lastImportMatch.length - 1];
      const insertPos = lastMatch.index + lastMatch[0].length + 1;
      content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      count += walkDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (processFile(fullPath)) {
        count++;
        console.log('✅ Substituído:', fullPath.replace(SRC_DIR, 'src'));
      }
    }
  }
  return count;
}

console.log('🔄 Substituindo alert() por toast() em src/...\n');
const count = walkDir(SRC_DIR);
console.log(`\n✨ ${count} arquivo(s) atualizado(s).`);
