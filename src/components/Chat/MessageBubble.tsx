import React from 'react';
import { User, EyeOff, Copy } from 'lucide-react';
import { toggleMessageReaction } from '../../store/chat';
import { PollWidget } from './PollWidget';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { toast } from '../UI/Toast';
import { useCastData } from '../Theater/hooks/useCastData';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎲', '🔥'];

interface MessageBubbleProps {
  msg: any;
  playerName: string;
  isSelectMode: boolean;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  hoveredMsgId: string | null;
  setHoveredMsgId: (id: string | null) => void;
  setLightboxImg: (src: string | null) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg, playerName, isSelectMode, selectedIds, setSelectedIds,
  hoveredMsgId, setHoveredMsgId, setLightboxImg
}) => {
  const { members } = useCastData();
  const isSelected = selectedIds.has(msg.id);
  const isHovered = hoveredMsgId === msg.id;

  let display = msg.text || '';
  if (display.startsWith('[IMG]')) {
    const imgSrc = display.substring(5);
    display = `<img src="${imgSrc}" class="chat-image-clickable" style="max-width: 100%; max-height: 200px; border-radius: 8px; cursor: pointer; border: 1px solid var(--chat-border); object-fit: contain;" />`;
  } else {
    display = display.replace(/\[\[(.*?)\]\]/g, (_m: string, p1: string) => {
      const parts = p1.split('|');
      const searchName = parts[0].trim();
      const label = parts[1] ? parts[1].trim() : searchName;
      return `<span class="chat-wiki-link" data-searchname="${searchName}" style="color: var(--chat-accent); text-decoration: underline; cursor: pointer; font-weight: bold;">📜 ${label}</span>`;
    });
  }

  const autorMember = members.find((m: any) => m.nome === msg.autor || m.nome === msg.autor_alias);
  const avatarUrl = autorMember?.imagem || autorMember?.avatar;
  const autorName = msg.autor_alias || msg.autor || 'Anônimo';
  const reactions: Record<string, string[]> = msg.reactions || {};

  return (
    <div
      onMouseEnter={() => setHoveredMsgId(msg.id)}
      onMouseLeave={() => setHoveredMsgId(null)}
      style={{
        display: 'flex', gap: '8px', margin: '4px 0', padding: '6px 8px',
        background: isSelected ? 'rgba(168,85,247,0.2)' : msg.tipo === 'whisper' ? 'rgba(99,102,241,0.1)' : msg.tipo === 'sistema' ? 'rgba(0,0,0,0.2)' : 'transparent',
        borderLeft: msg.tipo === 'whisper' ? '3px solid #6366f1' : msg.tipo === 'me' ? '3px solid #ec4899' : 'none',
        borderRadius: '6px', cursor: isSelectMode ? 'pointer' : 'default',
        transition: 'background 0.15s', position: 'relative',
        maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden'
      }}
      onClick={() => {
        if (isSelectMode && msg.id) {
          const next = new Set(selectedIds);
          if (next.has(msg.id)) next.delete(msg.id);
          else next.add(msg.id);
          setSelectedIds(next);
        }
      }}
    >
      {/* AVATAR */}
      {msg.tipo !== 'sistema' && (
        avatarUrl ? (
          <img 
            loading="lazy" decoding="async"
            src={avatarUrl} alt={autorName}
            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--chat-border)' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--chat-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', color: msg.autor_color || 'var(--chat-accent)' }}>
            <User size={14} />
          </div>
        )
      )}

      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--chat-accent)', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="chat-author" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '4px' }}>
            {msg.tipo === 'whisper' ? <><EyeOff size={10} style={{ display: 'inline', marginRight: '3px' }} /> Sussurro para {msg.alvo}:</> : 
             msg.tipo === 'me' ? '' : 
             <strong style={{ color: msg.autor_color || 'inherit' }}>{autorName}</strong>}
          </span>
          <span style={{ color: 'var(--chat-text-secondary)', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(msg.text);
                toast.info('Mensagem copiada!');
              }} 
              title="Copiar mensagem"
              style={{ background: 'transparent', border: 'none', color: 'var(--chat-text-secondary)', cursor: 'pointer', padding: 0 }}
            >
              <Copy size={10} />
            </button>
          </span>
        </div>

        {msg.pollId ? (
          <PollWidget pollId={msg.pollId} playerName={playerName} />
        ) : (
          <div 
            style={{ fontSize: '0.83rem', fontStyle: msg.tipo === 'me' ? 'italic' : 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', color: msg.tipo === 'sistema' ? 'var(--chat-text-secondary)' : 'var(--chat-text-primary)' }} 
            dangerouslySetInnerHTML={{ __html: display }} 
            onClick={(e) => {
              if (isSelectMode) return;
              const target = e.target as HTMLElement;
              if (target.tagName === 'IMG' && target.classList.contains('chat-image-clickable')) {
                setLightboxImg((target as HTMLImageElement).src);
              } else if (target.tagName === 'SPAN' && target.classList.contains('chat-wiki-link')) {
                let filepath = target.getAttribute('data-filepath');
                const searchname = target.getAttribute('data-searchname');
                if (searchname && !filepath) {
                  WikiIndexer.buildIndex().then(index => {
                    const match = index.find(entry => entry.slug.toLowerCase() === searchname.toLowerCase());
                    if (match) {
                      window.dispatchEvent(new CustomEvent('open-wiki-doc', { detail: match.path }));
                    } else {
                      toast.info(`O documento "${searchname}" não foi encontrado na Wiki.`);
                    }
                  });
                } else if (filepath) {
                  window.dispatchEvent(new CustomEvent('open-wiki-doc', { detail: filepath }));
                }
              }
            }}
          />
        )}

        {/* EMOJI REAÇÕES ATIVAS */}
        {Object.keys(reactions).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
            {Object.entries(reactions).map(([emoji, users]) => {
              const hasReacted = users.includes(playerName);
              return (
                <button
                  key={emoji}
                  onClick={(e) => { e.stopPropagation(); msg.id && toggleMessageReaction(msg.id, emoji, playerName); }}
                  title={`${users.join(', ')} reagiu`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '2px', padding: '1px 5px', borderRadius: '10px',
                    background: hasReacted ? 'rgba(168,85,247,0.25)' : 'var(--chat-border)',
                    border: hasReacted ? '1px solid rgba(168,85,247,0.5)' : '1px solid transparent',
                    color: 'var(--chat-text-primary)', fontSize: '0.65rem', cursor: 'pointer'
                  }}
                >
                  <span>{emoji}</span>
                  <span style={{ fontSize: '0.6rem', color: hasReacted ? '#f0abfc' : 'var(--chat-text-secondary)' }}>{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* BARRA DE EMOJIS RÁPIDA NO HOVER */}
      {isHovered && msg.id && !isSelectMode && (
        <div style={{
          position: 'absolute', top: '-14px', right: '8px',
          background: 'var(--chat-bg-primary)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--chat-border)', borderRadius: '14px',
          padding: '2px 6px', display: 'flex', gap: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 10
        }}>
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={(e) => { e.stopPropagation(); toggleMessageReaction(msg.id, emoji, playerName); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '1px' }}
              title={`Reagir com ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
