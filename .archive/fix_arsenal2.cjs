const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/Widgets/GameMaster/ArsenalMestreWidget.tsx');
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  { regex: /rgba\(255,\s*255,\s*255,\s*0\.0[1-9]\)/g, replacement: 'var(--glass-border)' },
  { regex: /rgba\(255,\s*255,\s*255,\s*0\.1\)/g, replacement: 'var(--glass-border)' },
  { regex: /rgba\(255,\s*255,\s*255,\s*0\.2\)/g, replacement: 'var(--glass-border)' },
  { regex: /rgba\(0,\s*0,\s*0,\s*0\.[1-9]\)/g, replacement: 'var(--bg-tertiary)' },
  { regex: /rgba\(30,\s*41,\s*59,\s*0\.3\)/g, replacement: 'var(--bg-secondary)' }
];

for (const { regex, replacement } of replacements) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed ArsenalMestreWidget.tsx with regexes.');
