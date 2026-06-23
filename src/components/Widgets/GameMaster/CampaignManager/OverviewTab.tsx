import React from 'react';
import { AlertTriangle, Link2, FileText, ExternalLink, Flag, Clock } from 'lucide-react';
import type { CampaignTabProps } from './types';
import { LegacyBadge } from './Shared';
import { WikiLinkedTextarea } from './Shared';

interface OverviewTabProps extends CampaignTabProps {
  openInWiki: (path: string) => void;
  linkCampaignToWiki: (campaign: any) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  campaign,
  updateCampaign,
  linkingId,
  openInWiki,
  linkCampaignToWiki
}) => {
  const upd = (updates: Partial<any>) => updateCampaign(campaign.id, updates);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease-out' }}>
      {/* Legacy / link banner */}
      {!campaign.folderPath && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <AlertTriangle size={14} color="#f59e0b" />
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(245,158,11,0.9)', flex: 1 }}>
            Esta campanha não tem arquivos na wiki ainda.
          </p>
          <button
            className="cm-link-btn"
            disabled={linkingId === campaign.id}
            onClick={() => linkCampaignToWiki(campaign)}
          >
            <Link2 size={10} />
            {linkingId === campaign.id ? 'Vinculando...' : 'Vincular à Wiki'}
          </button>
        </div>
      )}

      {/* Wiki file indicator */}
      {campaign.overviewPath && (
        <div className="cm-wiki-file-bar">
          <FileText size={12} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign.overviewPath}
          </span>
          <button
            className="cm-wiki-btn"
            onClick={() => openInWiki(campaign.overviewPath!)}
            title="Abrir na Wiki com editor rico"
          >
            <ExternalLink size={10} /> Abrir na Wiki
          </button>
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.6)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
          Sinopse & Background
        </label>
        <WikiLinkedTextarea
          key={`overview-${campaign.id}-${campaign.overviewPath}`}
          filePath={campaign.overviewPath}
          fallbackValue={campaign.description}
          onFallbackChange={(val: string) => upd({ description: val })}
          placeholder="Escreva o resumo, premissa, tom e metas desta campanha..."
          minHeight="220px"
        />
      </div>

      {/* Quick summary cards */}
      {campaign.arcs && campaign.arcs.length > 0 && (
        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.6)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
            Arcos em Andamento
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {campaign.arcs.filter((a: any) => a.status === 'active').map((arc: any) => (
              <div key={arc.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', background: 'rgba(56,189,248,0.07)',
                border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px'
              }}>
                <Flag size={12} color="#38bdf8" />
                <span style={{ fontSize: '0.82rem', color: '#7dd3fc', fontWeight: 600, flex: 1 }}>{arc.name}</span>
                {arc.filePath && (
                  <button className="cm-wiki-btn" onClick={() => openInWiki(arc.filePath!)}>
                    <ExternalLink size={10} /> Wiki
                  </button>
                )}
              </div>
            ))}
            {campaign.arcs.filter((a: any) => a.status === 'active').length === 0 && (
              <p style={{ fontSize: '0.78rem', color: 'rgba(148,163,184,0.4)', fontStyle: 'italic' }}>Nenhum arco ativo no momento.</p>
            )}
          </div>
        </div>
      )}

      {/* Next session */}
      {campaign.sessions && campaign.sessions.length > 0 && (() => {
        const next = [...campaign.sessions]
          .filter((s: any) => s.status === 'upcoming')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        return next ? (
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.6)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
              Próxima Sessão
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: '10px'
            }}>
              <Clock size={18} color="#f59e0b" />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#fcd34d', fontSize: '0.9rem' }}>
                  {new Date(next.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                {next.summary && <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'rgba(148,163,184,0.7)' }}>{next.summary.substring(0, 120)}{next.summary.length > 120 ? '…' : ''}</p>}
              </div>
              {next.filePath && (
                <button className="cm-wiki-btn" onClick={() => openInWiki(next.filePath!)}>
                  <ExternalLink size={10} /> Wiki
                </button>
              )}
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
};
