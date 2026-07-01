import React, { useMemo } from 'react';
import { useWiki } from '../../hooks/useWiki';
import { parseDataview, executeDataview } from '../../utils/dataviewParser';
import { FileText } from 'lucide-react';

interface DataviewRendererProps {
  query: string;
  isJS?: boolean;
  activeFile?: string;
}

export const DataviewRenderer: React.FC<DataviewRendererProps> = ({ query, isJS, activeFile }) => {
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
                const res = Object.assign(Array.prototype.filter.call(this, predicate), { where: this.where, map: this.map });
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
          },
          current: () => {
            if (!activeFile) return null;
            const entry = index.find((e: any) => e.path === activeFile);
            if (!entry) return { file: { path: activeFile, name: activeFile.split('/').pop() } };
            const meta = entry.metadata || {};
            return {
              file: {
                name: meta.nome || meta.titulo || entry.slug,
                path: entry.path,
                link: { isLink: true, path: entry.path, name: meta.nome || meta.titulo || entry.slug }
              },
              ...meta
            };
          }
        };

        const fakeApp = {
          workspace: {
            getActiveFile: () => {
              if (!activeFile) return { path: '', basename: '', extension: 'md' };
              const parts = activeFile.split('/');
              const fileWithExt = parts[parts.length - 1];
              const extIndex = fileWithExt.lastIndexOf('.');
              const basename = extIndex !== -1 ? fileWithExt.substring(0, extIndex) : fileWithExt;
              const extension = extIndex !== -1 ? fileWithExt.substring(extIndex + 1) : '';
              return { path: activeFile, basename, extension };
            }
          },
          plugins: { plugins: {} },
          metadataCache: {
            getFileCache: (fileObj: any) => {
              if (!fileObj || !fileObj.path) return null;
              const entry = index.find((e: any) => e.path === fileObj.path);
              if (!entry) return null;
              return {
                frontmatter: entry.metadata || {},
                tags: entry.metadata?.tags || [],
                links: []
              };
            }
          },
          vault: {}
        };

        const container = document.createElement('div');
        
        const patchElement = (el: HTMLElement) => {
          (el as any).createDiv = (options?: any) => {
            const div = document.createElement('div');
            if (options?.attr) {
              Object.keys(options.attr).forEach(k => div.setAttribute(k, options.attr[k]));
            }
            if (options?.text) div.textContent = String(options.text);
            if (options?.cls) div.className = options.cls;
            el.appendChild(div);
            return patchElement(div);
          };
          (el as any).createEl = (tag: string, options?: any) => {
            const newEl = document.createElement(tag);
            if (options?.attr) {
              Object.keys(options.attr).forEach(k => newEl.setAttribute(k, options.attr[k]));
            }
            if (options?.text) newEl.textContent = String(options.text);
            if (options?.cls) newEl.className = options.cls;
            el.appendChild(newEl);
            return patchElement(newEl);
          };
          return el;
        };
        
        patchElement(container);
        (dv as any).container = container;

        const func = new Function('dv', 'app', query);
        func.call({ container }, dv, fakeApp);

        return { type: outputType, parsed: null, results: outputData, headers: outputHeaders, error: null, htmlOutput: container.innerHTML };
      }

      // Classic Dataview
      const parsed = parseDataview(query);
      const results = executeDataview(parsed, index);
      return { type: parsed.type, parsed, results, headers: null, error: null, htmlOutput: '' };
    } catch (err: any) {
      return { type: 'ERROR', parsed: null, results: [], headers: null, error: err.message, htmlOutput: '' };
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
      <>
        {data.htmlOutput && <div dangerouslySetInnerHTML={{ __html: data.htmlOutput }} />}
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
      </>
    );
  }

  // Renderização da Lista JS
  if (isJS && data.type === 'LIST') {
    return (
      <>
        {data.htmlOutput && <div dangerouslySetInnerHTML={{ __html: data.htmlOutput }} />}
        <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '1rem 1rem 1rem 2.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
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
      </>
    );
  }

  if (isJS) {
    return <div dangerouslySetInnerHTML={{ __html: data.htmlOutput }} />;
  }

  // Renderização da Lista Clássica
  if (data.type === 'LIST') {
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
