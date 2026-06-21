import React, { useState, useEffect } from 'react';
import { useAudioStore } from '../../store/audioStore';
import { audioEngine } from '../../services/AudioEngine';
import type { AudioTrack, SoundboardItem } from '../../utils/audioTypes';
import { Play, Pause, Volume2, Music, Mic, Star, Plus, VolumeX, ListMusic, Layers, Zap } from 'lucide-react';
import { DraggableWindow } from './DraggableWindow';

export const AudioDirectorWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const audioState = useAudioStore();
  const { addAudioTrack, triggerMacro } = audioState;

  useEffect(() => {
    audioEngine.onStateChange = (stateUpdates) => {
      useAudioStore.setState(stateUpdates);
    };
    return () => {
      audioEngine.onStateChange = undefined;
    };
  }, []);
  
  const [activeTab, setActiveTab] = useState<'session' | 'library' | 'soundboard' | 'scenes'>('session');
  const [musicVol, setMusicVol] = useState(audioState.musicVolume);
  const [ambienceVol, setAmbienceVol] = useState(audioState.ambienceVolume);
  
  // Estados locais
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackProvider, setNewTrackProvider] = useState<'youtube' | 'local'>('youtube');

  // Handlers
  const handlePlayMusic = (track: AudioTrack) => {
    audioEngine.playMusic(track, musicVol);
  };

  const handlePlayAmbience = (track: AudioTrack) => {
    audioEngine.playAmbience(track, ambienceVol);
  };

  const handlePlaySFX = (item: SoundboardItem) => {
    audioEngine.playSFX(item);
  };

  const handleStopMusic = () => {
    audioEngine.stopMusic();
  };

  const handleAddTrack = () => {
    if (!newTrackUrl || !newTrackTitle) return;
    addAudioTrack({
      id: Date.now().toString(),
      title: newTrackTitle,
      url: newTrackUrl,
      provider: newTrackProvider,
      category: 'ambience',
      tags: [],
      volume: 0.5,
      isFavorite: false
    });
    setNewTrackUrl('');
    setNewTrackTitle('');
  };

  // Mock dados para exibir UI
  const mockLibrary: AudioTrack[] = [
    { id: '1', title: 'Taverna Noturna', provider: 'youtube', url: 'https://youtube.com/watch?v=1', category: 'ambience', tags: [], volume: 0.5, isFavorite: true },
    { id: '2', title: 'Chefe Final: Dragão', provider: 'youtube', url: 'https://youtube.com/watch?v=2', category: 'combat', tags: [], volume: 0.8, isFavorite: false },
    { id: '3', title: 'Chuva Suave', provider: 'local', url: '#', category: 'sfx', tags: [], volume: 0.3, isFavorite: true },
  ];

  return (
    <DraggableWindow id="audioDirector" title="Maestro de Sessão" initialX={window.innerWidth / 2 - 250} initialY={100} width={480} height={560} onClose={onClose} variant="glass">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-primary)', overflow: 'hidden' }}>
        
        {/* HEADER: Player Visual */}
        <div style={{ 
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)', 
          borderBottom: '1px solid var(--glass-border)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Animated Background Glow */}
          <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%)', animation: 'spin 20s linear infinite', zIndex: 0, pointerEvents: 'none' }} />
          
          <h2 style={{ position: 'relative', zIndex: 1, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', fontFamily: 'var(--font-display)', color: 'white' }}>
            <div style={{ padding: '0.4rem', background: 'var(--accent-primary)', borderRadius: '8px', display: 'flex', boxShadow: '0 0 15px var(--accent-glow)' }}>
              <Music size={18} color="white" />
            </div>
            Audio Hub
          </h2>

          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* BG Music Indicator */}
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <span style={{ fontSize: '0.7rem', color: '#f0abfc', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Música Atual</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {audioState.currentMusicId ? 'Tema de Batalha' : 'Silêncio...'}
                </span>
                {audioState.isPlayingMusic ? (
                   <button onClick={handleStopMusic} style={{ background: 'transparent', border: 'none', color: '#f0abfc', cursor: 'pointer' }}><Pause size={16} /></button>
                ) : (
                   <Play size={16} color="var(--text-secondary)" />
                )}
              </div>
            </div>

            {/* Ambience Indicator */}
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <span style={{ fontSize: '0.7rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Ambiente</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {audioState.currentAmbienceId ? 'Chuva e Trovões' : 'Nenhum'}
                </span>
                {audioState.isPlayingAmbience ? (
                   <Volume2 size={16} color="#93c5fd" />
                ) : (
                   <VolumeX size={16} color="var(--text-secondary)" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLES DE VOLUME (Mixer) */}
        <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem', color: '#f0abfc' }}>
              <span>🎵 Volume da Música</span>
              <span>{Math.round(musicVol * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={musicVol} 
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setMusicVol(v);
                audioEngine.setMusicVolume(v);
              }}
              style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', appearance: 'none', cursor: 'pointer' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem', color: '#93c5fd' }}>
              <span>🌧 Volume do Ambiente</span>
              <span>{Math.round(ambienceVol * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={ambienceVol} 
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setAmbienceVol(v);
                audioEngine.setAmbienceVolume(v);
              }}
              style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', appearance: 'none', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)' }}>
          {[
            { id: 'session', label: 'Sessão Atual', icon: ListMusic },
            { id: 'library', label: 'Biblioteca', icon: Music },
            { id: 'soundboard', label: 'Soundboard', icon: Mic },
            { id: 'scenes', label: 'Macros', icon: Layers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1, padding: '0.75rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = 'white'; }}
              onMouseOut={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--glass-bg)' }}>
          
          {/* ABA SESSÃO */}
          {activeTab === 'session' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(audioState.playlist.length > 0 ? audioState.playlist : mockLibrary).map((track) => (
                <div key={track.id} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', 
                  background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid var(--glass-border)',
                  transition: 'border 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-glow)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold',
                      background: track.category === 'combat' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: track.category === 'combat' ? '#fca5a5' : '#93c5fd',
                      border: `1px solid ${track.category === 'combat' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`
                    }}>
                      {track.provider === 'youtube' ? 'YT' : 'MP3'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{track.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{track.category}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => handlePlayMusic(track)} style={{ padding: '0.4rem', borderRadius: '50%', border: 'none', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Tocar como Música Principal">
                      <Play size={14} />
                    </button>
                    <button onClick={() => handlePlayAmbience(track)} style={{ padding: '0.4rem', borderRadius: '50%', border: 'none', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Tocar como Ambiente (SFX)">
                      <Volume2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ABA BIBLIOTECA */}
          {activeTab === 'library' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={16} color="var(--accent-primary)" /> Adicionar Nova Faixa
                </h4>
                
                <input 
                  type="text" placeholder="Nome da Faixa (Ex: Tema de Batalha Épica)" 
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.85rem', color: 'white', marginBottom: '0.75rem', outline: 'none' }}
                  value={newTrackTitle} onChange={e => setNewTrackTitle(e.target.value)}
                />
                
                <select 
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.85rem', color: 'white', marginBottom: '0.75rem', outline: 'none' }}
                  value={newTrackProvider} onChange={e => setNewTrackProvider(e.target.value as any)}
                >
                  <option value="youtube">YouTube (Video / Playlist)</option>
                  <option value="spotify">Spotify (Track)</option>
                  <option value="local">Arquivo de Áudio Local (.mp3, .ogg)</option>
                </select>
                
                <input 
                  type="text" placeholder="Cole a URL ou link aqui..." 
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.85rem', color: 'white', marginBottom: '1rem', outline: 'none' }}
                  value={newTrackUrl} onChange={e => setNewTrackUrl(e.target.value)}
                />
                
                <button 
                  onClick={handleAddTrack}
                  style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.boxShadow = '0 0 15px var(--accent-glow)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  Salvar na Biblioteca
                </button>
              </div>
            </div>
          )}

          {/* ABA SOUNDBOARD */}
          {activeTab === 'soundboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                { id: '1', title: 'Espada', icon: '⚔️', url: '#' },
                { id: '2', title: 'Explosão', icon: '💥', url: '#' },
                { id: '3', title: 'Magia', icon: '✨', url: '#' },
                { id: '4', title: 'Porta', icon: '🚪', url: '#' },
                { id: '5', title: 'Trovão', icon: '⚡', url: '#' },
                { id: '6', title: 'Grito', icon: '😱', url: '#' },
                { id: '7', title: 'Moedas', icon: '💰', url: '#' },
                { id: '8', title: 'Lobo', icon: '🐺', url: '#' },
              ].map((sfx) => (
                <button
                  key={sfx.id}
                  onClick={() => handlePlaySFX(sfx as any)}
                  style={{
                    aspectRatio: '1', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '12px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    cursor: 'pointer', transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                >
                  <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{sfx.icon}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{sfx.title}</span>
                </button>
              ))}
              <button style={{
                    aspectRatio: '1', background: 'transparent', border: '1px dashed var(--glass-border)', borderRadius: '12px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'white'; e.currentTarget.style.color = 'white'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <Plus size={24} />
                <span style={{ fontSize: '0.65rem' }}>Adicionar</span>
              </button>
            </div>
          )}

          {/* ABA MACROS (CENAS) */}
          {activeTab === 'scenes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                   onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(234, 179, 8, 0.2)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                   onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(234, 179, 8, 0.1)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fef08a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Zap size={16} /> Encontro com o Chefe
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Fade Out → Toca: Dragão de Fogo → SFX: Rugido</p>
                </div>
                <Play size={20} color="#fef08a" />
              </div>
              
              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                   onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                   onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Star size={16} /> Acampamento Seguro
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Toca: Noite Estrelada → Ambiência: Fogueira</p>
                </div>
                <Play size={20} color="#93c5fd" />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DraggableWindow>
  );
};
