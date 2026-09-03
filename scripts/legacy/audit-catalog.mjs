import fs from 'fs';
import path from 'path';

const wikiDir = 'D:/DOZERO/wikidozero';

function scan(dir) {
  let list = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === '.git_disabled' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      list = list.concat(scan(full));
    } else {
      list.push(full);
    }
  }
  return list;
}

const files = scan(wikiDir);

const catalog = {
  personagens: [],
  descartaveis: [],
  locais: [],
  campanhas_missoes: [],
  compendios_regras: [],
  anexos: []
};

for (const f of files) {
  const rel = path.relative(wikiDir, f).replace(/\\/g, '/');
  const ext = path.extname(f).toLowerCase();
  const stat = fs.statSync(f);

  if (['.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif', '.mp3'].includes(ext)) {
    catalog.anexos.push({ path: rel, size: stat.size });
    continue;
  }

  if (ext === '.json') {
    catalog.compendios_regras.push({ path: rel, size: stat.size, desc: 'Arquivo JSON de dados/DLC' });
    continue;
  }

  if (ext === '.md') {
    const raw = fs.readFileSync(f, 'utf8');
    const trimmed = raw.trim();
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    const textLines = lines.filter(l => !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('tags:') && !l.startsWith('title:'));
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

    // Critérios para descartável:
    // - 0 bytes ou menos de 60 caracteres
    // - Não tem linhas de texto além de cabeçalhos vazios
    // - Arquivo de teste obsoleto ("teste.md", "Teste Ficha.md" vazio, stubs de missão sem texto)
    const isOnlyHeader = lines.length <= 2 && textLines.length === 0;
    const isDisposable = trimmed.length < 75 || isOnlyHeader || (trimmed.length < 150 && rel.includes('Quarentena') && textLines.length <= 1);

    if (isDisposable) {
      catalog.descartaveis.push({
        path: rel,
        size: stat.size,
        chars: trimmed.length,
        lines: lines.length,
        textLines: textLines.length,
        preview: lines.join(' | ') || '(Vazio / 0 bytes)'
      });
      continue;
    }

    const lower = (rel + ' ' + raw).toLowerCase();
    const hasCharStats = lower.includes('força') || lower.includes('agilidade') || lower.includes('vida') || lower.includes('pv') || lower.includes('atributos') || lower.includes('classe') || lower.includes('nível') || lower.includes('perícias') || lower.includes('npc') || lower.includes('personagem');

    if (hasCharStats || rel.toLowerCase().includes('personagens/') || rel.toLowerCase().includes('npcs/')) {
      catalog.personagens.push({
        path: rel,
        size: stat.size,
        words: wordCount,
        title: lines[0] || path.basename(rel, '.md')
      });
    } else if (lower.includes('local') || lower.includes('cidade') || lower.includes('reino') || lower.includes('masmorra') || rel.toLowerCase().includes('lugares/')) {
      catalog.locais.push({
        path: rel,
        size: stat.size,
        words: wordCount,
        title: lines[0] || path.basename(rel, '.md')
      });
    } else if (rel.toLowerCase().includes('campanha') || rel.toLowerCase().includes('missao') || rel.toLowerCase().includes('sessoes')) {
      catalog.campanhas_missoes.push({
        path: rel,
        size: stat.size,
        words: wordCount,
        title: lines[0] || path.basename(rel, '.md')
      });
    } else {
      catalog.compendios_regras.push({
        path: rel,
        size: stat.size,
        words: wordCount,
        title: lines[0] || path.basename(rel, '.md')
      });
    }
  }
}

fs.writeFileSync('D:/DOZERO/scripts/wiki-catalog-output.json', JSON.stringify(catalog, null, 2), 'utf8');
console.log('=== RESUMO DA AUDITORIA ===');
console.log(`1. Personagens Válidos: ${catalog.personagens.length}`);
console.log(`2. Descartáveis / Vazios / Stubs: ${catalog.descartaveis.length}`);
console.log(`3. Locais & Cenários: ${catalog.locais.length}`);
console.log(`4. Campanhas & Missões: ${catalog.campanhas_missoes.length}`);
console.log(`5. Compêndios, Regras & Guias: ${catalog.compendios_regras.length}`);
console.log(`6. Anexos / Imagens: ${catalog.anexos.length}`);
