import type { AudioTrack, SoundboardItem, AudioProviderType } from '../utils/audioTypes';
import { useAudioStore } from '../store/audioStore';

class AudioEngine {
  private nativeMusicAudio: HTMLAudioElement | null = null;
  private ambienceAudio: HTMLAudioElement | null = null;
  private sfxAudio: HTMLAudioElement | null = null;
  
  private currentMusicVolume: number = 0.7;
  private currentAmbienceVolume: number = 0.4;
  private currentMusicTrack: AudioTrack | null = null;
  private currentAmbienceTrack: AudioTrack | null = null;

  // Playlists temporárias
  private musicPlaylistIds: string[] = [];
  private musicPlaylistIndex: number = 0;

  private ambiencePlaylistIds: string[] = [];
  private ambiencePlaylistIndex: number = 0;

  // Callbacks para atualizar a UI
  onStateChange?: (state: any) => void;
  onProgressChange?: (type: 'music' | 'ambience', current: number, duration: number) => void;
  
  private progressInterval: any = null;

  constructor() {
    this.ambienceAudio = new Audio();
    this.sfxAudio = new Audio();
    this.sfxAudio.preload = 'auto';

    this.startProgressLoop();
  }

  private startProgressLoop() {
    this.progressInterval = setInterval(() => {
      // Music
      if (this.currentMusicTrack && this.nativeMusicAudio) {
        const current = this.nativeMusicAudio.currentTime || 0;
        const duration = this.nativeMusicAudio.duration || 0;
        if (duration > 0 && Number.isFinite(duration)) this.onProgressChange?.('music', current, duration);
      }

      // Ambience
      if (this.currentAmbienceTrack && this.ambienceAudio) {
        const current = this.ambienceAudio.currentTime || 0;
        const duration = this.ambienceAudio.duration || 0;
        if (duration > 0 && Number.isFinite(duration)) this.onProgressChange?.('ambience', current, duration);
      }
    }, 1000);
  }

  private fadeAudio(audio: HTMLAudioElement | any, targetVolume: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      if (!audio) return resolve();
      
      const safeTarget = Number.isFinite(targetVolume) ? targetVolume : 0;
      
      if (duration <= 0) {
        if (audio) audio.volume = safeTarget;
        return resolve();
      }
      
      const startVolume = audio.volume;
      const safeStart = Number.isFinite(startVolume) ? startVolume : 0;
      const startTime = performance.now();
      
      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentVol = safeStart + (safeTarget - safeStart) * progress;
        
        if (Number.isFinite(currentVol) && audio) {
          audio.volume = Math.max(0, Math.min(1, currentVol));
        }
        
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  /**
   * Resolve a URL final de reprodução baseada no track.
   * Se for arquivo local e tiver fileHandle, tentamos obter o Blob.
   */
  private async resolveTrackUrl(track: AudioTrack | SoundboardItem): Promise<string | null> {
    if (track.fileHandle) {
      try {
        // Verifica se ainda temos permissão no fileHandle (se não, a UI precisa pedir, mas vamos tentar direto)
        const file = await track.fileHandle.getFile();
        return URL.createObjectURL(file);
      } catch (err) {
        console.error("Falha ao recuperar arquivo via FileHandle:", err);
      }
    }
    
    // Fallback: usar a URL que foi salva (mas se for um objeto file:/// falso, não vai tocar)
    // Se a URL for um id de spotify ou algo que não tocava nativo, apenas retorna a URL.
    return track.url || null;
  }

  async playMusic(track: AudioTrack, volume: number) {
    this.currentMusicVolume = volume;
    this.currentMusicTrack = track;
    this.musicPlaylistIds = [];
    this.musicPlaylistIndex = 0;

    this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: false }); // Loading

    const finalUrl = await this.resolveTrackUrl(track);
    if (!finalUrl) {
      console.error('URL não pode ser resolvida:', track.title);
      return;
    }

