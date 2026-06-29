import React, { useRef, useState } from 'react';
import { AlertTriangle, Link2, FileText, ExternalLink, Flag, Clock, ImagePlus, Loader2 } from 'lucide-react';
import type { CampaignTabProps } from './types';
import { LegacyBadge } from './Shared';
import { WikiLinkedTextarea } from './Shared';
import { getWikiConfig } from '../../../../store';

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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';

      // Read and resize image to 1400px wide max
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = ev => res(ev.target?.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const img = new Image();
      await new Promise<void>(res => { img.onload = () => res(); img.src = dataUrl; });
      const canvas = document.createElement('canvas');
      const maxW = 1400;
      const ratio = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const webpBase64 = canvas.toDataURL('image/webp', 0.85);

      const safeName = campaign.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `capa_${safeName}.webp`;

      const res = await fetch('/api/wiki/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, filename, base64: webpBase64 }),
      });
      const data = await res.json();
      if (data.url) {
        upd({ imageUrl: data.url });
      }
    } catch (err) {
      console.error('Erro ao fazer upload da capa:', err);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease-out' }}>

      {/* ─── Campaign Cover Image ─── */}
      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', minHeight: '120px' }}>
        {campaign.imageUrl ? (
          <div style={{ position: 'relative' }}>
            <img
              src={campaign.imageUrl}
              alt="Capa da Campanha"
              style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block', borderRadius: '12px' }}
            />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '12px',
              background: 'linear-gradient(to top, rgba(2,6,23,0.8) 0%, transparent 60%)',
            }} />
            <label
              title="Trocar imagem de capa"
              style={{
                position: 'absolute', bottom: '10px', right: '10px', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
                fontFamily: 'var(--font-display)', background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', transition: 'all 0.2s',
              }}
            >
              <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} />
              {uploadingCover ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={11} />}
              {uploadingCover ? 'Enviando...' : 'Trocar Capa'}
            </label>
          </div>
        ) : (
          <label
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '8px', height: '120px', borderRadius: '12px', cursor: 'pointer',
              background: 'rgba(168,85,247,0.05)', border: '1px dashed rgba(168,85,247,0.3)',
              color: 'rgba(168,85,247,0.7)', transition: 'all 0.2s',
            }}
          >
            <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} />
            {uploadingCover
              ? <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              : <ImagePlus size={24} />}
            <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {uploadingCover ? 'Enviando capa...' : 'Adicionar Imagem de Capa'}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(168,85,247,0.5)' }}>
              Salva automaticamente na pasta ANEXOS da Wiki
            </span>
          </label>
        )}
      </div>

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
          Sinopse &amp; Background
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
