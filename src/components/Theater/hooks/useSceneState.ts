// src/components/Theater/hooks/useSceneState.ts
import { useState, useEffect, useCallback } from 'react';
import {
  state,
  getTheaterState,
  updateTheaterState,
  addTheaterScene,
  updateTheaterScene,
  removeTheaterScene,
  addTheaterDiaryEntry,
  type TheaterStateData,
  type TheaterScene,
  type MoodType,
  type WeatherType,
  type TimeOfDay,
  type TheaterObjective,
  type TheaterNpcPresentation,
} from '../../../store';
import { indexeddbProvider } from '../../../services/yjs';

export function useSceneState() {
  const [theaterData, setTheaterData] = useState<TheaterStateData>(getTheaterState);

  // Observe Yjs & IndexedDB changes
  useEffect(() => {
    const handler = () => setTheaterData(getTheaterState());
    state.theater.observe(handler);
    
    // When indexedDB sync finishes, reload fresh state
    const onSynced = () => setTheaterData(getTheaterState());
    indexeddbProvider.on('synced', onSynced);

    return () => {
      state.theater.unobserve(handler);
      indexeddbProvider.off('synced', onSynced);
    };
  }, []);

  const currentScene = theaterData.scenes.find(s => s.id === theaterData.currentSceneId) || null;

  const setCurrentScene = useCallback((id: string) => {
    const scene = theaterData.scenes.find(s => s.id === id);
    if (scene) {
      // Disparar transição visual (TheaterView escuta)
      const transition = scene.transitionType || 'fade';
      if (transition !== 'none') {
        window.dispatchEvent(new CustomEvent('theater-scene-transition', { detail: { type: transition } }));
      }

      updateTheaterState({ currentSceneId: id, mood: scene.mood, weather: scene.weather });
      addTheaterDiaryEntry({ timestamp: Date.now(), type: 'scene', text: `🎬 Cena: "${scene.title}"` });

      // Auto-trigger áudio vinculado à cena
      if (scene.musicPresetId || scene.ambiencePresetId) {
        import('../../../store/audioStore').then(({ useAudioStore }) => {
          const { scenePresets, localTracks, musicVolume, ambienceVolume } = useAudioStore.getState();
          // Procurar primeiro por preset de música
          const musicPreset = scenePresets.find(p => p.id === scene.musicPresetId);
          if (musicPreset) {
            useAudioStore.getState().triggerMacro(musicPreset.id);
          } else if (scene.musicPresetId) {
            import('../../../services/AudioEngine').then(({ audioEngine }) => {
              const t = localTracks.find(track => track.id === scene.musicPresetId);
              if (t) audioEngine.playMusic(t, musicVolume);
            });
          }

          // Tratar som ambiente (presets rápidos do Soundscape ou faixas locais)
          if (scene.ambiencePresetId) {
            import('../TheaterSoundscape').then(({ AMBIENT_PRESETS }) => {
              const ambientPreset = AMBIENT_PRESETS.find(p => p.id === scene.ambiencePresetId);
              import('../../../services/AudioEngine').then(({ audioEngine }) => {
                if (ambientPreset) {
                  audioEngine.playAmbience(ambientPreset.url, ambientPreset.name, ambientPreset.id);
                } else {
                  const t = localTracks.find(track => track.id === scene.ambiencePresetId);
                  if (t) audioEngine.playAmbience(t, ambienceVolume);
                }
              });
            });
          }
        });
      }
    }
  }, [theaterData.scenes]);

  /** Vincula a música e ambiente atualmente tocando à cena atual */
  const linkAudioToScene = useCallback(() => {
    if (!theaterData.currentSceneId) return;
    import('../../../store/audioStore').then(({ useAudioStore }) => {
      const { currentMusicId, currentAmbienceId } = useAudioStore.getState();
      updateTheaterScene(theaterData.currentSceneId, {
        musicPresetId: currentMusicId,
        ambiencePresetId: currentAmbienceId,
      });
      addTheaterDiaryEntry({ timestamp: Date.now(), type: 'narrative', text: `🔗 Áudio vinculado à cena atual` });
    });
  }, [theaterData.currentSceneId]);

  const createScene = useCallback((overrides: Partial<TheaterScene> = {}) => {
    const defaultScene: Omit<TheaterScene, 'id'> = {
      title: 'Nova Cena',
      subtitle: 'Descrição do ambiente',
      description: '',
      mood: 'neutral',
      weather: 'clear',
      timeOfDay: 'day',
      objectives: [],
      tags: [],
      assets: [],
      props: [],
      ...overrides,
    };
    const id = addTheaterScene(defaultScene);
    updateTheaterState({ currentSceneId: id });
    addTheaterDiaryEntry({ timestamp: Date.now(), type: 'scene', text: `🎬 Nova cena criada: "${defaultScene.title}"` });
    return id;
  }, []);

  const patchCurrentScene = useCallback((updates: Partial<TheaterScene>) => {
    if (theaterData.currentSceneId) {
      updateTheaterScene(theaterData.currentSceneId, updates);
    }
  }, [theaterData.currentSceneId]);

  const deleteScene = useCallback((id: string) => {
    removeTheaterScene(id);
  }, []);

  const setObjectiveStatus = useCallback((objectiveId: string, status: 'active' | 'success' | 'failed') => {
    if (!currentScene) return;
    const objectives = currentScene.objectives.map(o => {
      if (o.id !== objectiveId) return o;
      return { 
        ...o, 
        completed: status === 'success', 
        failed: status === 'failed' 
      };
    });
    updateTheaterScene(currentScene.id, { objectives });
    
    const obj = currentScene.objectives.find(o => o.id === objectiveId);
    if (obj) {
      const emoji = status === 'success' ? '🏆' : status === 'failed' ? '💀' : '⏳';
      addTheaterDiaryEntry({
        timestamp: Date.now(),
        type: 'objective',
        text: `${emoji} Missão: "${obj.text}"`,
      });
    }
  }, [currentScene]);

  const toggleObjectiveSecret = useCallback((objectiveId: string) => {
    if (!currentScene) return;
    const objectives = currentScene.objectives.map(o =>
      o.id === objectiveId ? { ...o, secret: !o.secret } : o
    );
    updateTheaterScene(currentScene.id, { objectives });
  }, [currentScene]);

  const addObjective = useCallback((text: string, secret = false) => {
    if (!currentScene) return;
    const newObj: TheaterObjective = {
      id: `obj_${Date.now()}`,
      text,
      completed: false,
      failed: false,
      secret,
    };
    updateTheaterScene(currentScene.id, { objectives: [...currentScene.objectives, newObj] });
  }, [currentScene]);

  const removeObjective = useCallback((objectiveId: string) => {
    if (!currentScene) return;
    updateTheaterScene(currentScene.id, {
      objectives: currentScene.objectives.filter(o => o.id !== objectiveId),
    });
  }, [currentScene]);

  const goToNextScene = useCallback(() => {
    const idx = theaterData.scenes.findIndex(s => s.id === theaterData.currentSceneId);
    if (idx < theaterData.scenes.length - 1) {
      const next = theaterData.scenes[idx + 1];
      setCurrentScene(next.id);
    }
  }, [theaterData, setCurrentScene]);

  const goToPrevScene = useCallback(() => {
    const idx = theaterData.scenes.findIndex(s => s.id === theaterData.currentSceneId);
    if (idx > 0) {
      const prev = theaterData.scenes[idx - 1];
      setCurrentScene(prev.id);
    }
  }, [theaterData, setCurrentScene]);

  return {
    theaterData,
    currentScene,
    scenes: theaterData.scenes,
    mood: theaterData.mood,
    weather: theaterData.weather,
    timeOfDay: theaterData.timeOfDay,
    diaryEntries: theaterData.diaryEntries,
    globalAssets: theaterData.globalAssets || [],
    activeNpc: theaterData.activeNpc || null,
    activeDialogue: theaterData.activeDialogue || null,
    setActiveNpc: (npc: TheaterNpcPresentation | null) => updateTheaterState({ activeNpc: npc }),
    enemies: theaterData.enemies,
    castConditions: theaterData.castConditions,
    selectedCastMemberId: theaterData.selectedCastMemberId,
    vnModeActive: theaterData.vnModeActive,
    showHeroCards: theaterData.showHeroCards !== false,
    heroCardPositions: theaterData.heroCardPositions || {},
    heroCardScales: theaterData.heroCardScales || {},
    heroCardCustomStatus: theaterData.heroCardCustomStatus || {},
    setSelectedCastMemberId: (id: string) => updateTheaterState({ selectedCastMemberId: id }),
    setCurrentScene,
    createScene,
    patchCurrentScene,
    deleteScene,
    setObjectiveStatus,
    toggleObjectiveSecret,
    addObjective,
    removeObjective,
    goToNextScene,
    goToPrevScene,
    linkAudioToScene,
  };
}
