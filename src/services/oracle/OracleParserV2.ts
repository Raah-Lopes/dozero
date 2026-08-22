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

// Fallback robusto integrado com dezenas de tabelas essenciais para o Mestre
export const DEFAULT_ORACLE_CATEGORIES: OracleCategory[] = [
  {
    id: 'essencial-oraculo',
    name: '🎲 Oráculo & Decisões Rápidas',
    tables: [
      {
        id: 'sim-nao-5050',
        name: 'Sim / Não (Chance Equilibrada 50/50)',
        dice: '1d100',
        rows: [
          { min: 1, max: 10, result: '❌ Não Extremo (E algo pior acontece)' },
          { min: 11, max: 50, result: '❌ Não' },
          { min: 51, max: 90, result: '✅ Sim' },
          { min: 91, max: 100, result: '⭐ Sim Extraordinário (Com bônus inesperado!)' }
        ]
      },
      {
        id: 'sim-nao-provavel',
        name: 'Sim / Não (Muito Provável)',
        dice: '1d100',
        rows: [
          { min: 1, max: 5, result: '❌ Não Extremo' },
          { min: 6, max: 25, result: '❌ Não' },
          { min: 26, max: 85, result: '✅ Sim' },
          { min: 86, max: 100, result: '⭐ Sim Extraordinário!' }
        ]
      },
      {
        id: 'sim-nao-improvavel',
        name: 'Sim / Não (Improvável)',
        dice: '1d100',
        rows: [
          { min: 1, max: 15, result: '❌ Não Extremo' },
          { min: 16, max: 75, result: '❌ Não' },
          { min: 76, max: 95, result: '✅ Sim' },
          { min: 96, max: 100, result: '⭐ Sim Extraordinário!' }
        ]
      },
      {
        id: 'acoes-temas',
        name: 'Ações Narrativas (Verbos)',
        dice: '1d20',
        rows: [
          { min: 1, max: 1, result: 'Investigar / Examinar com cautela' },
          { min: 2, max: 2, result: 'Atacar / Romper defesas' },
          { min: 3, max: 3, result: 'Defender / Fortificar terreno' },
          { min: 4, max: 4, result: 'Fugir / Recuar estrategicamente' },
          { min: 5, max: 5, result: 'Negociar / Fazer um acordo' },
          { min: 6, max: 6, result: 'Enganar / Distrair o alvo' },
          { min: 7, max: 7, result: 'Trair / Quebrar aliança' },
          { min: 8, max: 8, result: 'Descobrir / Revelar verdade' },
          { min: 9, max: 9, result: 'Proteger / Salvaguardar aliado' },
          { min: 10, max: 10, result: 'Destruir / Aniquilar obstáculo' },
          { min: 11, max: 11, result: 'Construir / Criar ferramenta' },
          { min: 12, max: 12, result: 'Viajar / Mudar de cenário' },
          { min: 13, max: 13, result: 'Aprender / Decifrar tomo antigo' },
          { min: 14, max: 14, result: 'Improvisar / Usar o ambiente' },
          { min: 15, max: 15, result: 'Executar / Finalizar plano' },
          { min: 16, max: 16, result: 'Silenciar / Agir furtivamente' },
          { min: 17, max: 17, result: 'Desafiar / Provocar líder' },
          { min: 18, max: 18, result: 'Infiltrar / Entrar despercebido' },
          { min: 19, max: 19, result: 'Sacrificar / Pagar preço alto' },
          { min: 20, max: 20, result: 'Transceder / Despertar poder oculto' }
        ]
      },
      {
        id: 'temas-conceito',
        name: 'Temas & Foco da Cena',
        dice: '1d20',
        rows: [
          { min: 1, max: 1, result: 'Vingança / Ódio guardado' },
          { min: 2, max: 2, result: 'Ambição / Sede de poder' },
          { min: 3, max: 3, result: 'Medo / Sobrevivência pura' },
          { min: 4, max: 4, result: 'Honra / Cumprir promessa' },
          { min: 5, max: 5, result: 'Amor / Proteger inocentes' },
          { min: 6, max: 6, result: 'Ganância / Riquezas proibidas' },
          { min: 7, max: 7, result: 'Mistério / Segredo cósmico' },
          { min: 8, max: 8, result: 'Loucura / Magia descontrolada' },
          { min: 9, max: 9, result: 'Tempo / Contagem regressiva' },
          { min: 10, max: 10, result: 'Destino / Profecia iminente' },
          { min: 11, max: 11, result: 'Tecnologia / Relíquia esquecida' },
          { min: 12, max: 12, result: 'Natureza / Feras em frenesi' },
          { min: 13, max: 13, result: 'Corrupção / Praga na terra' },
          { min: 14, max: 14, result: 'Aliança / Trégua forçada' },
          { min: 15, max: 15, result: 'Guerra / Cerco prestes a estourar' },
          { min: 16, max: 16, result: 'Fé / Devoção fanática' },
          { min: 17, max: 17, result: 'Redenção / Chance de perdão' },
          { min: 18, max: 18, result: 'Caos / Imprevisto total' },
          { min: 19, max: 19, result: 'Isolamento / Sem comunicação' },
          { min: 20, max: 20, result: 'Apocalipse / Desastre iminente' }
        ]
      }
    ]
  },
  {
    id: 'reviravoltas-complicacoes',
    name: '⚡ Reviravoltas & Complicações de Combate',
    tables: [
      {
        id: 'reviravolta-narrativa',
        name: 'Reviravolta Inesperada (Plot Twist)',
        dice: '1d10',
        rows: [
          { min: 1, max: 1, result: 'Um aliado se revela um informante ou traidor!' },
          { min: 2, max: 2, result: 'Reforços inimigos surgem flanqueando o grupo!' },
          { min: 3, max: 3, result: 'O terreno desaba ou uma estrutura pega fogo.' },
          { min: 4, max: 4, result: 'O alvo da missão não é quem parecia ser.' },
          { min: 5, max: 5, result: 'Uma terceira facção neutra invade o local.' },
          { min: 6, max: 6, result: 'O tempo limite foi encurtado drasticamente.' },
          { min: 7, max: 7, result: 'A arma ou feitiço do inimigo causa um efeito colateral bizarro.' },
          { min: 8, max: 8, result: 'Um monstro gigante adormecido é despertado pelo barulho.' },
          { min: 9, max: 9, result: 'O tesouro foi roubado momentos antes de vocês chegarem.' },
          { min: 10, max: 10, result: 'Um eclipse, tempestade ou surto arcano altera as leis da física!' }
        ]
      },
      {
        id: 'complicacao-falha',
        name: 'Complicações ao Falhar em Teste',
        dice: '1d10',
        rows: [
          { min: 1, max: 1, result: 'Perda de recurso valioso (munição, poção, tocha)' },
          { min: 2, max: 2, result: 'Barulho atrai atenção de patrulhas próximas' },
          { min: 3, max: 3, result: 'Equipamento danificado ou arma emperrada' },
          { min: 4, max: 4, result: 'Condição: Caído no chão ou Desorientado' },
          { min: 5, max: 5, result: 'Perda de tempo precioso na contagem da cena' },
          { min: 6, max: 6, result: 'Dano colateral atinge um aliado por engano' },
          { min: 7, max: 7, result: 'O inimigo ganha vantagem tática imediata' },
          { min: 8, max: 8, result: 'Fadiga: Sofre 1 ponto de Exaustão/Fome' },
          { min: 9, max: 9, result: 'A pista crucial é destruída ou queimada' },
          { min: 10, max: 10, result: 'Um segredo embaraçoso do personagem é revelado' }
        ]
      }
    ]
  },
  {
    id: 'mundo-atmosfera',
    name: '🌍 Clima, Terreno & Atmosfera',
    tables: [
      {
        id: 'clima-metereologia',
        name: 'Clima & Visibilidade',
        dice: '1d10',
        rows: [
          { min: 1, max: 1, result: '☀️ Céu Limpo e Sol Escaldante (Fadiga ao ar livre)' },
          { min: 2, max: 2, result: '☁️ Nublado com Ventos Uivantes' },
          { min: 3, max: 3, result: '🌧️ Chuva Fina e Névoa Baixa (Visibilidade moderada)' },
          { min: 4, max: 4, result: '⛈️ Tempestade Torrencial com Raios e Trovões' },
          { min: 5, max: 5, result: '🌫️ Neblina Densa e Sobrenatural (Visão limitada a 3m)' },
          { min: 6, max: 6, result: '❄️ Granizo ou Neve Fria Cortante' },
          { min: 7, max: 7, result: '🌪️ Vendaval Forte (Penalidade em ataques à distância)' },
          { min: 8, max: 8, result: '🔥 Calor Sufocante com Chamas no Horizonte' },
          { min: 9, max: 9, result: '✨ Chuva Arcana de Partículas Brilhantes' },
          { min: 10, max: 10, result: '🌑 Escuridão Antinatural (Tochas quase não iluminam)' }
        ]
      },
      {
        id: 'perigos-terreno',
        name: 'Perigos & Obstáculos do Terreno',
        dice: '1d10',
        rows: [
          { min: 1, max: 1, result: 'Lamaçal pegajoso ou Areia Movediça (Movimento cortado)' },
          { min: 2, max: 2, result: 'Penhasco íngreme com pedras soltas caindo' },
          { min: 3, max: 3, result: 'Vegetação espinhosa com veneno paralisante' },
          { min: 4, max: 4, result: 'Gases tóxicos saindo de rachaduras no chão' },
          { min: 5, max: 5, result: 'Gelo escorregadio sob um lago congelado' },
          { min: 6, max: 6, result: 'Correnteza forte de rio subterrâneo' },
          { min: 7, max: 7, result: 'Armadilhas antigas de ferro enferrujado' },
          { min: 8, max: 8, result: 'Zona de eco perturbador que confunde a audição' },
          { min: 9, max: 9, result: 'Rastro recente de predador colossal' },
          { min: 10, max: 10, result: 'Ruptura gravitacional ou chão flutuante' }
        ]
      }
    ]
  },
  {
    id: 'npcs-social',
    name: '🧙‍♂️ Disposição & Motivos de NPCs',
    tables: [
      {
        id: 'disposicao-npc',
        name: 'Primeira Impressão & Disposição',
        dice: '1d10',
        rows: [
          { min: 1, max: 1, result: '😡 Hostil Agressivo (Pronto para puxar armas)' },
          { min: 2, max: 2, result: '😠 Desconfiado e Arrogante' },
          { min: 3, max: 3, result: '😨 Amedrontado / Pede socorro desesperadamente' },
          { min: 4, max: 4, result: '😐 Frio e Indiferente (Só fala por ouro/troca)' },
          { min: 5, max: 5, result: '🤔 Curioso e Cauteloso' },
          { min: 6, max: 6, result: '🤝 Amigável e Tagarela' },
          { min: 7, max: 7, result: '🎭 Excessivamente Lisonjeiro (Tem segundas intenções)' },
          { min: 8, max: 8, result: '🤫 Furtivo / Quer falar em particular' },
          { min: 9, max: 9, result: '🍻 Embriagado ou Delirante' },
          { min: 10, max: 10, result: '👑 Reverente / Acredita que o grupo foi enviado pelos deuses' }
        ]
      },
      {
        id: 'recompensa-loot',
        name: 'Saque Rápido / Recompensa Encontrada',
        dice: '1d10',
        rows: [
          { min: 1, max: 1, result: 'Bolsa de moedas de prata (1d20 x 5 PO)' },
          { min: 2, max: 2, result: 'Frasco de Poção de Cura com rótulo gasto' },
          { min: 3, max: 3, result: 'Carta selada com cera contendo um segredo de facção' },
          { min: 4, max: 4, result: 'Chave de ferro ornamentada para uma fechadura desconhecida' },
          { min: 5, max: 5, result: 'Adaga ou arma com gema brilhante no pomo' },
          { min: 6, max: 6, result: 'Pergaminho arcano com magia de utilidade' },
          { min: 7, max: 7, result: 'Pingente sagrado que pulsa suavemente no escuro' },
          { min: 8, max: 8, result: 'Mapa em couro desenhado à mão com um "X" marcado' },
          { min: 9, max: 9, result: 'Anel de família nobre com brasão raspado' },
          { min: 10, max: 10, result: 'Pedra Filosofal / Relíquia ancestral de valor inestimável' }
        ]
      }
    ]
  }
];

