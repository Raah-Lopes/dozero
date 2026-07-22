// src/components/Chat/MessageBubble.tsx
import React, { useState } from 'react';
import { EyeOff, User, Copy } from 'lucide-react';
import { toggleMessageReaction } from '../../store/chat';
import { toast } from '../UI/Toast';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎲', '🔥'];

interface MessageBubbleProps {
  msg: any;
  playerName: string;
  isHovered: boolean;
  setHoveredMsgId: (id: string | null) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  wikiDocs: { id: string; filepath: string }[];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  playerName,
  isHovered,
  setHoveredMsgId,
  isSelectMode,
  isSelected,
  selectedIds,
  setSelectedIds,
  wikiDocs
}) => {
  const autorName = msg.autor || 'Anônimo';
  const avatarUrl = msg.autor_avatar;
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
        maxWidth: '100%', boxSizing: 'border-box', overflow: 'visible',
        zIndex: isHovered ? 999 : 1
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

      <div style={{ flex: 1, minWidth: 0 }}>
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
              style={{ background: 'none', border: 'none', color: 'var(--chat-text-secondary)', cursor: 'pointer', padding: 0 }}
            >
              <Copy size={11} />
            </button>
          </span>
        </div>

        {/* CONTEÚDO DA MENSAGEM */}
        <div 
          style={{ fontSize: '0.8rem', wordBreak: 'break-word', color: msg.tipo === 'me' ? '#f472b6' : 'var(--chat-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: msg.text }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('wiki-link')) {
              const name = target.getAttribute('data-wiki-name');
              if (name) {
                const doc = wikiDocs.find(w => w.id.toLowerCase() === name.toLowerCase());
                const filepath = doc ? doc.filepath : null;
                if (!filepath) {
                  toast.error(`Doc Wiki "${name}" não encontrado.`);
                } else {
                  window.dispatchEvent(new CustomEvent('open-wiki-doc', { detail: filepath }));
                }
              }
            }
          }}
        />

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
          position: 'absolute', top: '-18px', right: '8px',
          background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(10px)',
          border: '1px solid var(--glass-border)', borderRadius: '16px',
          padding: '3px 8px', display: 'flex', gap: '6px', boxShadow: '0 6px 20px rgba(0,0,0,0.8)', zIndex: 99999
        }}>
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={(e) => { e.stopPropagation(); toggleMessageReaction(msg.id, emoji, playerName); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 4px', transition: 'transform 0.1s' }}
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
