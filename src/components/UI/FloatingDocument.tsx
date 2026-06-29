import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DraggableWindow } from '../HUD/DraggableWindow';
import { loadMarkdownFile } from '../../utils/githubApi';
import { Check, Copy } from 'lucide-react';

interface FloatingDocumentProps {
  id: string;
  filepath: string;
  initialX: number;
  initialY: number;
  onClose: () => void;
}

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline) {
    return (
      <div style={{ position: 'relative', margin: '1em 0', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderTopLeftRadius: '6px', borderTopRightRadius: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>{match ? match[1] : 'código'}</span>
          <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: copied ? '#4ade80' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
        <div style={{ padding: '12px', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#e2e8f0' }}>
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      </div>
    );
  }
  return <code className={className} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px', fontSize: '0.85em', color: '#f87171' }} {...props}>{children}</code>;
};

const Blockquote = ({ node, children, ...props }: any) => {
  let type = '';
  let title = '';
  let isCallout = false;
  
  if (node && node.children && node.children.length > 0) {
    const firstP = node.children[0];
    if (firstP.type === 'element' && firstP.tagName === 'p' && firstP.children.length > 0) {
      const firstText = firstP.children[0];
      if (firstText.type === 'text') {
        const match = /^\[!(\w+)\][-+]?\s*(.*)/.exec(firstText.value);
        if (match) {
          isCallout = true;
          type = match[1].toLowerCase();
          title = match[2].trim();
          firstText.value = firstText.value.replace(/^\[!(\w+)\][-+]?\s*.*\n?/, '');
        }
      }
    }
  }

  if (isCallout) {
    const colors: any = {
      info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#93c5fd' },
      warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#fcd34d' },
      danger: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#fca5a5' },
      success: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', text: '#6ee7b7' },
      quote: { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7', text: '#d8b4fe' },
      tip: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', text: '#6ee7b7' },
      bug: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#fca5a5' },
      note: { bg: 'rgba(100, 116, 139, 0.1)', border: '#64748b', text: '#cbd5e1' },
    };
    
    const c = colors[type] || colors.info;

    return (
      <div style={{ margin: '1em 0', padding: '12px', background: c.bg, borderLeft: `4px solid ${c.border}`, borderRadius: '0 6px 6px 0' }}>
        {title && <div style={{ fontWeight: 'bold', color: c.text, marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>{title || type}</div>}
        <div style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>
          {children}
        </div>
      </div>
    );
  }

  return <blockquote style={{ borderLeft: '4px solid var(--accent-primary)', margin: '1em 0', paddingLeft: '1em', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '10px' }} {...props}>{children}</blockquote>;
};

export const FloatingDocument: React.FC<FloatingDocumentProps> = React.memo(({ id, filepath, initialX, initialY, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const text = await loadMarkdownFile(filepath);
      if (text) {
        // Strip out frontmatter for clean reading
        const lines = text.split('\n');
        if (lines[0]?.trim() === '---') {
          const fim = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
          if (fim !== -1) {
            setContent(lines.slice(fim + 1).join('\n'));
          } else {
            setContent(text);
          }
        } else {
          setContent(text);
        }
      } else {
        setContent('*Documento não encontrado ou vazio.*');
      }
      setLoading(false);
    }
    load();
  }, [filepath]);

  const filename = filepath.split('/').pop()?.replace('.md', '') || 'Documento';

  return (
    <DraggableWindow 
      id={id} 
      title={`📖 ${filename}`} 
      initialX={initialX} 
      initialY={initialY} 
      width={450} 
      height={550} 
      onClose={onClose}
    >
      <div style={{ padding: '20px', height: '100%', overflowY: 'auto', color: '#e2e8f0', fontFamily: 'var(--font-primary)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <span className="spin" style={{ display: 'inline-block', fontSize: '24px' }}>⏳</span>
          </div>
        ) : (
          <div className="wiki-content" style={{ lineHeight: '1.6', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: filepath } }));
                  onClose();
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px',
                  background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.4)',
                  borderRadius: '4px', color: '#d8b4fe', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                }}
                title="Expandir na Wiki Principal"
              >
                Expandir
              </button>
            </div>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code: CodeBlock,
                blockquote: Blockquote,
                a: ({node, ...props}) => <a style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }} {...props} />
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </DraggableWindow>
  );
});
