const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/Widgets/GameMaster/ArsenalMestreWidget.tsx');
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  { regex: /rgba\(15,23,42,0\.9\)/g, replacement: 'var(--bg-secondary)' },
  { regex: /rgba\(15,23,42,0\.95\)/g, replacement: 'var(--bg-secondary)' },
  { regex: /rgba\(15,23,42,0\.15\)/g, replacement: 'var(--bg-tertiary)' },
  { regex: /rgba\(30,41,59,0\.3\)/g, replacement: 'var(--bg-tertiary)' },
  { regex: /rgba\(30,41,59,0\.9\)/g, replacement: 'var(--bg-secondary)' }
];

for (const { regex, replacement } of replacements) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed ArsenalMestreWidget.tsx with more backgrounds.');
