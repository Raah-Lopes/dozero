import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { useWiki } from '../../../hooks/useWiki';
import { pushChatMessage, state } from '../../../store';
import { loadMarkdownFile } from '../../../utils/githubApi';
import { Sparkles, MessageCircle, ScrollText, BookOpen, ToyBrick } from 'lucide-react';

export const LoreMachineWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { index, isLoading } = useWiki();
  const [result, setResult] = useState<string | null>(null);
  const [dlcTemplates, setDlcTemplates] = useState<string[]>([]);
    const [activeMods, setActiveMods] = useState<string[]>([]);

  useEffect(() => {
    const observer = async () => {
      const active = [...(state.dlcs.get('active') as string[] || [])];
      setActiveMods(active);
      
      let allTemplates: string[] = [];
      if (active.includes('dlc_cyberpunk')) {
        try {
          const content = await loadMarkdownFile('DLCs/Cyberpunk.json');
          if (content) {
            const dlc = JSON.parse(content);
            if (dlc.loreTemplates) allTemplates = [...allTemplates, ...dlc.loreTemplates];
          }
        } catch(e) { console.error("Falha ao ler DLC", e); }
      }
      setDlcTemplates(allTemplates);
    };

    state.dlcs.observe(observer);
    observer();
    return () => state.dlcs.unobserve(observer);
  }, []);

  const getEntities = (keyword: string) => {
    return index.filter(e => e.path.toLowerCase().includes(keyword)).map(e => e.metadata.titulo || e.slug || 'Desconhecido');
  };

  const getRandom = (arr: string[]) => {
    if (arr.length === 0) return '???';
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const generateRumor = () => {
    const npcs = getEntities('npcs');
    const locais = getEntities('lugares');
    const itens = getEntities('itens');
    const monstros = getEntities('monstros');
    const faccoes = getEntities('faccoes');

    let baseTemplates = [
      `Dizem as más línguas que <b>\${npc}</b> foi visto rondando <b>\${local}</b> em busca de um tesouro proibido.`,
      `Tenha cuidado! A facção <b>\${faccao}</b> está recrutando mercenários para roubar <b>\${item}</b>.`,
      `Viajantes juram ter visto <b>\${monstro}</b> aterrorizando as estradas perto de <b>\${local}</b>.`,
      `Alguém pagou muito ouro para que <b>\${npc}</b> sumisse com <b>\${item}</b>, mas <b>\${faccao}</b> interveio!`,
      `Um culto nas sombras de <b>\${local}</b> acordou <b>\${monstro}</b>. E <b>\${npc}</b> foi o último a tentar impedi-los.`,
      `Há um leilão secreto em <b>\${local}</b>. O prêmio principal? <b>\${item}</b>! Todos querem, especialmente <b>\${npc}</b>.`
    ];

    if (dlcTemplates.length > 0) {
      baseTemplates = dlcTemplates.map(t => t
        .replace(/\[NPC\]/g, '<b>${npc}</b>')
        .replace(/\[Local\]/g, '<b>${local}</b>')
        .replace(/\[Facção\]/g, '<b>${faccao}</b>')
        .replace(/\[Item\]/g, '<b>${item}</b>')
        .replace(/\[Monstro\]/g, '<b>${monstro}</b>')
      );
    }

    const tpl = getRandom(baseTemplates);
    const hydrated = tpl
      .replace(/\$\{npc\}/g, getRandom(npcs))
      .replace(/\$\{local\}/g, getRandom(locais))
      .replace(/\$\{faccao\}/g, getRandom(faccoes))
      .replace(/\$\{item\}/g, getRandom(itens))
      .replace(/\$\{monstro\}/g, getRandom(monstros));

    setResult(hydrated);
  };

  const generateQuest = () => {
    const npcs = getEntities('npcs');
    const locais = getEntities('lugares');
    const itens = getEntities('itens');
    const monstros = getEntities('monstros');
    const faccoes = getEntities('faccoes');

    let baseTemplates = [
      `<b>Objetivo:</b> Recuperar <b>\${item}</b> das garras de <b>\${faccao}</b> antes que entreguem para <b>\${npc}</b> em <b>\${local}</b>.`,
      `<b>Escolta Perigosa:</b> <b>\${npc}</b> precisa de escolta até <b>\${local}</b>. O problema é que <b>\${monstro}</b> bloqueiam o caminho principal.`,
      `<b>Investigação:</b> O artefato <b>\${item}</b> desapareceu dos cofres. O principal suspeito é <b>\${npc}</b> que fugiu para <b>\${local}</b>.`,
      `<b>Resgate:</b> <b>\${npc}</b> foi capturado por <b>\${faccao}</b> e levado para o covil nas profundezas de <b>\${local}</b>.`
    ];

    if (dlcTemplates.length > 0) {
      baseTemplates = dlcTemplates.map(t => t
        .replace(/\[NPC\]/g, '<b>${npc}</b>')
        .replace(/\[Local\]/g, '<b>${local}</b>')
        .replace(/\[Facção\]/g, '<b>${faccao}</b>')
        .replace(/\[Item\]/g, '<b>${item}</b>')
        .replace(/\[Monstro\]/g, '<b>${monstro}</b>')
      );
    }

    const tpl = getRandom(baseTemplates);
    const hydrated = tpl
      .replace(/\$\{npc\}/g, getRandom(npcs))
      .replace(/\$\{local\}/g, getRandom(locais))
      .replace(/\$\{faccao\}/g, getRandom(faccoes))
      .replace(/\$\{item\}/g, getRandom(itens))
      .replace(/\$\{monstro\}/g, getRandom(monstros));

    setResult(hydrated);
  };

  const handleShare = () => {
    if (result) {
      pushChatMessage(`🔮 <b>A Máquina de Lores ecoa:</b><br/>${result}`, false, true);
    }
  };

  if (isLoading) {
    return (
      <DraggableWindow id="lore-machine" title="A Máquina de Lores" initialX={window.innerWidth / 2 - 200} initialY={100} width={400} height={200} onClose={onClose}>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Sincronizando os arquivos akáshicos...</div>
      </DraggableWindow>
    );
  }

  return (
    <DraggableWindow id="lore-machine" title="A Máquina de Lores" initialX={window.innerWidth / 2 - 225} initialY={100} width={450} height={320} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.2rem', color: 'var(--text-primary)', height: '100%' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <Sparkles size={32} color="var(--accent-primary)" style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--accent-primary)' }}>Gerador Procedural</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mapeia dados do Obsidian para criar sementes narrativas.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button 
            onClick={generateRumor}
            style={{ padding: '0.75rem', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#c4b5fd', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold' }}
          >
            <MessageCircle size={16} /> Gerar Rumor
          </button>
          
          <button 
            onClick={generateQuest}
            style={{ padding: '0.75rem', background: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(234, 179, 8, 0.4)', color: '#fde047', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold' }}
          >
            <ScrollText size={16} /> Missão (Quest)
          </button>
        </div>

        {/* Quadro de Resultado */}
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '1rem', position: 'relative', overflowY: 'auto' }}>
          {result ? (
            <div style={{ fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: result }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              Pressione um dos botões para gerar conteúdo.
            </div>
          )}
        </div>

        {/* Botão de Ação */}
        {result && (
          <button 
            onClick={handleShare}
            style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            <BookOpen size={14} /> Compartilhar no Chat Global
          </button>
        )}
      </div>
    </DraggableWindow>
  );
};
