

export interface DataviewQuery {
  type: 'TABLE' | 'LIST';
  fields: { raw: string; label: string; field: string }[];
  from: string | null;
  where: string | null;
  sort: { field: string; order: 'ASC' | 'DESC' } | null;
}

export function parseDataview(query: string): DataviewQuery {
  const lines = query.split('\n').map(l => l.trim()).filter(l => l);
  const result: DataviewQuery = { type: 'TABLE', fields: [], from: null, where: null, sort: null };

  for (const line of lines) {
    if (line.toUpperCase().startsWith('TABLE')) {
      result.type = 'TABLE';
      const fieldsStr = line.substring(5).trim();
      if (fieldsStr) {
        result.fields = fieldsStr.split(',').map(f => {
          const raw = f.trim();
          const parts = raw.split(/ AS /i);
          const field = parts[0].trim();
          const label = parts[1] ? parts[1].replace(/['"]/g, '').trim() : field;
          return { raw, field, label };
        });
      }
    } else if (line.toUpperCase().startsWith('LIST')) {
      result.type = 'LIST';
    } else if (line.toUpperCase().startsWith('FROM')) {
      result.from = line.substring(4).replace(/['"]/g, '').trim();
    } else if (line.toUpperCase().startsWith('WHERE')) {
      result.where = line.substring(5).trim();
    } else if (line.toUpperCase().startsWith('SORT')) {
      const sortStr = line.substring(4).trim();
      const parts = sortStr.split(/\s+/);
      result.sort = {
        field: parts[0],
        order: parts[1]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
      };
    }
  }

  return result;
}

export function executeDataview(query: DataviewQuery, index: any[]): any[] {
  let results = [...index];

  // 1. FROM (Filtro por pasta/caminho)
  if (query.from) {
    results = results.filter(e => e.path.toLowerCase().includes(query.from!.toLowerCase()));
  }

  // 2. WHERE (Filtro condicional por propriedades)
  if (query.where) {
    results = results.filter(e => {
      try {
        const metadata = e.metadata || {};
        
        let evalStr = query.where!;
        // Substitui = único por === (ignorando >=, <=, !=)
        evalStr = evalStr.replace(/(?<![<>=!])=(?!=)/g, '===');
        // Traduz AND/OR
        evalStr = evalStr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||');

        // Extrai as variaveis
        const varsMatch = evalStr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        const uniqueVars = Array.from(new Set(varsMatch)).filter(v => 
          !['true', 'false', 'null', 'undefined', 'AND', 'OR'].includes(v) && 
          !evalStr.includes(`"${v}"`) && !evalStr.includes(`'${v}'`)
        );
        
        const varValues = uniqueVars.map(v => {
            if (v === 'path') return e.path;
            if (v === 'slug') return e.slug;
            return metadata[v];
        });
        
        const func = new Function(...uniqueVars, `return (${evalStr});`);
        return func(...varValues);
      } catch (err) {
        return false; // Ignora arquivo caso falhe na avaliação
      }
    });
  }

  // 3. SORT (Ordenação)
  if (query.sort) {
    const { field, order } = query.sort;
    results.sort((a, b) => {
      const valA = a.metadata?.[field] ?? (a as any)[field];
      const valB = b.metadata?.[field] ?? (b as any)[field];
      if (valA === valB) return 0;
      if (valA === undefined) return order === 'ASC' ? -1 : 1;
      if (valB === undefined) return order === 'ASC' ? 1 : -1;
      
      const compare = valA > valB ? 1 : -1;
      return order === 'ASC' ? compare : -compare;
    });
  }

  // 4. Mapear para colunas solicitadas (sempre inclui arquivo e caminho nativamente)
  return results.map(e => {
    const row: any = { file: e.slug, path: e.path };
    if (query.fields.length > 0) {
      query.fields.forEach(f => {
        row[f.label] = e.metadata?.[f.field] ?? (e as any)[f.field] ?? null;
      });
    }
    return row;
  });
}
