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

const analysis = allFiles.map(f => {
  const rel = path.relative(wikiDir, f).replace(/\\/g, '/');
  const stat = fs.statSync(f);
  const ext = path.extname(f).toLowerCase();
  
  if (['.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif', '.mp3', '.wav', '.ogg'].includes(ext)) {
    return { path: rel, type: 'asset', size: stat.size };
  }
  
  if (ext === '.json') {
    return { path: rel, type: 'json', size: stat.size };
  }

  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n').map(l => l.trim());
  const cleanLines = lines.filter(Boolean);
  const meaningfulLines = cleanLines.filter(l => !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('tags:') && !l.startsWith('title:'));

  return {
    path: rel,
    type: 'markdown',
    size: stat.size,
    charCount: content.trim().length,
    lineCount: cleanLines.length,
    meaningfulLineCount: meaningfulLines.length,
    firstLines: cleanLines.slice(0, 4).join(' | '),
    contentSnippet: content.slice(0, 150).replace(/\n/g, ' ')
  };
});

fs.writeFileSync('D:/DOZERO/scripts/detailed-wiki-analysis.json', JSON.stringify(analysis, null, 2), 'utf8');
console.log('Análise detalhada gerada.');
