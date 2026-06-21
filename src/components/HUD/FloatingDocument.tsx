import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DraggableWindow } from './DraggableWindow';
import { loadMarkdownFile } from '../../utils/githubApi';

interface FloatingDocumentProps {
  id: string;
  filepath: string;
  initialX: number;
  initialY: number;
  onClose: () => void;
}

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
      width={400} 
      height={500} 
      onClose={onClose}
    >
      <div style={{ padding: '20px', height: '100%', overflowY: 'auto', color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <span className="spin" style={{ display: 'inline-block', fontSize: '24px' }}>⏳</span>
          </div>
        ) : (
          <div className="wiki-content" style={{ lineHeight: '1.6' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </DraggableWindow>
  );
});
