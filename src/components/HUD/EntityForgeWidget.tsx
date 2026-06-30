import React, { useState } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { useWiki } from '../../hooks/useWiki';
import { loadMarkdownFile } from '../../utils/githubApi';
import { addTokenFromMarkdown } from '../../store';
import { Anvil, Search, FileText } from 'lucide-react';
import * as yaml from 'js-yaml';

export const EntityForgeWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
        alert("O arquivo não tem formato Frontmatter válido.");
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
        ...data,
        name: data.nome || data.titulo || (entry?.slug) || path.split('/').pop()?.replace('.md', '') || 'Desconhecido',
        hp: data.HP || data.pv || 100,
        maxHp: data.HP_max || data.pv_max || data.HP || data.pv || 100,
        mana: data.PM || data.mana || 50,
        maxMana: data.PM_max || data.mana_max || data.PM || data.mana || 50,
        hunger: Number(data.fome || data.Fome || 0),
        thirst: Number(data.sede || data.Sede || 0),
        sanity: Number(data.sanidade || data.Sanidade || 100),
        imageUrl: data.imageUrl || data.avatar || data.imagem || '/vite.svg',
        isPlayer,
        wikiSlug
      };

      addTokenFromMarkdown(tokenData);
    } catch (e) {
      console.error("Erro ao forjar entidade:", e);
      alert("Falha ao ler ou extrair metadados da entidade.");
    }
  };

  return (
    <DraggableWindow id="entity-forge" title="Forja de Entidades" initialX={window.innerWidth / 2 - 300} initialY={100} width={600} height={500} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.2rem', color: 'var(--text-primary)', height: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          <Anvil size={24} color="var(--accent-primary)" />
          <h3 style={{ margin: 0, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Forja do Mestre</h3>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
          Pesquise qualquer NPC ou Monstro do seu cofre Obsidian e materialize-o na mesa como um Token reativo.
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Pesquisar por nome ou pasta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', fontSize: '0.9rem' }}
          />
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', right: '12px', top: '12px' }} />
        </div>

        {/* Entity List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
          {isLoading && <span style={{ color: 'var(--text-secondary)' }}>Lendo o cofre...</span>}
          
          {!isLoading && filteredEntities.map(entity => (
            <div key={entity.slug} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--accent-primary)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{entity.metadata.titulo || entity.slug}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{entity.path}</span>
                </div>
              </div>
              <button
                onClick={() => handleSpawn(entity.path)}
                style={{
                  padding: '0.4rem 0.8rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px',
                  color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'
                }}
              >
                EVOCAR
              </button>
            </div>
          ))}

          {!isLoading && filteredEntities.length === 0 && (
            <span style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>Nenhuma entidade encontrada.</span>
          )}
        </div>
      </div>
    </DraggableWindow>
  );
};
