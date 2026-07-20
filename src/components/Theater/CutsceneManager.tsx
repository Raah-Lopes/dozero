// src/components/Theater/CutsceneManager.tsx
//
// Gerenciador de cutscenes: lista, cria, edita, apaga e dispara.
// Renderizado dentro do DirectorPanel na aba Cutscenes.
//
import React, { useState } from 'react';
import { Play, Pencil, Trash2, Plus, Check, X, Clock } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { convertImageToWebP } from '../../utils/imageUtils';
import { saveCutscene, updateCutscene, deleteCutscene } from '../../store';
import type { SavedCutscene } from '../../store';

// ── Inline editor ──────────────────────────────────────────────────────────────
interface EditorProps {
  initial: Partial<SavedCutscene>;
  onSave: (data: Omit<SavedCutscene, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const field: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 7,
  padding: '7px 10px',
  color: '#e2e8f0',
  fontSize: '0.78rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#475569',
  marginBottom: 4,
};

const CutsceneEditor: React.FC<EditorProps> = ({ initial, onSave, onCancel }) => {
  const [name, setName] = useState(initial.name ?? '');
  const [title, setTitle] = useState(initial.title ?? '');
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? '');
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? '');
  const [durationMs, setDurationMs] = useState((initial.durationMs ?? 4000) / 1000);

  const valid = title.trim().length > 0 && name.trim().length > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      name: name.trim(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      durationMs: Math.max(1, durationMs) * 1000,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0' }}>
      <div>
        <span style={label}>Nome interno (para sua lista)</span>
        <input style={field} value={name} onChange={e => setName(e.target.value)} placeholder="ex: Capítulo 4 – A Capital" />
      </div>
      <div>
        <span style={label}>Título exibido na tela</span>
        <input style={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: Capítulo IV: A Capital de Ferro" />
      </div>
      <div>
        <span style={label}>Subtítulo / descrição (opcional)</span>
        <input style={field} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="ex: Uma cidade forjada em sangue" />
      </div>
      <div>
        <span style={label}>Imagem de fundo (opcional)</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            style={{ ...field, flex: 1 }}
            value={imageUrl.startsWith('data:') ? '(imagem do computador)' : imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://... ou use o botão ao lado"
            readOnly={imageUrl.startsWith('data:')}
          />
          {/* hidden file input */}
          <input
            id="cutscene-file-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const { base64 } = await convertImageToWebP(file, 0.9, 1280);
              setImageUrl(base64);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => document.getElementById('cutscene-file-upload')?.click()}
            title="Carregar imagem do computador"
            style={{
              padding: '7px 10px', borderRadius: 7, flexShrink: 0,
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
              color: '#818cf8', cursor: 'pointer', fontSize: '0.72rem',
              fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            📂 Arquivo
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl('')}
              title="Remover imagem"
              style={{
                padding: '7px 8px', borderRadius: 7, flexShrink: 0,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit',
              }}
            >
              ✕
            </button>
          )}
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="preview"
            onError={e => (e.currentTarget.style.display = 'none')}
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 6, marginTop: 6, border: '1px solid rgba(255,255,255,0.08)' }}
          />
        )}
      </div>
      <div>
        <span style={label}>Duração (segundos)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" min={1} max={20} step={0.5} value={durationMs} onChange={e => setDurationMs(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#a855f7' }} />
          <span style={{ color: '#c084fc', fontSize: '0.78rem', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>{durationMs}s</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button
          disabled={!valid}
          onClick={handleSave}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '8px', borderRadius: 7, background: valid ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${valid ? '#a855f7' : 'rgba(255,255,255,0.08)'}`,
            color: valid ? '#c084fc' : '#334155', cursor: valid ? 'pointer' : 'not-allowed',
            fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit',
          }}
        >
          <Check size={13} /> Salvar
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 12px', borderRadius: 7, background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)', color: '#475569',
            cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit',
          }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

// ── Main manager ───────────────────────────────────────────────────────────────
type UIState =
  | { mode: 'list' }
  | { mode: 'create' }
  | { mode: 'edit'; id: string };

export const CutsceneManager: React.FC = () => {
  const { theaterData } = useSceneState();
  const cutscenes = theaterData.cutscenes ?? [];
  const [ui, setUi] = useState<UIState>({ mode: 'list' });

  const fire = (c: SavedCutscene) => {
    window.dispatchEvent(new CustomEvent('theater-cutscene', {
      detail: { title: c.title, subtitle: c.subtitle, imageUrl: c.imageUrl, durationMs: c.durationMs },
    }));
  };

  const handleCreate = (data: Omit<SavedCutscene, 'id' | 'createdAt'>) => {
    saveCutscene(data);
    setUi({ mode: 'list' });
  };

  const handleUpdate = (id: string, data: Omit<SavedCutscene, 'id' | 'createdAt'>) => {
    updateCutscene(id, data);
    setUi({ mode: 'list' });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Apagar esta cutscene?')) return;
    deleteCutscene(id);
    if (ui.mode === 'edit' && ui.id === id) setUi({ mode: 'list' });
  };

  const editTarget = ui.mode === 'edit' ? cutscenes.find(c => c.id === ui.id) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155' }}>
          Biblioteca de Cutscenes
        </span>
        {ui.mode === 'list' && (
          <button
            onClick={() => setUi({ mode: 'create' })}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              borderRadius: 6, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)',
              color: '#c084fc', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={12} /> Nova
          </button>
        )}
        {ui.mode !== 'list' && (
          <button onClick={() => setUi({ mode: 'list' })}
            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.7rem' }}>
            ← Voltar
          </button>
        )}
      </div>

      {/* CREATE form */}
      {ui.mode === 'create' && (
        <CutsceneEditor
          initial={{ durationMs: 4000 }}
          onSave={handleCreate}
          onCancel={() => setUi({ mode: 'list' })}
        />
      )}

      {/* EDIT form */}
      {ui.mode === 'edit' && editTarget && (
        <CutsceneEditor
          initial={editTarget}
          onSave={data => handleUpdate(editTarget.id, data)}
          onCancel={() => setUi({ mode: 'list' })}
        />
      )}

      {/* LIST */}
      {ui.mode === 'list' && (
        <>
          {cutscenes.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#334155', textAlign: 'center', padding: '20px 0' }}>
              Nenhuma cutscene salva.<br />Clique em "Nova" para criar.
            </p>
          )}
          {cutscenes.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.02)', marginBottom: 6,
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: 44, height: 30, borderRadius: 5, flexShrink: 0, overflow: 'hidden',
                background: c.imageUrl ? `url(${c.imageUrl}) center/cover` : 'rgba(168,85,247,0.2)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {!c.imageUrl && <span style={{ fontSize: '0.9rem' }}>🎬</span>}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={9} /> {c.durationMs / 1000}s
                  {c.subtitle && <span>· {c.subtitle.slice(0, 28)}{c.subtitle.length > 28 ? '…' : ''}</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 3 }}>
                <button title="Disparar agora" onClick={() => fire(c)}
                  style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={11} />
                </button>
                <button title="Editar" onClick={() => setUi({ mode: 'edit', id: c.id })}
                  style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={11} />
                </button>
                <button title="Apagar" onClick={() => handleDelete(c.id)}
                  style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
