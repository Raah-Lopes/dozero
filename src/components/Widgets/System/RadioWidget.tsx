import React, { useState } from 'react';
import { 
  Radio as RadioIcon, Volume2, VolumeX, CloudRain, Flame, Wind, 
  ShieldAlert, Sparkles, Bell, Music, Play, Pause, Square, Link, Check, Sliders
} from 'lucide-react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { useAudioStore } from '../../../store/audioStore';
import { audioEngine } from '../../../services/AudioEngine';
import { useSceneState } from '../../Theater/hooks/useSceneState';
import { toast } from '../../UI/Toast';

interface Props {
  onClose: () => void;
}

export const RADIO_PRESETS = [
  { id: 'tavern', name: 'Taverna & Lareira', category: 'Civilização', icon: Flame, color: '#f97316', url: '/audio/ambience/tavern.wav' },
  { id: 'rain', name: 'Tempestade & Chuva', category: 'Natureza', icon: CloudRain, color: '#38bdf8', url: '/audio/ambience/rain.wav' },
  { id: 'forest', name: 'Floresta Ancestral', category: 'Natureza', icon: Bell, color: '#10b981', url: '/audio/ambience/forest.wav' },
  { id: 'water', name: 'Rio & Cachoeira', category: 'Natureza', icon: CloudRain, color: '#06b6d4', url: '/audio/ambience/water.wav' },
  { id: 'crickets', name: 'Noite Estrelada', category: 'Natureza', icon: Sparkles, color: '#6366f1', url: '/audio/ambience/crickets.wav' },
  { id: 'wind', name: 'Vento Gélido & Nevasca', category: 'Natureza', icon: Wind, color: '#94a3b8', url: '/audio/ambience/wind.wav' },
  { id: 'cave', name: 'Caverna & Cripta', category: 'Masmorra', icon: Sparkles, color: '#a855f7', url: '/audio/ambience/cave.wav' },
  { id: 'combat', name: 'Tensão de Batalha', category: 'Combate', icon: ShieldAlert, color: '#ef4444', url: '/audio/ambience/combat.wav' },
];

export const RadioWidget: React.FC<Props> = ({ onClose }) => {
  const { 
    ambienceVolume, musicVolume, setVolume,
    isPlayingAmbience, currentAmbienceId, currentAmbienceTitle 
  } = useAudioStore();

  const { currentScene, patchCurrentScene } = useSceneState();
  const [crossfadeMs, setCrossfadeMs] = useState<number>(2000);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  const handleTuneStation = (preset: typeof RADIO_PRESETS[0]) => {
    if (currentAmbienceId === preset.id && isPlayingAmbience) {
      audioEngine.pauseAmbience();
      toast.info(`Rádio pausado: ${preset.name}`);
    } else {
      audioEngine.crossfadeToAmbience(preset.url, ambienceVolume, preset.name, preset.id, crossfadeMs);
      toast.success(`Sintonizado em: ${preset.name} (Crossfade ${(crossfadeMs / 1000).toFixed(1)}s)`);
    }
  };

  const handleStop = () => {
    audioEngine.stopAmbience(crossfadeMs);
    toast.info('Rádio ambiente silenciado.');
  };

  const handleLinkToScene = (presetId?: string) => {
    if (!currentScene) {
      toast.warn('Nenhuma cena ativa selecionada para vincular.');
      return;
    }
    const targetId = presetId || currentAmbienceId;
    if (!targetId) {
      toast.warn('Sintonize uma atmosfera primeiro para vincular.');
      return;
    }
    patchCurrentScene({ ambiencePresetId: targetId });
    const targetName = RADIO_PRESETS.find(p => p.id === targetId)?.name || 'Ambiente';
    toast.success(`"${targetName}" vinculado à cena "${currentScene.title}"!`);
  };

  const filteredPresets = activeCategory === 'Todos' 
    ? RADIO_PRESETS 
    : RADIO_PRESETS.filter(p => p.category === activeCategory);

  return (
    <DraggableWindow
      title="Rádio Ambiente & Climas"
      onClose={onClose}
      defaultPosition={{ x: window.innerWidth - 380, y: 80 }}
      width={360}
      height={520}
      minWidth={320}
      minHeight={420}
      storageKey="dozero-radio-widget"
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0c0e12',
        color: '#f1f5f9',
        fontSize: '0.85rem',
        padding: '12px',
        boxSizing: 'border-box',
        gap: '12px'
      }}>
        {/* NOW PLAYING CARD */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '10px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isPlayingAmbience ? '#10b981' : '#64748b',
                boxShadow: isPlayingAmbience ? '0 0 10px #10b981' : 'none'
              }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em' }}>
                {isPlayingAmbience ? 'SINTONIZADO (AO VIVO)' : 'EM ESPERA'}
              </span>
            </div>

            {currentAmbienceId && currentScene && (
              <button
                onClick={() => handleLinkToScene()}
                title="Vincular atmosfera à cena ativa"
                style={{
                  background: currentScene.ambiencePresetId === currentAmbienceId ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${currentScene.ambiencePresetId === currentAmbienceId ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
                  color: currentScene.ambiencePresetId === currentAmbienceId ? '#34d399' : '#94a3b8',
                  borderRadius: '6px',
                  padding: '3px 7px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {currentScene.ambiencePresetId === currentAmbienceId ? <Check size={11} /> : <Link size={11} />}
                Cena
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                {currentAmbienceTitle || 'Nenhum clima ativo'}
              </p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                Crossfade suave: {(crossfadeMs / 1000).toFixed(1)}s
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={handleStop}
                title="Silenciar Rádio"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  padding: '6px',
                  color: '#f87171',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Square size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLES DE CROSSFADE & MIXAGEM */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '8px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Volume2 size={13} /> Volume do Rádio ({Math.round(ambienceVolume * 100)}%)
            </span>
            <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              {Math.round(ambienceVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={ambienceVolume}
            onChange={(e) => setVolume('ambience', parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tempo de Crossfade:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1000, 2000, 3500, 5000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => setCrossfadeMs(ms)}
                  style={{
                    background: crossfadeMs === ms ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${crossfadeMs === ms ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: crossfadeMs === ms ? '#38bdf8' : '#94a3b8',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {(ms / 1000).toFixed(0)}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CATEGORIAS */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {['Todos', 'Civilização', 'Natureza', 'Masmorra', 'Combate'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${activeCategory === cat ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                color: activeCategory === cat ? '#fcd34d' : '#94a3b8',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ESTAÇÕES DE CLIMA */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          overflowY: 'auto',
          flex: 1,
          paddingRight: '2px'
        }}>
          {filteredPresets.map((preset) => {
            const isPlaying = currentAmbienceId === preset.id && isPlayingAmbience;
            const IconComponent = preset.icon;

            return (
              <button
                key={preset.id}
                onClick={() => handleTuneStation(preset)}
                style={{
                  background: isPlaying ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.4)',
                  border: `1px solid ${isPlaying ? preset.color : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '8px',
                  padding: '10px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: '#f8fafc',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  boxShadow: isPlaying ? `0 0 12px ${preset.color}33` : 'none'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: `${preset.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: preset.color
                }}>
                  <IconComponent size={16} />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.2 }}>
                  {preset.name}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                  {isPlaying ? '▶ Tocando' : 'Sintonizar'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </DraggableWindow>
  );
};
