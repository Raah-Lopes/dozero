const fs = require('fs');
let file = fs.readFileSync('src/components/Widgets/PlayerTools/TargetTerminal.tsx', 'utf8');

// Fix 1: <tab.icon /> to <Icon />
file = file.replace(
  /\.map\(tab => \(\s*<button([^>]+)>\s*<tab\.icon([^>]+)>\s*\{tab\.label\}\s*<\/button>\s*\)\)/g,
  '.map(tab => { const Icon = tab.icon; return (\n          <button$1>\n            <Icon$2> {tab.label}\n          </button>\n        )})'
);

// Fix 2: updateTokenProps and merged tokenData in LevelUpWidget onSave
const targetWidget = `<LevelUpWidget 
        isOpen={isLevelUpOpen} 
        onClose={() => setIsLevelUpOpen(false)} 
        tokenData={tokenData} 
        onSave={async (updates) => {
          const path = tokenId ? wikiEntry?.path : wikiPath;
          if (path) {
            await syncMultipleFieldsToWiki(path, updates);
            setTokenData((prev: any) => ({ ...prev, ...updates }));
            WikiIndexer.clearCache();
            window.dispatchEvent(new Event('wiki-updated'));
          }
        }} 
      />`;

const replacedWidget = `<LevelUpWidget 
        isOpen={isLevelUpOpen} 
        onClose={() => setIsLevelUpOpen(false)} 
        tokenData={{ ...(wikiEntry?.metadata || {}), ...(tokenData || {}) }} 
        onSave={async (updates) => {
          const path = tokenId ? wikiEntry?.path : wikiPath;
          if (path) {
            await syncMultipleFieldsToWiki(path, updates);
            const visualUpdates = {
              ...updates,
              maxHp: updates.pv_max || updates.HP_max,
              hp: updates.pv_max || updates.HP_max,
              maxMana: updates.mana_max || updates.PM_max,
              mana: updates.mana_max || updates.PM_max,
              energiaMax: updates.energia_max || updates.vigor_max,
              energia: updates.energia_max || updates.vigor_max,
            };
            setTokenData((prev: any) => ({ ...prev, ...visualUpdates }));
            if (tokenId) {
              updateTokenProps(tokenId, visualUpdates);
            }
            WikiIndexer.clearCache();
            window.dispatchEvent(new Event('wiki-updated'));
          }
        }} 
      />`;

file = file.replace(targetWidget, replacedWidget);

fs.writeFileSync('src/components/Widgets/PlayerTools/TargetTerminal.tsx', file);
console.log('Fixes applied successfully!');
