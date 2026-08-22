import React, { useState } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { useWiki } from '../../../hooks/useWiki';
import { loadMarkdownFile } from '../../../utils/githubApi';
import { addTokenFromMarkdown } from '../../../store';
import { Anvil, Search, FileText } from 'lucide-react';
import * as yaml from 'js-yaml';
import { toast } from '../../UI/Toast';

export const EntityForgeWidget: React.FC<{ onClose?: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
  const { index, isLoading } = useWiki();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar monstros, NPCs ou qualquer personagem baseado no tipo do YAML ou caminho da pasta
  const filteredEntities = index.filter(e => {
    const tipo = String(e.metadata?.tipo || '').toLowerCase();
    const status = String(e.metadata?.status || '').toLowerCase();
    const path = e.path.toLowerCase();
    
    // Ignorar arquivos modelo
    if (path.includes('_modelo')) return false;

    // Verificar se é uma ficha de personagem por tipo, status ou caminho
    const isChar = ['pc', 'npc', 'monstro', 'personagem', 'jogador', 'inimigo'].includes(tipo) ||
                   ['jogador', 'npc', 'inimigo'].includes(status) ||
                   path.includes('/fichas/') ||
                   path.includes('/personagens/') ||
                   path.includes('fichas/') ||
                   path.includes('personagens/');

    if (!isChar) return false;

    const nome = String(e.metadata?.nome || e.metadata?.titulo || e.slug || '');
    const matchesSearch = path.includes(searchTerm.toLowerCase()) || nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleSpawn = async (path: string) => {
    try {
      const rawMd = await loadMarkdownFile(path);
      if (!rawMd) return;
      const parts = rawMd.split('---');
      if (parts.length < 3) {
        toast.warn("O arquivo não tem formato Frontmatter válido.");
        return;
      }

      const frontmatterStr = parts[1];
      const data = yaml.load(frontmatterStr) as any;

      if (!data) return;

      const tipo = String(data.tipo || '').toLowerCase();
      const status = String(data.status || '').toLowerCase();
      const isPlayer = ['pc', 'personagem', 'jogador'].includes(tipo) || status === 'jogador' || path.toLowerCase().includes('/jogadores/');

      const entry = index.find(e => e.path === path);
      const wikiSlug = entry?.slug;

      const tokenData = {
        name: data.nome || data.titulo || data.name || 'Nova Entidade',
        img: data.avatar || data.imagem || (isPlayer ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' : 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150'),
        hp: Number(data.hp || data.vida || (isPlayer ? 20 : 10)),
        maxHp: Number(data.maxHp || data.hp_max || data.vida_max || (isPlayer ? 20 : 10)),
        mana: Number(data.mana || data.mp || 0),
        maxMana: Number(data.maxMana || data.mp_max || 0),
        type: isPlayer ? 'player' as const : 'npc' as const,
        category: (data.categoria || tipo || 'Geral') as string,
        stats: data.atributos || {},
        sourceMarkdownPath: path,
        wikiSlug: wikiSlug
      };

      addTokenFromMarkdown(tokenData);
      toast.success(`Token "${tokenData.name}" evocado para o mapa!`);
    } catch (e: any) {
      toast.error(`Erro ao invocar token: ${e?.message || e}`);
    }
  };

  const bodyContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '14px', boxSizing: 'border-box', color: 'var(--text-primary)' }}>
      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
        <input 
          type="text" 
          placeholder="Buscar monstro, NPC ou ficha..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px 8px 34px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Lista de Entidades */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>Carregando compêndio...</div>
        ) : filteredEntities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>Nenhuma ficha de criatura/NPC encontrada na Wiki.</div>
        ) : (
          filteredEntities.map((e, idx) => {
            const nome = e.metadata?.nome || e.metadata?.titulo || e.slug;
            const tipo = e.metadata?.tipo || 'Entidade';
            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <FileText size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{nome}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tipo}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSpawn(e.path)}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--accent-primary)',
                    color: '#000',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  Evocar
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <DraggableWindow id="entity-forge" widgetKey="entityForge" title="Forja de Entidades (Wiki)" onClose={onClose} width={360} height={480} initialX={100} initialY={100}>
      {bodyContent}
    </DraggableWindow>
  );
};
