import type { AudioTrack, SoundboardItem } from '../utils/audioTypes';
import { useAudioStore } from '../store/audioStore';

class AudioEngine {
  private nativeMusicAudio: HTMLAudioElement | null = null;
  private ambienceAudio: HTMLAudioElement | null = null;
  
  private currentMusicVolume: number = 0.7;
  private currentAmbienceVolume: number = 0.4;
  private currentMusicTrack: AudioTrack | null = null;
  private currentAmbienceTrack: AudioTrack | null = null;

  // Rastrear ObjectURLs criadas para revogá-las e evitar memory leak
  private activeMusicObjectUrl: string | null = null;
  private activeAmbienceObjectUrl: string | null = null;
  private activeSfxUrls: Map<string, string> = new Map();

  onStateChange?: (state: any) => void;
  onProgressChange?: (type: 'music' | 'ambience', current: number, duration: number) => void;
  
  private progressInterval: any = null;

  constructor() {
    this.startProgressLoop();
  }

  private startProgressLoop() {
    this.progressInterval = setInterval(() => {
      if (this.currentMusicTrack && this.nativeMusicAudio) {
        const current = this.nativeMusicAudio.currentTime || 0;
        const duration = this.nativeMusicAudio.duration || 0;
        if (duration > 0 && Number.isFinite(duration)) {
          this.onProgressChange?.('music', current, duration);
        }
      }
      if (this.currentAmbienceTrack && this.ambienceAudio) {
        const current = this.ambienceAudio.currentTime || 0;
        const duration = this.ambienceAudio.duration || 0;
        if (duration > 0 && Number.isFinite(duration)) {
          this.onProgressChange?.('ambience', current, duration);
        }
      }
    }, 1000);
  }

