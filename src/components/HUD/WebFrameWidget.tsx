import React, { useState } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { Globe, RefreshCw, ExternalLink } from 'lucide-react';

interface WebFrameWidgetProps {
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
}

export const WebFrameWidget: React.FC<WebFrameWidgetProps> = ({ onClose, }) => {
  const [url, setUrl] = useState('https://tabletopaudio.com');
  const [currentUrl, setCurrentUrl] = useState('https://tabletopaudio.com');
  const [key, setKey] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = url;
    if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }
    // Tratamento especial para YouTube para forçar o embed e suportar Playlists
    if (finalUrl.includes('youtube.com/playlist?list=')) {
      const listId = finalUrl.split('list=')[1].split('&')[0];
      finalUrl = `https://www.youtube.com/embed/videoseries?list=${listId}`;
    } else if (finalUrl.includes('youtube.com/watch') && finalUrl.includes('list=')) {
      const videoId = finalUrl.split('v=')[1].split('&')[0];
      const listId = finalUrl.split('list=')[1].split('&')[0];
      finalUrl = `https://www.youtube.com/embed/${videoId}?list=${listId}`;
    } else if (finalUrl.includes('youtube.com/watch?v=')) {
      const videoId = finalUrl.split('v=')[1].split('&')[0];
      finalUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (finalUrl.includes('youtu.be/')) {
      const videoId = finalUrl.split('youtu.be/')[1].split('?')[0];
      finalUrl = `https://www.youtube.com/embed/${videoId}`;
    }
    
    setCurrentUrl(finalUrl);
  };

  const reload = () => setKey(prev => prev + 1);

  return (
    <DraggableWindow
      id="webFrame"
      title="Navegador Integrado"
      initialX={100}
      initialY={100}
      width={600}
      height={450}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
        
        {/* Barra de Endereço */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--glass-border)', alignItems: 'center' }}>
          <button type="button" onClick={() => setCurrentUrl('https://tabletopaudio.com')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }} title="Página Inicial (Tabletop Audio)">
            <Globe size={16} />
          </button>
          
          <input 
            type="text" 
            value={url} 
            onChange={e => setUrl(e.target.value)}
            style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.4rem 0.6rem', color: 'white', fontSize: '0.8rem', outline: 'none' }}
            placeholder="Digite uma URL (ex: https://tabletopaudio.com)"
          />
          
          <button type="button" onClick={reload} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }} title="Recarregar Janela Interna">
            <RefreshCw size={16} />
          </button>
          
          <button type="button" onClick={() => window.open(url, '_blank')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem', marginLeft: '0.2rem' }} title="Abrir em Nova Guia (Para sites que bloqueiam Iframes)">
            <ExternalLink size={16} />
          </button>
        </form>

        {/* Aviso sobre segurança */}
        <div style={{ padding: '0.4rem', fontSize: '0.7rem', background: 'rgba(234, 179, 8, 0.1)', color: '#fef08a', textAlign: 'center', borderBottom: '1px solid rgba(234, 179, 8, 0.2)' }}>
          Aviso: Se o site ficar em branco, ele bloqueia Iframes. Clique no botão de "Nova Guia" acima.
        </div>

        {/* Conteúdo Iframe */}
        <div style={{ flex: 1, position: 'relative', background: '#ffffff' }}>
          <iframe
            key={key}
            src={currentUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Web Frame"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; microphone; camera; midi"
          />
        </div>
      </div>
    </DraggableWindow>
  );
};
