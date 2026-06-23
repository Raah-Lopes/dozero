import React, { useRef, useEffect, useState } from 'react';
import { AlertTriangle, FileText } from 'lucide-react';
import { loadMarkdownFile, saveMarkdownContent } from '../../../../utils/githubApi';

export const LegacyBadge: React.FC = () => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
    color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: '999px', padding: '2px 8px', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
  }}>
    <AlertTriangle size={9} />
    Sem arquivo
  </span>
);


// ─── WikiLinkedTextarea ────────────────────────────────────────────────────────
// A textarea that loads content from a .md file (filePath) and auto-saves back to it.
// If filePath is null/undefined, falls back to simple controlled value/onChange.

interface WikiLinkedTextareaProps {
  filePath?: string;
  fallbackValue?: string;
  onFallbackChange?: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
  autoFocus?: boolean;
}

export const WikiLinkedTextarea: React.FC<WikiLinkedTextareaProps> = ({
  filePath, fallbackValue, onFallbackChange, placeholder, minHeight = '100px', autoFocus = false,
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Load from file when filePath becomes available
  useEffect(() => {
    mountedRef.current = true;
    if (!filePath) {
      setContent(fallbackValue ?? '');
      return;
    }
    setLoading(true);
    loadMarkdownFile(filePath)
      .then(text => {
        if (mountedRef.current) setContent(text ?? '');
      })
      .catch(() => { if (mountedRef.current) setContent(''); })
      .finally(() => { if (mountedRef.current) setLoading(false); });
    return () => { mountedRef.current = false; };
  }, [filePath]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (filePath) {
      // Auto-save to .md file
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        setSaving(true);
        try {
          await saveMarkdownContent(filePath, val);
        } finally {
          setSaving(false);
        }
      }, 1000);
    } else {
      // Fallback: update parent directly
      onFallbackChange?.(val);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight, borderRadius: '10px', background: 'rgba(15,23,42,0.4)',
        border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '8px', color: 'rgba(148,163,184,0.5)', fontSize: '0.8rem',
      }}>
        <FileText size={14} style={{ opacity: 0.4 }} /> Carregando...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        className="cm-textarea"
        style={{ minHeight }}
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {saving && (
        <span style={{
          position: 'absolute', bottom: '8px', right: '10px',
          fontSize: '0.65rem', color: 'rgba(148,163,184,0.5)',
          fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
        }}>
          salvando...
        </span>
      )}
    </div>
  );
};

