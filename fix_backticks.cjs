const fs = require('fs');
let c = fs.readFileSync('src/components/Theater/ScenePanel.tsx', 'utf8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\$/g, '$');
fs.writeFileSync('src/components/Theater/ScenePanel.tsx', c);
console.log('Fixed backticks');
