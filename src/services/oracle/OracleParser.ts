export interface OracleCategory {
  id: string;
  name: string;
  tables: OracleTable[];
}

export interface OracleTableRow {
  min: number;
  max: number;
  result: string;
}

export interface OracleTable {
  id: string;
  name: string;
  dice: string;
  rows: OracleTableRow[];
}

export class OracleParser {
  // O caminho da base de oráculos do Obsidian do usuário
  static ORACLES_PATH = 'D:/DOZERO/wikidozero/Oracles';
  private static cachedCategories: OracleCategory[] | null = null;

  static async loadCategories(): Promise<OracleCategory[]> {
    if (this.cachedCategories) return this.cachedCategories;

    try {
      // Usamos a mesma API local que usamos para a Wiki
      const res = await fetch(`http://localhost:5174/api/wiki/tree?repoPath=${encodeURIComponent(this.ORACLES_PATH)}`);
      if (!res.ok) throw new Error('Falha ao carregar tree do Oráculo');
      const data = await res.json();
      const tree: any[] = data.tree || [];

      const categoriesMap: Record<string, OracleCategory> = {};

      for (const item of tree) {
        if (item.type === 'blob' && item.path.endsWith('.md')) {
          const parts = item.path.split('/');
          if (parts.length < 2) continue; // Precisa estar em uma pasta (Categoria)

          const catName = parts[0];
          if (!categoriesMap[catName]) {
            categoriesMap[catName] = {
              id: catName,
              name: catName.replace(/_/g, ' '),
              tables: []
            };
          }

          const fileRes = await fetch(`http://localhost:5174/api/wiki/file?repoPath=${encodeURIComponent(this.ORACLES_PATH)}&path=${encodeURIComponent(item.path)}`);
          if (fileRes.ok) {
            const fileData = await fileRes.json();
            const table = this.parseTable(item.path, fileData.content);
            if (table) {
              categoriesMap[catName].tables.push(table);
            }
          }
        }
      }

      // 2. Carregar e parsear os JSONs na raiz
      const jsonFiles = ['Ironsmith-Expanded-Oracles.JSON', 'Starsmith-Expanded-Oracles.json'];
      for (const jf of jsonFiles) {
        const fileRes = await fetch(`http://localhost:5174/api/wiki/file?repoPath=${encodeURIComponent('D:/DOZERO/wikidozero')}&path=${encodeURIComponent(jf)}`);
        if (fileRes.ok) {
          try {
             const fileData = await fileRes.json();
             const jContent = JSON.parse(fileData.content);
             const oracles = jContent.Oracles || [];
             
             for (const orc of oracles) {
                const categoryName = orc.Category || (jf.includes('Ironsmith') ? 'Ironsmith' : 'Starsmith');
                if (!categoriesMap[categoryName]) {
                  categoriesMap[categoryName] = { id: categoryName, name: categoryName, tables: [] };
                }
                
                const table: OracleTable = {
                   id: orc.Name,
                   name: orc.Name,
                   dice: orc.d ? `1d${orc.d}` : (orc.Dice ? `1d${orc.Dice}` : '1d100'),
                   rows: []
                };

                const sourceTable = orc['Oracle Table'] || orc.Table || [];
                let lastMax = 0;
                
                for (const row of sourceTable) {
                   const min = row.Floor !== undefined ? row.Floor : (lastMax + 1);
                   const max = row.Chance !== undefined ? row.Chance : (row.Ceiling !== undefined ? row.Ceiling : min);
                   const result = row.Description || row.Result || row.Text || 'Sem resultado';
                   
                   table.rows.push({ min, max, result });
                   lastMax = max;
                }
                
                if (table.rows.length > 0) {
                   categoriesMap[categoryName].tables.push(table);
                }
             }
          } catch(e) {
             console.error('Erro ao parsear JSON', jf, e);
          }
        }
      }

      this.cachedCategories = Object.values(categoriesMap).sort((a, b) => a.name.localeCompare(b.name));
      return this.cachedCategories;
    } catch (err) {
      console.error('[OracleParser] Erro:', err);
      return [];
    }
  }

  private static parseTable(path: string, content: string): OracleTable | null {
    const lines = content.split('\n');
    const rows: OracleTableRow[] = [];
    let dice = '1d100';
    let tableName = path.split('/').pop()?.replace('.md', '').replace(/_/g, ' ') || 'Oráculo';

    for (const line of lines) {
      if (line.startsWith('# ')) {
        tableName = line.replace('# ', '').trim();
      }
      if (line.includes('dice:')) {
        const dMatch = line.match(/dice:\s*(1d\d+)/i);
        if (dMatch) dice = dMatch[1].toLowerCase();
      }
    }

    const rowRegex = /^\|\s*(\d+)(?:-(\d+))?\s*\|\s*(.+?)\s*\|$/;

    for (const line of lines) {
      const match = line.trim().match(rowRegex);
      if (match) {
        const min = parseInt(match[1], 10);
        const max = match[2] ? parseInt(match[2], 10) : min;
        const result = match[3].trim();
        if (!isNaN(min) && !isNaN(max)) {
          rows.push({ min, max, result });
        }
      }
    }

    if (rows.length === 0) return null;

    return {
      id: path,
      name: tableName,
      dice,
      rows
    };
  }

  static rollTable(table: OracleTable): string {
    const dMatch = table.dice.match(/1d(\d+)/);
    const maxDice = dMatch ? parseInt(dMatch[1], 10) : 100;
    
    const roll = Math.floor(Math.random() * maxDice) + 1;
    
    const row = table.rows.find(r => roll >= r.min && roll <= r.max);
    if (row) {
      return `🎲 ${roll} - **${row.result}**`;
    }
    return `🎲 ${roll} - Sem resultado`;
  }
}
