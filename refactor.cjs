const fs = require('fs');

function refactorFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  let changed = false;

  const replaceStr = (search, replace) => {
    if (content.includes(search)) {
      content = content.replaceAll(search, replace);
      changed = true;
    }
  };
  const replaceRegex = (regex, replace) => {
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      changed = true;
    }
  };

  if (content.includes('updateTokenProps') || content.includes('removeToken') || content.includes('applyDamageToToken')) {
      if (!content.includes('import { Tokens } from')) {
         content = content.replace(/(import React[^;]+;)/, "$1\nimport { Tokens } from '" + (path.includes('src/components/HUD') ? '../../store/modules' : '../store/modules') + "';");
         changed = true;
      }
  }

  replaceRegex(/updateTokenProps\(([^,]+),\s*([^)]+)\)/g, 'Tokens.update($1, $2)');
  replaceRegex(/applyDamageToToken\(([^,]+),\s*([^)]+)\)/g, 'Tokens.applyDamage($1, $2)');
  replaceRegex(/removeToken\(([^)]+)\)/g, 'Tokens.delete($1)');

  if (changed) {
     fs.writeFileSync(path, content, 'utf8');
     console.log('Refactored ' + path);
  }
}

refactorFile('src/components/HUD/NPCPanel.tsx');
refactorFile('src/components/HUD/PlayerQuickBar.tsx');
refactorFile('src/components/HUD/CombatTracker.tsx');
