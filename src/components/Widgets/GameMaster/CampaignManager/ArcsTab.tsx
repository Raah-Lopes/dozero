import React from 'react';
import { Plus, CheckCircle, Play, Circle, Edit3, Trash2, Save, ExternalLink, FileText, Link2, Target } from 'lucide-react';
import type { CampaignTabProps } from './types';
import { LegacyBadge } from './Shared';
import { WikiLinkedTextarea } from './Shared';

// Minimal mock for STATUS_CONFIG used here. Ideally imported from a shared constants file.
const STATUS_CONFIG = {
  arc: {
    planned: { label: 'Planejado', color: '#94a3b8', border: 'rgba(148,163,184,0.3)', bg: 'rgba(15,23,42,0.6)' },
    active: { label: 'Ativo', color: '#38bdf8', border: 'rgba(56,189,248,0.3)', bg: 'rgba(12,74,110,0.4)' },
    completed: { label: 'Concluído', color: '#22c55e', border: 'rgba(34,197,94,0.3)', bg: 'rgba(20,83,45,0.4)' },
  }
};

const Badge = ({ label, color, bg, border }: any) => (
  <div style={{
    fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-display)',
    textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px',
    color, background: bg, border: `1px solid ${border}`,
  }}>{label}</div>
);

const EmptyState = ({ icon, message, sub }: any) => (
  <div style={{
    padding: '30px 20px', textAlign: 'center', background: 'rgba(15,23,42,0.4)',
    borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)'
  }}>
    <div style={{ color: 'rgba(148,163,184,0.3)', marginBottom: '12px' }}>{icon}</div>
    <p style={{ margin: 0, fontWeight: 600, color: '#94a3b8', fontSize: '0.9rem' }}>{message}</p>
    {sub && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(148,163,184,0.5)' }}>{sub}</p>}
  </div>
);

interface ArcsTabProps extends CampaignTabProps {
  editingArcId: string | null;
  setEditingArcId: (id: string | null) => void;
  openInWiki: (path: string) => void;
  linkArcToWiki: (arc: any) => void;
  addArc: () => void;
  updateArc: (arcId: string, changes: any) => void;
  deleteArc: (arcId: string) => void;
}

export const ArcsTab: React.FC<ArcsTabProps> = ({
  campaign,
  linkingId,
  editingArcId,
  setEditingArcId,
  openInWiki,
  linkArcToWiki,
  addArc,
  updateArc,
  deleteArc
}) => {

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.25s ease-out' }}>
      {/* Arc kanban header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['planned', 'active', 'completed'] as const).map(st => {
            const conf = STATUS_CONFIG.arc[st];
            const count = (campaign.arcs || []).filter((a: any) => a.status === st).length;
            return (
              <Badge key={st} label={`${conf.label} (${count})`} color={conf.color} bg={conf.bg} border={conf.border} />
            );
          })}
        </div>
        <button className="cm-action-btn" onClick={addArc}>
          <Plus size={12} /> Novo Arco
        </button>
      </div>

      {/* Timeline */}
      {(campaign.arcs || []).length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
          {(campaign.arcs || []).map((arc: any, i: number) => {
            const conf = STATUS_CONFIG.arc[arc.status as keyof typeof STATUS_CONFIG.arc];
            const isEditing = editingArcId === arc.id;
            const isLast = i === (campaign.arcs || []).length - 1;

            return (
              <div key={arc.id} style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                {/* Timeline column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30px', flexShrink: 0 }}>
                  <div
                    className="cm-arc-step-dot"
                    style={{ color: conf.color, borderColor: conf.border, background: conf.bg }}
                  >
                    {arc.status === 'completed' ? <CheckCircle size={13} /> : arc.status === 'active' ? <Play size={11} /> : <Circle size={11} />}
                  </div>
                  {!isLast && <div style={{ flex: 1, width: '2px', background: 'rgba(255,255,255,0.06)', minHeight: '8px' }} />}
                </div>

                {/* Arc card */}
                <div className="cm-arc-card" style={{ flex: 1, marginBottom: isLast ? 0 : '4px' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                    {isEditing ? (
                      <input
                        className="cm-input"
                        style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-display)', padding: '4px 8px' }}
                        autoFocus
                        value={arc.name}
                        onChange={e => updateArc(arc.id, { name: e.target.value })}
                      />
                    ) : (
                      <h4 style={{
                        flex: 1, margin: 0, fontSize: '0.9rem', fontWeight: 700,
                        color: '#e2e8f0', fontFamily: 'var(--font-display)',
                        cursor: 'text'
                      }}
                        onClick={() => setEditingArcId(arc.id)}
                      >{arc.name}</h4>
                    )}

                    <select
                      className="cm-select"
                      value={arc.status}
                      onChange={e => updateArc(arc.id, { status: e.target.value })}
                      style={{
                        fontSize: '0.7rem', padding: '3px 8px',
                        color: conf.color, borderColor: conf.border, background: conf.bg,
                      }}
                    >
                      <option value="planned">Planejado</option>
                      <option value="active">Ativo</option>
                      <option value="completed">Concluído</option>
                    </select>

                    {isEditing ? (
                      <button
                        className="cm-action-btn"
                        style={{ padding: '3px 10px' }}
                        onClick={() => setEditingArcId(null)}
                      ><Save size={12} /> Salvar</button>
                    ) : (
                      <button className="cm-danger-btn" onClick={() => setEditingArcId(arc.id)} title="Editar">
                        <Edit3 size={13} />
                      </button>
                    )}
                    <button className="cm-danger-btn" onClick={() => deleteArc(arc.id)} title="Remover">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Wiki file bar */}
                  {arc.filePath ? (
                    <div className="cm-wiki-file-bar" style={{ marginBottom: '8px' }}>
                      <FileText size={11} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.68rem' }}>
                        {arc.filePath}
                      </span>
                      <button className="cm-wiki-btn" onClick={() => openInWiki(arc.filePath!)}>
                        <ExternalLink size={10} /> Abrir na Wiki
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <LegacyBadge />
                      <button
                        className="cm-link-btn"
                        disabled={linkingId === arc.id}
                        onClick={() => linkArcToWiki(arc)}
                      >
                        <Link2 size={9} />
                        {linkingId === arc.id ? 'Vinculando...' : 'Vincular à Wiki'}
                      </button>
                    </div>
                  )}

                  {/* Description textarea linked to .md */}
                  <WikiLinkedTextarea
                    key={`arc-${arc.id}-${arc.filePath}`}
                    filePath={arc.filePath}
                    fallbackValue={arc.description}
                    onFallbackChange={(val: string) => updateArc(arc.id, { description: val })}
                    placeholder="Objetivos, NPCs chave, fios narrativos deste arco..."
                    minHeight="80px"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Target size={36} />}
          message="Nenhum arco narrativo planejado."
          sub="Adicione arcos para organizar os atos da campanha."
        />
      )}
    </div>
  );
};