    this.stopMusic(0);
    this.playNativeAudio(finalUrl, track, volume, true);
  }

  private handleMusicEnded = async () => {
    const store = useAudioStore.getState();
    const { loopMode, isShuffle, localTracks } = store;

    if (loopMode === 'single' && this.nativeMusicAudio) {
      this.nativeMusicAudio.currentTime = 0;
      this.nativeMusicAudio.play().catch(e => console.error(e));
      return;
    }

    if (loopMode === 'none') {
      this.stopMusic(0);
      return;
    }

    // loopMode === 'all'
    if (localTracks.length > 0 && this.currentMusicTrack) {
      if (isShuffle) {
        const nextIndex = Math.floor(Math.random() * localTracks.length);
        this.playMusic(localTracks[nextIndex], this.currentMusicVolume);
      } else {
        const currentIndex = localTracks.findIndex(t => t.id === this.currentMusicTrack!.id);
        const nextIndex = (currentIndex + 1) % localTracks.length;
        this.playMusic(localTracks[nextIndex], this.currentMusicVolume);
      }
    } else {
      this.stopMusic(0);
    }
  };

  private handleAmbienceEnded = async () => {
    if (this.ambienceAudio) {
      this.ambienceAudio.currentTime = 0;
      this.ambienceAudio.play().catch(e => console.error(e));
    }
  };

  private playNativeAudio(src: string, track: AudioTrack, volume: number, isMusic: boolean = false) {
    console.log(`Tocando áudio nativo [${isMusic ? 'Música' : 'Ambiente'}]:`, src);
    
    const audioEl = new Audio(src);
    // Em vez de loop no elemento, capturamos onended para injetar lógica de playlist se for youtube
    audioEl.loop = false;
    audioEl.volume = 0;
    
    if (isMusic) {
      if (this.nativeMusicAudio) {
        this.nativeMusicAudio.removeEventListener('ended', this.handleMusicEnded);
      }
      this.nativeMusicAudio = audioEl;
      this.nativeMusicAudio.addEventListener('ended', this.handleMusicEnded);
      this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: true });
    } else {
      if (this.ambienceAudio) {
        this.ambienceAudio.removeEventListener('ended', this.handleAmbienceEnded);
      }
      this.ambienceAudio = audioEl;
      this.ambienceAudio.addEventListener('ended', this.handleAmbienceEnded);
      this.onStateChange?.({ currentAmbienceId: track.id, isPlayingAmbience: true });
    }
    
    audioEl.play()
      .then(() => {
        this.fadeAudio(audioEl, volume, 2000);
      })
      .catch(e => {
        console.error(`Erro ao reproduzir áudio nativo (${track.title}):`, e);
        if (isMusic) this.onStateChange?.({ isPlayingMusic: false });
        else this.onStateChange?.({ isPlayingAmbience: false });
      });
      
    audioEl.addEventListener('error', (e) => {
      console.error(`Erro no elemento de áudio (${track.title}):`, e);
      if (isMusic) this.onStateChange?.({ isPlayingMusic: false });
      else this.onStateChange?.({ isPlayingAmbience: false });
    });
  }

  pauseMusic() {
    if (this.nativeMusicAudio) {
      this.nativeMusicAudio.pause();
    }
    this.onStateChange?.({ isPlayingMusic: false });
  }

  resumeMusic() {
    if (this.nativeMusicAudio) {
      this.nativeMusicAudio.play().catch(e => console.error("Resume error:", e));
    }
    this.onStateChange?.({ isPlayingMusic: true });
  }

  async stopMusic(fadeDuration: number = 2000) {
    const oldNative = this.nativeMusicAudio;
    
    this.currentMusicTrack = null;
    this.musicPlaylistIds = [];
    this.onStateChange?.({ isPlayingMusic: false });

    this.nativeMusicAudio = null;

    if (oldNative) {
      oldNative.removeEventListener('ended', this.handleMusicEnded);
      try { await this.fadeAudio(oldNative, 0, fadeDuration); } catch(e) {}
      try { oldNative.pause(); } catch(e) {}
      try { oldNative.src = ''; } catch(e) {}
    }
  }

  seekMusic(seconds: number) {
    if (this.nativeMusicAudio) {
      this.nativeMusicAudio.currentTime = seconds;
    }
  }

  pauseAmbience() {
    if (this.ambienceAudio) {
      this.ambienceAudio.pause();
    }
    this.onStateChange?.({ isPlayingAmbience: false });
  }

  resumeAmbience() {
    if (this.ambienceAudio) {
      this.ambienceAudio.play();
    }
    this.onStateChange?.({ isPlayingAmbience: true });
  }

  async stopAmbience(fadeDuration: number = 1000) {
    const oldAmbience = this.ambienceAudio;
    this.currentAmbienceTrack = null;
    this.ambiencePlaylistIds = [];
    this.onStateChange?.({ isPlayingAmbience: false, currentAmbienceId: null });
    
    this.ambienceAudio = null;

    if (oldAmbience) {
      oldAmbience.removeEventListener('ended', this.handleAmbienceEnded);
      try { await this.fadeAudio(oldAmbience, 0, fadeDuration); } catch(e) {}
      try { oldAmbience.pause(); } catch(e) {}
      try { oldAmbience.src = ''; } catch(e) {}
    }
  }

  seekAmbience(seconds: number) {
    if (this.ambienceAudio) {
      this.ambienceAudio.currentTime = seconds;
    }
  }

  async playAmbience(track: AudioTrack, volume: number) {
    this.currentAmbienceVolume = volume;
    this.currentAmbienceTrack = track;
    this.ambiencePlaylistIds = [];
    this.ambiencePlaylistIndex = 0;

    this.onStateChange?.({ currentAmbienceId: track.id, isPlayingAmbience: false }); // Loading

    const finalUrl = await this.resolveTrackUrl(track);
    if (!finalUrl) {
      console.error('URL não pode ser resolvida para ambiente:', track.title);
      return;
    }

    this.stopAmbience(2000);
    this.playNativeAudio(finalUrl, track, volume, false);
  }

  private activeSfx: Map<string, HTMLAudioElement> = new Map();

  async playSFX(item: SoundboardItem) {
    if (this.activeSfx.has(item.id)) {
      const existing = this.activeSfx.get(item.id);
      if (existing) {
        existing.pause();
        existing.src = '';
      }
      this.activeSfx.delete(item.id);
      return;
    }

    const finalUrl = await this.resolveTrackUrl(item);
    if (!finalUrl) {
      console.error('URL inválida para SFX:', item.title);
      return;
    }

    console.log('Tocando SFX Nativo:', item.title, finalUrl);
    const sfx = new Audio(finalUrl);
    sfx.volume = item.volume || 1;
    
    this.activeSfx.set(item.id, sfx);

    sfx.addEventListener('ended', () => {
      this.activeSfx.delete(item.id);
    });
    
    sfx.addEventListener('canplaythrough', () => {
      sfx.play().catch(e => {
        console.error('Erro ao tocar SFX:', e);
        this.activeSfx.delete(item.id);
      });
    }, { once: true });
    
    sfx.addEventListener('error', (e) => {
      console.error('Erro no SFX:', e);
      this.activeSfx.delete(item.id);
    });
    
    sfx.load();
  }

  setMusicVolume(val: number) {
    this.currentMusicVolume = val;
    if (this.nativeMusicAudio) {
      this.nativeMusicAudio.volume = val;
    }
    this.onStateChange?.({ musicVolume: val });
  }

  setAmbienceVolume(val: number) {
    this.currentAmbienceVolume = val;
    if (this.ambienceAudio) {
      this.ambienceAudio.volume = val;
    }
    this.onStateChange?.({ ambienceVolume: val });
  }
}

export const audioEngine = new AudioEngine();
