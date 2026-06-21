import React, { useState, useEffect } from 'react';
import { useAudioStore } from '../../store/audioStore';
import { audioEngine } from '../../services/AudioEngine';
import type { AudioTrack, SoundboardItem } from '../../utils/audioTypes';
import { Play, Pause, Volume2, Music, Mic, Star, Plus, VolumeX, ListMusic, Layers, Zap, Maximize2, Minimize2, Globe, Save } from 'lucide-react';
import { DraggableWindow } from './DraggableWindow';
import { saveMarkdownContent, loadMarkdownFile, fetchRepositoryTree } from '../../utils/githubApi';

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
  
  const [activeTab, setActiveTab] = useState<'session' | 'library' | 'soundboard' | 'scenes' | 'catalog'>('session');
  const [musicVol, setMusicVol] = useState(audioState.musicVolume);
  const [ambienceVol, setAmbienceVol] = useState(audioState.ambienceVolume);
  const [isMiniplayer, setIsMiniplayer] = useState(false);
  const [wikiTracks, setWikiTracks] = useState<AudioTrack[]>([]);
  
  // Estados locais
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackProvider, setNewTrackProvider] = useState<'youtube' | 'local'>('youtube');

  // Carregar faixas da Wiki
  useEffect(() => {
    const loadWikiTracks = async () => {
      try {
        const tree = await fetchRepositoryTree();
        const audioFiles = tree.filter(f => f.path.startsWith('Biblioteca/Audios/') && f.path.endsWith('.md'));
        const loadedTracks: AudioTrack[] = [];
        
        for (const file of audioFiles) {
          const content = await loadMarkdownFile(file.path);
          if (content && content.includes('tipo: audio')) {
            // Extrair frontmatter simples
            const matchUrl = content.match(/url:\s*(.+)/);
            const matchProvider = content.match(/provider:\s*(.+)/);
            if (matchUrl && matchProvider) {
              loadedTracks.push({
                id: file.path,
                title: file.path.split('/').pop()?.replace('.md', '') || 'Áudio Desconhecido',
                url: matchUrl[1].trim(),
                provider: matchProvider[1].trim() as any,
                category: 'ambience',
                tags: [],
                volume: 0.5,
                isFavorite: false
              });
            }
          }
        }
        setWikiTracks(loadedTracks);
      } catch (err) {
        console.error("Erro ao carregar áudios da Wiki:", err);
      }
    };
    if (activeTab === 'library') {
      loadWikiTracks();
    }
  }, [activeTab]);

  // Handlers
  const handlePlayMusic = (track: AudioTrack) => audioEngine.playMusic(track, musicVol);
  const handlePlayAmbience = (track: AudioTrack) => audioEngine.playAmbience(track, ambienceVol);
  const handlePlaySFX = (item: SoundboardItem) => audioEngine.playSFX(item);
  const handleStopMusic = () => audioEngine.stopMusic();

  const handleSaveToWiki = async (trackTitle: string, url: string, provider: string) => {
    if (!url || !trackTitle) return;
    try {
      const content = `---
tipo: audio
provider: ${provider}
url: ${url}
volume: 0.5
---

# ${trackTitle}
Adicionado via Audio Hub.
`;
      await saveMarkdownContent(`Biblioteca/Audios/${trackTitle.replace(/[^a-zA-Z0-9_ ]/g, '')}.md`, content);
      alert('Áudio salvo na Wiki com sucesso!');
      setNewTrackUrl('');
      setNewTrackTitle('');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar na Wiki.');
    }
  };

  const handleAddTrack = () => {
    handleSaveToWiki(newTrackTitle, newTrackUrl, newTrackProvider);
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
  };

  // Mock dados para exibir UI
  const mockLibrary: AudioTrack[] = [
    { id: '1', title: 'Taverna Noturna', provider: 'youtube', url: 'https://www.youtube.com/watch?v=RMB-LhQ1B6c', category: 'ambience', tags: [], volume: 0.5, isFavorite: true },
    { id: '2', title: 'Chefe Final: Dragão', provider: 'youtube', url: 'https://www.youtube.com/watch?v=g6h7i8j9k0l', category: 'combat', tags: [], volume: 0.8, isFavorite: false },
    { id: '3', title: 'Chuva Suave', provider: 'local', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', category: 'sfx', tags: [], volume: 0.3, isFavorite: true },
  ];

  const onlineCatalog: AudioTrack[] = [
    { id: 'cat-1', title: 'Tavern Music (Tabletop Audio)', provider: 'local', url: 'https://sounds.tabletopaudio.com/1_Tavern_Music.mp3', category: 'ambience', tags: [], volume: 0.5, isFavorite: false },
    { id: 'cat-2', title: 'True Space (Tabletop Audio)', provider: 'local', url: 'https://sounds.tabletopaudio.com/2_True_Space.mp3', category: 'ambience', tags: [], volume: 0.5, isFavorite: false },
    { id: 'cat-3', title: 'Medieval Town (Tabletop Audio)', provider: 'local', url: 'https://sounds.tabletopaudio.com/193_Medieval_Town.mp3', category: 'ambience', tags: [], volume: 0.5, isFavorite: false },
    { id: 'cat-4', title: 'RPG Combat Music (Michael Ghelfi)', provider: 'youtube', url: 'https://www.youtube.com/watch?v=A2xQeB-i9nE', category: 'combat', tags: [], volume: 0.5, isFavorite: false },
    { id: 'cat-5', title: 'Dark Ambience (Michael Ghelfi)', provider: 'youtube', url: 'https://www.youtube.com/watch?v=hZJ2wJqTXXw', category: 'ambience', tags: [], volume: 0.5, isFavorite: false },
  ];

  const currentMusicTitle = audioState.playlist.find(t => t.id === audioState.currentMusicId)?.title || mockLibrary.find(t => t.id === audioState.currentMusicId)?.title || onlineCatalog.find(t => t.id === audioState.currentMusicId)?.title || wikiTracks.find(t => t.id === audioState.currentMusicId)?.title || 'Tema de Batalha';
  const currentAmbienceTitle = audioState.playlist.find(t => t.id === audioState.currentAmbienceId)?.title || mockLibrary.find(t => t.id === audioState.currentAmbienceId)?.title || onlineCatalog.find(t => t.id === audioState.currentAmbienceId)?.title || wikiTracks.find(t => t.id === audioState.currentAmbienceId)?.title || 'Chuva e Trovões';

  return (
    <DraggableWindow id="audioDirector" title="Maestro de Sessão" initialX={window.innerWidth / 2 - 250} initialY={100} width={isMiniplayer ? 340 : 480} height={isMiniplayer ? 180 : 560} onClose={onClose} variant="glass">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-primary)', overflow: 'hidden' }}>
        
        {/* HEADER: Player Visual */}
        <div style={{ 
          padding: '1rem', 
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)', 
          borderBottom: '1px solid var(--glass-border)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%)', animation: 'spin 20s linear infinite', zIndex: 0, pointerEvents: 'none' }} />
          
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontFamily: 'var(--font-display)', color: 'white' }}>
              <div style={{ padding: '0.3rem', background: 'var(--accent-primary)', borderRadius: '6px', display: 'flex', boxShadow: '0 0 10px var(--accent-glow)' }}>
                <Music size={14} color="white" />
              </div>
              Audio Hub
            </h2>
            <button onClick={() => setIsMiniplayer(!isMiniplayer)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.3rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }} title={isMiniplayer ? 'Maximizar' : 'Miniplayer'}>
              {isMiniplayer ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
          </div>

          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: (isMiniplayer && !audioState.currentAmbienceId) ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
            {/* BG Music Indicator */}
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <span style={{ fontSize: '0.65rem', color: '#f0abfc', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Música Atual</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {audioState.currentMusicId ? currentMusicTitle : 'Silêncio...'}
                </span>
                {audioState.isPlayingMusic ? (
                   <button onClick={handleStopMusic} style={{ background: 'transparent', border: 'none', color: '#f0abfc', cursor: 'pointer' }}><Pause size={14} /></button>
                ) : (
                   <Play size={14} color="var(--text-secondary)" />
                )}
              </div>
            </div>

            {/* Ambience Indicator (Hidden in miniplayer if not playing to save space) */}
            {(!isMiniplayer || audioState.currentAmbienceId) && (
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <span style={{ fontSize: '0.65rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Ambiente</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {audioState.currentAmbienceId ? currentAmbienceTitle : 'Nenhum'}
                  </span>
                  {audioState.isPlayingAmbience ? (
                     <Volume2 size={14} color="#93c5fd" />
                  ) : (
                     <VolumeX size={14} color="var(--text-secondary)" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTROLES DE VOLUME (Mixer) */}
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.25rem', color: '#f0abfc' }}>
              <span>🎵 Mús</span>
              <span>{Math.round(musicVol * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={musicVol} 
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setMusicVol(v);
                audioState.setVolume('music', v);
                audioEngine.setMusicVolume(v);
              }}
              style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', appearance: 'none', cursor: 'pointer' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.25rem', color: '#93c5fd' }}>
              <span>🌧 Amb</span>
              <span>{Math.round(ambienceVol * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={ambienceVol} 
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setAmbienceVol(v);
                audioState.setVolume('ambience', v);
                audioEngine.setAmbienceVolume(v);
              }}
              style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', appearance: 'none', cursor: 'pointer' }}
            />
          </div>
        </div>

        {!isMiniplayer && (
          <>
            {/* NAVEGAÇÃO POR ABAS */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)', overflowX: 'auto' }}>
              {[
                { id: 'session', label: 'Sessão', icon: ListMusic },
                { id: 'catalog', label: 'Online', icon: Globe },
                { id: 'library', label: 'Wiki', icon: Music },
                { id: 'soundboard', label: 'SFX', icon: Mic },
                { id: 'scenes', label: 'Macros', icon: Layers },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1, minWidth: '80px', padding: '0.75rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                    background: activeTab === tab.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s'
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'var(--glass-bg)' }}>
              
              {/* ABA SESSÃO */}
              {activeTab === 'session' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(audioState.playlist.length > 0 ? audioState.playlist : mockLibrary).map((track) => (
                    <div key={track.id} style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', 
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
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{track.title}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{track.category}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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

              {/* ABA CATÁLOGO EXTERNO */}
              {activeTab === 'catalog' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ marginBottom: '0.5rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={16}/> Catálogo Online Oficial</h3>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Ouvindo trilhas e ambientes de domínio público / fair use. Nenhum download necessário!</p>
                  </div>
                  {onlineCatalog.map((track) => (
                    <div key={track.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{track.title}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{track.provider === 'local' ? 'Tabletop Audio (MP3)' : 'Michael Ghelfi (YouTube)'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={() => handlePlayMusic(track)} style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          <Play size={12} /> Tocar
                        </button>
                        <button onClick={() => handleSaveToWiki(track.title, track.url, track.provider)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Salvar Ficha na Wiki">
                          <Save size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA BIBLIOTECA (WIKI) */}
              {activeTab === 'library' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Plus size={14} color="var(--accent-primary)" /> Nova Faixa na Wiki
                    </h4>
                    
                    <input 
                      type="text" placeholder="Nome da Faixa" 
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', marginBottom: '0.5rem', outline: 'none' }}
                      value={newTrackTitle} onChange={e => setNewTrackTitle(e.target.value)}
                    />
                    
                    <select 
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', marginBottom: '0.5rem', outline: 'none' }}
                      value={newTrackProvider} onChange={e => setNewTrackProvider(e.target.value as any)}
                    >
                      <option value="youtube">YouTube (Video / Playlist)</option>
                      <option value="local">Link Direto (.mp3, .ogg)</option>
                    </select>
                    
                    <input 
                      type="text" placeholder="Cole a URL ou link aqui..." 
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', marginBottom: '0.75rem', outline: 'none' }}
                      value={newTrackUrl} onChange={e => setNewTrackUrl(e.target.value)}
                    />
                    
                    <button 
                      onClick={handleAddTrack}
                      style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                    >
                      <Save size={14} /> Salvar Ficha
                    </button>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Fichas de Áudio (Biblioteca/Audios)</h4>
                    {wikiTracks.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', border: '1px dashed var(--glass-border)', borderRadius: '8px' }}>
                        Nenhuma ficha de áudio encontrada.
                      </div>
                    ) : (
                      wikiTracks.map(track => (
                        <div key={track.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '0.5rem' }}>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{track.title}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{track.provider.toUpperCase()}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={() => handlePlayMusic(track)} style={{ padding: '0.3rem', borderRadius: '4px', border: 'none', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Tocar como Música">
                              <Play size={12} />
                            </button>
                            <button onClick={() => handlePlayAmbience(track)} style={{ padding: '0.3rem', borderRadius: '4px', border: 'none', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Tocar como Ambiente">
                              <Volume2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ABA SOUNDBOARD */}
              {activeTab === 'soundboard' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: '1', title: 'Espada', icon: '⚔️', url: '#', volume: 0.8, provider: 'local' },
                    { id: '2', title: 'Explosão', icon: '💥', url: '#', volume: 0.8, provider: 'local' },
                    { id: '3', title: 'Magia', icon: '✨', url: '#', volume: 0.8, provider: 'local' },
                    { id: '4', title: 'Porta', icon: '🚪', url: '#', volume: 0.8, provider: 'local' },
                    { id: '5', title: 'Trovão', icon: '⚡', url: '#', volume: 0.8, provider: 'local' },
                    { id: '6', title: 'Grito', icon: '😱', url: '#', volume: 0.8, provider: 'local' },
                    { id: '7', title: 'Moedas', icon: '💰', url: '#', volume: 0.8, provider: 'local' },
                    { id: '8', title: 'Lobo', icon: '🐺', url: '#', volume: 0.8, provider: 'local' },
                  ].map((sfx) => (
                    <button
                      key={sfx.id}
                      onClick={() => handlePlaySFX(sfx as any)}
                      style={{
                        aspectRatio: '1', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '12px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                        cursor: 'pointer', transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
                    >
                      <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{sfx.icon}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{sfx.title}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ABA MACROS (CENAS) */}
              {activeTab === 'scenes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ padding: '0.75rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fef08a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <Zap size={14} /> Encontro com o Chefe
                      </h4>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Toca: Battle Theme → SFX: Rugido</p>
                    </div>
                    <Play size={16} color="#fef08a" />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
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
