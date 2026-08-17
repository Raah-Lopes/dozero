// src/components/Theater/VisualNovelOverlay.tsx
import React, { useState, useEffect, useRef } from 'react';
import { state } from '../../store';
import { getTheaterState, closeActiveDialogue, advanceDialogueScript, type TheaterDialogue, type DialogueChoice } from '../../store/theater';
import { useCastData } from './hooks/useCastData';
import { pushChatMessage } from '../../store';
import { X, ChevronRight, Sparkles, CheckCircle, Scroll, FastForward } from 'lucide-react';

const EMOTION_COLORS: Record<string, string> = {
  neutral: '#94a3b8',
  fury: '#ef4444',
  mystic: '#a855f7',
  panic: '#f59e0b',
  joy: '#10b981',
  solemn: '#3b82f6'
};

export const VisualNovelOverlay: React.FC = () => {
  const [activeDialogue, setActiveDialogue] = useState<TheaterDialogue | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const { members } = useCastData();
  
  const typingTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Som sutil de digitação via Web Audio API
  const playTypeBlip = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
        return;
      }
      if (ctx.state !== 'running') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 + Math.random() * 80, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {}
  };

  // Observar sincronização de diálogo ativo do Yjs
  useEffect(() => {
    const handleTheaterChange = () => {
      const thState = getTheaterState();
      const dialogue = thState.activeDialogue || null;
      if (
        dialogue?.id !== activeDialogue?.id || 
        dialogue?.currentStepIndex !== activeDialogue?.currentStepIndex ||
        dialogue?.text !== activeDialogue?.text
      ) {
        if (dialogue) {
          triggerDialogue(dialogue);
        } else {
          setActiveDialogue(null);
        }
      }
    };

    handleTheaterChange();
    state.theater.observe(handleTheaterChange);
    return () => state.theater.unobserve(handleTheaterChange);
  }, [activeDialogue?.id, activeDialogue?.currentStepIndex, activeDialogue?.text]);

  // Atalhos de Teclado (ESC para fechar, Espaço ou Enter para avançar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeDialogue) return;
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (isTyping) {
          if (typingTimerRef.current) clearInterval(typingTimerRef.current);
          setDisplayedText(activeDialogue.text);
          setIsTyping(false);
        } else if (!activeDialogue.choices || activeDialogue.choices.length === 0) {
          if (activeDialogue.steps && activeDialogue.steps.length > 1) {
            advanceDialogueScript();
          } else {
            handleClose();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDialogue, isTyping]);

  const triggerDialogue = (dialogue: TheaterDialogue) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    setActiveDialogue(dialogue);
    setDisplayedText('');
    setIsTyping(true);
    setSelectedChoiceId(null);

    let i = 0;
    const fullText = dialogue.text || '';
    
    typingTimerRef.current = window.setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.substring(0, i + 1));
        if (i % 3 === 0) playTypeBlip();
        i++;
      } else {
        setIsTyping(false);
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      }
    }, 22); // 22ms por caractere para leitura cinematográfica
  };

  const handleSkipOrClick = (e: React.MouseEvent) => {
    // Se clicar em um botão interativo, não interceptar
    if ((e.target as HTMLElement).closest('.vn-choice-btn, .vn-box-close-btn, .vn-close-btn, .vn-next-step-btn')) return;

    if (isTyping && activeDialogue) {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setDisplayedText(activeDialogue.text);
      setIsTyping(false);
      return;
    }

    // Se já terminou de digitar e não há escolhas pendentes:
    if (!activeDialogue?.choices || activeDialogue.choices.length === 0) {
      if (activeDialogue?.steps && activeDialogue.steps.length > 1) {
        advanceDialogueScript();
      } else {
        handleClose();
      }
    }
  };

  const handleChoiceSelect = (choice: DialogueChoice) => {
    setSelectedChoiceId(choice.id);
    const speaker = activeDialogue?.speakerName || 'Narrador';
    pushChatMessage(`💬 [Escolha]: Em resposta a **${speaker}**, foi escolhido: "*${choice.label}*"`);
    
    if (choice.outcomeText) {
      // Se houver resposta direta configurada
      setDisplayedText(`“${choice.outcomeText}”`);
      setTimeout(() => {
        if (activeDialogue?.steps && activeDialogue.steps.length > 1) {
          advanceDialogueScript();
        } else {
          handleClose();
        }
      }, 2200);
    } else {
      setTimeout(() => {
        if (activeDialogue?.steps && activeDialogue.steps.length > 1) {
          advanceDialogueScript();
        } else {
          handleClose();
        }
      }, 450);
    }
  };

  const handleClose = () => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setActiveDialogue(null);
    closeActiveDialogue();
  };

  if (!activeDialogue) return null;

  const speakerName = activeDialogue.speakerName || 'Desconhecido';
  const speakerTitle = activeDialogue.speakerTitle;
  const emotion = activeDialogue.emotion || 'neutral';
  const accentColor = EMOTION_COLORS[emotion] || '#94a3b8';
  
  // Tentar encontrar avatar correspondente se não informado
  let avatarUrl = activeDialogue.speakerAvatar;
  if (!avatarUrl) {
    const member = members.find((m: any) => 
      m.nome.toLowerCase() === speakerName.toLowerCase() || 
      m.nome.toLowerCase().includes(speakerName.toLowerCase())
    );
    avatarUrl = member?.avatar || null;
  }

  return (
    <div className="vn-overlay animate-fade-in" onClick={handleSkipOrClick}>
      
      {/* Botão Global de Fechar no topo */}
      <button 
        className="vn-close-btn"
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        title="Fechar diálogo (ESC)"
      >
        <X size={18} />
      </button>

      <div className="vn-container animate-scale-up" onClick={(e) => e.stopPropagation()}>
        
        {/* Retrato do Personagem com Efeito Glow */}
        {avatarUrl && (
          <div className="vn-portrait-wrapper animate-slide-up">
            <img 
              loading="lazy" 
              decoding="async" 
              src={avatarUrl} 
              alt={speakerName} 
              className="vn-portrait"
              style={{
                boxShadow: `0 0 35px ${accentColor}44`,
                borderColor: `${accentColor}88`
              }} 
            />
            <div 
              className="vn-portrait-glow"
              style={{ background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)` }}
            />
          </div>
        )}

        {/* Caixa de Diálogo Central Glassmorphism */}
        <div 
          className="vn-dialog-box animate-fade-in-up"
          style={{ borderLeftColor: accentColor }}
          onClick={handleSkipOrClick}
        >
          {/* Botão de Fechar direto na Caixa */}
          <button 
            className="vn-box-close-btn"
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            title="Fechar Diálogo (ESC)"
          >
            <X size={15} />
          </button>

          {/* Header do Personagem & Progresso do Roteiro */}
          <div className="vn-speaker-header">
            <span 
              className="vn-speaker-badge"
              style={{ borderColor: `${accentColor}88`, color: accentColor }}
            >
              <Sparkles size={12} /> {speakerName}
            </span>
            {speakerTitle && (
              <span className="vn-speaker-title">
                {speakerTitle}
              </span>
            )}
            {activeDialogue.steps && activeDialogue.steps.length > 1 && (
              <span className="vn-script-progress-badge">
                <Scroll size={11} /> {activeDialogue.scriptTitle || 'Roteiro'} • {(activeDialogue.currentStepIndex ?? 0) + 1}/{activeDialogue.totalSteps || activeDialogue.steps.length}
              </span>
            )}
          </div>

          {/* Texto com Typewriter */}
          <div className="vn-dialog-text">
            “{displayedText}”
            {isTyping && <span className="vn-cursor" style={{ backgroundColor: accentColor }}></span>}
          </div>

          {/* Opções de Escolha do Jogador */}
          {activeDialogue.choices && activeDialogue.choices.length > 0 && !isTyping && (
            <div className="vn-choices-container animate-fade-in">
              <span className="vn-choices-title">Faça sua escolha:</span>
              <div className="vn-choices-grid">
                {activeDialogue.choices.map((choice, idx) => {
                  const isSelected = selectedChoiceId === choice.id;
                  return (
                    <button
                      key={choice.id}
                      className={`vn-choice-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleChoiceSelect(choice)}
                    >
                      <span className="vn-choice-num">{idx + 1}</span>
                      <span className="vn-choice-text">{choice.label}</span>
                      {isSelected ? <CheckCircle size={16} /> : <ChevronRight size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rodapé com Dica e Botão de Avançar */}
          <div className="vn-footer-bar">
            <div className="vn-footer-hint">
              {isTyping 
                ? 'Clique para completar o texto' 
                : (activeDialogue.choices?.length 
                    ? 'Selecione uma opção acima' 
                    : (activeDialogue.steps && activeDialogue.steps.length > 1
                        ? 'Clique na tela ou em Avançar' 
                        : 'Clique para fechar (ou ESC)'))}
            </div>

            {activeDialogue.steps && activeDialogue.steps.length > 1 && !isTyping && (!activeDialogue.choices || activeDialogue.choices.length === 0) && (
              <button 
                className="vn-next-step-btn"
                onClick={(e) => { e.stopPropagation(); advanceDialogueScript(); }}
              >
                <span>{(activeDialogue.currentStepIndex ?? 0) + 1 < activeDialogue.steps.length ? 'Avançar' : 'Concluir'}</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

