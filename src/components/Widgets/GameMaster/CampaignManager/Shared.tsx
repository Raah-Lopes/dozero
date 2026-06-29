import React, { useRef, useEffect, useState } from 'react';
import { AlertTriangle, FileText, Paperclip, Loader2 } from 'lucide-react';
import { loadMarkdownFile, saveMarkdownContent } from '../../../../utils/githubApi';
import { getWikiConfig } from '../../../../store';

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const insertTextAtCursor = (textToInsert: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const newVal = before + textToInsert + after;
    setContent(newVal);
    // Trigger save
    window.setTimeout(() => {
      ta.selectionStart = start + textToInsert.length;
      ta.selectionEnd = start + textToInsert.length;
      ta.focus();
    }, 10);
    if (filePath) {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        setSaving(true);
        try { await saveMarkdownContent(filePath, newVal); }
        finally { setSaving(false); }
      }, 1000);
    } else {
      onFallbackChange?.(newVal);
    }
  };

  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';

      // Convert to WebP
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = ev => res(ev.target?.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      // Resize via canvas
      const img = new Image();
      await new Promise<void>(res => { img.onload = () => res(); img.src = dataUrl; });
      const canvas = document.createElement('canvas');
      const maxSize = 1200;
      let w = img.width, h = img.height;
      if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
      if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      const webpBase64 = canvas.toDataURL('image/webp', 0.85);

      const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeName}_${Date.now()}.webp`;

      const res = await fetch('/api/wiki/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, filename, base64: webpBase64 }),
      });
      const data = await res.json();
      if (data.url) {
        const altText = file.name.replace(/\.[^.]+$/, '');
        insertTextAtCursor(`\n![${altText}](${data.url})\n`);
      }
    } catch (err) {
      console.error('Erro ao anexar imagem:', err);
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
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
        ref={textareaRef}
        className="cm-textarea"
        style={{ minHeight, paddingBottom: '28px' }}
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {/* Toolbar dentro do textarea */}
      <div style={{
        position: 'absolute', bottom: '6px', left: '8px',
        display: 'flex', alignItems: 'center', gap: '4px',
      }}>
        <label
          title="Anexar imagem (salva em ANEXOS/ e insere no texto)"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '5px', cursor: 'pointer',
            background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)',
            color: '#c084fc', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-display)',
            transition: 'all 0.2s',
          }}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageAttach}
          />
          {uploadingImage
            ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
            : <Paperclip size={10} />}
          {uploadingImage ? 'Enviando...' : 'Anexar'}
        </label>
      </div>
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
