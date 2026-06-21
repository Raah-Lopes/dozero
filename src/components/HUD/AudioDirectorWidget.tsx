import React, { useState } from 'react';
import { useAudioStore } from '../../store/audioStore';
import { audioEngine } from '../../services/AudioEngine';
import type { AudioTrack, SoundboardItem } from '../../utils/audioTypes';
import { Play, Volume2, Music, Mic, Star, Plus } from 'lucide-react';
import { DraggableWindow } from './DraggableWindow';

export const AudioDirectorWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const audioState = useAudioStore();
  const { addAudioTrack, addSoundboardItem, triggerMacro } = audioState;
  
  const [activeTab, setActiveTab] = useState<'library' | 'session' | 'soundboard' | 'scenes'>('session');
  const [musicVol, setMusicVol] = useState(audioState.musicVolume);
  const [ambienceVol, setAmbienceVol] = useState(audioState.ambienceVolume);
  
  // Estados locais para inputs de nova faixa
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

  const handleAddTrack = () => {
    if (!newTrackUrl || !newTrackTitle) return;
    addAudioTrack({
      id: Date.now().toString(),
      title: newTrackTitle,
      url: newTrackUrl,
      provider: newTrackProvider,
      category: 'ambience', // Default
      tags: [],
      volume: 0.5,
      isFavorite: false
    });
    setNewTrackUrl('');
    setNewTrackTitle('');
  };

  return (
    <DraggableWindow id="audioDirector" title="Audio Director" initialX={window.innerWidth / 2 - 250} initialY={100} width={450} height={500} onClose={onClose} variant="default">
      <div className="flex flex-col h-full text-white overflow-hidden bg-gray-900 rounded-b-lg">
        {/* HEADER: Status da Cena */}
        <div className="p-4 bg-gradient-to-r from-purple-900 to-indigo-900 border-b border-gray-700">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-400" />
            Audio Director
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
            <div className="bg-black/30 p-2 rounded">
              <span className="text-gray-400 block">🎵 Música Atual</span>
              <span className="font-medium truncate block">
                {audioState.currentMusicId ? 'Música Tocando' : 'Nenhuma'}
              </span>
            </div>
            <div className="bg-black/30 p-2 rounded">
              <span className="text-gray-400 block">🌧 Ambiente</span>
              <span className="font-medium truncate block">
                {audioState.currentAmbienceId ? 'Ambiente Ativo' : 'Nenhum'}
              </span>
            </div>
          </div>
        </div>

        {/* CONTROLES GERAIS (Master) */}
        <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-purple-300">Música</span>
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
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-300">Ambiente</span>
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
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS */}
        <div className="flex border-b border-gray-700 bg-gray-800/50">
          {[
            { id: 'session', label: 'Sessão', icon: Play },
            { id: 'library', label: 'Biblioteca', icon: Music },
            { id: 'soundboard', label: 'Efeitos', icon: Mic },
            { id: 'scenes', label: 'Cenas', icon: Star },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                activeTab === tab.id 
                  ? 'bg-gray-700 text-white border-b-2 border-purple-500' 
                  : 'text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* ABA SESSÃO (Playlist Ativa) */}
          {activeTab === 'session' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Fila de Reprodução</h3>
              {audioState.playlist.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-4">Nenhuma música na sessão.</p>
              ) : (
                audioState.playlist.map((track) => (
                  <div key={track.id} className="flex items-center justify-between p-2 bg-gray-800 rounded hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                        track.category === 'combat' ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'
                      }`}>
                        {track.provider === 'youtube' ? 'YT' : 'MP3'}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">{track.title}</div>
                        <div className="text-xs text-gray-500 capitalize">{track.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handlePlayMusic(track)} className="p-1 hover:text-green-400" title="Tocar Música">
                        <Play className="w-4 h-4" />
                      </button>
                      <button onClick={() => handlePlayAmbience(track)} className="p-1 hover:text-blue-400" title="Tocar Ambiente">
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA BIBLIOTECA (Adicionar) */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <h4 className="text-xs font-bold text-gray-400 mb-2">Adicionar Nova Faixa</h4>
                <input 
                  type="text" placeholder="Título (ex: Chuva Noturna)" 
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm mb-2 focus:border-purple-500 outline-none text-white"
                  value={newTrackTitle} onChange={e => setNewTrackTitle(e.target.value)}
                />
                <select 
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm mb-2 outline-none text-white"
                  value={newTrackProvider} onChange={e => setNewTrackProvider(e.target.value as any)}
                >
                  <option value="youtube">YouTube</option>
                  <option value="local">Arquivo Local (Link Direto)</option>
                  <option value="spotify">Spotify (Embed)</option>
                </select>
                <input 
                  type="text" placeholder="URL (https://...)" 
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm mb-3 focus:border-purple-500 outline-none text-white"
                  value={newTrackUrl} onChange={e => setNewTrackUrl(e.target.value)}
                />
                <button 
                  onClick={handleAddTrack}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2 rounded flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Adicionar à Biblioteca
                </button>
              </div>
            </div>
          )}

          {/* ABA SONOROBOARD (Efeitos) */}
          {activeTab === 'soundboard' && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '1', title: 'Espada', icon: '⚔️', url: '#' },
                { id: '2', title: 'Explosão', icon: '💥', url: '#' },
                { id: '3', title: 'Porta', icon: '🚪', url: '#' },
                { id: '4', title: 'Lobo', icon: '🐺', url: '#' },
                { id: '5', title: 'Moeda', icon: '💰', url: '#' },
                { id: '6', title: 'Fantasma', icon: '👻', url: '#' },
              ].map((sfx) => (
                <button
                  key={sfx.id}
                  onClick={() => handlePlaySFX(sfx as any)}
                  className="aspect-square bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <span className="text-2xl">{sfx.icon}</span>
                  <span className="text-[10px] text-gray-300">{sfx.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* ABA CENAS (Macros) */}
          {activeTab === 'scenes' && (
            <div className="space-y-3">
               <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Macros de Cena</h3>
               <div className="p-3 bg-indigo-900/30 border border-indigo-700 rounded cursor-pointer hover:bg-indigo-900/50 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-indigo-300">🏰 Chegada na Taverna</h4>
                      <p className="text-xs text-gray-400 mt-1">Música: Alegre • Ambience: Fogo</p>
                    </div>
                    <Play className="w-4 h-4 text-indigo-400" />
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </DraggableWindow>
  );
};
