import React, { useState, useEffect, useRef } from 'react';
import { state } from '../../store';
import { getTheaterState } from '../../store/theater';
import { useCastData } from './hooks/useCastData';

export const VisualNovelOverlay: React.FC = () => {
  const [activeMessage, setActiveMessage] = useState<any | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { members } = useCastData();
  const typingTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  // Read vnModeActive from theater store manually
  const [vnMode, setVnMode] = useState(false);

  useEffect(() => {
    const handleTheaterChange = () => {
      setVnMode(getTheaterState().vnModeActive || false);
    };
    handleTheaterChange();
    state.theater.observe(handleTheaterChange);
    return () => state.theater.unobserve(handleTheaterChange);
  }, []);

  useEffect(() => {
    const handleChat = (event: any) => {
      if (!vnMode) return;
      
      const changes = event.changes.added;
      if (changes && changes.size > 0) {
        // Obter a última mensagem inserida
        const arr = state.chat.toArray();
        if (arr.length > 0) {
          const lastMsg = arr[arr.length - 1] as any;
          // Mostrar apenas mensagens 'in-game' ou com 'autor_alias'
          if (lastMsg.tipo === 'in-game' || lastMsg.autor_alias || lastMsg.tipo === 'whisper') {
            triggerDialogue(lastMsg);
          }
        }
      }
    };
    state.chat.observe(handleChat);
    return () => state.chat.unobserve(handleChat);
  }, [vnMode]);

  const triggerDialogue = (msg: any) => {
    // Limpar timers anteriores
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    setActiveMessage(msg);
    setDisplayedText('');
    setIsTyping(true);

    let i = 0;
    const fullText = msg.texto || '';
    
    typingTimerRef.current = window.setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.substring(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        
        // Auto-close após 8 segundos
        closeTimerRef.current = window.setTimeout(() => {
          setActiveMessage(null);
        }, 8000);
      }
    }, 30); // 30ms per character
  };

  const handleSkipOrClose = () => {
    if (isTyping && activeMessage) {
      // Pular digitação
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setDisplayedText(activeMessage.texto);
      setIsTyping(false);
      
      closeTimerRef.current = window.setTimeout(() => {
        setActiveMessage(null);
      }, 8000);
    } else {
      // Fechar
      setActiveMessage(null);
    }
  };

  if (!vnMode || !activeMessage) return null;

  const speakerName = activeMessage.autor_alias || activeMessage.autor || 'Desconhecido';
  
  // Tentar achar um avatar correspondente no elenco
  const member = members.find((m: any) => 
    m.nome.toLowerCase() === speakerName.toLowerCase() || 
    m.nome.toLowerCase().includes(speakerName.toLowerCase())
  );
  
  const avatarUrl = member?.avatar || null;

  return (
    <div className="vn-overlay" onClick={handleSkipOrClose}>
      <div className="vn-container">
        {avatarUrl && (
          <img loading="lazy" decoding="async" src={avatarUrl} alt={speakerName} className="vn-portrait animate-slide-up" />
        )}
        <div className="vn-dialog-box animate-fade-in-up">
          <div className="vn-speaker-name">{speakerName}</div>
          <div className="vn-dialog-text">
            {displayedText}
            {isTyping && <span className="vn-cursor"></span>}
          </div>
        </div>
      </div>
    </div>
  );
};
