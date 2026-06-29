import React, { useState } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { Globe, RefreshCw, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';

interface WebFrameWidgetProps {
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
}

export const WebFrameWidget: React.FC<WebFrameWidgetProps> = ({ onClose, }) => {
  const [url, setUrl] = useState('https://tabletopaudio.com');
  const [currentUrl, setCurrentUrl] = useState('https://tabletopaudio.com');
  const [key, setKey] = useState(0);
  const [useProxy, setUseProxy] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = url;
    if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }
    
    let isYouTube = false;

    // Tratamento especial para YouTube para forçar o embed e suportar Playlists
    if (finalUrl.includes('youtube.com/playlist?list=')) {
      isYouTube = true;
      const listId = finalUrl.split('list=')[1].split('&')[0];
      finalUrl = `https://www.youtube.com/embed/videoseries?list=${listId}`;
    } else if (finalUrl.includes('youtube.com/watch') && finalUrl.includes('list=')) {
      isYouTube = true;
      const videoId = finalUrl.split('v=')[1].split('&')[0];
      const listId = finalUrl.split('list=')[1].split('&')[0];
      finalUrl = `https://www.youtube.com/embed/${videoId}?list=${listId}`;
    } else if (finalUrl.includes('youtube.com/watch?v=')) {
      isYouTube = true;
      const videoId = finalUrl.split('v=')[1].split('&')[0];
      finalUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (finalUrl.includes('youtu.be/')) {
      isYouTube = true;
      const videoId = finalUrl.split('youtu.be/')[1].split('?')[0];
      finalUrl = `https://www.youtube.com/embed/${videoId}`;
    }
    
    if (useProxy && !isYouTube) {
      finalUrl = `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`;
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
          
          <button type="button" onClick={() => setUseProxy(!useProxy)} style={{ background: 'transparent', border: 'none', color: useProxy ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem', marginLeft: '0.2rem' }} title="Modo Proxy Anti-Bloqueio (Ignora restrições, mas quebra logins)">
            {useProxy ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          </button>

          <button type="button" onClick={() => window.open(url, '_blank')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem', marginLeft: '0.2rem' }} title="Abrir em Nova Guia (Para sites que bloqueiam Iframes)">
            <ExternalLink size={16} />
          </button>
        </form>

        {/* Aviso sobre segurança */}
        <div style={{ padding: '0.4rem', fontSize: '0.7rem', background: useProxy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: useProxy ? '#6ee7b7' : '#fef08a', textAlign: 'center', borderBottom: `1px solid ${useProxy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)'}` }}>
          {useProxy 
            ? '✅ Modo Proxy Anti-Bloqueio Ativado. Sites estão liberados para leitura (mas logins não funcionarão).'
            : 'Aviso: Se o site ficar em branco, ele bloqueia Iframes. Ative o Proxy (escudo) acima ou abra em Nova Guia.'}
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
