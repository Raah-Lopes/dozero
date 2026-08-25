import React, { useMemo } from 'react';
import { GitBranch, Heart, Users, ArrowUp, ArrowDown, User, ExternalLink } from 'lucide-react';
import { buildGenealogyTree, type GenealogyMember } from '../../utils/genealogy';
import type { WikiEntry } from '../../services/wiki/WikiIndexer';
import { resolveMediaUrl } from '../../services/wiki/mediaResolver';

interface GenealogyTreeProps {
  currentEntry: WikiEntry;
  allEntries: WikiEntry[];
  onSelectPerson: (path: string) => void;
}

export const GenealogyTree: React.FC<GenealogyTreeProps> = ({ currentEntry, allEntries, onSelectPerson }) => {
  const tree = useMemo(() => {
    return buildGenealogyTree(currentEntry, allEntries);
  }, [currentEntry, allEntries]);

  if (tree.totalRelatives === 0) {
    return (
      <div style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px dashed var(--glass-border)',
        backgroundColor: 'rgba(0,0,0,0.2)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.84rem'
      }}>
        <GitBranch size={24} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
        <p style={{ margin: 0 }}>Nenhuma conexão genealógica ou de parentesco encontrada para este personagem.</p>
        <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
          Adicione conexões como <code>Pai de:: [[Nome]]</code>, <code>Filho de:: [[Nome]]</code> ou <code>Casado com:: [[Nome]]</code> no artigo ou no frontmatter.
        </span>
      </div>
    );
  }

  const renderCard = (member: GenealogyMember, isFocus = false) => {
    let avatarUrl = member.avatar;
    if (avatarUrl) {
      avatarUrl = avatarUrl.replace(/[[\]!]/g, '').split('|')[0].trim();
      if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:') && !avatarUrl.startsWith('/')) {
        avatarUrl = resolveMediaUrl(avatarUrl, 'D:/DOZERO/wikidozero');
      }
    }

    return (
      <div 
        key={member.id}
        onClick={() => {
          if (member.path && !isFocus) onSelectPerson(member.path);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          borderRadius: '8px',
          background: isFocus ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-secondary)',
          border: isFocus ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
          boxShadow: isFocus ? '0 0 16px rgba(168, 85, 247, 0.25)' : '0 4px 10px rgba(0,0,0,0.2)',
          cursor: member.path && !isFocus ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          minWidth: '170px',
          maxWidth: '240px',
          flex: '1 1 180px'
        }}
        className="genealogy-card hover-glow"
      >
        <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={member.name}
              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--glass-border)' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: isFocus ? 'var(--accent-primary)' : 'var(--bg-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isFocus ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--glass-border)'
            }}>
              <User size={18} />
            </div>
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'space-between' }}>
            <span style={{
              fontWeight: isFocus ? 800 : 600,
              color: isFocus ? 'var(--accent-primary)' : 'var(--text-primary)',
              fontSize: '0.82rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {member.name}
            </span>
            {member.path && !isFocus && (
              <ExternalLink size={12} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <span style={{
              fontSize: '0.68rem',
              color: isFocus ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: 500
            }}>
              {member.relationToFocus}
            </span>
            {member.status && (
              <span style={{
                fontSize: '0.62rem',
                padding: '0 4px',
                borderRadius: '3px',
                backgroundColor: member.status.toLowerCase().includes('mort') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                color: member.status.toLowerCase().includes('mort') ? '#f87171' : '#34d399'
              }}>
                {member.status}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderRadius: '10px',
      border: '1px solid var(--glass-border)',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranch size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Árvore Genealógica & Parentescos ({tree.totalRelatives})
          </span>
        </div>
      </div>

      {/* 1. GERAÇÃO SUPERIOR: Pais e Ancestrais */}
      {tree.ancestors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            <ArrowUp size={12} color="var(--accent-primary)" /> Pais & Ancestrais
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tree.ancestors.map(a => renderCard(a))}
          </div>
          <div style={{ width: '2px', height: '12px', backgroundColor: 'var(--glass-border)', margin: '0 auto' }} />
        </div>
      )}

      {/* 2. GERAÇÃO ATUAL: Foco + Cônjuges + Irmãos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
          <Users size={12} color="#c084fc" /> Geração Atual (Foco, Cônjuges & Irmãos)
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          {renderCard(tree.focus, true)}

          {tree.spouses.map(spouse => (
            <React.Fragment key={spouse.id}>
              <div style={{ display: 'flex', alignItems: 'center', color: '#fb7185' }}>
                <Heart size={16} fill="#fb7185" />
              </div>
              {renderCard(spouse)}
            </React.Fragment>
          ))}
        </div>

        {tree.siblings.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Irmãos e Irmãs:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tree.siblings.map(s => renderCard(s))}
            </div>
          </div>
        )}
      </div>

      {/* 3. GERAÇÃO INFERIOR: Filhos e Descendentes */}
      {tree.descendants.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          <div style={{ width: '2px', height: '12px', backgroundColor: 'var(--glass-border)', margin: '0 auto' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            <ArrowDown size={12} color="#34d399" /> Filhos & Descendentes
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tree.descendants.map(d => renderCard(d))}
          </div>
        </div>
      )}
    </div>
  );
};
