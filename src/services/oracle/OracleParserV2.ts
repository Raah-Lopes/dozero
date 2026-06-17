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

export class OracleParserV2 {
  static MEGA_ORACLES_PATH = '[2] 🔮 Matrizes do VTT/MegaOraculo.md';
  private static cachedCategories: OracleCategory[] | null = null;

  static async loadCategories(): Promise<OracleCategory[]> {
    if (this.cachedCategories) return this.cachedCategories;

    try {
      const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent('D:/wikidozero')}&path=${encodeURIComponent('[2] 🔮 Matrizes do VTT/MegaOraculo.md')}`);
      if (!res.ok) throw new Error('Falha ao carregar o Mega Oráculo');
      
      const fileData = await res.json();
      const content = fileData.content;
      const lines = content.split('\n');

      const categoriesMap: Record<string, OracleCategory> = {};
      let currentCategory: OracleCategory | null = null;
      let currentTable: OracleTable | null = null;

      const themeMap: Record<string, string> = {
        '👑 Ferramentas do Mestre': '👑 Ferramentas do Mestre',
        'Essencial': '🎲 Básico & Ações',
        'Movimentos': '🎲 Básico & Ações',
        'Campanha': '🎲 Básico & Ações',
        'senhor ao Oráculo': '🎲 Básico & Ações',
        'Ask the Oracle': '🎲 Básico & Ações',
        'Assentamentos': '🪐 Mundo & Locais',
        'Planetas': '🪐 Mundo & Locais',
        'Espaço': '🪐 Mundo & Locais',
        'Deserto': '🪐 Mundo & Locais',
        'Forno': '🪐 Mundo & Locais',
        'Cova': '🪐 Mundo & Locais',
        'Gelo': '🪐 Mundo & Locais',
        'Joviano': '🪐 Mundo & Locais',
        'Selva': '🪐 Mundo & Locais',
        'Oceano': '🪐 Mundo & Locais',
        'Rochoso': '🪐 Mundo & Locais',
        'Estilhaçado': '🪐 Mundo & Locais',
        'Contaminado': '🪐 Mundo & Locais',
        'Vital': '🪐 Mundo & Locais',
        'Árido': '🪐 Mundo & Locais',
        'Temas de Localização': '🪐 Mundo & Locais',
        'Temas de localização': '🪐 Mundo & Locais',
        'Cofres': '🚀 Naves & Ruínas',
        'Naves Abandonadas': '🚀 Naves & Ruínas',
        'Naves Estelares': '🚀 Naves & Ruínas',
        'Naves espaciais': '🚀 Naves & Ruínas',
        'Abandonados': '🚀 Naves & Ruínas',
        'Criaturas': '👽 Personagens & Criaturas',
        'Faccoes': '👽 Personagens & Criaturas',
        'Facções': '👽 Personagens & Criaturas',
        'Personagens': '👽 Personagens & Criaturas',
        'Personagem': '👽 Personagens & Criaturas',
        'Comunidade': '👽 Personagens & Criaturas',
        'Acesso': '🏢 Componentes (Base/Nave)',
        'Distritos': '🏢 Componentes (Base/Nave)',
        'Engenharia': '🏢 Componentes (Base/Nave)',
        'Vivendo': '🏢 Componentes (Base/Nave)',
        'Médico': '🏢 Componentes (Base/Nave)',
        'Operações': '🏢 Componentes (Base/Nave)',
        'Produção': '🏢 Componentes (Base/Nave)',
        'Pesquisar': '🏢 Componentes (Base/Nave)',
        'Caótico': '✨ Biomas & Temas',
        'Cronal': '✨ Biomas & Temas',
        'Flutuante': '✨ Biomas & Temas',
        'Inundado': '✨ Biomas & Temas',
        'Fortificado': '✨ Biomas & Temas',
        'Congelado': '✨ Biomas & Temas',
        'Assombrado': '✨ Biomas & Temas',
        'Inferno': '✨ Biomas & Temas',
        'Infestado': '✨ Biomas & Temas',
        'Habitado': '✨ Biomas & Temas',
        'Forma de vida': '✨ Biomas & Temas',
        'Mecânico': '✨ Biomas & Temas',
        'Místico': '✨ Biomas & Temas',
        'Coberto de vegetação': '✨ Biomas & Temas',
        'Arruinado': '✨ Biomas & Temas',
        'Sagrado': '✨ Biomas & Temas',
        'Zona de Guerra': '✨ Biomas & Temas',
        'Ferreiro': '🛠️ Ironsmith & Expansões',
        'Diversos': '🛠️ Ironsmith & Expansões',
        'Variado': '🛠️ Ironsmith & Expansões',
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Novo Categoria
        if (line.startsWith('# ')) {
          let rawCatName = line.replace('# ', '').trim();
          if (rawCatName === 'Mega Oráculo Mestre') continue;
          
          let catName = themeMap[rawCatName] || '📂 Outros (' + rawCatName + ')';
          
          if (!categoriesMap[catName]) {
            categoriesMap[catName] = { id: catName, name: catName, tables: [] };
          }
          currentCategory = categoriesMap[catName];
          currentTable = null; // Reseta a tabela
        } 
        // Nova Tabela
        else if (line.startsWith('## ') && currentCategory) {
          const tableName = line.replace('## ', '').trim();
          const uniqueId = `${tableName}-${currentCategory.tables.length}`;
          currentTable = { id: uniqueId, name: tableName, dice: '1d100', rows: [] };
          currentCategory.tables.push(currentTable);
        }
        // Dice Metadata (suporte para inglês e português traduzido)
        else if ((line.startsWith('dice:') || line.startsWith('dados:')) && currentTable) {
          currentTable.dice = line.replace(/^(dice|dados):/i, '').trim();
        }
        // Tabela Markdown: Ignorar cabeçalho e divisor
        else if (line.startsWith('|') && currentTable) {
          // Ignorar cabeçalho como | Dado | Resultado | e |---|---|
          if (line.includes('Dado') || line.includes('Resultado') || line.includes('---')) {
            continue;
          }

          const rowRegex = /^\|\s*(\d+)(?:-(\d+))?\s*\|\s*(.+?)\s*\|$/;
          const match = line.match(rowRegex);
          if (match) {
            const min = parseInt(match[1]);
            const max = match[2] ? parseInt(match[2]) : min;
            const result = match[3].trim();
            currentTable.rows.push({ min, max, result });
          }
        }
      }

      const sortedCats = Object.values(categoriesMap).filter(c => c.tables.length > 0);
      
      const themeOrder = [
        '👑 Ferramentas do Mestre',
        '🌍 Essenciais de Jogo (Clima & Tempo)',
        '🎲 Básico & Ações',
        '👽 Personagens & Criaturas',
        '🪐 Mundo & Locais',
        '🚀 Naves & Ruínas',
        '✨ Biomas & Temas',
        '🏢 Componentes (Base/Nave)',
        '🛠️ Ironsmith & Expansões'
      ];

      sortedCats.sort((a, b) => {
        let indexA = themeOrder.indexOf(a.name);
        let indexB = themeOrder.indexOf(b.name);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        if (indexA !== indexB) return indexA - indexB;
        return a.name.localeCompare(b.name);
      });

      // Sort tables alphabetically within each category to keep them organized
      sortedCats.forEach(cat => {
        cat.tables.sort((t1, t2) => t1.name.localeCompare(t2.name));
      });

      this.cachedCategories = sortedCats;
      return this.cachedCategories;

    } catch (error) {
      console.error('Erro ao carregar o Mega Oráculo:', error);
      return [];
    }
  }

  // Permite forçar o recarregamento do cache (ex: caso o usuário atualize o mega arquivo)
  static clearCache() {
    this.cachedCategories = null;
  }
}
