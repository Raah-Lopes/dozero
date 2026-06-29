import React, { useState, useEffect, useRef } from 'react';
import { Scroll, ChevronDown, ChevronRight, CheckCircle2, Circle, X, GripVertical, Eye, EyeOff } from 'lucide-react';
import { state, updateCampaign } from '../../../store';
import type { CampaignData, CampaignQuest } from '../../../store';

interface ActiveQuestWithCampaign {
  quest: CampaignQuest;
  campaignName: string;
  campaignId: string;
}

export const QuestTrackerHUD: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 80 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hudRef = useRef<HTMLDivElement>(null);

  // Sync campaigns from Yjs
  useEffect(() => {
    const sync = () => {
      const list = Array.from(state.campaigns.values()) as CampaignData[];
      setCampaigns(list);
    };
    sync();
    state.campaigns.observe(sync);
    return () => state.campaigns.unobserve(sync);
  }, []);

  // Collect all active quests across all campaigns
  const activeQuests: ActiveQuestWithCampaign[] = campaigns.flatMap(c =>
    (c.quests || [])
      .filter(q => q.status === 'active')
      .map(q => ({ quest: q, campaignName: c.name, campaignId: c.id }))
  );

  // Dragging logic
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, label')) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const x = Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragOffset.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y));
      setPos({ x, y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  if (activeQuests.length === 0) return null;

  // Toggle an objective for a quest
  const toggleObjective = (campaignId: string, questId: string, objIndex: number) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    const updatedQuests = (campaign.quests || []).map(q => {
      if (q.id !== questId) return q;
      const objectives = [...(q.objectives || [])];
      objectives[objIndex] = { ...objectives[objIndex], done: !objectives[objIndex].done };
      return { ...q, objectives };
    });
    updateCampaign(campaignId, { quests: updatedQuests });
  };

  const toggleCollapse = (questId: string) => {
    setCollapsed(prev => ({ ...prev, [questId]: !prev[questId] }));
  };

  return (
    <>
      {/* Toggle button when fully hidden */}
      {hidden && (
        <button
          onClick={() => setHidden(false)}
          style={{
            position: 'fixed', left: `${pos.x}px`, top: `${pos.y}px`, zIndex: 9000,
            background: 'rgba(10,10,20,0.85)', border: '1px solid rgba(168,85,247,0.5)',
            borderRadius: '10px', padding: '6px 12px', color: '#c084fc', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700,
            fontFamily: 'var(--font-display)', letterSpacing: '0.05em', backdropFilter: 'blur(10px)',
            boxShadow: '0 0 14px rgba(168,85,247,0.2)',
          }}
          onMouseDown={onMouseDown}
        >
          <Scroll size={12} />
          Missões Ativas ({activeQuests.length})
        </button>
      )}

      {!hidden && (
        <div
          ref={hudRef}
          style={{
            position: 'fixed',
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            zIndex: 9000,
            width: '260px',
            maxHeight: minimized ? 'auto' : '480px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '14px',
            background: 'rgba(8,10,22,0.88)',
            border: '1px solid rgba(168,85,247,0.3)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
            overflow: 'hidden',
            userSelect: 'none',
            pointerEvents: 'auto',
          }}
        >
          {/* ── Header ── */}
          <div
            onMouseDown={onMouseDown}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px', cursor: 'grab',
              borderBottom: minimized ? 'none' : '1px solid rgba(168,85,247,0.15)',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(99,102,241,0.06) 100%)',
            }}
          >
            <GripVertical size={12} color="rgba(168,85,247,0.5)" style={{ flexShrink: 0 }} />
            <Scroll size={13} color="#a855f7" style={{ flexShrink: 0 }} />
            <span style={{
              flex: 1, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#c084fc', fontFamily: 'var(--font-display)',
            }}>
              Missões Ativas
            </span>
            <span style={{
              fontSize: '0.62rem', fontWeight: 700, color: '#a855f7',
              background: 'rgba(168,85,247,0.2)', borderRadius: '999px', padding: '1px 6px',
              fontFamily: 'var(--font-display)',
            }}>
              {activeQuests.length}
            </span>
            <button
              onClick={() => setMinimized(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.5)', padding: '2px', display: 'flex', transition: 'color 0.2s' }}
              title={minimized ? 'Expandir' : 'Minimizar'}
            >
              {minimized ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            <button
              onClick={() => setHidden(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.4)', padding: '2px', display: 'flex', transition: 'color 0.2s' }}
              title="Ocultar"
            >
              <X size={13} />
            </button>
          </div>

          {/* ── Quest list ── */}
          {!minimized && (
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {activeQuests.map(({ quest, campaignName, campaignId }) => {
                const isCollapsed = collapsed[quest.id];
                const objectives = quest.objectives || [];
                const doneCount = objectives.filter(o => o.done).length;
                const progress = objectives.length > 0 ? doneCount / objectives.length : 0;
                const questColor = quest.type === 'main' ? '#f59e0b' : '#38bdf8';
                const questBg = quest.type === 'main' ? 'rgba(245,158,11,0.12)' : 'rgba(56,189,248,0.08)';
                const questBorder = quest.type === 'main' ? 'rgba(245,158,11,0.25)' : 'rgba(56,189,248,0.2)';

                return (
                  <div key={quest.id} style={{
                    marginBottom: '8px', borderRadius: '10px', overflow: 'hidden',
                    border: `1px solid ${questBorder}`, background: questBg,
                  }}>
                    {/* Quest cover strip */}
                    {quest.coverUrl && (
                      <div style={{ height: '40px', overflow: 'hidden', position: 'relative' }}>
                        {quest.coverUrl.startsWith('linear-gradient') || quest.coverUrl.startsWith('radial-gradient')
                          ? <div style={{ width: '100%', height: '100%', background: quest.coverUrl, opacity: 0.7 }} />
                          : <img src={quest.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        }
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,10,22,0.8) 0%, transparent 70%)' }} />
                      </div>
                    )}

                    {/* Quest header */}
                    <div
                      onClick={() => toggleCollapse(quest.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 10px', cursor: 'pointer',
                      }}
                    >
                      {isCollapsed
                        ? <ChevronRight size={12} color={questColor} style={{ flexShrink: 0 }} />
                        : <ChevronDown size={12} color={questColor} style={{ flexShrink: 0 }} />
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0',
                          fontFamily: 'var(--font-display)', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {quest.name}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: 'rgba(148,163,184,0.5)' }}>
                          {campaignName} · {quest.type === 'main' ? 'Principal' : 'Secundária'}
                        </p>
                      </div>
                      {objectives.length > 0 && (
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, color: questColor,
                          fontFamily: 'var(--font-display)', flexShrink: 0,
                        }}>
                          {doneCount}/{objectives.length}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {objectives.length > 0 && (
                      <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', margin: '0 10px' }}>
                        <div style={{
                          height: '100%', borderRadius: '1px', transition: 'width 0.4s ease',
                          width: `${progress * 100}%`,
                          background: `linear-gradient(90deg, ${questColor}, ${quest.type === 'main' ? '#fcd34d' : '#7dd3fc'})`,
                        }} />
                      </div>
                    )}

                    {/* Objectives */}
                    {!isCollapsed && objectives.length > 0 && (
                      <div style={{ padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {objectives.map((obj, i) => (
                          <div
                            key={i}
                            onClick={() => toggleObjective(campaignId, quest.id, i)}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: '6px',
                              cursor: 'pointer', padding: '2px 4px', borderRadius: '5px',
                              transition: 'background 0.15s',
                            }}
                          >
                            {obj.done
                              ? <CheckCircle2 size={13} color="#22c55e" style={{ flexShrink: 0, marginTop: '1px' }} />
                              : <Circle size={13} color="rgba(148,163,184,0.4)" style={{ flexShrink: 0, marginTop: '1px' }} />
                            }
                            <span style={{
                              fontSize: '0.72rem', color: obj.done ? 'rgba(148,163,184,0.4)' : '#cbd5e1',
                              textDecoration: obj.done ? 'line-through' : 'none',
                              lineHeight: 1.4, transition: 'all 0.2s',
                            }}>
                              {obj.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isCollapsed && objectives.length === 0 && (
                      <p style={{ margin: 0, padding: '4px 10px 8px', fontSize: '0.68rem', color: 'rgba(148,163,184,0.35)', fontStyle: 'italic' }}>
                        Sem objetivos definidos.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};
