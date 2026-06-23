import React, { useState, useEffect } from 'react';
import { useAudioStore } from '../../../store/audioStore';
import { audioEngine } from '../../../services/AudioEngine';
import type { AudioTrack, SoundboardItem } from '../../../utils/audioTypes';
import { Play, Pause, Volume2, Music, FolderOpen, Sliders, Maximize2, Minimize2, Square, Zap, HardDrive, Eye, EyeOff, LockOpen, Repeat, Repeat1, ArrowRight, Shuffle } from 'lucide-react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { get, set } from 'idb-keyval';

export const AudioDirectorWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const audioState = useAudioStore();
  
  const [isMiniplayer, setIsMiniplayer] = useState(false);
  const [isMicroplayer, setIsMicroplayer] = useState(false);
  
  const [needsPermission, setNeedsPermission] = useState(false);
  const [savedDirHandle, setSavedDirHandle] = useState<any>(null);

  // Progress states
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [ambienceProgress, setAmbienceProgress] = useState(0);
  const [ambienceDuration, setAmbienceDuration] = useState(0);

  // For Seeking
  const [isSeekingMusic, setIsSeekingMusic] = useState(false);
  const [isSeekingAmbience, setIsSeekingAmbience] = useState(false);

  useEffect(() => {
    audioEngine.onStateChange = (stateUpdates) => {
      useAudioStore.setState(stateUpdates);
    };
    audioEngine.onProgressChange = (type, current, duration) => {
      if (type === 'music') {
        if (!isSeekingMusic) setMusicProgress(current);
        setMusicDuration(duration);
      } else {
        if (!isSeekingAmbience) setAmbienceProgress(current);
        setAmbienceDuration(duration);
      }
    };
    return () => {
      audioEngine.onStateChange = undefined;
      audioEngine.onProgressChange = undefined;
    };
  }, [isSeekingMusic, isSeekingAmbience]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const loadDirectory = async (dirHandle: any) => {
    try {
      const newTracks: AudioTrack[] = [];
      let i = 0;
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const lowerName = entry.name.toLowerCase();
          if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav') || lowerName.endsWith('.ogg')) {
            newTracks.push({
              id: `local-${dirHandle.name}-${entry.name}-${i++}`,
              title: entry.name.replace(/\.(mp3|wav|ogg)$/i, ''),
              url: '', // Será gerado sob demanda no AudioEngine
              fileHandle: entry,
              provider: 'local',
              category: 'ambience',
              tags: [],
              volume: 1,
              isFavorite: false
            });
          }
        }
      }
      if (newTracks.length > 0) {
        audioState.setLocalTracks(newTracks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (audioState.localTracks.length > 0) return; // already loaded
    const checkSavedDir = async () => {
      try {
        const dirHandle = await get('dozero_audio_dir');
        if (dirHandle) {
          const permission = await dirHandle.queryPermission({ mode: 'read' });
          if (permission === 'granted') {
            await loadDirectory(dirHandle);
          } else {
            setSavedDirHandle(dirHandle);
            setNeedsPermission(true);
          }
        }
      } catch (e) { console.error(e); }
    };
    checkSavedDir();
  }, []);

  const requestDirPermission = async () => {
    if (savedDirHandle) {
      try {
        const permission = await savedDirHandle.requestPermission({ mode: 'read' });
        if (permission === 'granted') {
          setNeedsPermission(false);
          await loadDirectory(savedDirHandle);
        }
      } catch (e) { console.error('Erro de permissão', e); }
    }
  };

  const handleLoadLocalFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        await set('dozero_audio_dir', dirHandle);
        setNeedsPermission(false);
        await loadDirectory(dirHandle);
      } catch (e) {
        console.error('Erro ao carregar pasta local via FileSystem:', e);
      }
    } else {
      console.warn('File System Access API não suportada. Usando fallback de input file.');
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        (input as any).directory = true;
        input.multiple = true;
        
        input.onchange = (e: any) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          
          const newTracks: AudioTrack[] = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav') || lowerName.endsWith('.ogg')) {
              newTracks.push({
                id: `local-fallback-${Date.now()}-${i}`,
                title: file.name.replace(/\.(mp3|wav|ogg)$/i, ''),
                url: URL.createObjectURL(file), // Gera URL temporária imediatamente
                provider: 'local',
                category: 'ambience',
                tags: [],
                volume: 1,
                isFavorite: false
              });
            }
          }
          if (newTracks.length > 0) {
            audioState.setLocalTracks(newTracks);
          }
        };
        input.click();
      } catch(e) {
        console.error(e);
      }
    }
  };

  const currentMusicTrackTitle = audioState.currentMusicId ? audioState.localTracks.find(t => t.id === audioState.currentMusicId)?.title || audioState.currentMusicTitle || 'Música Desconhecida' : 'Nenhuma Faixa';
  const currentAmbienceTrackTitle = audioState.currentAmbienceId ? audioState.localTracks.find(t => t.id === audioState.currentAmbienceId)?.title || audioState.currentAmbienceTitle || 'Nenhuma Faixa' : 'Nenhuma Faixa';

  const trackStyle = {
    padding: '1rem', background: '#111', borderRadius: '8px', border: '1px solid #222', 
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' as const, gap: '0.75rem'
  };

  const getWindowHeight = () => {
    if (isMicroplayer) return 50;
    if (isMiniplayer) return 340;
    return 640;
  };

  return (
    <DraggableWindow id="audioMixer" title="DOZERO Audio Mixer" initialX={window.innerWidth / 2 - 250} initialY={100} width={isMiniplayer || isMicroplayer ? 380 : 420} height={getWindowHeight()} onClose={onClose} variant="glass">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-primary)', overflow: 'hidden', background: '#0a0a0a' }}>
        
        {/* MIXER HEADER */}
        <div style={{ padding: '0.75rem 1rem', background: 'linear-gradient(180deg, #18181b 0%, #0a0a0a 100%)', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="#a855f7" />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '2px', color: '#e5e5e5' }}>Audio Mixer</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {needsPermission && (
              <button onClick={requestDirPermission} style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.75rem' }}>
                <LockOpen size={14} /> Restaurar Faixas
              </button>
            )}
            {!isMicroplayer && (
              <button onClick={handleLoadLocalFolder} style={{ background: '#222', color: '#e5e5e5', border: '1px solid #444', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.75rem', transition: 'all 0.2s' }}>
                <HardDrive size={14} /> Importar Pasta
              </button>
            )}
            <button onClick={() => {
              if (isMicroplayer) { setIsMicroplayer(false); setIsMiniplayer(false); }
              else { setIsMicroplayer(true); }
            }} style={{ background: '#222', border: '1px solid #444', color: '#e5e5e5', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}>
              {isMicroplayer ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            {!isMicroplayer && (
              <button onClick={() => setIsMiniplayer(!isMiniplayer)} style={{ background: '#222', border: '1px solid #444', color: '#e5e5e5', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}>
                {isMiniplayer ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* MIXER CHANNELS */}
        {!isMicroplayer && (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem', gap: '1rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(30,30,30,1) 0%, rgba(10,10,10,1) 100%)', borderBottom: '1px solid #222' }}>
          
          {/* CHANNEL 1: MUSIC */}
          <div style={trackStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                <Music size={14} /> CH 1 / MÚSICA
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '120px' }}>
                <Volume2 size={14} color="#666" />
                <input type="range" min="0" max="1" step="0.01" value={audioState.musicVolume} onChange={(e) => audioEngine.setMusicVolume(parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: '#a855f7' }} />
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: audioState.isPlayingMusic ? '#e5e5e5' : '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
              {currentMusicTrackTitle}
            </div>

            {/* Seek Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', color: '#666', fontFamily: 'monospace', minWidth: '30px' }}>{formatTime(musicProgress)}</span>
              <input type="range" min="0" max={musicDuration || 100} value={musicProgress} 
                onMouseDown={() => setIsSeekingMusic(true)}
                onMouseUp={(e) => {
                  setIsSeekingMusic(false);
                  audioEngine.seekMusic(parseFloat((e.target as HTMLInputElement).value));
                }}
                onChange={(e) => setMusicProgress(parseFloat(e.target.value))}
                style={{ flex: 1, height: '4px', cursor: 'pointer', accentColor: '#a855f7' }} 
              />
              <span style={{ fontSize: '0.65rem', color: '#666', fontFamily: 'monospace', minWidth: '30px' }}>{formatTime(musicDuration)}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <button 
                 onClick={() => {
                   const modes = ['all', 'single', 'none'] as const;
                   const next = modes[(modes.indexOf(audioState.loopMode) + 1) % modes.length];
                   audioState.setLoopMode(next);
                 }}
                 style={{ background: '#222', border: '1px solid #444', color: audioState.loopMode === 'none' ? '#666' : '#a855f7', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                 title={`Modo de Repetição: ${audioState.loopMode}`}
               >
                 {audioState.loopMode === 'all' && <Repeat size={14} />}
                 {audioState.loopMode === 'single' && <Repeat1 size={14} />}
                 {audioState.loopMode === 'none' && <ArrowRight size={14} />}
               </button>
               
               <button 
                 onClick={() => audioState.setIsShuffle(!audioState.isShuffle)}
                 style={{ background: '#222', border: '1px solid #444', color: audioState.isShuffle ? '#a855f7' : '#666', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                 title="Modo Aleatório (Shuffle)"
               >
                 <Shuffle size={14} />
               </button>

               {audioState.isPlayingMusic ? (
                 <button onClick={() => audioEngine.pauseMusic()} style={{ flex: 1, background: '#222', border: '1px solid #444', color: 'white', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Pause size={14} /></button>
               ) : (
                 <button onClick={() => audioEngine.resumeMusic()} style={{ flex: 1, background: '#a855f7', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Play size={14} /></button>
               )}
               <button onClick={() => audioEngine.stopMusic()} style={{ background: '#3f1d1d', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Square size={14} /></button>
            </div>
          </div>

          {/* CHANNEL 2: AMBIENCE */}
          <div style={trackStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                <Zap size={14} /> CH 2 / AMBIENTE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '120px' }}>
                <Volume2 size={14} color="#666" />
                <input type="range" min="0" max="1" step="0.01" value={audioState.ambienceVolume} onChange={(e) => audioEngine.setAmbienceVolume(parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6' }} />
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: audioState.isPlayingAmbience ? '#e5e5e5' : '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
              {currentAmbienceTrackTitle}
            </div>

            {/* Seek Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', color: '#666', fontFamily: 'monospace', minWidth: '30px' }}>{formatTime(ambienceProgress)}</span>
              <input type="range" min="0" max={ambienceDuration || 100} value={ambienceProgress} 
                onMouseDown={() => setIsSeekingAmbience(true)}
                onMouseUp={(e) => {
                  setIsSeekingAmbience(false);
                  audioEngine.seekAmbience(parseFloat((e.target as HTMLInputElement).value));
                }}
                onChange={(e) => setAmbienceProgress(parseFloat(e.target.value))}
                style={{ flex: 1, height: '4px', cursor: 'pointer', accentColor: '#3b82f6' }} 
              />
              <span style={{ fontSize: '0.65rem', color: '#666', fontFamily: 'monospace', minWidth: '30px' }}>{formatTime(ambienceDuration)}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
               {audioState.isPlayingAmbience ? (
                 <button onClick={() => audioEngine.pauseAmbience()} style={{ flex: 1, background: '#222', border: '1px solid #444', color: 'white', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Pause size={14} /></button>
               ) : (
                 <button onClick={() => audioEngine.resumeAmbience()} style={{ flex: 1, background: '#3b82f6', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Play size={14} /></button>
               )}
               <button onClick={() => audioEngine.stopAmbience()} style={{ background: '#3f1d1d', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Square size={14} /></button>
            </div>
            </div>
          </div>
        )}

        {/* LIBRARY SECTION */}
        {!isMiniplayer && !isMicroplayer && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#0a0a0a' }}>
            <h3 style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderOpen size={14} /> Ficheiro Local ({audioState.localTracks.length} faixas)
            </h3>
            
            {audioState.localTracks.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                <Music size={32} color="#444" style={{ marginBottom: '1rem' }} />
                <p style={{ fontSize: '0.85rem', color: '#888', textAlign: 'center' }}>Nenhuma música carregada.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {audioState.localTracks.map((track) => (
                  <div key={track.id} className="hover-mixer-track" style={{ background: '#111', border: '1px solid #222', borderRadius: '6px', padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', cursor: 'default' }}>
                    <div style={{ flex: 1, overflow: 'hidden', marginRight: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#e5e5e5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button onClick={() => audioEngine.playMusic(track, audioState.musicVolume)} style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Tocar no CH 1 (Música)">
                        <Music size={12} />
                      </button>
                      <button onClick={() => audioEngine.playAmbience(track, audioState.ambienceVolume)} style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Tocar no CH 2 (Ambiente)">
                        <Volume2 size={12} />
                      </button>
                      <button onClick={() => audioEngine.playSFX({ ...track, volume: 1 } as unknown as SoundboardItem)} style={{ background: 'rgba(234,179,8,0.1)', color: '#fde047', border: '1px solid rgba(234,179,8,0.3)', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Efeito Rápido (SFX)">
                        <Zap size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DraggableWindow>
  );
};
