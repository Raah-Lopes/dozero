const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '../src');
let count = 0;

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) { walk(full); continue; }
    if (!f.endsWith('.tsx')) continue;
    let c = fs.readFileSync(full, 'utf8');
    // Add loading="lazy" decoding="async" to img tags that don't already have it
    const updated = c.replace(/<img\b(?![^>]*\bloading=)/g, '<img loading="lazy" decoding="async"');
    if (updated !== c) {
      fs.writeFileSync(full, updated, 'utf8');
      count++;
      console.log('+ lazy:', full.replace(src, 'src'));
    }
  }
}
walk(src);
console.log(count + ' arquivo(s) com lazy loading adicionado.');
