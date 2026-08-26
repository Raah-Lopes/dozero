import fs from 'fs';
import path from 'path';

const wikiRoot = 'D:/DOZERO/wikidozero';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeMove(srcRel, destRel) {
  const src = path.join(wikiRoot, srcRel);
  const dest = path.join(wikiRoot, destRel);
  if (!fs.existsSync(src)) {
    console.warn(`[Skip] Não encontrado: ${srcRel}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
  console.log(`[Moved] ${srcRel} -> ${destRel}`);
  return true;
}

console.log('--- 1. UNIFICANDO ANEXOS E IMAGENS ---');
const anexosDir = path.join(wikiRoot, 'ANEXOS');
if (fs.existsSync(anexosDir)) {
  const files = fs.readdirSync(anexosDir);
  for (const f of files) {
    safeMove(`ANEXOS/${f}`, `[3] 📎 Anexos/${f}`);
  }
}

console.log('\n--- 2. RESTAURANDO LUGARES E SESSÕES ATIVAS ---');
const placesDir = path.join(wikiRoot, '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Lugares/Localizacoes');
if (fs.existsSync(placesDir)) {
  const files = fs.readdirSync(placesDir);
  for (const f of files) {
    safeMove(`[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Lugares/Localizacoes/${f}`, `[1] 🏕️ Campanha Principal/Lugares/${f}`);
  }
}

const sessionDir = path.join(wikiRoot, '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Diario_de_Sessao/Nova-Campanha/Sessoes');
if (fs.existsSync(sessionDir)) {
  const files = fs.readdirSync(sessionDir);
  for (const f of files) {
    safeMove(`[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Diario_de_Sessao/Nova-Campanha/Sessoes/${f}`, `[1] 🏕️ Campanha Principal/Diario_de_Sessao/Sessoes/${f}`);
  }
}

const arcosDir = path.join(wikiRoot, '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Diario_de_Sessao/Nova-Campanha/Arcos');
if (fs.existsSync(arcosDir)) {
  const files = fs.readdirSync(arcosDir);
  for (const f of files) {
    safeMove(`[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Diario_de_Sessao/Nova-Campanha/Arcos/${f}`, `[1] 🏕️ Campanha Principal/Diario_de_Sessao/Arcos/${f}`);
  }
}

// Arquivo teste do editor
safeMove('[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Teste_do_Editor.md', '[99] 🗑️ Descartaveis & Stubs/Teste_do_Editor.md');
safeMove('Campanhas/Nova-Campanha/_campanha.md', '[99] 🗑️ Descartaveis & Stubs/Nova-Campanha__campanha.md');
safeMove('[0] 📦 Arquivo (Quarentena)/Campanhas/Nova-Campanha/_campanha.md', '[99] 🗑️ Descartaveis & Stubs/Quarentena_Nova-Campanha__campanha.md');
safeMove('[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Diario_de_Sessao/Nova-Campanha/_campanha.md', '[99] 🗑️ Descartaveis & Stubs/Diario_Nova-Campanha__campanha.md');

console.log('\n--- 3. REMOVENDO PASTAS TOTALMENTE VAZIAS ---');
function removeEmptyDirs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const full = path.join(dir, e.name);
      removeEmptyDirs(full);
      try {
        const remaining = fs.readdirSync(full);
        if (remaining.length === 0) {
          fs.rmdirSync(full);
          console.log(`[Removed Empty Dir] ${path.relative(wikiRoot, full).replace(/\\/g, '/')}`);
        }
      } catch (err) {}
    }
  }
}

// Rodar 3 passes para garantir limpeza de pastas pai vazias
removeEmptyDirs(wikiRoot);
removeEmptyDirs(wikiRoot);
removeEmptyDirs(wikiRoot);

console.log('\nConsolidação de pastas finalizada!');
