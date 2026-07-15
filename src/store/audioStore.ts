import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AudioState, AudioTrack, SoundboardItem, AudioScenePreset } from '../utils/audioTypes';
import { audioEngine } from '../services/AudioEngine';

interface AudioStore extends AudioState {
  addAudioTrack: (track: AudioTrack) => void;
  removeAudioTrack: (id: string) => void;
  toggleFavorite: (id: string) => void;
  renameTrack: (id: string, name: string) => void;
  changeCategory: (id: string, category: AudioTrack['category']) => void;
  addSoundboardItem: (item: SoundboardItem) => void;
  removeSoundboardItem: (id: string) => void;
  setVolume: (type: 'music' | 'ambience', val: number) => void;
  addScenePreset: (preset: Omit<AudioScenePreset, 'id'>) => void;
  removeScenePreset: (id: string) => void;
  triggerMacro: (presetId: string) => void;
  clearMusic: () => void;
  clearAmbience: () => void;
  clearPlaylist: () => void;
  localTracks: AudioTrack[];
  setLocalTracks: (tracks: AudioTrack[]) => void;
  loopMode: 'none' | 'single' | 'all';
  setLoopMode: (mode: 'none' | 'single' | 'all') => void;
  isShuffle: boolean;
  setIsShuffle: (val: boolean) => void;
}

/** Remove campos não-serializáveis (fileHandle, blob URLs) antes de persistir */
function serializeTrack(t: AudioTrack): AudioTrack {
  const { fileHandle: _fh, ...rest } = t;
  return { ...rest, url: t.url.startsWith('blob:') ? '' : t.url };
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => ({
      musicVolume: 0.7,
      ambienceVolume: 0.4,
      currentMusicId: undefined,
      currentAmbienceId: undefined,
      currentMusicTitle: undefined,
      currentAmbienceTitle: undefined,
      isPlayingMusic: false,
      isPlayingAmbience: false,
      playlist: [],
      soundboard: [],
      scenePresets: [],
      localTracks: [],
      loopMode: 'all',
      isShuffle: false,

      addAudioTrack: (track) => set((state) => {
        if (state.playlist.some(t => t.id === track.id)) return state;
        return { playlist: [...state.playlist, track] };
      }),

      removeAudioTrack: (id) => set((state) => ({
        playlist: state.playlist.filter(t => t.id !== id)
      })),

      toggleFavorite: (id) => set((state) => ({
        localTracks: state.localTracks.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t),
        playlist: state.playlist.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t),
      })),

      renameTrack: (id, name) => set((state) => ({
        localTracks: state.localTracks.map(t => t.id === id ? { ...t, name } : t),
        playlist: state.playlist.map(t => t.id === id ? { ...t, name } : t),
      })),

      changeCategory: (id, category) => set((state) => ({
        localTracks: state.localTracks.map(t => t.id === id ? { ...t, category } : t),
        playlist: state.playlist.map(t => t.id === id ? { ...t, category } : t),
      })),

      addSoundboardItem: (item) => set((state) => ({ soundboard: [...state.soundboard, item] })),
      removeSoundboardItem: (id) => set((state) => ({ soundboard: state.soundboard.filter(s => s.id !== id) })),

      setVolume: (type, val) => {
        if (type === 'music') audioEngine.setMusicVolume(val);
        else audioEngine.setAmbienceVolume(val);
      },

      addScenePreset: (preset) => set((state) => ({
        scenePresets: [...state.scenePresets, { ...preset, id: `preset_${Date.now()}` }]
      })),

      removeScenePreset: (id) => set((state) => ({
        scenePresets: state.scenePresets.filter(p => p.id !== id)
      })),

      triggerMacro: (presetId) => {
        const { scenePresets, localTracks, musicVolume, ambienceVolume } = get();
        const preset = scenePresets.find(p => p.id === presetId);
        if (!preset) return;

        if (preset.musicTrackId) {
          const track = localTracks.find(t => t.id === preset.musicTrackId);
          if (track) audioEngine.playMusic(track, musicVolume);
        }
        if (preset.ambienceTrackId) {
          const track = localTracks.find(t => t.id === preset.ambienceTrackId);
          if (track) audioEngine.playAmbience(track, ambienceVolume);
        }
      },

      clearMusic: () => set({ currentMusicId: undefined, currentMusicTitle: undefined, isPlayingMusic: false }),
      clearAmbience: () => set({ currentAmbienceId: undefined, currentAmbienceTitle: undefined, isPlayingAmbience: false }),
      clearPlaylist: () => set({ playlist: [] }),
      setLocalTracks: (tracks) => set({ localTracks: tracks }),
      setLoopMode: (mode) => set({ loopMode: mode }),
      setIsShuffle: (val) => set({ isShuffle: val }),
    }),
    {
      name: 'dozero-audio-storage',
      partialize: (state) => ({
        // Salvar faixas da playlist sem fileHandle nem blob URLs
        playlist: state.playlist.map(serializeTrack).filter(t => t.url),
        // Salvar metadados das faixas locais (nome editável, categoria, favorito) sem fileHandle
        localTracksMeta: state.localTracks.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          isFavorite: t.isFavorite,
        })),
        soundboard: state.soundboard.map(s => s.url.startsWith('blob:') ? null : s).filter(Boolean),
        scenePresets: state.scenePresets,
        musicVolume: state.musicVolume,
        ambienceVolume: state.ambienceVolume,
        loopMode: state.loopMode,
        isShuffle: state.isShuffle,
      }),
      // Ao reidratar, restaurar os metadados de volta para as faixas locais
      merge: (persisted: any, current) => {
        const meta: Record<string, any> = {};
        (persisted.localTracksMeta || []).forEach((m: any) => { meta[m.id] = m; });
        return {
          ...current,
          ...persisted,
          localTracks: current.localTracks.map(t => meta[t.id] ? { ...t, ...meta[t.id] } : t),
        };
      },
    }
  )
);
