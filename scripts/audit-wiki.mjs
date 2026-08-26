import fs from 'fs';
import path from 'path';

const wikiDir = 'D:/DOZERO/wikidozero';

function scanDir(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = scanDir(wikiDir);
console.log(`Total de arquivos encontrados: ${allFiles.length}`);

const report = {
  characters: [],
  emptyOrDisposable: [],
  campaignOrMissions: [],
  locations: [],
  dlcsAndSettings: [],
  attachments: [],
  others: []
};

for (const f of allFiles) {
  const rel = path.relative(wikiDir, f).replace(/\\/g, '/');
  const ext = path.extname(f).toLowerCase();
  const stat = fs.statSync(f);

  if (['.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext)) {
    report.attachments.push({ path: rel, size: stat.size });
    continue;
  }

  if (ext === '.json') {
    report.dlcsAndSettings.push({ path: rel, size: stat.size });
    continue;
  }

  if (ext === '.md') {
    const content = fs.readFileSync(f, 'utf8').trim();
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const nonHeaderLines = lines.filter(l => !l.startsWith('#') && !l.startsWith('---') && l.length > 0);
    const hasMeaningfulText = nonHeaderLines.length > 0;
    const isVirtuallyEmpty = content.length < 40 || !hasMeaningfulText;

    // Checar conteúdo
    const lower = content.toLowerCase();
    const isCharacter = lower.includes('personagem') || lower.includes('npc') || lower.includes('ficha') ||
      lower.includes('força') || lower.includes('agilidade') || lower.includes('destreza') ||
      lower.includes('pv') || lower.includes('classe') || lower.includes('raça') ||
      lower.includes('perícias') || lower.includes('atributos') || lower.includes('antecedentes') ||
      lower.includes('inventário') || rel.toLowerCase().includes('personagens/') || rel.toLowerCase().includes('npcs/');

    const isLocation = lower.includes('local') || lower.includes('cidade') || lower.includes('reino') ||
      lower.includes('taverna') || lower.includes('masmorra') || rel.toLowerCase().includes('locais/');

    if (isVirtuallyEmpty) {
      report.emptyOrDisposable.push({
        path: rel,
        size: stat.size,
        chars: content.length,
        lines: lines.length,
        reason: content.length < 40 ? 'Menor que 40 caracteres' : 'Apenas títulos/cabeçalhos sem texto'
      });
    } else if (isCharacter) {
      report.characters.push({
        path: rel,
        size: stat.size,
        lines: lines.length,
        title: lines[0] || 'Sem título'
      });
    } else if (isLocation) {
      report.locations.push({
        path: rel,
        size: stat.size,
        lines: lines.length,
        title: lines[0] || 'Sem título'
      });
    } else if (rel.toLowerCase().includes('campanha') || rel.toLowerCase().includes('missao') || rel.toLowerCase().includes('missoes')) {
      report.campaignOrMissions.push({
        path: rel,
        size: stat.size,
        lines: lines.length,
        title: lines[0] || 'Sem título'
      });
    } else {
      report.others.push({
        path: rel,
        size: stat.size,
        lines: lines.length,
        title: lines[0] || 'Sem título'
      });
    }
  }
}

console.log('--- RELATÓRIO PRELIMINAR ---');
console.log(`Personagens: ${report.characters.length}`);
console.log(`Descartáveis/Vazios: ${report.emptyOrDisposable.length}`);
console.log(`Campanhas & Missões: ${report.campaignOrMissions.length}`);
console.log(`Locais: ${report.locations.length}`);
console.log(`DLCs & Configs: ${report.dlcsAndSettings.length}`);
console.log(`Anexos/Imagens: ${report.attachments.length}`);
console.log(`Outros: ${report.others.length}`);

fs.writeFileSync('D:/DOZERO/scripts/wiki-audit-result.json', JSON.stringify(report, null, 2), 'utf8');
console.log('Resultado salvo em scripts/wiki-audit-result.json');