  private fadeAudio(audio: HTMLAudioElement, targetVolume: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      if (!audio) return resolve();
      const safeTarget = Number.isFinite(targetVolume) ? targetVolume : 0;
      if (duration <= 0) {
        audio.volume = safeTarget;
        return resolve();
      }
      const startVolume = Number.isFinite(audio.volume) ? audio.volume : 0;
      const startTime = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const vol = startVolume + (safeTarget - startVolume) * progress;
        audio.volume = Math.max(0, Math.min(1, vol));
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /** Resolve a URL de reprodução. Cria ObjectURL para fileHandles e rastreia para revogar depois. */
  private async resolveTrackUrl(
    track: AudioTrack | SoundboardItem,
    type: 'music' | 'ambience' | 'sfx'
  ): Promise<string | null> {
    if (track.fileHandle) {
      try {
        const file = await track.fileHandle.getFile();
        const url = URL.createObjectURL(file);
        // Revogar a URL anterior do mesmo canal antes de criar a nova
        if (type === 'music' && this.activeMusicObjectUrl) {
          URL.revokeObjectURL(this.activeMusicObjectUrl);
        } else if (type === 'ambience' && this.activeAmbienceObjectUrl) {
          URL.revokeObjectURL(this.activeAmbienceObjectUrl);
        }
        if (type === 'music') this.activeMusicObjectUrl = url;
        else if (type === 'ambience') this.activeAmbienceObjectUrl = url;
        return url;
      } catch (err) {
        console.error('Falha ao recuperar arquivo via FileHandle:', err);
      }
    }
    return track.url || null;
  }

  /** Para o elemento de áudio de forma síncrona, sem fade, para evitar race conditions */
  private killAudio(audio: HTMLAudioElement | null, onEnded?: () => void): void {
    if (!audio) return;
    if (onEnded) audio.removeEventListener('ended', onEnded);
    audio.pause();
    audio.src = '';
  }

  async playMusic(track: AudioTrack, volume: number) {
    this.currentMusicVolume = volume;
    this.currentMusicTrack = track;
    this.onStateChange?.({ currentMusicId: track.id, currentMusicTitle: track.name || track.title, isPlayingMusic: false });

    const finalUrl = await this.resolveTrackUrl(track, 'music');
    if (!finalUrl) {
      console.error('URL não pode ser resolvida:', track.title);
      return;
    }

    // Parar o anterior de forma síncrona antes de iniciar o novo (sem race condition)
    this.killAudio(this.nativeMusicAudio, this.handleMusicEnded);

    const audioEl = new Audio(finalUrl);
    audioEl.volume = 0;
    audioEl.addEventListener('ended', this.handleMusicEnded);
    audioEl.addEventListener('error', () => this.onStateChange?.({ isPlayingMusic: false }));
    this.nativeMusicAudio = audioEl;

    audioEl.play()
      .then(() => {
        this.fadeAudio(audioEl, volume, 2000);
        this.onStateChange?.({ isPlayingMusic: true });
      })
      .catch(() => this.onStateChange?.({ isPlayingMusic: false }));
  }

  private handleMusicEnded = () => {
    const { loopMode, isShuffle, localTracks } = useAudioStore.getState();

    if (loopMode === 'single' && this.nativeMusicAudio) {
      this.nativeMusicAudio.currentTime = 0;
      this.nativeMusicAudio.play().catch(() => {});
      return;
    }
    if (loopMode === 'none') { this.stopMusic(0); return; }

    // loopMode === 'all'
    if (localTracks.length > 0 && this.currentMusicTrack) {
      if (isShuffle) {
        this.playMusic(localTracks[Math.floor(Math.random() * localTracks.length)], this.currentMusicVolume);
      } else {
        const idx = localTracks.findIndex(t => t.id === this.currentMusicTrack!.id);
        this.playMusic(localTracks[(idx + 1) % localTracks.length], this.currentMusicVolume);
      }
    } else {
      this.stopMusic(0);
    }
  };

  private handleAmbienceEnded = () => {
    if (this.ambienceAudio) {
      this.ambienceAudio.currentTime = 0;
      this.ambienceAudio.play().catch(() => {});
    }
  };

  pauseMusic() {
    this.nativeMusicAudio?.pause();
    this.onStateChange?.({ isPlayingMusic: false });
  }

  resumeMusic() {
    this.nativeMusicAudio?.play().catch(() => {});
    this.onStateChange?.({ isPlayingMusic: true });
  }

  async stopMusic(fadeDuration = 2000) {
    const old = this.nativeMusicAudio;
    this.currentMusicTrack = null;
    this.nativeMusicAudio = null;
    this.onStateChange?.({ isPlayingMusic: false, currentMusicId: undefined, currentMusicTitle: undefined });

    if (old) {
      old.removeEventListener('ended', this.handleMusicEnded);
      if (fadeDuration > 0) await this.fadeAudio(old, 0, fadeDuration).catch(() => {});
      old.pause();
      old.src = '';
      if (this.activeMusicObjectUrl) {
        URL.revokeObjectURL(this.activeMusicObjectUrl);
        this.activeMusicObjectUrl = null;
      }
    }
  }

  seekMusic(seconds: number) {
    if (this.nativeMusicAudio) this.nativeMusicAudio.currentTime = seconds;
  }

  async playAmbience(track: AudioTrack, volume: number) {
    this.currentAmbienceVolume = volume;
    this.currentAmbienceTrack = track;
    this.onStateChange?.({ currentAmbienceId: track.id, currentAmbienceTitle: track.name || track.title, isPlayingAmbience: false });

    const finalUrl = await this.resolveTrackUrl(track, 'ambience');
    if (!finalUrl) {
      console.error('URL não pode ser resolvida para ambiente:', track.title);
      return;
    }

    // Parar o anterior de forma síncrona antes de iniciar o novo (sem race condition)
    this.killAudio(this.ambienceAudio, this.handleAmbienceEnded);

    const audioEl = new Audio(finalUrl);
    audioEl.volume = 0;
    audioEl.addEventListener('ended', this.handleAmbienceEnded);
    audioEl.addEventListener('error', () => this.onStateChange?.({ isPlayingAmbience: false }));
    this.ambienceAudio = audioEl;

    audioEl.play()
      .then(() => {
        this.fadeAudio(audioEl, volume, 2000);
        this.onStateChange?.({ isPlayingAmbience: true });
      })
      .catch(() => this.onStateChange?.({ isPlayingAmbience: false }));
  }

  pauseAmbience() {
    this.ambienceAudio?.pause();
    this.onStateChange?.({ isPlayingAmbience: false });
  }

  resumeAmbience() {
    this.ambienceAudio?.play().catch(() => {});
    this.onStateChange?.({ isPlayingAmbience: true });
  }

  async stopAmbience(fadeDuration = 1000) {
    const old = this.ambienceAudio;
    this.currentAmbienceTrack = null;
    this.ambienceAudio = null;
    this.onStateChange?.({ isPlayingAmbience: false, currentAmbienceId: undefined, currentAmbienceTitle: undefined });

    if (old) {
      old.removeEventListener('ended', this.handleAmbienceEnded);
      if (fadeDuration > 0) await this.fadeAudio(old, 0, fadeDuration).catch(() => {});
      old.pause();
      old.src = '';
      if (this.activeAmbienceObjectUrl) {
        URL.revokeObjectURL(this.activeAmbienceObjectUrl);
        this.activeAmbienceObjectUrl = null;
      }
    }
  }

  seekAmbience(seconds: number) {
    if (this.ambienceAudio) this.ambienceAudio.currentTime = seconds;
  }

  private activeSfx: Map<string, HTMLAudioElement> = new Map();

  async playSFX(item: SoundboardItem) {
    // Toggle: clique duplo para e repete
    if (this.activeSfx.has(item.id)) {
      const existing = this.activeSfx.get(item.id)!;
      existing.pause();
      existing.src = '';
      this.activeSfx.delete(item.id);
      if (this.activeSfxUrls.has(item.id)) {
        URL.revokeObjectURL(this.activeSfxUrls.get(item.id)!);
        this.activeSfxUrls.delete(item.id);
      }
      return;
    }

    const finalUrl = await this.resolveTrackUrl(item, 'sfx');
    if (!finalUrl) return;

    // Rastrear se for ObjectURL
    if (finalUrl.startsWith('blob:')) this.activeSfxUrls.set(item.id, finalUrl);

    const sfx = new Audio(finalUrl);
    sfx.volume = item.volume || 1;
    this.activeSfx.set(item.id, sfx);

    const cleanup = () => {
      this.activeSfx.delete(item.id);
      if (this.activeSfxUrls.has(item.id)) {
        URL.revokeObjectURL(this.activeSfxUrls.get(item.id)!);
        this.activeSfxUrls.delete(item.id);
      }
    };

    sfx.addEventListener('ended', cleanup, { once: true });
    sfx.addEventListener('error', cleanup, { once: true });
    sfx.play().catch(cleanup);
  }

  setMusicVolume(val: number) {
    this.currentMusicVolume = val;
    if (this.nativeMusicAudio) this.nativeMusicAudio.volume = val;
    this.onStateChange?.({ musicVolume: val });
  }

  setAmbienceVolume(val: number) {
    this.currentAmbienceVolume = val;
    if (this.ambienceAudio) this.ambienceAudio.volume = val;
    this.onStateChange?.({ ambienceVolume: val });
  }
}

export const audioEngine = new AudioEngine();