export class OracleParserV2 {
  static MEGA_ORACLES_PATH = '[2] 🔮 Matrizes do VTT/MegaOraculo.md';
  private static cachedCategories: OracleCategory[] | null = null;

  static async loadCategories(): Promise<OracleCategory[]> {
    if (this.cachedCategories && this.cachedCategories.length > 0) return this.cachedCategories;

    try {
      const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent('D:/DOZERO/wikidozero')}&path=${encodeURIComponent('[2] 🔮 Matrizes do VTT/MegaOraculo.md')}`);
      if (!res.ok) throw new Error('Wiki file não carregada');
      
      const fileData = await res.json();
      const content = fileData?.content;
      if (!content) throw new Error('Conteúdo vazio');

      const lines = content.split('\n');
      const categoriesMap: Record<string, OracleCategory> = {};
      let currentCategory: OracleCategory | null = null;
      let currentTable: OracleTable | null = null;

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
          const tableId = tableName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          
          if (!currentCategory) {
            currentCategory = { id: 'geral', name: 'Geral', tables: [] };
            categoriesMap['geral'] = currentCategory;
          }

          currentTable = {
            id: tableId,
            name: tableName,
            dice: '1d100',
            rows: []
          };
          currentCategory.tables.push(currentTable);
          continue;
        }

        if (currentTable && line.startsWith('|')) {
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

      const parsedCats = Object.values(categoriesMap).filter(c => c.tables.length > 0);
      if (parsedCats.length > 0) {
        // Mesclar tabelas padrão no topo
        this.cachedCategories = [...DEFAULT_ORACLE_CATEGORIES, ...parsedCats];
        return this.cachedCategories;
      }
    } catch (error) {
      console.warn('Carregando categorias embutidas do Mega Oráculo:', error);
    }

    // Retorna as categorias padrão robustas se a requisição remota/arquivo falhar
    this.cachedCategories = DEFAULT_ORACLE_CATEGORIES;
    return this.cachedCategories;
  }

  static clearCache() {
    this.cachedCategories = null;
  }
}
