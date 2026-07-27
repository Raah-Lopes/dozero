const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /color=['"]#6ee7b7['"]/g, replacement: 'color="var(--success)"' },
  { regex: /color=['"]#fca5a5['"]/g, replacement: 'color="var(--danger)"' },
  { regex: /color=['"]#ef4444['"]/g, replacement: 'color="var(--danger)"' },
  { regex: /color=['"]#93c5fd['"]/g, replacement: 'color="var(--mana)"' },
  { regex: /color=['"]#fbbf24['"]/g, replacement: 'color="var(--warning)"' },
  { regex: /color=['"]#f59e0b['"]/g, replacement: 'color="var(--warning)"' },
  { regex: /color=['"]#10b981['"]/g, replacement: 'color="var(--success)"' },
  { regex: /color=['"]#3b82f6['"]/g, replacement: 'color="var(--mana)"' },
  { regex: /color=['"]#a855f7['"]/g, replacement: 'color="var(--accent-primary)"' },
  { regex: /color=['"]#cbd5e1['"]/g, replacement: 'color="var(--text-secondary)"' },
  { regex: /color=['"]#94a3b8['"]/g, replacement: 'color="var(--text-secondary)"' },
  { regex: /color=['"]#f1f5f9['"]/g, replacement: 'color="var(--text-primary)"' },
  { regex: /color=['"]#f3f4f6['"]/g, replacement: 'color="var(--text-primary)"' },
  { regex: /color=['"]#64748b['"]/g, replacement: 'color="var(--text-secondary)"' },
  { regex: /color: ['"]#fbbf24['"]/g, replacement: "color: 'var(--warning)'" },
  { regex: /color: ['"]#60a5fa['"]/g, replacement: "color: 'var(--mana)'" },
  { regex: /color: ['"]white['"]/g, replacement: "color: 'var(--text-primary)'" },
  { regex: /color: ['"]#fca5a5['"]/g, replacement: "color: 'var(--danger)'" },
  { regex: /color: ['"]#6ee7b7['"]/g, replacement: "color: 'var(--success)'" },
  { regex: /color: ['"]#93c5fd['"]/g, replacement: "color: 'var(--mana)'" },
  { regex: /color: ['"]#d1d5db['"]/g, replacement: "color: 'var(--text-secondary)'" },
  { regex: /color: ['"]#d8b4fe['"]/g, replacement: "color: 'var(--accent-primary)'" },
  { regex: /color: ['"]#f1f5f9['"]/g, replacement: "color: 'var(--text-primary)'" },
  { regex: /color: ['"]#94a3b8['"]/g, replacement: "color: 'var(--text-secondary)'" },
  { regex: /color: ['"]#fcd34d['"]/g, replacement: "color: 'var(--warning)'" },
  { regex: /color: ['"]#64748b['"]/g, replacement: "color: 'var(--text-secondary)'" }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directoryPath);
console.log('Done replacing colors.');
