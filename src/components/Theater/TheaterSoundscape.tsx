// src/components/Theater/TheaterSoundscape.tsx
import React, { useState, useRef } from 'react';
import { 
  Volume2, VolumeX, Play, Pause, Square, Music, 
  CloudRain, Flame, Wind, ShieldAlert, Sparkles, X, 
  Disc, Sliders, Link, Bell, Zap, Swords, DoorClosed, 
  Trophy, Plus, Upload, Check, Radio, ListMusic
} from 'lucide-react';
import { useAudioStore } from '../../store/audioStore';
import { audioEngine } from '../../services/AudioEngine';
import { useSceneState } from './hooks/useSceneState';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type SoundTab = 'ambience' | 'music' | 'sfx';

// Atmospheric Ambient Loops
export const AMBIENT_PRESETS = [
  { id: 'rain', name: 'Tempestade & Chuva', icon: <CloudRain size={16} />, color: '#38bdf8', url: '/audio/ambience/rain.wav' },
  { id: 'tavern', name: 'Taverna & Lareira', icon: <Flame size={16} />, color: '#f97316', url: '/audio/ambience/tavern.wav' },
  { id: 'wind', name: 'Vento Gélido', icon: <Wind size={16} />, color: '#94a3b8', url: '/audio/ambience/wind.wav' },
  { id: 'combat', name: 'Tensão de Batalha', icon: <ShieldAlert size={16} />, color: '#ef4444', url: '/audio/ambience/combat.wav' },
  { id: 'cave', name: 'Caverna & Cripta', icon: <Sparkles size={16} />, color: '#a855f7', url: '/audio/ambience/cave.wav' },
  { id: 'forest', name: 'Floresta Misteriosa', icon: <Bell size={16} />, color: '#10b981', url: '/audio/ambience/forest.wav' },
  { id: 'crickets', name: 'Noite Estrelada', icon: <Sparkles size={16} />, color: '#6366f1', url: '/audio/ambience/crickets.wav' },
  { id: 'water', name: 'Rio & Cachoeira', icon: <CloudRain size={16} />, color: '#06b6d4', url: '/audio/ambience/water.wav' },
];

export const MUSIC_PRESETS = [
  { id: 'epic_journey', name: 'Jornada Épica (Sinfonia)', color: '#ec4899', url: '/audio/music/epic_journey.mp3' },
  { id: 'tavern_vibe', name: 'Taverna Festiva', color: '#f59e0b', url: '/audio/music/tavern_vibe.mp3' },
  { id: 'dark_suspense', name: 'Suspense & Mistério', color: '#8b5cf6', url: '/audio/ambience/cave.wav' },
];

export const SFX_PRESETS = [
  { id: 'sfx_thunder', name: 'Relâmpago / Trovão', icon: <Zap size={14} />, color: '#38bdf8', url: '/audio/sfx/thunder.mp3' },
  { id: 'sfx_sword', name: 'Golpe de Espada', icon: <Swords size={14} />, color: '#ef4444', url: '/audio/sfx/sword.mp3' },
  { id: 'sfx_impact', name: 'Impacto / Pancada', icon: <ShieldAlert size={14} />, color: '#f97316', url: '/audio/sfx/impact.mp3' },
  { id: 'sfx_door', name: 'Porta de Masmorra', icon: <DoorClosed size={14} />, color: '#a855f7', url: '/audio/sfx/door.mp3' },
  { id: 'sfx_magic', name: 'Magia Arcana', icon: <Sparkles size={14} />, color: '#10b981', url: '/audio/sfx/magic.mp3' },
  { id: 'sfx_alarm', name: 'Alarme / Tensão', icon: <Bell size={14} />, color: '#f59e0b', url: '/audio/sfx/alarm.mp3' },
  { id: 'sfx_victory', name: 'Vitória', icon: <Trophy size={14} />, color: '#eab308', url: '/audio/sfx/victory.mp3' },
  { id: 'sfx_loot', name: 'Tesouro / Ouro', icon: <Sparkles size={14} />, color: '#eab308', url: '/audio/sfx/loot.mp3' },
  { id: 'sfx_dice', name: 'Rolagem de Dados', icon: <Disc size={14} />, color: '#94a3b8', url: '/audio/sfx/dice.mp3' },
];

