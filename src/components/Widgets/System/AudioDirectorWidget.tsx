import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAudioStore } from '../../../store/audioStore';
import { audioEngine } from '../../../services/AudioEngine';
import type { AudioTrack, SoundboardItem } from '../../../utils/audioTypes';
import {
  Play, Pause, Volume2, Music, FolderOpen, Sliders, Maximize2, Minimize2,
  Square, Zap, HardDrive, Eye, EyeOff, Repeat, Repeat1, ArrowRight, Shuffle,
  Sparkles, Loader2, Search, Star, StarOff, Edit2, Check, X, Plus, Trash2, LayoutGrid
} from 'lucide-react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { get, set } from 'idb-keyval';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<AudioTrack['category'], string> = {
  ambience: 'Ambiente',
  combat: 'Combate',
  exploration: 'Exploração',
  narrative: 'Narrativa',
  sfx: 'SFX',
};
const CATEGORY_COLORS: Record<AudioTrack['category'], string> = {
  ambience: '#3b82f6',
  combat: '#ef4444',
  exploration: '#10b981',
  narrative: '#a855f7',
  sfx: '#f59e0b',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as AudioTrack['category'][];

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const btnBase: React.CSSProperties = {
  background: '#222', border: '1px solid #444', color: '#e5e5e5',
  padding: '0.4rem', borderRadius: '4px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ─── Sub-component: Channel strip ───────────────────────────────────────────

interface ChannelProps {
  label: string;
  color: string;
  icon: React.ReactNode;
  title: string;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  loopMode?: 'none' | 'single' | 'all';
  isShuffle?: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onVolumeChange: (v: number) => void;
  onSeekStart: () => void;
  onSeekEnd: (v: number) => void;
  onSeekChange: (v: number) => void;
  onLoopCycle?: () => void;
  onShuffleToggle?: () => void;
}

const Channel: React.FC<ChannelProps> = ({
  label, color, icon, title, isPlaying, volume, progress, duration,
  loopMode, isShuffle, onPlayPause, onStop, onVolumeChange,
  onSeekStart, onSeekEnd, onSeekChange, onLoopCycle, onShuffleToggle,
}) => (
  <div style={{
    padding: '0.875rem', background: '#111', borderRadius: '8px',
    border: '1px solid #222', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
    display: 'flex', flexDirection: 'column', gap: '0.625rem'
  }}>
    {/* Header row */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '1px' }}>
        {icon} {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '110px' }}>
        <Volume2 size={13} color="#555" />
        <input type="range" min="0" max="1" step="0.01" value={volume}
          onPointerDown={e => e.stopPropagation()}
          onChange={e => onVolumeChange(parseFloat(e.target.value))}
          style={{ width: '100%', cursor: 'pointer', accentColor: color }} />
      </div>
    </div>

    {/* Track title */}
    <div style={{
      fontSize: '0.8rem', color: isPlaying ? '#e5e5e5' : '#555',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500
    }}>
      {title || 'Nenhuma faixa'}
    </div>

    {/* Seek bar */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{ fontSize: '0.6rem', color: '#555', fontFamily: 'monospace', minWidth: '28px' }}>{formatTime(progress)}</span>
      <input type="range" min="0" max={duration || 100} value={progress}
        onPointerDown={e => { e.stopPropagation(); onSeekStart(); }}
        onPointerUp={e => onSeekEnd(parseFloat((e.target as HTMLInputElement).value))}
        onChange={e => onSeekChange(parseFloat(e.target.value))}
        style={{ flex: 1, height: '3px', cursor: 'pointer', accentColor: color }} />
      <span style={{ fontSize: '0.6rem', color: '#555', fontFamily: 'monospace', minWidth: '28px' }}>{formatTime(duration)}</span>
    </div>

    {/* Controls */}
    <div style={{ display: 'flex', gap: '0.4rem' }}>
      {onLoopCycle && (
        <button onClick={onLoopCycle} style={{ ...btnBase, color: loopMode === 'none' ? '#555' : color }} title={`Loop: ${loopMode}`}>
          {loopMode === 'all' && <Repeat size={13} />}
          {loopMode === 'single' && <Repeat1 size={13} />}
          {loopMode === 'none' && <ArrowRight size={13} />}
        </button>
      )}
      {onShuffleToggle && (
        <button onClick={onShuffleToggle} style={{ ...btnBase, color: isShuffle ? color : '#555' }} title="Aleatório">
          <Shuffle size={13} />
        </button>
      )}
      <button onClick={onPlayPause} style={{ ...btnBase, flex: 1, background: isPlaying ? '#222' : color, borderColor: color }}>
        {isPlaying ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <button onClick={onStop} style={{ ...btnBase, background: '#3f1d1d', borderColor: '#7f1d1d', color: 'var(--danger)' }}>
        <Square size={13} />
      </button>
    </div>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

export const AudioDirectorWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const audioState = useAudioStore();

  const [isMiniplayer, setIsMiniplayer] = useState(false);
  const [isMicroplayer, setIsMicroplayer] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [savedDirHandle, setSavedDirHandle] = useState<any>(null);

  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiModel, setAiModel] = useState<'eleven-sfx' | 'stable-audio' | 'google-tts'>('google-tts');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('pollinations_api_key') || '');
  const [isGenerating, setIsGenerating] = useState(false);

  // Progress
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [ambienceProgress, setAmbienceProgress] = useState(0);
  const [ambienceDuration, setAmbienceDuration] = useState(0);
  const seekingRef = useRef<{ music: boolean; ambience: boolean }>({ music: false, ambience: false });

  // Library UI
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<AudioTrack['category'] | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'library' | 'presets' | 'soundboard' | 'web'>('library');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [webMusicUrl, setWebMusicUrl] = useState('');

  // Preset creation
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    audioEngine.onStateChange = (updates) => useAudioStore.setState(updates);
    audioEngine.onProgressChange = (type, current, duration) => {
      if (type === 'music') {
        if (!seekingRef.current.music) setMusicProgress(current);
        setMusicDuration(duration);
      } else {
        if (!seekingRef.current.ambience) setAmbienceProgress(current);
        setAmbienceDuration(duration);
      }
    };
    return () => {
      audioEngine.onStateChange = undefined;
      audioEngine.onProgressChange = undefined;
    };
  }, []);

  // Auto-load saved directory on mount
  useEffect(() => {
    if (audioState.localTracks.length > 0) return;
    (async () => {
      try {
        const dirHandle = await get('dozero_audio_dir');
        if (!dirHandle) return;
        const permission = await dirHandle.queryPermission({ mode: 'read' });
        if (permission === 'granted') await loadDirectory(dirHandle);
        else { setSavedDirHandle(dirHandle); setNeedsPermission(true); }
      } catch {}
    })();
  }, []);

  const loadDirectory = async (dirHandle: any) => {
    const newTracks: AudioTrack[] = [];
    let i = 0;
    for await (const entry of dirHandle.values()) {
      if (entry.kind !== 'file') continue;
      const lower = entry.name.toLowerCase();
      if (!lower.match(/\.(mp3|wav|ogg|flac|m4a)$/)) continue;
      newTracks.push({
        id: `local-${dirHandle.name}-${entry.name}-${i++}`,
        title: entry.name.replace(/\.(mp3|wav|ogg|flac|m4a)$/i, ''),
        url: '',
        fileHandle: entry,
        provider: 'local',
        category: 'ambience',
        tags: [],
        volume: 1,
        isFavorite: false,
      });
    }
    if (newTracks.length > 0) audioState.setLocalTracks(newTracks);
  };

  const handleLoadFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        await set('dozero_audio_dir', dirHandle);
        setNeedsPermission(false);
        await loadDirectory(dirHandle);
      } catch {}
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.multiple = true;
      input.onchange = (e: any) => {
        const tracks: AudioTrack[] = [];
        Array.from(e.target.files as FileList).forEach((file, i) => {
          if (!file.name.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) return;
          tracks.push({
            id: `local-fb-${Date.now()}-${i}`,
            title: file.name.replace(/\.(mp3|wav|ogg|flac|m4a)$/i, ''),
            url: URL.createObjectURL(file),
            provider: 'local',
            category: 'ambience',
            tags: [],
            volume: 1,
            isFavorite: false,
          });
        });
        if (tracks.length) audioState.setLocalTracks(tracks);
      };
      input.click();
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const q = encodeURIComponent(aiPrompt.trim());
      const url = aiModel === 'google-tts'
        ? `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt&client=tw-ob&q=${q}`
        : `https://gen.pollinations.ai/audio/${q}?model=${aiModel}${apiKey ? `&key=${apiKey}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Erro ${res.status} ao gerar áudio`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      audioState.setLocalTracks([{
        id: `ai-${Date.now()}`,
        title: `[IA] ${aiPrompt.slice(0, 24)}`,
        url: objUrl,
        provider: 'local',
        category: aiModel === 'google-tts' ? 'narrative' : (aiModel === 'eleven-sfx' ? 'sfx' : 'ambience'),
        tags: ['IA'],
        volume: 1,
        isFavorite: false,
      }, ...audioState.localTracks]);
      setAiPrompt('');
      setIsAIOpen(false);
    } catch (e: any) {
      alert(e.message || 'Erro ao gerar áudio.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Memoized computed values
  const currentMusicTitle = useMemo(() => {
    if (!audioState.currentMusicId) return 'Nenhuma faixa';
    const t = audioState.localTracks.find(t => t.id === audioState.currentMusicId);
    return t?.name || t?.title || audioState.currentMusicTitle || 'Desconhecida';
  }, [audioState.currentMusicId, audioState.localTracks, audioState.currentMusicTitle]);

  const currentAmbienceTitle = useMemo(() => {
    if (!audioState.currentAmbienceId) return 'Nenhuma faixa';
    const t = audioState.localTracks.find(t => t.id === audioState.currentAmbienceId);
    return t?.name || t?.title || audioState.currentAmbienceTitle || 'Desconhecida';
  }, [audioState.currentAmbienceId, audioState.localTracks, audioState.currentAmbienceTitle]);

  const filteredTracks = useMemo(() => {
    const q = search.toLowerCase();
    return audioState.localTracks.filter(t => {
      const name = (t.name || t.title).toLowerCase();
      const matchSearch = !q || name.includes(q);
      const matchCat = catFilter === 'all' || t.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [audioState.localTracks, search, catFilter]);

  const windowHeight = isMicroplayer ? 50 : isMiniplayer ? 340 : 680;

  return (
    <DraggableWindow
      id="audioMixer"
      title="DOZERO Audio Mixer"
      initialX={window.innerWidth / 2 - 220}
      initialY={80}
      width={isMiniplayer || isMicroplayer ? 380 : 440}
      height={windowHeight}
      onClose={onClose}
      variant="glass"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#e5e5e5', overflow: 'hidden', background: '#0a0a0a' }}>

        {/* ── Header ── */}
        <div style={{ padding: '0.625rem 0.875rem', background: 'linear-gradient(180deg,#18181b,#0a0a0a)', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sliders size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>Audio Mixer</span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {needsPermission && (
              <button onClick={async () => {
                const perm = await savedDirHandle.requestPermission({ mode: 'read' });
                if (perm === 'granted') { setNeedsPermission(false); await loadDirectory(savedDirHandle); }
              }} style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '0.7rem' }}>
                🔓 Restaurar Faixas
              </button>
            )}
            {!isMicroplayer && (
              <>
                <button onClick={() => setIsAIOpen(p => !p)} style={{ ...btnBase, color: isAIOpen ? '#c084fc' : '#666', borderColor: isAIOpen ? '#a855f7' : '#444' }} title="Gerador IA">
                  <Sparkles size={13} />
                </button>
                <button onClick={handleLoadFolder} style={btnBase} title="Importar Pasta">
                  <HardDrive size={13} />
                </button>
              </>
            )}
            <button onClick={() => { if (isMicroplayer) { setIsMicroplayer(false); setIsMiniplayer(false); } else setIsMicroplayer(true); }}
              style={btnBase} title={isMicroplayer ? 'Expandir' : 'Modo Micro'}>
              {isMicroplayer ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            {!isMicroplayer && (
              <button onClick={() => setIsMiniplayer(p => !p)} style={btnBase} title={isMiniplayer ? 'Expandir' : 'Compactar'}>
                {isMiniplayer ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* ── Channels ── */}
        {!isMicroplayer && (
          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'radial-gradient(ellipse at 50% 0%,#1a1a1a,#0a0a0a)', borderBottom: '1px solid #1a1a1a' }}>
            <Channel
              label="CH 1 / MÚSICA" color="var(--accent-primary)" icon={<Music size={13} />}
              title={currentMusicTitle} isPlaying={audioState.isPlayingMusic}
              volume={audioState.musicVolume} progress={musicProgress} duration={musicDuration}
              loopMode={audioState.loopMode} isShuffle={audioState.isShuffle}
              onVolumeChange={v => audioEngine.setMusicVolume(v)}
              onPlayPause={() => audioState.isPlayingMusic ? audioEngine.pauseMusic() : audioEngine.resumeMusic()}
              onStop={() => audioEngine.stopMusic()}
              onSeekStart={() => { seekingRef.current.music = true; }}
              onSeekEnd={v => { seekingRef.current.music = false; audioEngine.seekMusic(v); }}
              onSeekChange={v => setMusicProgress(v)}
              onLoopCycle={() => {
                const modes = ['all', 'single', 'none'] as const;
                audioState.setLoopMode(modes[(modes.indexOf(audioState.loopMode) + 1) % 3]);
              }}
              onShuffleToggle={() => audioState.setIsShuffle(!audioState.isShuffle)}
            />
            <Channel
              label="CH 2 / AMBIENTE" color="var(--mana)" icon={<Zap size={13} />}
              title={currentAmbienceTitle} isPlaying={audioState.isPlayingAmbience}
              volume={audioState.ambienceVolume} progress={ambienceProgress} duration={ambienceDuration}
              onVolumeChange={v => audioEngine.setAmbienceVolume(v)}
              onPlayPause={() => audioState.isPlayingAmbience ? audioEngine.pauseAmbience() : audioEngine.resumeAmbience()}
              onStop={() => audioEngine.stopAmbience()}
              onSeekStart={() => { seekingRef.current.ambience = true; }}
              onSeekEnd={v => { seekingRef.current.ambience = false; audioEngine.seekAmbience(v); }}
              onSeekChange={v => setAmbienceProgress(v)}
            />
          </div>
        )}

        {/* ── Library / Presets ── */}
        {!isMiniplayer && !isMicroplayer && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a' }}>
              {(['library', 'presets', 'soundboard', 'web'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex: 1, padding: '0.5rem', background: activeTab === tab ? '#111' : 'transparent',
                  border: 'none', borderBottom: activeTab === tab ? '2px solid #a855f7' : '2px solid transparent',
                  color: activeTab === tab ? '#e5e5e5' : '#555', cursor: 'pointer', fontSize: '0.70rem',
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.15s'
                }}>
                  {tab === 'library' && `📁 Biblioteca (${audioState.localTracks.length})`}
                  {tab === 'presets' && '🎬 Presets'}
                  {tab === 'soundboard' && '🎛️ Soundboard'}
                  {tab === 'web' && '🌐 Web (Todos)'}
                </button>
              ))}
            </div>

            {activeTab === 'library' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* AI Generator */}
                {isAIOpen && (
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#111' }}>
                    <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={13} /> Gerador de Áudio IA
                    </span>
                    <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleGenerateAI()}
                      placeholder="Ex: chuva em floresta, batalha épica..."
                      disabled={isGenerating}
                      style={{ background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '0.5rem', fontSize: '0.8rem', outline: 'none' }} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select value={aiModel} onChange={e => setAiModel(e.target.value as any)} disabled={isGenerating}
                        style={{ flex: 1, background: '#222', color: '#e5e5e5', border: '1px solid #444', borderRadius: '4px', padding: '0.4rem', fontSize: '0.75rem' }}>
                        <option value="google-tts">Narração TTS (grátis)</option>
                        <option value="eleven-sfx">SFX (Pollinations)</option>
                        <option value="stable-audio">Música (Pollinations)</option>
                      </select>
                      {aiModel !== 'google-tts' && (
                        <input type="password" value={apiKey}
                          onChange={e => { setApiKey(e.target.value); localStorage.setItem('pollinations_api_key', e.target.value); }}
                          placeholder="API Key" disabled={isGenerating}
                          style={{ flex: 1, background: '#222', border: '1px solid #444', color: '#e5e5e5', borderRadius: '4px', padding: '0.4rem', fontSize: '0.75rem' }} />
                      )}
                      <button onClick={handleGenerateAI} disabled={isGenerating || !aiPrompt.trim()}
                        style={{ background: isGenerating || !aiPrompt.trim() ? '#333' : '#a855f7', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.4rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        {isGenerating ? <><Loader2 size={13} className="animate-spin" /> Gerando...</> : <><Sparkles size={13} /> Gerar</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Search + Category filter */}
                <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#0d0d0d' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#111', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '0.35rem 0.6rem' }}>
                    <Search size={13} color="#555" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar faixa..."
                      style={{ flex: 1, background: 'transparent', border: 'none', color: '#e5e5e5', outline: 'none', fontSize: '0.8rem' }} />
                    {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0 }}><X size={12} /></button>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setCatFilter('all')} style={{ ...btnBase, fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: catFilter === 'all' ? '#333' : '#111', color: catFilter === 'all' ? '#e5e5e5' : '#666' }}>
                      Todas
                    </button>
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setCatFilter(cat)} style={{ ...btnBase, fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: catFilter === cat ? CATEGORY_COLORS[cat] + '33' : '#111', color: catFilter === cat ? CATEGORY_COLORS[cat] : '#666', borderColor: catFilter === cat ? CATEGORY_COLORS[cat] : '#2a2a2a' }}>
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Track list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {filteredTracks.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4 }}>
                      <Music size={28} color="#444" />
                      <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.75rem', textAlign: 'center' }}>
                        {audioState.localTracks.length === 0 ? 'Nenhuma música carregada.\nClique em 💾 para importar uma pasta.' : 'Nenhuma faixa encontrada.'}
                      </p>
                    </div>
                  ) : filteredTracks.map(track => {
                    const isPlayingMusic = audioState.currentMusicId === track.id && audioState.isPlayingMusic;
                    const isPlayingAmbience = audioState.currentAmbienceId === track.id && audioState.isPlayingAmbience;
                    const displayName = track.name || track.title;
                    const catColor = CATEGORY_COLORS[track.category];

                    return (
                      <div key={track.id} style={{
                        background: '#111', borderRadius: '6px', padding: '0.4rem 0.6rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        border: `1px solid ${isPlayingMusic || isPlayingAmbience ? catColor + '66' : '#1e1e1e'}`,
                        boxShadow: isPlayingMusic || isPlayingAmbience ? `0 0 8px ${catColor}22` : 'none',
                        transition: 'all 0.15s',
                      }}>
                        {/* Category dot (clickable to cycle) */}
                        <button onClick={() => {
                          const idx = CATEGORIES.indexOf(track.category);
                          audioState.changeCategory(track.id, CATEGORIES[(idx + 1) % CATEGORIES.length]);
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }} title={`Categoria: ${CATEGORY_LABELS[track.category]} (clique para mudar)`}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: catColor }} />
                        </button>

                        {/* Name (double-click to edit) */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {editingId === track.id ? (
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <input
                                autoFocus
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { audioState.renameTrack(track.id, editingName || track.title); setEditingId(null); }
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                style={{ flex: 1, background: '#000', border: '1px solid #a855f7', color: '#fff', borderRadius: '3px', padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                              />
                              <button onClick={() => { audioState.renameTrack(track.id, editingName || track.title); setEditingId(null); }} style={{ ...btnBase, padding: '0.15rem 0.3rem', color: '#10b981' }}><Check size={11} /></button>
                              <button onClick={() => setEditingId(null)} style={{ ...btnBase, padding: '0.15rem 0.3rem', color: '#ef4444' }}><X size={11} /></button>
                            </div>
                          ) : (
                            <span
                              onDoubleClick={() => { setEditingId(track.id); setEditingName(track.name || track.title); }}
                              title="Clique duplo para renomear"
                              style={{ fontSize: '0.78rem', color: isPlayingMusic || isPlayingAmbience ? '#e5e5e5' : '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', cursor: 'text' }}
                            >
                              {displayName}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
                          <button onClick={() => audioState.toggleFavorite(track.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: track.isFavorite ? '#f59e0b' : '#333', padding: '0.2rem' }}>
                            {track.isFavorite ? <Star size={11} fill="#f59e0b" /> : <StarOff size={11} />}
                          </button>
                          <button onClick={() => audioEngine.playMusic(track, audioState.musicVolume)} style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer' }} title="Tocar como Música (CH1)">
                            <Music size={11} />
                          </button>
                          <button onClick={() => audioEngine.playAmbience(track, audioState.ambienceVolume)} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: 'var(--mana)', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer' }} title="Tocar como Ambiente (CH2)">
                            <Volume2 size={11} />
                          </button>
                          <button onClick={() => audioEngine.playSFX({ ...track, icon: undefined } as unknown as SoundboardItem)} style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', color: '#fde047', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer' }} title="Efeito Rápido (SFX)">
                            <Zap size={11} />
                          </button>
                          <button onClick={() => {
                            const isPinned = audioState.soundboard.some(s => s.id === track.id);
                            if (isPinned) audioState.removeSoundboardItem(track.id);
                            else audioState.addSoundboardItem({
                              id: track.id, title: displayName, url: track.url, provider: track.provider, fileHandle: track.fileHandle, volume: 1
                            });
                          }} style={{ background: audioState.soundboard.some(s => s.id === track.id) ? 'rgba(168,85,247,0.2)' : 'transparent', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer' }} title={audioState.soundboard.some(s => s.id === track.id) ? "Remover do Soundboard" : "Fixar no Soundboard"}>
                            <LayoutGrid size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'presets' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Create new preset */}
                <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Novo Preset de Cena</span>
                  <div style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.5 }}>
                    Preset salva a faixa de música e ambiente <strong style={{ color: '#888' }}>atualmente tocando</strong>. Um clique dispara ambas.
                  </div>
                  <input value={newPresetName} onChange={e => setNewPresetName(e.target.value)}
                    placeholder="Nome do preset (ex: Floresta Noturna)"
                    style={{ background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', outline: 'none' }}
                    onKeyDown={e => e.key === 'Enter' && newPresetName.trim() && (() => {
                      audioState.addScenePreset({ name: newPresetName.trim(), musicTrackId: audioState.currentMusicId, ambienceTrackId: audioState.currentAmbienceId });
                      setNewPresetName('');
                    })()}
                  />
                  <button onClick={() => {
                    if (!newPresetName.trim()) return;
                    audioState.addScenePreset({ name: newPresetName.trim(), musicTrackId: audioState.currentMusicId, ambienceTrackId: audioState.currentAmbienceId });
                    setNewPresetName('');
                  }} style={{ background: audioState.currentMusicId || audioState.currentAmbienceId ? '#a855f7' : '#333', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                    <Plus size={13} /> Salvar Preset Atual
                  </button>
                </div>

                {/* Preset list */}
                {audioState.scenePresets.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#444', fontSize: '0.8rem', padding: '2rem 0' }}>
                    Nenhum preset criado ainda.
                  </div>
                ) : audioState.scenePresets.map(preset => {
                  const musicTrack = audioState.localTracks.find(t => t.id === preset.musicTrackId);
                  const ambienceTrack = audioState.localTracks.find(t => t.id === preset.ambienceTrackId);
                  return (
                    <div key={preset.id} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e5e5e5', marginBottom: '0.25rem' }}>{preset.name}</div>
                        <div style={{ fontSize: '0.68rem', color: '#555', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <span><Music size={9} style={{ display: 'inline', marginRight: 3 }} color="var(--accent-primary)" />{musicTrack?.name || musicTrack?.title || 'Sem música'}</span>
                          <span><Zap size={9} style={{ display: 'inline', marginRight: 3 }} color="var(--mana)" />{ambienceTrack?.name || ambienceTrack?.title || 'Sem ambiente'}</span>
                        </div>
                      </div>
                      <button onClick={() => audioState.triggerMacro(preset.id)} style={{ background: '#a855f7', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Play size={12} /> Tocar
                      </button>
                      <button onClick={() => audioState.removeScenePreset(preset.id)} style={{ ...btnBase, color: '#ef4444', borderColor: '#3f1d1d', background: '#1a0a0a' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'soundboard' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                {audioState.soundboard.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#444', fontSize: '0.8rem', padding: '2rem 0' }}>
                    O Soundboard está vazio.<br/>Fixe faixas da biblioteca clicando no ícone de grade.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                    {audioState.soundboard.map((item) => (
                      <div key={item.id} style={{ position: 'relative' }}>
                        <button
                          onClick={() => audioEngine.playSFX(item)}
                          style={{
                            width: '100%',
                            aspectRatio: '1',
                            background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            color: '#e5e5e5',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                            transition: 'all 0.1s ease',
                          }}
                          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.borderColor = '#fde047'; }}
                          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#444'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#444'; }}
                        >
                          <div style={{ fontSize: '1.5rem' }}>{item.icon || '⚡'}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 600, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.2 }}>
                            {item.title}
                          </div>
                        </button>
                        <button
                          onClick={() => audioState.removeSoundboardItem(item.id)}
                          style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'var(--text-primary)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          title="Remover"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'web' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <Sparkles size={12} color="var(--accent-primary)" /> Transmitir Música para Todos (YouTube/Web)
                  </span>
                  <div style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.5 }}>
                    Cole um link do YouTube ou de um MP3 direto. Ele tocará instantaneamente no navegador de todos os jogadores conectados.
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      value={webMusicUrl}
                      onChange={e => setWebMusicUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      style={{ flex: 1, background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', outline: 'none' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                           if (webMusicUrl.trim()) {
                              import('../../../services/yjs').then(({ state }) => {
                                 state.audio.set('music', { url: webMusicUrl.trim(), isPlaying: true, ts: Date.now() });
                              });
                           }
                        }
                      }}
                    />
                    <button onClick={() => {
                      if (webMusicUrl.trim()) {
                         import('../../../services/yjs').then(({ state }) => {
                            state.audio.set('music', { url: webMusicUrl.trim(), isPlaying: true, ts: Date.now() });
                         });
                      }
                    }} style={{ background: '#a855f7', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.4rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Play size={13} /> Transmitir
                    </button>
                  </div>
                  
                  {/* Controles de Play/Pause/Stop da música global ativa */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={() => {
                       import('../../../services/yjs').then(({ state }) => {
                          const currentMusic = state.audio.get('music') as any;
                          if (currentMusic && currentMusic.url) {
                             state.audio.set('music', { ...currentMusic, isPlaying: !currentMusic.isPlaying, ts: Date.now() });
                          }
                       });
                    }} style={{ flex: 1, background: '#222', color: '#e5e5e5', border: '1px solid #444', borderRadius: '4px', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Pause size={13} /> Pausar / Retomar
                    </button>
                    <button onClick={() => {
                       import('../../../services/yjs').then(({ state }) => {
                          state.audio.set('music', { url: '', isPlaying: false, ts: Date.now() });
                          setWebMusicUrl('');
                       });
                    }} style={{ flex: 1, background: '#3f1d1d', color: 'var(--danger)', border: '1px solid #7f1d1d', borderRadius: '4px', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Square size={13} /> Parar (Remover)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DraggableWindow>
  );
};
