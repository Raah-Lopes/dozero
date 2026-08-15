// src/components/Theater/TheaterSoundscape.tsx
import React, { useState } from 'react';
import { 
  Volume2, VolumeX, Play, Pause, SkipForward, Music, 
  CloudRain, Flame, Wind, ShieldAlert, Sparkles, X, 
  Disc, Sliders, Link, Bell
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

// Curated atmospheric ambient loops
const AMBIENT_PRESETS = [
  { id: 'rain', name: 'Tempestade & Chuva', icon: <CloudRain size={16} />, color: '#38bdf8', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg' },
  { id: 'tavern', name: 'Taverna & Lareira', icon: <Flame size={16} />, color: '#f97316', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
  { id: 'wind', name: 'Vento Gélido / Montanha', icon: <Wind size={16} />, color: '#94a3b8', url: 'https://actions.google.com/sounds/v1/weather/wind_strong_whistling.ogg' },
  { id: 'combat', name: 'Tensão de Batalha', icon: <ShieldAlert size={16} />, color: '#ef4444', url: 'https://actions.google.com/sounds/v1/ambiences/battle_tents.ogg' },
  { id: 'cave', name: 'Caverna & Cripta', icon: <Sparkles size={16} />, color: '#a855f7', url: 'https://actions.google.com/sounds/v1/ambiences/cave_water_drips.ogg' },
  { id: 'forest', name: 'Floresta Misteriosa', icon: <Bell size={16} />, color: '#10b981', url: 'https://actions.google.com/sounds/v1/ambiences/forest_birds.ogg' },
];

export const TheaterSoundscape: React.FC<Props> = ({ isOpen, onClose }) => {
  const { 
    musicVolume, ambienceVolume, setVolume, 
    isPlayingMusic, isPlayingAmbience,
    currentMusicTitle, currentAmbienceTitle,
    playlist 
  } = useAudioStore();

  const { currentScene, patchCurrentScene } = useSceneState();
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePlayPreset = (preset: typeof AMBIENT_PRESETS[0]) => {
    if (activePresetId === preset.id && isPlayingAmbience) {
      audioEngine.stopAmbience();
      setActivePresetId(null);
      toast.info('Ambiente pausado.');
    } else {
      audioEngine.playAmbience(preset.url, preset.name, preset.id);
      setActivePresetId(preset.id);
      toast.success(`Ambiente: ${preset.name}`);
    }
  };

  const handleLinkToScene = () => {
    if (!currentScene) return;
    if (activePresetId) {
      patchCurrentScene({ ambiencePresetId: activePresetId });
      toast.success(`Ambiente vinculado à cena "${currentScene.title}"!`);
    } else {
      toast.info('Toque um ambiente primeiro para vinculá-lo.');
    }
  };

  return (
    <div className="theater-soundscape-overlay" onClick={onClose}>
      <div 
        className="theater-soundscape-modal" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="theater-soundscape-header">
          <div className="theater-soundscape-title-group">
            <Music size={16} color="#ec4899" />
            <h3>Jukebox & Soundscape do Teatro</h3>
          </div>
          <button onClick={onClose} className="theater-soundscape-close">
            <X size={16} />
          </button>
        </div>

        {/* Volume Mixers */}
        <div className="theater-soundscape-mixers">
          <div className="theater-mixer-card">
            <div className="theater-mixer-label">
              <Disc size={14} color="#ec4899" />
              <span>Música ({Math.round(musicVolume * 100)}%)</span>
              <button 
                className="theater-mixer-mute"
                onClick={() => setVolume('music', musicVolume > 0 ? 0 : 0.7)}
              >
                {musicVolume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
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
            <div className="theater-mixer-now-playing">
              {currentMusicTitle ? `🎵 ${currentMusicTitle}` : 'Nenhuma música tocando'}
            </div>
          </div>

          <div className="theater-mixer-card">
            <div className="theater-mixer-label">
              <Sliders size={14} color="#38bdf8" />
              <span>Ambiente ({Math.round(ambienceVolume * 100)}%)</span>
              <button 
                className="theater-mixer-mute"
                onClick={() => setVolume('ambience', ambienceVolume > 0 ? 0 : 0.5)}
              >
                {ambienceVolume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
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
            <div className="theater-mixer-now-playing">
              {currentAmbienceTitle ? `🌿 ${currentAmbienceTitle}` : 'Nenhum ambiente ativo'}
            </div>
          </div>
        </div>

        {/* Atmosphere Soundscape Presets */}
        <div className="theater-soundscape-section">
          <div className="theater-soundscape-section-header">
            <h4>Ambientes Rápidos</h4>
            {activePresetId && (
              <button 
                onClick={handleLinkToScene}
                className="theater-link-sound-btn"
                title="Tocar este som automaticamente ao entrar nesta cena"
              >
                <Link size={12} />
                <span>Vincular à Cena</span>
              </button>
            )}
          </div>

          <div className="theater-presets-grid">
            {AMBIENT_PRESETS.map(preset => {
              const isActive = activePresetId === preset.id && isPlayingAmbience;
              return (
                <button 
                  key={preset.id}
                  onClick={() => handlePlayPreset(preset)}
                  className={`theater-preset-btn ${isActive ? 'active' : ''}`}
                  style={{
                    borderColor: isActive ? preset.color : undefined,
                    boxShadow: isActive ? `0 0 16px ${preset.color}40` : undefined,
                  }}
                >
                  <div 
                    className="theater-preset-icon"
                    style={{ color: preset.color, background: `${preset.color}15` }}
                  >
                    {isActive ? <Pause size={16} /> : preset.icon}
                  </div>
                  <span className="theater-preset-name">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
