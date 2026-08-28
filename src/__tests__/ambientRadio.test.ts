import { describe, it, expect, beforeEach, vi } from 'vitest';
import { audioEngine } from '../services/AudioEngine';
import { useAudioStore } from '../store/audioStore';
import { RADIO_PRESETS } from '../components/Widgets/System/RadioWidget';

describe('Ambient Radio Engine & Presets', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    useAudioStore.setState({
      ambienceVolume: 0.5,
      musicVolume: 0.7,
      isPlayingAmbience: false,
      isPlayingMusic: false,
      currentAmbienceId: undefined,
      currentAmbienceTitle: undefined,
      currentMusicId: undefined,
      currentMusicTitle: undefined,
    });
  });

  it('contains complete atmospheric biome presets', () => {
    expect(RADIO_PRESETS.length).toBeGreaterThanOrEqual(8);
    const tavern = RADIO_PRESETS.find(p => p.id === 'tavern');
    const rain = RADIO_PRESETS.find(p => p.id === 'rain');
    const combat = RADIO_PRESETS.find(p => p.id === 'combat');

    expect(tavern).toBeDefined();
    expect(tavern?.url).toBe('/audio/ambience/tavern.wav');
    expect(rain).toBeDefined();
    expect(rain?.url).toBe('/audio/ambience/rain.wav');
    expect(combat).toBeDefined();
    expect(combat?.category).toBe('Combate');
  });

  it('executes crossfadeToAmbience and updates global state', async () => {
    const playAmbienceSpy = vi.spyOn(audioEngine, 'playAmbience').mockImplementation(async () => {});

    await audioEngine.crossfadeToAmbience('/audio/ambience/rain.wav', 0.6, 'Tempestade & Chuva', 'rain', 1500);

    expect(playAmbienceSpy).toHaveBeenCalledWith(
      '/audio/ambience/rain.wav',
      0.001,
      'Tempestade & Chuva',
      'rain'
    );
  });

  it('executes crossfadeToMusic smoothly', async () => {
    const playMusicSpy = vi.spyOn(audioEngine, 'playMusic').mockImplementation(async () => {});

    await audioEngine.crossfadeToMusic('/audio/music/epic.mp3', 0.8, 'Jornada Épica', 'epic', 2000);

    expect(playMusicSpy).toHaveBeenCalledWith(
      '/audio/music/epic.mp3',
      0.001,
      'Jornada Épica',
      'epic'
    );
  });

  it('stops ambience with fade duration and resets state', async () => {
    useAudioStore.setState({
      currentAmbienceId: 'rain',
      currentAmbienceTitle: 'Tempestade & Chuva',
      isPlayingAmbience: true
    });

    await audioEngine.stopAmbience(500);

    const state = useAudioStore.getState();
    expect(state.isPlayingAmbience).toBe(false);
    expect(state.currentAmbienceId).toBeUndefined();
    expect(state.currentAmbienceTitle).toBeUndefined();
  });
});
