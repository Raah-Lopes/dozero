import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AudioState, AudioTrack, SoundboardItem, AudioScenePreset } from '../utils/audioTypes';

interface AudioStore extends AudioState {
  addAudioTrack: (track: AudioTrack) => void;
  removeAudioTrack: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addSoundboardItem: (item: SoundboardItem) => void;
  removeSoundboardItem: (id: string) => void;
  setVolume: (type: 'music' | 'ambience', val: number) => void;
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

const initialAudioState: AudioState = {
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
  scenePresets: []
};

export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => ({
      ...initialAudioState,

      addAudioTrack: (track) => set((state) => {
        if (state.playlist.some(t => t.id === track.id)) return state;
        return { playlist: [...state.playlist, track] };
      }),
      
      removeAudioTrack: (id) => set((state) => ({ playlist: state.playlist.filter(t => t.id !== id) })),
      
      toggleFavorite: (id) => set((state) => ({
        playlist: state.playlist.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t)
      })),
      
      addSoundboardItem: (item) => set((state) => ({ soundboard: [...state.soundboard, item] })),
      
      removeSoundboardItem: (id) => set((state) => ({ soundboard: state.soundboard.filter(s => s.id !== id) })),
      
      setVolume: (type, val) => set(() => {
        if (type === 'music') return { musicVolume: val };
        return { ambienceVolume: val };
      }),
      
      triggerMacro: (presetId) => {
        const state = get();
        const preset = state.scenePresets.find(p => p.id === presetId);
        if (!preset) return;
        console.log(`Disparando macro: ${preset.name}`);
      },

      clearMusic: () => set({ currentMusicId: undefined, currentMusicTitle: undefined, isPlayingMusic: false }),
      clearAmbience: () => set({ currentAmbienceId: undefined, currentAmbienceTitle: undefined, isPlayingAmbience: false }),
      clearPlaylist: () => set({ playlist: [] }),
      localTracks: [],
      setLocalTracks: (tracks) => set({ localTracks: tracks }),
      loopMode: 'all',
      setLoopMode: (mode) => set({ loopMode: mode }),
      isShuffle: false,
      setIsShuffle: (val) => set({ isShuffle: val })
    }),
    {
      name: 'dozero-audio-storage',
      partialize: (state) => ({ 
        playlist: state.playlist.filter(t => !t.url.startsWith('blob:')),
        soundboard: state.soundboard.filter(s => !s.url.startsWith('blob:')),
        musicVolume: state.musicVolume,
        ambienceVolume: state.ambienceVolume
      })
    }
  )
);
