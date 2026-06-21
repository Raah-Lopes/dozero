import { create } from 'zustand';
import type { AudioState, AudioTrack, SoundboardItem, AudioScenePreset } from '../utils/audioTypes';

interface AudioStore extends AudioState {
  addAudioTrack: (track: AudioTrack) => void;
  removeAudioTrack: (id: string) => void;
  addSoundboardItem: (item: SoundboardItem) => void;
  setVolume: (type: 'music' | 'ambience', val: number) => void;
  triggerMacro: (presetId: string) => void;
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

export const useAudioStore = create<AudioStore>((set, get) => ({
  ...initialAudioState,

  addAudioTrack: (track) => set((state) => ({ playlist: [...state.playlist, track] })),
  
  removeAudioTrack: (id) => set((state) => ({ playlist: state.playlist.filter(t => t.id !== id) })),
  
  addSoundboardItem: (item) => set((state) => ({ soundboard: [...state.soundboard, item] })),
  
  setVolume: (type, val) => set(() => {
    if (type === 'music') return { musicVolume: val };
    return { ambienceVolume: val };
  }),
  
  triggerMacro: (presetId) => {
    const state = get();
    const preset = state.scenePresets.find(p => p.id === presetId);
    if (!preset) return;
    
    // Lógica complexa: para música atual, fade, toca nova, manda msg no chat
    console.log(`Disparando macro: ${preset.name}`);
  }
}));