export const TheaterSoundscape: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SoundTab>('ambience');
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    musicVolume, ambienceVolume, setVolume, 
    isPlayingMusic, isPlayingAmbience,
    currentMusicId, currentAmbienceId,
    currentMusicTitle, currentAmbienceTitle,
    localTracks, playlist
  } = useAudioStore();

  const { currentScene, patchCurrentScene } = useSceneState();

  if (!isOpen) return null;

  // --- AMBIENCE HANDLERS ---
  const handlePlayAmbiencePreset = (preset: typeof AMBIENT_PRESETS[0]) => {
    if (currentAmbienceId === preset.id && isPlayingAmbience) {
      audioEngine.pauseAmbience();
      toast.info('Ambiente pausado.');
    } else if (currentAmbienceId === preset.id && !isPlayingAmbience) {
      audioEngine.resumeAmbience();
      toast.success(`Retomando: ${preset.name}`);
    } else {
      audioEngine.playAmbience(preset.url, preset.name, preset.id);
      toast.success(`Tocando ambiente: ${preset.name}`);
    }
  };

  const handleStopAmbience = () => {
    audioEngine.stopAmbience();
    toast.info('Som ambiente interrompido.');
  };

  const handleLinkAmbienceToScene = (presetId?: string) => {
    if (!currentScene) return;
    const targetId = presetId || currentAmbienceId;
    if (!targetId) {
      toast.warn('Selecione ou toque um ambiente primeiro para vincular.');
      return;
    }
    patchCurrentScene({ ambiencePresetId: targetId });
    const targetName = AMBIENT_PRESETS.find(p => p.id === targetId)?.name || 'Ambiente';
    toast.success(`"${targetName}" vinculado à cena "${currentScene.title}"!`);
  };

  const handleUnlinkAmbience = () => {
    if (!currentScene) return;
    patchCurrentScene({ ambiencePresetId: undefined });
    toast.info('Vínculo de som ambiente removido da cena.');
  };

  // --- MUSIC HANDLERS ---
  const handlePlayMusicPreset = (preset: typeof MUSIC_PRESETS[0]) => {
    if (currentMusicId === preset.id && isPlayingMusic) {
      audioEngine.pauseMusic();
      toast.info('Música pausada.');
    } else if (currentMusicId === preset.id && !isPlayingMusic) {
      audioEngine.resumeMusic();
      toast.success(`Retomando: ${preset.name}`);
    } else {
      audioEngine.playMusic(preset.url, preset.name, preset.id);
      toast.success(`Tocando música: ${preset.name}`);
    }
  };

  const handleStopMusic = () => {
    audioEngine.stopMusic();
    toast.info('Música interrompida.');
  };

  const handleLinkMusicToScene = (musicId?: string) => {
    if (!currentScene) return;
    const targetId = musicId || currentMusicId;
    if (!targetId) {
      toast.warn('Toque uma música primeiro para vinculá-la.');
      return;
    }
    patchCurrentScene({ musicPresetId: targetId });
    toast.success(`Trilha vinculada à cena "${currentScene.title}"!`);
  };

  // --- SFX HANDLER ---
  const handlePlaySFX = (sfx: typeof SFX_PRESETS[0]) => {
    audioEngine.playSFX({
      id: sfx.id,
      name: sfx.name,
      url: sfx.url,
      volume: 1,
    });
  };

  // --- CUSTOM AUDIO UPLOAD & URL ---
  const handlePlayCustomUrl = () => {
    if (!customUrl.trim()) {
      toast.warn('Insira a URL do áudio.');
      return;
    }
    const name = customName.trim() || 'Áudio Personalizado';
    if (activeTab === 'ambience') {
      audioEngine.playAmbience(customUrl.trim(), name, `custom_amb_${Date.now()}`);
      toast.success(`Tocando ambiente: ${name}`);
    } else {
      audioEngine.playMusic(customUrl.trim(), name, `custom_mus_${Date.now()}`);
      toast.success(`Tocando música: ${name}`);
    }
    setCustomUrl('');
    setCustomName('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^/.]+$/, '');
    if (activeTab === 'ambience') {
      audioEngine.playAmbience(url, name, `local_amb_${Date.now()}`);
      toast.success(`Carregado e tocando: ${name}`);
    } else {
      audioEngine.playMusic(url, name, `local_mus_${Date.now()}`);
      toast.success(`Carregado e tocando: ${name}`);
    }
    e.target.value = '';
  };

  return (
    <div className="theater-soundscape-overlay" onClick={onClose}>
      <div 
        className="theater-soundscape-modal" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '560px' }}
      >
        {/* Header */}
        <div className="theater-soundscape-header">
          <div className="theater-soundscape-title-group">
            <Radio size={16} color="#ec4899" />
            <h3>Jukebox & Soundscape do Teatro</h3>
          </div>
          <button onClick={onClose} className="theater-soundscape-close">
            <X size={16} />
          </button>
        </div>

        {/* Master Mixers (Live Audio Controls) */}
        <div className="theater-soundscape-mixers">
          {/* Music Channel */}
          <div className="theater-mixer-card">
            <div className="theater-mixer-label">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Disc size={14} color="#ec4899" className={isPlayingMusic ? 'spin' : ''} />
                <span>Música ({Math.round(musicVolume * 100)}%)</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className="theater-mixer-mute"
                  onClick={() => isPlayingMusic ? audioEngine.pauseMusic() : (currentMusicId ? audioEngine.resumeMusic() : handlePlayMusicPreset(MUSIC_PRESETS[0]))}
                  title={isPlayingMusic ? 'Pausar Música' : 'Tocar Música'}
                >
                  {isPlayingMusic ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button 
                  className="theater-mixer-mute"
                  onClick={handleStopMusic}
                  title="Parar Música"
                >
                  <Square size={12} />
                </button>
                <button 
                  className="theater-mixer-mute"
                  onClick={() => setVolume('music', musicVolume > 0 ? 0 : 0.7)}
                  title={musicVolume === 0 ? 'Desmutar' : 'Mutar'}
                >
                  {musicVolume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
              </div>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={musicVolume}
              onChange={e => setVolume('music', parseFloat(e.target.value))}
              className="theater-fader"
            />
            <div className="theater-mixer-now-playing" title={currentMusicTitle || 'Nenhuma música tocando'}>
              {isPlayingMusic ? `🎵 ${currentMusicTitle}` : (currentMusicTitle ? `⏸️ ${currentMusicTitle} (Pausado)` : 'Nenhuma música tocando')}
            </div>
          </div>

          {/* Ambience Channel */}
          <div className="theater-mixer-card">
            <div className="theater-mixer-label">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} color="#38bdf8" />
                <span>Ambiente ({Math.round(ambienceVolume * 100)}%)</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className="theater-mixer-mute"
                  onClick={() => isPlayingAmbience ? audioEngine.pauseAmbience() : (currentAmbienceId ? audioEngine.resumeAmbience() : handlePlayAmbiencePreset(AMBIENT_PRESETS[0]))}
                  title={isPlayingAmbience ? 'Pausar Ambiente' : 'Tocar Ambiente'}
                >
                  {isPlayingAmbience ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button 
                  className="theater-mixer-mute"
                  onClick={handleStopAmbience}
                  title="Parar Ambiente"
                >
                  <Square size={12} />
                </button>
                <button 
                  className="theater-mixer-mute"
                  onClick={() => setVolume('ambience', ambienceVolume > 0 ? 0 : 0.4)}
                  title={ambienceVolume === 0 ? 'Desmutar' : 'Mutar'}
                >
                  {ambienceVolume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
              </div>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={ambienceVolume}
              onChange={e => setVolume('ambience', parseFloat(e.target.value))}
              className="theater-fader"
            />
            <div className="theater-mixer-now-playing" title={currentAmbienceTitle || 'Nenhum ambiente ativo'}>
              {isPlayingAmbience ? `🌿 ${currentAmbienceTitle}` : (currentAmbienceTitle ? `⏸️ ${currentAmbienceTitle} (Pausado)` : 'Nenhum ambiente ativo')}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
          <button 
            onClick={() => setActiveTab('ambience')}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '6px', border: 'none',
              background: activeTab === 'ambience' ? 'rgba(56,189,248,0.2)' : 'transparent',
              color: activeTab === 'ambience' ? '#38bdf8' : '#94a3b8',
              fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <CloudRain size={14} />
            Som Ambiente
          </button>
          <button 
            onClick={() => setActiveTab('music')}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '6px', border: 'none',
              background: activeTab === 'music' ? 'rgba(236,72,153,0.2)' : 'transparent',
              color: activeTab === 'music' ? '#ec4899' : '#94a3b8',
              fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Music size={14} />
            Trilhas Musicais
          </button>
          <button 
            onClick={() => setActiveTab('sfx')}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '6px', border: 'none',
              background: activeTab === 'sfx' ? 'rgba(245,158,11,0.2)' : 'transparent',
              color: activeTab === 'sfx' ? '#f59e0b' : '#94a3b8',
              fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Zap size={14} />
            Efeitos (SFX)
          </button>
        </div>

        {/* Tab 1: SOM AMBIENTE (Soundscape) */}
        {activeTab === 'ambience' && (
          <div className="theater-soundscape-section">
            <div className="theater-soundscape-section-header">
              <h4>Loops Atmosféricos</h4>
              {currentScene && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentScene.ambiencePresetId ? (
                    <button 
                      onClick={handleUnlinkAmbience}
                      className="theater-link-sound-btn"
                      style={{ borderColor: '#ef4444', color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}
                      title="Desvincular som da cena atual"
                    >
                      <span>Desvincular Cena</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleLinkAmbienceToScene()}
                      className="theater-link-sound-btn"
                      title="Tocar este som automaticamente ao entrar nesta cena"
                    >
                      <Link size={12} />
                      <span>Vincular à Cena</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="theater-presets-grid">
              {AMBIENT_PRESETS.map(preset => {
                const isPlaying = currentAmbienceId === preset.id && isPlayingAmbience;
                const isLinked = currentScene?.ambiencePresetId === preset.id;

                return (
                  <button 
                    key={preset.id}
                    onClick={() => handlePlayAmbiencePreset(preset)}
                    className={`theater-preset-btn ${isPlaying ? 'active' : ''}`}
                    style={{
                      borderColor: isPlaying ? preset.color : (isLinked ? '#10b981' : undefined),
                      boxShadow: isPlaying ? `0 0 16px ${preset.color}40` : undefined,
                    }}
                  >
                    <div 
                      className="theater-preset-icon"
                      style={{ color: preset.color, background: `${preset.color}15` }}
                    >
                      {isPlaying ? <Pause size={16} /> : preset.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span className="theater-preset-name">{preset.name}</span>
                      {isLinked && (
                        <div style={{ fontSize: '0.6rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Check size={10} /> Vinculado à Cena
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: TRILHAS MUSICAIS (Jukebox) */}
        {activeTab === 'music' && (
          <div className="theater-soundscape-section">
            <div className="theater-soundscape-section-header">
              <h4>Trilhas Rápidas</h4>
              {currentScene && (
                <button 
                  onClick={() => handleLinkMusicToScene()}
                  className="theater-link-sound-btn"
                  title="Vincular música à cena"
                >
                  <Link size={12} />
                  <span>Vincular Música à Cena</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {MUSIC_PRESETS.map(preset => {
                const isPlaying = currentMusicId === preset.id && isPlayingMusic;
                const isLinked = currentScene?.musicPresetId === preset.id;

                return (
                  <div 
                    key={preset.id}
                    onClick={() => handlePlayMusicPreset(preset)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                      background: isPlaying ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isPlaying ? '#ec4899' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ color: preset.color, display: 'flex' }}>
                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#f1f5f9', fontWeight: 600 }}>{preset.name}</span>
                    </div>
                    {isLinked && (
                      <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 700 }}>Vinculado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: SFX SOUNDBOARD (Efeitos Sonoros) */}
        {activeTab === 'sfx' && (
          <div className="theater-soundscape-section">
            <div className="theater-soundscape-section-header">
              <h4>Soundboard de Ação Rápida</h4>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Disparo de 1 clique</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {SFX_PRESETS.map(sfx => (
                <button 
                  key={sfx.id}
                  onClick={() => handlePlaySFX(sfx)}
                  className="theater-preset-btn"
                  style={{
                    flexDirection: 'column', padding: '10px 8px', gap: '6px', textAlign: 'center',
                    justifyContent: 'center', borderColor: 'rgba(255,255,255,0.08)'
                  }}
                >
                  <div 
                    className="theater-preset-icon"
                    style={{ color: sfx.color, background: `${sfx.color}20`, margin: '0 auto' }}
                  >
                    {sfx.icon}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e2e8f0' }}>{sfx.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Audio Importer (URL or File) */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder={`URL do ${activeTab === 'ambience' ? 'ambiente' : 'áudio'} (mp3, ogg, wav)...`}
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
              className="theater-vault-input flex-1"
              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
            />
            <button 
              onClick={handlePlayCustomUrl}
              style={{
                padding: '6px 12px', background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.4)',
                borderRadius: '6px', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Tocar URL
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px', color: '#cbd5e1', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
              title="Carregar arquivo do computador"
            >
              <Upload size={13} />
              <span>Arquivo</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="audio/*" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
