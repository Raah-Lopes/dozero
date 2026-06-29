import React, { useMemo } from 'react';
import { useWiki } from '../../hooks/useWiki';
import { parseDataview, executeDataview } from '../../utils/dataviewParser';
import { FileText } from 'lucide-react';

interface DataviewRendererProps {
  query: string;
  isJS?: boolean;
}

export const DataviewRenderer: React.FC<DataviewRendererProps> = ({ query, isJS }) => {
  const { index } = useWiki();
  
  const data = useMemo(() => {
    try {
      if (isJS) {
        let outputType = 'LIST';
        let outputData: any[] = [];
        let outputHeaders: string[] = [];

        // Fake API do DataviewJS
        const dv = {
          pages: (source?: string) => {
            let results = index.map(entry => {
              const meta = entry.metadata || {};
              const linkObj = { isLink: true, path: entry.path, name: meta.nome || meta.titulo || entry.slug };
              return {
                file: {
                  name: meta.nome || meta.titulo || entry.slug,
                  path: entry.path,
                  link: linkObj,
                },
                ...meta
              };
            });
            if (source) {
              const clean = source.replace(/['"]/g, '').toLowerCase();
              results = results.filter(r => r.file.path.toLowerCase().includes(clean));
            }
            // Injetar atalho .where() e encadear os prototypes do array de forma burra
            const arrayWrapper = Object.assign([...results], {
              where: function(predicate: any) {
                const res = Object.assign(this.filter(predicate), { where: this.where, map: this.map });
                return res;
              },
              map: function(fn: any) {
                const res = Object.assign(Array.prototype.map.call(this, fn), { where: this.where, map: this.map });
                return res;
              }
            });
            return arrayWrapper;
          },
          table: (headers: string[], rows: any[][]) => {
            outputType = 'TABLE';
            outputHeaders = headers;
            outputData = rows;
          },
          list: (items: any[]) => {
            outputType = 'LIST';
            outputData = items;
          }
        };

        const func = new Function('dv', query);
        func(dv);

        return { type: outputType, parsed: null, results: outputData, headers: outputHeaders, error: null };
      }

      // Classic Dataview
      const parsed = parseDataview(query);
      const results = executeDataview(parsed, index);
      return { type: parsed.type, parsed, results, headers: null, error: null };
    } catch (err: any) {
      return { type: 'ERROR', parsed: null, results: [], headers: null, error: err.message };
    }
  }, [query, index, isJS]);

  if (data.error) {
    return (
      <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '6px', color: '#fca5a5', fontFamily: 'monospace', fontSize: '0.85rem' }}>
        <strong>Dataview{isJS ? 'JS' : ''} Error:</strong> {data.error}
      </div>
    );
  }

  // Renderização da Tabela JS
  if (isJS && data.type === 'TABLE') {
    return (
      <div style={{ margin: '1rem 0', overflowX: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--glass-border)', padding: '0.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              {data.headers?.map((h, i) => (
                <th key={i} style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.results.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                {row.map((cell: any, j: number) => {
                   const isLink = typeof cell === 'object' && cell !== null && cell.isLink;
                   const content = isLink 
                     ? <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: cell.path } })); }} style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}><FileText size={12}/> {cell.name}</a>
                     : typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
                   return <td key={j} style={{ padding: '0.5rem', color: 'var(--text-primary)' }}>{content}</td>;
                })}
              </tr>
            ))}
            {data.results.length === 0 && (
              <tr>
                <td colSpan={data.headers?.length || 1} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum resultado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // Renderização da Lista Clássica ou JS
  if (data.type === 'LIST' || (isJS && data.type === 'LIST')) {
    return (
      <div style={{ margin: '1rem 0' }}>
        <ul style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem 1rem 1rem 2.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
          {data.results.map((row, i) => {
            const isObj = typeof row === 'object' && row !== null;
            const isCustomLink = isObj && row.isLink;
            const linkPath = isCustomLink ? row.path : (isObj && row.path ? row.path : (isObj && row.file?.path ? row.file.path : null));
            const label = isCustomLink ? row.name : (isObj && row.file?.name ? row.file.name : (isObj && row.name ? row.name : String(row)));
            
            return (
              <li key={i} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                {linkPath && <FileText size={14} color="var(--accent-secondary)" />}
                {linkPath ? (
                  <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: linkPath } })); }} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
                    {label}
                  </a>
                ) : (
                  <span>{label}</span>
                )}
              </li>
            );
          })}
          {data.results.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>Nenhum resultado encontrado.</span>}
        </ul>
      </div>
    );
  }

  // Renderização da Tabela Clássica
  const headers = ['Arquivo', ...(data.parsed?.fields.map(f => f.label) || [])];

  return (
    <div style={{ margin: '1rem 0', overflowX: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--glass-border)', padding: '0.5rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.results.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
              <td style={{ padding: '0.5rem' }}>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: row.path } }));
                  }}
                  style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}
                >
                  <FileText size={12} /> {row.file}
                </a>
              </td>
              {data.parsed?.fields.map(f => (
                <td key={f.field} style={{ padding: '0.5rem', color: 'var(--text-primary)' }}>
                  {row[f.label] !== null && row[f.label] !== undefined ? String(row[f.label]) : <span style={{ color: 'var(--text-secondary)' }}>-</span>}
                </td>
              ))}
            </tr>
          ))}
          {data.results.length === 0 && (
            <tr>
              <td colSpan={headers.length} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nenhum resultado encontrado para esta consulta.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
