// src/components/Theater/HeroBadge.tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CastMember } from './hooks/useCastData';
import { useSceneState } from './hooks/useSceneState';
import { 
  updateHeroCardPosition, updateHeroCardScale, setHeroCustomStatus, 
  toggleCastCondition 
} from '../../store/theater';
import { 
  MessageSquare, Sparkles, Heart, Shield, Dice5, Eye, 
  Flame, Skull, Moon, RotateCcw, Check, ChevronRight,
  Maximize2, Minimize2, Move, User
} from 'lucide-react';
import { pushChatMessage, addTheaterDiaryEntry } from '../../store';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';

interface Props {
  member: CastMember;
  index: number;
}

export const HeroBadge: React.FC<Props> = ({ member, index }) => {
  const { 
    selectedCastMemberId, setSelectedCastMemberId, 
    castConditions, setActiveNpc,
    heroCardPositions, heroCardScales, heroCardCustomStatus
  } = useSceneState();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-posicionar o menu de contexto garantindo que NUNCA vaze da janela visível
  useEffect(() => {
    if (!contextMenu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const pad = 12;
    let adjustedX = contextMenu.x;
    let adjustedY = contextMenu.y;

    // Se vazar para a direita da tela, puxa para a esquerda
    if (adjustedX + rect.width > window.innerWidth - pad) {
      adjustedX = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    // Se vazar para baixo da tela, puxa para cima
    if (adjustedY + rect.height > window.innerHeight - pad) {
      adjustedY = Math.max(pad, window.innerHeight - rect.height - pad);
    }
    // Margem mínima do topo e esquerda
    if (adjustedX < pad) adjustedX = pad;
    if (adjustedY < pad) adjustedY = pad;

    if (adjustedX !== contextMenu.x || adjustedY !== contextMenu.y) {
      setContextMenu({ x: adjustedX, y: adjustedY });
    }
  }, [contextMenu?.x, contextMenu?.y]);

  const isSelected = selectedCastMemberId === member.caminhoArquivo;
  const scale = heroCardScales[member.caminhoArquivo] || 'small';
  const customStatus = heroCardCustomStatus[member.caminhoArquivo] || 'alive';
  const customPos = heroCardPositions[member.caminhoArquivo] || null;

  const hp = member.pv;
  const maxHp = member.pv_max || 1;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 100;

  // Determinar estado vital
  const isDead = customStatus === 'dead' || hp <= 0;
  const isUnconscious = customStatus === 'unconscious' || (hp <= 0 && customStatus !== 'dead');
  
  // Condições
  const conditions = castConditions[member.caminhoArquivo] || [];
  const isPoisoned = conditions.includes('poisoned');
  const isBurning = conditions.includes('burning');
  const isShielded = conditions.includes('shielded');
  const isInspired = conditions.includes('inspired');

  // Fechar menu de contexto ao clicar fora ou apertar Esc
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.theater-hero-context-menu')) return;
      setContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Drag & drop ultra suave (distingue clique simples de arraste por distância)
  const stageRectRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });
  const currentPosRef = useRef<{ x: number; y: number } | null>(customPos);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);
  const isMouseDownRef = useRef<boolean>(false);

  useEffect(() => {
    currentPosRef.current = customPos;
  }, [customPos]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Se for clique direito ou dentro do menu de contexto ou botões rápidos, ignorar drag
    if (e.button !== 0 || (e.target as HTMLElement).closest('.theater-hero-context-menu') || (e.target as HTMLElement).closest('.vhc-quick-bar')) return;
    
    isMouseDownRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;

    const stageEl = document.querySelector('.theater-stage-content');
    const stageRect = stageEl ? stageEl.getBoundingClientRect() : { left: 0, top: 0 };
    stageRectRef.current = { left: stageRect.left, top: stageRect.top };

    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      // SÓ move se o usuário estiver SEGURANDO o botão do mouse sobre o card
      if (!isMouseDownRef.current) return;

      const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
      if (dist > 8) {
        hasMovedRef.current = true;
      }

      if (!hasMovedRef.current) return;
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        const stageLeft = stageRectRef.current.left;
        const stageTop = stageRectRef.current.top;
        const newX = Math.max(10, Math.min(window.innerWidth - 180, e.clientX - stageLeft - dragOffset.x));
        const newY = Math.max(10, Math.min(window.innerHeight - 220, e.clientY - stageTop - dragOffset.y));
        
        currentPosRef.current = { x: newX, y: newY };
        if (cardRef.current) {
          cardRef.current.style.bottom = 'auto';
          cardRef.current.style.left = `${newX}px`;
          cardRef.current.style.top = `${newY}px`;
        }
      });
    };

    const handleMouseUp = () => {
      if (!isMouseDownRef.current) return;
      isMouseDownRef.current = false;

      if (rafId) cancelAnimationFrame(rafId);
      if (hasMovedRef.current && currentPosRef.current) {
        updateHeroCardPosition(member.caminhoArquivo, currentPosRef.current);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragOffset, member.caminhoArquivo]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const posX = Math.max(10, Math.min(e.clientX, window.innerWidth - 270));
    const posY = Math.max(10, Math.min(e.clientY, window.innerHeight - 420));
    setContextMenu({ x: posX, y: posY });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Se o usuário arrastou o card, não conta como clique
    if (hasMovedRef.current) return;
    e.stopPropagation();
    setSelectedCastMemberId(isSelected ? '' : member.caminhoArquivo);
  };

  const handleSpotlight = () => {
    setActiveNpc({
      name: member.nome,
      imageUrl: member.avatar || undefined,
      subtitle: member.classe || 'Herói do Grupo',
      type: 'hero'
    });
    setContextMenu(null);
  };

  const handleOpenDialogue = () => {
    window.dispatchEvent(new CustomEvent('theater-open-dialogue-studio', {
      detail: {
        speakerName: member.nome,
        speakerTitle: member.classe || 'Herói',
        speakerAvatar: member.avatar || ''
      }
    }));
    setContextMenu(null);
  };

  const handleAdjustHp = async (delta: number) => {
    const next = Math.max(0, hp + delta);
    await syncTokenFieldToWiki(member.caminhoArquivo, 'hp', next);
    const signal = delta > 0 ? '+' : '';
    const msg = `${delta > 0 ? '💚' : '💔'} ${member.nome}: ${signal}${delta} PV (Agora: ${next}/${maxHp})`;
    pushChatMessage(msg, false, delta < 0);
    addTheaterDiaryEntry({ timestamp: Date.now(), type: 'combat', text: msg });
  };

  const handleSetScale = (newScale: 'small' | 'medium' | 'large') => {
    updateHeroCardScale(member.caminhoArquivo, newScale);
    setContextMenu(null);
  };

  const handleToggleStatus = (status: 'alive' | 'unconscious' | 'dead') => {
    const next = customStatus === status ? 'alive' : status;
    setHeroCustomStatus(member.caminhoArquivo, next);
    setContextMenu(null);
  };

  const handleResetPosition = () => {
    updateHeroCardPosition(member.caminhoArquivo, null);
    if (cardRef.current) {
      cardRef.current.style.top = 'auto';
    }
    setContextMenu(null);
  };

  // Posicionamento absoluto no palco com fallback automático no rodapé
  const defaultSpacing = scale === 'large' ? 225 : scale === 'medium' ? 175 : 135;
  const defaultLeft = 24 + index * defaultSpacing;
  
  const cardStyle: React.CSSProperties = customPos ? {
    position: 'absolute',
    left: `${customPos.x}px`,
    top: `${customPos.y}px`,
    bottom: 'auto',
    zIndex: isDragging ? 100 : (isSelected ? 45 : 35),
    pointerEvents: 'auto'
  } : {
    position: 'absolute',
    left: `${defaultLeft}px`,
    bottom: '20px',
    top: 'auto',
    zIndex: isSelected ? 45 : 35,
    pointerEvents: 'auto'
  };

  return (
    <>
      <div 
        ref={cardRef}
        className={`vintage-hero-card scale-${scale} ${isSelected ? 'selected' : ''} ${isDead ? 'status-dead' : (isUnconscious ? 'status-unconscious' : '')} ${isPoisoned ? 'status-poisoned' : ''}`}
        style={cardStyle}
        draggable={false}
        onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseDown={handleMouseDown}
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
      >
        {/* Moldura Antiga de Pergaminho e Metal */}
        <div className="vhc-frame">
          
          {/* Header do Card (Nome & Classe) */}
          <div className="vhc-header">
            <span className="vhc-name" title={member.nome}>{member.nome}</span>
            <span className="vhc-class">{member.classe || 'Herói'}</span>
          </div>

          {/* Arte do Personagem com Efeitos */}
          <div className="vhc-art-wrapper">
            {member.avatar ? (
              <img 
                loading="lazy" 
                decoding="async" 
                src={member.avatar} 
                alt={member.nome} 
                className="vhc-art"
                draggable={false}
                onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
              />
            ) : (
              <div className="vhc-art-fallback">
                <User size={36} />
              </div>
            )}

            {/* Overlays de Condição e Status */}
            {isDead && (
              <div className="vhc-overlay-dead animate-fade-in">
                <Skull size={44} className="vhc-icon-skull" />
                <span className="vhc-status-ribbon red">ABATIDO</span>
              </div>
            )}

            {!isDead && isUnconscious && (
              <div className="vhc-overlay-unconscious animate-fade-in">
                <Moon size={38} className="vhc-icon-unconscious" />
                <span className="vhc-status-ribbon amber">DESACORDADO</span>
              </div>
            )}

            {isPoisoned && (
              <div className="vhc-poison-badge" title="Envenenado">
                🧪
              </div>
            )}

            {isBurning && (
              <div className="vhc-burning-badge" title="Queimando">
                🔥
              </div>
            )}

            {isShielded && (
              <div className="vhc-shielded-badge" title="Protegido">
                🛡️
              </div>
            )}
          </div>

          {/* Barra de Vida & Estatísticas Clássicas */}
          <div className="vhc-footer">
            <div className="vhc-hp-row">
              <span className="vhc-hp-label">PV</span>
              <div className="vhc-hp-track">
                <div 
                  className="vhc-hp-fill"
                  style={{ 
                    width: `${hpPct}%`,
                    backgroundColor: isDead ? '#ef4444' : (hpPct > 50 ? '#10b981' : hpPct > 25 ? '#f59e0b' : '#ef4444')
                  }}
                />
              </div>
              <span className="vhc-hp-text">{hp}/{maxHp}</span>
            </div>
          </div>

          {/* Barra de Ações Rápidas (Aparece no topo ao passar o mouse ou selecionar) */}
          <div className="vhc-quick-bar" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <button className="vhc-qbtn" onClick={handleSpotlight} title="👁️ Projetar no Palco (Spotlight)">
              <Eye size={12} color="#38bdf8" />
            </button>
            <button className="vhc-qbtn" onClick={handleOpenDialogue} title="💬 Abrir Diálogo Cinematográfico">
              <MessageSquare size={12} color="#c084fc" />
            </button>
            <button className="vhc-qbtn" onClick={() => handleAdjustHp(-5)} title="💔 Dano rápido (-5 PV)">
              <span style={{ color: '#f87171', fontWeight: 900, fontSize: '0.65rem' }}>-5</span>
            </button>
            <button className="vhc-qbtn" onClick={() => handleAdjustHp(5)} title="💚 Cura rápida (+5 PV)">
              <span style={{ color: '#4ade80', fontWeight: 900, fontSize: '0.65rem' }}>+5</span>
            </button>
          </div>

          {/* Dica de arraste sutil */}
          <div className="vhc-drag-handle" title="Clique e arraste para posicionar onde quiser">
            <Move size={10} />
          </div>

        </div>
      </div>

      {/* Menu de Contexto (Clique com o Botão Direito via Portal Global) */}
      {contextMenu && createPortal(
        <div 
          ref={menuRef}
          className="theater-hero-context-menu animate-scale-up"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="thcm-header">
            <span className="thcm-title">⚔️ {member.nome}</span>
            <span className="thcm-sub">{member.classe || 'Herói'}</span>
          </div>

          {/* Ações Principais */}
          <div className="thcm-group">
            <button className="thcm-item" onClick={handleSpotlight}>
              <Eye size={13} color="#38bdf8" /> Projetar no Palco (Spotlight)
            </button>
            <button className="thcm-item" onClick={handleOpenDialogue}>
              <MessageSquare size={13} color="#a855f7" /> Abrir Diálogo Cinematográfico
            </button>
            <button className="thcm-item" onClick={() => { setSelectedCastMemberId(member.caminhoArquivo); setContextMenu(null); }}>
              <Sparkles size={13} color="#f59e0b" /> Selecionar como Alvo Ativo
            </button>
          </div>

          {/* Ajuste Rápido de Vida */}
          <div className="thcm-group">
            <span className="thcm-group-label">Ajuste de PV ({hp}/{maxHp}):</span>
            <div className="thcm-hp-buttons">
              <button className="thcm-hp-btn red" onClick={() => handleAdjustHp(-10)}>-10</button>
              <button className="thcm-hp-btn red" onClick={() => handleAdjustHp(-5)}>-5</button>
              <button className="thcm-hp-btn red" onClick={() => handleAdjustHp(-1)}>-1</button>
              <button className="thcm-hp-btn green" onClick={() => handleAdjustHp(1)}>+1</button>
              <button className="thcm-hp-btn green" onClick={() => handleAdjustHp(5)}>+5</button>
              <button className="thcm-hp-btn green" onClick={() => handleAdjustHp(10)}>+10</button>
            </div>
          </div>

          {/* Condições e Filtros Visuais */}
          <div className="thcm-group">
            <span className="thcm-group-label">Condições & Estados:</span>
            <button 
              className={`thcm-item ${customStatus === 'dead' ? 'active' : ''}`}
              onClick={() => handleToggleStatus('dead')}
            >
              <Skull size={13} color="#ef4444" /> {customStatus === 'dead' ? '✓ Abatido / Morto (Filtro Vermelho)' : 'Marcar como Morto (Filtro Vermelho)'}
            </button>
            <button 
              className={`thcm-item ${customStatus === 'unconscious' ? 'active' : ''}`}
              onClick={() => handleToggleStatus('unconscious')}
            >
              <Moon size={13} color="#f59e0b" /> {customStatus === 'unconscious' ? '✓ Desacordado (Filtro Amarelo)' : 'Marcar como Desacordado (Filtro Amarelo)'}
            </button>
            <button 
              className={`thcm-item ${isPoisoned ? 'active' : ''}`}
              onClick={() => toggleCastCondition(member.caminhoArquivo, 'poisoned')}
            >
              <span>🧪</span> {isPoisoned ? '✓ Envenenado (Filtro Roxo)' : 'Aplicar Veneno (Filtro Roxo)'}
            </button>
            <button 
              className={`thcm-item ${isBurning ? 'active' : ''}`}
              onClick={() => toggleCastCondition(member.caminhoArquivo, 'burning')}
            >
              <span>🔥</span> {isBurning ? '✓ Queimando' : 'Aplicar Queimando'}
            </button>
            <button 
              className={`thcm-item ${isShielded ? 'active' : ''}`}
              onClick={() => toggleCastCondition(member.caminhoArquivo, 'shielded')}
            >
              <span>🛡️</span> {isShielded ? '✓ Protegido' : 'Aplicar Protegido'}
            </button>
          </div>

          {/* Tamanho do Card */}
          <div className="thcm-group">
            <span className="thcm-group-label">Tamanho do Card:</span>
            <div className="thcm-scale-buttons">
              <button className={`thcm-scale-btn ${scale === 'small' ? 'active' : ''}`} onClick={() => handleSetScale('small')}>
                Pequeno
              </button>
              <button className={`thcm-scale-btn ${scale === 'medium' ? 'active' : ''}`} onClick={() => handleSetScale('medium')}>
                Médio
              </button>
              <button className={`thcm-scale-btn ${scale === 'large' ? 'active' : ''}`} onClick={() => handleSetScale('large')}>
                Grande
              </button>
            </div>
          </div>

          {/* Redefinir Posição */}
          {customPos && (
            <div className="thcm-group">
              <button className="thcm-item" onClick={handleResetPosition}>
                <RotateCcw size={12} /> Redefinir Posição Padrão
              </button>
            </div>
          )}

        </div>,
        document.body
      )}
    </>
  );
};
