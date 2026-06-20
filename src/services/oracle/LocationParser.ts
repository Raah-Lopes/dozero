import type { NPCCategory, NPCTable } from './NPCParser';

export class LocationParser {
  private static cachedCategories: NPCCategory[] | null = null;

  static async loadCategories(): Promise<NPCCategory[]> {
    if (this.cachedCategories) return this.cachedCategories;

    try {
      const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent('D:/DOZERO/wikidozero')}&path=${encodeURIComponent('[2] 🔮 Matrizes do VTT/MegaLocais.md')}`);
      if (!res.ok) throw new Error('Falha ao carregar o Mega Locais');
      
      const fileData = await res.json();
      const content = fileData.content;
      const lines = content.split('\n');

      const categoriesMap: Record<string, NPCCategory> = {};
      let currentCategory: NPCCategory | null = null;
      let currentTable: NPCTable | null = null;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('# ') && !line.startsWith('## ')) {
          const catName = line.replace('# ', '').trim();
          const catId = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          
          if (!categoriesMap[catId]) {
            categoriesMap[catId] = {
              id: catId,
              name: catName,
              tables: []
            };
          }
          currentCategory = categoriesMap[catId];
          currentTable = null;
          continue;
        }

        if (line.startsWith('## ')) {
          const tableName = line.replace('## ', '').trim();
          if (currentCategory) {
            currentTable = {
              id: `${currentCategory.id}-${tableName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
              name: tableName,
              dice: '1d100', // default
              rows: []
            };
            currentCategory.tables.push(currentTable);
          }
          continue;
        }

        if (line.toLowerCase().startsWith('dados:')) {
          if (currentTable) {
            currentTable.dice = line.substring(6).trim();
          }
          continue;
        }

        if (line.startsWith('|') && !line.includes('---|---') && !line.includes('Dado | Resultado')) {
          const parts = line.split('|').map(p => p.trim()).filter(p => p);
          if (parts.length >= 2 && currentTable) {
            const rangeStr = parts[0];
            const result = parts[1];
            
            let min = 0, max = 0;
            if (rangeStr.includes('-')) {
              const [minStr, maxStr] = rangeStr.split('-');
              min = parseInt(minStr, 10);
              max = parseInt(maxStr, 10);
            } else {
              min = parseInt(rangeStr, 10);
              max = min;
            }

            if (!isNaN(min) && !isNaN(max)) {
              currentTable.rows.push({ min, max, result });
            }
          }
        }
      }

      this.cachedCategories = Object.values(categoriesMap);
      return this.cachedCategories;

    } catch (error) {
      console.error('Erro ao parsear MegaLocais.md:', error);
      return [];
    }
  }

  static getCategoriesSync() {
    return this.cachedCategories || [];
  }
}
