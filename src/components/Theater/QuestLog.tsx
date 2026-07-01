import React, { useState } from 'react';
import { Target, CheckCircle2, XCircle, Plus, Edit2, Check, X, Wand2 } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { updateTheaterScene, type Objective } from '../../store';
import { GlassAccordion } from '../UI/GlassAccordion';

export const QuestLog: React.FC = () => {
  const { currentScene } = useSceneState();
  const [addingObj, setAddingObj] = useState(false);
  const [newObjText, setNewObjText] = useState('');
  const [newObjSecret, setNewObjSecret] = useState(false);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  if (!currentScene) return null;

  const addObjective = (text: string, secret: boolean = false) => {
    if (!text.trim()) return;
    const newObj: Objective = {
      id: Date.now().toString(),
      text: text.trim(),
      status: 'pending',
      secret
    };
    updateTheaterScene({ objectives: [...currentScene.objectives, newObj] });
  };

  const handleAddSubmit = () => {
    addObjective(newObjText, newObjSecret);
    setNewObjText('');
    setAddingObj(false);
  };

  const setObjectiveStatus = (id: string, status: 'pending' | 'success' | 'failed') => {
    updateTheaterScene({
      objectives: currentScene.objectives.map(o => o.id === id ? { ...o, status } : o)
    });
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      updateTheaterScene({
        objectives: currentScene.objectives.map(o => o.id === id ? { ...o, text: editText.trim() } : o)
      });
    }
    setEditingId(null);
  };

  return (
    <GlassAccordion title={<><Target size={13} color="#fca5a5" /> Painel de Missões</>}>
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={async () => {
              const prompt = `Gere uma missão curta e dramática para os jogadores num RPG de mesa, considerando esta cena: ${currentScene.title}. Aja como um Mestre. Retorne apenas o texto da missão (máximo 15 palavras).`;
              try {
                const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
                const text = await res.text();
                addObjective(text.trim());
              } catch (e) {
                console.error(e);
                alert('Erro ao gerar missão com IA');
              }
            }}
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', borderRadius: '4px', padding: '2px 8px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Sugerir Missão com IA"
          >
            <Wand2 size={12} /> IA
          </button>
          <button onClick={() => setAddingObj(!addingObj)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Add Form */}
      {addingObj && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <input
            autoFocus
            value={newObjText}
            onChange={e => setNewObjText(e.target.value)}
            placeholder="Descreva a missão..."
            onKeyDown={e => { if (e.key === 'Enter') handleAddSubmit(); }}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '0.75rem', width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#94a3b8', cursor: 'pointer' }}>
              <input type="checkbox" checked={newObjSecret} onChange={e => setNewObjSecret(e.target.checked)} />
              Missão Secreta (Visível só para o Mestre)
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setAddingObj(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px' }}>Cancelar</button>
              <button onClick={handleAddSubmit} style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {/* Quest List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {currentScene.objectives.length === 0 && !addingObj && (
          <div style={{ color: '#475569', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
            Nenhuma missão ativa.
          </div>
        )}
        
        {currentScene.objectives.map(obj => {
          const isSuccess = obj.status === 'success';
          const isFailed = obj.status === 'failed';
          const isEditing = editingId === obj.id;

          return (
            <div
              key={obj.id}
              style={{
                display: 'flex', flexDirection: 'column',
                background: isSuccess ? 'rgba(16,185,129,0.05)' : isFailed ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.2)' : isFailed ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '6px', overflow: 'hidden'
              }}
            >
              {/* Quest Item Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px' }}>
                <div style={{ paddingTop: '2px' }}>
                  {isSuccess ? <CheckCircle2 size={14} color="#10b981" /> : isFailed ? <XCircle size={14} color="#ef4444" /> : <Target size={14} color="#94a3b8" />}
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(obj.id); if (e.key === 'Escape') setEditingId(null); }}
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '0.8rem', padding: '2px 4px', borderRadius: '4px' }}
                    />
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: isSuccess ? '#6ee7b7' : isFailed ? '#fca5a5' : '#e2e8f0', textDecoration: isFailed || isSuccess ? 'line-through' : 'none' }}>
                      {obj.text}
                    </span>
                  )}
                  {obj.secret && <span style={{ fontSize: '0.6rem', color: '#f59e0b', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[Segredo do Mestre]</span>}
                </div>

                <div style={{ display: 'flex', gap: '4px', opacity: isEditing ? 1 : 0.6 }}>
                  {isEditing ? (
                    <button onClick={() => saveEdit(obj.id)} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer' }}><Check size={13} /></button>
                  ) : (
                    <button onClick={() => { setEditingId(obj.id); setEditText(obj.text); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Edit2 size={13} /></button>
                  )}
                  <button
                    onClick={() => {
                      updateTheaterScene({ objectives: currentScene.objectives.filter(o => o.id !== obj.id) });
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Status Toggles */}
              <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.02)', background: 'rgba(0,0,0,0.1)' }}>
                <button
                  onClick={() => setObjectiveStatus(obj.id, 'success')}
                  style={{ flex: 1, padding: '4px', background: isSuccess ? 'rgba(16,185,129,0.1)' : 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.02)', color: isSuccess ? '#10b981' : '#64748b', fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Sucesso
                </button>
                <button
                  onClick={() => setObjectiveStatus(obj.id, 'pending')}
                  style={{ flex: 1, padding: '4px', background: obj.status === 'pending' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.02)', color: obj.status === 'pending' ? '#94a3b8' : '#64748b', fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Pendente
                </button>
                <button
                  onClick={() => setObjectiveStatus(obj.id, 'failed')}
                  style={{ flex: 1, padding: '4px', background: isFailed ? 'rgba(239,68,68,0.1)' : 'transparent', border: 'none', color: isFailed ? '#ef4444' : '#64748b', fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Falha
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </GlassAccordion>
  );
};
