import React, { useState } from 'react';
import { Plus, Calendar, ExternalLink, FileText, Link2, Trash2, ChevronRight } from 'lucide-react';
import type { CampaignTabProps } from './types';
import { LegacyBadge } from './Shared';
import { WikiLinkedTextarea } from './Shared';

// Minimal mock for STATUS_CONFIG
const STATUS_CONFIG = {
  session: {
    upcoming: { label: 'Agendada', color: '#f59e0b', border: 'rgba(245,158,11,0.3)', bg: 'rgba(120,53,15,0.4)' },
    completed: { label: 'Realizada', color: '#22c55e', border: 'rgba(34,197,94,0.3)', bg: 'rgba(20,83,45,0.4)' },
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

interface SessionsTabProps extends CampaignTabProps {
  expandedSession: string | null;
  setExpandedSession: (id: string | null) => void;
  openInWiki: (path: string) => void;
  linkSessionToWiki: (sess: any, sessNum: number) => void;
  addSession: () => void;
  updateSession: (sessId: string, changes: any) => void;
  deleteSession: (sessId: string) => void;
}

export const SessionsTab: React.FC<SessionsTabProps> = ({
  campaign,
  linkingId,
  expandedSession,
  setExpandedSession,
  openInWiki,
  linkSessionToWiki,
  addSession,
  updateSession,
  deleteSession
}) => {
  const sortedSessions = campaign.sessions
    ? [...campaign.sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.25s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['upcoming', 'completed'] as const).map(st => {
            const conf = STATUS_CONFIG.session[st];
            const count = (campaign.sessions || []).filter((s: any) => s.status === st).length;
            return <Badge key={st} label={`${conf.label} (${count})`} color={conf.color} bg={conf.bg} border={conf.border} />;
          })}
        </div>
        <button className="cm-action-btn" onClick={addSession}>
          <Plus size={12} /> Registrar Sessão
        </button>
      </div>

      {sortedSessions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sortedSessions.map((sess: any, idx: number) => {
            const conf = STATUS_CONFIG.session[sess.status as keyof typeof STATUS_CONFIG.session];
            const isExpanded = expandedSession === sess.id;
            const sessNum = sortedSessions.length - idx;

            return (
              <div key={sess.id} className="cm-session-card">
                {/* Session header row */}
                <div
                  className="cm-session-header"
                  onClick={() => setExpandedSession(isExpanded ? null : sess.id)}
                >
                  {/* Number badge */}
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    background: conf.bg, border: `1px solid ${conf.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.68rem', fontWeight: 800, fontFamily: 'var(--font-display)',
                    color: conf.color
                  }}>
                    {sessNum}
                  </div>

                  <div style={{ flex: 1 }}>
                    <input
                      className="cm-input"
                      style={{
                        background: 'transparent', border: 'none', padding: '0',
                        borderRadius: 0, fontSize: '0.82rem', fontWeight: 700,
                        fontFamily: 'var(--font-display)', color: '#e2e8f0'
                      }}
                      type="date"
                      value={sess.date}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateSession(sess.id, { date: e.target.value })}
                    />
                  </div>

                  <Badge label={conf.label} color={conf.color} bg={conf.bg} border={conf.border} />

                  {/* Wiki button (if linked) */}
                  {sess.filePath && (
                    <button
                      className="cm-wiki-btn"
                      onClick={e => { e.stopPropagation(); openInWiki(sess.filePath!); }}
                      title="Abrir na Wiki"
                    >
                      <ExternalLink size={10} /> Wiki
                    </button>
                  )}

                  {/* Link button (if legacy) */}
                  {!sess.filePath && (
                    <button
                      className="cm-link-btn"
                      disabled={linkingId === sess.id}
                      onClick={e => { e.stopPropagation(); linkSessionToWiki(sess, sessNum); }}
                      title="Vincular à Wiki"
                    >
                      <Link2 size={9} />
                      {linkingId === sess.id ? '...' : 'Vincular'}
                    </button>
                  )}

                  <select
                    className="cm-select"
                    value={sess.status}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', color: conf.color, borderColor: conf.border, background: conf.bg }}
                    onClick={e => e.stopPropagation()}
                    onChange={e => updateSession(sess.id, { status: e.target.value })}
                  >
                    <option value="upcoming">Agendada</option>
                    <option value="completed">Realizada</option>
                  </select>

                  <button
                    className="cm-danger-btn"
                    onClick={e => { e.stopPropagation(); deleteSession(sess.id); }}
                  >
                    <Trash2 size={13} />
                  </button>

                  <ChevronRight
                    size={14}
                    style={{
                      color: 'rgba(148,163,184,0.4)',
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                      flexShrink: 0
                    }}
                  />
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '0 14px 14px' }}>
                    {/* File path bar inside expanded */}
                    {sess.filePath && (
                      <div className="cm-wiki-file-bar" style={{ marginBottom: '10px' }}>
                        <FileText size={11} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.68rem' }}>
                          {sess.filePath}
                        </span>
                        <button className="cm-wiki-btn" onClick={() => openInWiki(sess.filePath!)}>
                          <ExternalLink size={10} /> Abrir na Wiki
                        </button>
                      </div>
                    )}

                    <WikiLinkedTextarea
                      key={`session-${sess.id}-${sess.filePath}`}
                      filePath={sess.filePath}
                      fallbackValue={sess.summary}
                      onFallbackChange={(val: string) => updateSession(sess.id, { summary: val })}
                      placeholder={
                        sess.status === 'upcoming'
                          ? 'Pautas, objetivos e planos para esta sessão...'
                          : 'O que aconteceu? Decisões dos jogadores, reviravoltas, consequências...'
                      }
                      minHeight="120px"
                      autoFocus
                    />
                  </div>
                )}

                {/* Collapsed preview */}
                {!isExpanded && sess.summary && (
                  <p style={{
                    margin: '0 14px 10px',
                    fontSize: '0.75rem', color: 'rgba(148,163,184,0.6)',
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                  }}>
                    {sess.summary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Calendar size={36} />}
          message="Nenhuma sessão registrada."
          sub="Agende sessões futuras ou documente sessões passadas."
        />
      )}
    </div>
  );
};
