// src/services/AudioEngine.ts
import type { AudioTrack, SoundboardItem } from '../utils/audioTypes';
import { useAudioStore } from '../store/audioStore';
import { proceduralAudio } from './ProceduralAudio';

class AudioEngine {
  private nativeMusicAudio: HTMLAudioElement | null = null;
  private ambienceAudio: HTMLAudioElement | null = null;
  
  private currentMusicVolume: number = 0.7;
  private currentAmbienceVolume: number = 0.4;
  private currentMusicTrack: AudioTrack | null = null;
  private currentAmbienceTrack: AudioTrack | null = null;
  private isUsingSynthAmbience = false;
  private isUsingSynthMusic = false;

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

  private emitState(updates: any) {
    try {
      useAudioStore.setState(updates);
    } catch {
      // Ignorar se a store ainda estiver inicializando
    }
    this.onStateChange?.(updates);
  }

  private startProgressLoop() {
    this.progressInterval = setInterval(() => {
      if (this.currentMusicTrack && this.nativeMusicAudio && !this.isUsingSynthMusic) {
        const current = this.nativeMusicAudio.currentTime || 0;
        const duration = this.nativeMusicAudio.duration || 0;
        if (duration > 0 && Number.isFinite(duration)) {
          this.onProgressChange?.('music', current, duration);
        }
      }
      if (this.currentAmbienceTrack && this.ambienceAudio && !this.isUsingSynthAmbience) {
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
      const safeTarget = Number.isFinite(targetVolume) ? Math.max(0, Math.min(1, targetVolume)) : 0;
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

  async playMusic(
    trackOrUrl: AudioTrack | string, 
    volumeOrName?: number | string, 
    nameOrId?: string, 
    id?: string
  ) {
    let track: AudioTrack;
    let volume = this.currentMusicVolume;

    if (typeof trackOrUrl === 'string') {
      const url = trackOrUrl;
      const name = typeof volumeOrName === 'string' ? volumeOrName : (nameOrId || 'Música');
      const trackId = typeof nameOrId === 'string' && nameOrId !== name ? nameOrId : (id || `music_${Date.now()}`);
      if (typeof volumeOrName === 'number') volume = volumeOrName;

      track = {
        id: trackId,
        name: name,
        title: name,
        url: url,
        category: 'music',
        duration: 0
      };
    } else {
      track = trackOrUrl;
      if (typeof volumeOrName === 'number') volume = volumeOrName;
    }

    this.currentMusicVolume = volume;
    this.currentMusicTrack = track;
    this.emitState({ currentMusicId: track.id, currentMusicTitle: track.name || track.title, isPlayingMusic: false });

    const finalUrl = await this.resolveTrackUrl(track, 'music');
    if (!finalUrl) {
      console.error('URL não pode ser resolvida para música:', track.title || track.name);
      return;
    }

    this.killAudio(this.nativeMusicAudio, this.handleMusicEnded);

    // Procedural Web Audio Synth somente quando explicitamente solicitado
    if (finalUrl.startsWith('synth:') || finalUrl.startsWith('procedural:')) {
      this.isUsingSynthMusic = true;
      const synthType = finalUrl.replace(/^(synth:|procedural:)/, '');
      proceduralAudio.startMusic(synthType || track.id, volume);
      this.emitState({ isPlayingMusic: true, currentMusicId: track.id, currentMusicTitle: track.name || track.title });
      return;
    }

    this.isUsingSynthMusic = false;
    proceduralAudio.stopMusic();

    const audioEl = new Audio(finalUrl);
    audioEl.volume = Math.max(0, Math.min(1, volume));
    audioEl.addEventListener('ended', this.handleMusicEnded);
    audioEl.addEventListener('error', (e) => {
      console.warn('[AudioEngine] Erro ao carregar arquivo de música, ativando procedural:', finalUrl, e);
      this.isUsingSynthMusic = true;
      proceduralAudio.startMusic(track.id, volume);
      this.emitState({ isPlayingMusic: true, currentMusicId: track.id, currentMusicTitle: track.name || track.title });
    });
    this.nativeMusicAudio = audioEl;

    try {
      await audioEl.play();
      this.emitState({ isPlayingMusic: true, currentMusicId: track.id, currentMusicTitle: track.name || track.title });
    } catch (err) {
      console.warn('[AudioEngine] Play de música bloqueado pelo navegador, ativando procedural:', err);
      this.isUsingSynthMusic = true;
      proceduralAudio.startMusic(track.id, volume);
      this.emitState({ isPlayingMusic: true, currentMusicId: track.id, currentMusicTitle: track.name || track.title });
    }
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
    if (this.isUsingSynthMusic) {
      proceduralAudio.stopMusic();
    } else {
      this.nativeMusicAudio?.pause();
    }
    this.emitState({ isPlayingMusic: false });
  }

  resumeMusic() {
    if (this.isUsingSynthMusic && this.currentMusicTrack) {
      const synthType = (this.currentMusicTrack.url || '').replace(/^(synth:|procedural:)/, '') || this.currentMusicTrack.id;
      proceduralAudio.startMusic(synthType, this.currentMusicVolume);
    } else {
      this.nativeMusicAudio?.play().catch(() => {});
    }
    this.emitState({ isPlayingMusic: true });
  }

  async stopMusic(fadeDuration = 500) {
    const old = this.nativeMusicAudio;
    this.currentMusicTrack = null;
    this.nativeMusicAudio = null;
    this.isUsingSynthMusic = false;
    proceduralAudio.stopMusic();
    this.emitState({ isPlayingMusic: false, currentMusicId: undefined, currentMusicTitle: undefined });

    if (old) {
      old.removeEventListener('ended', this.handleMusicEnded);
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

  async playAmbience(
    trackOrUrl: AudioTrack | string, 
    volumeOrName?: number | string, 
    nameOrId?: string, 
    id?: string
  ) {
    let track: AudioTrack;
    let volume = this.currentAmbienceVolume;

    if (typeof trackOrUrl === 'string') {
      const url = trackOrUrl;
      const name = typeof volumeOrName === 'string' ? volumeOrName : (nameOrId || 'Ambiente');
      const trackId = typeof nameOrId === 'string' && nameOrId !== name ? nameOrId : (id || `amb_${Date.now()}`);
      if (typeof volumeOrName === 'number') volume = volumeOrName;

      track = {
        id: trackId,
        name: name,
        title: name,
        url: url,
        category: 'ambience',
        duration: 0
      };
    } else {
      track = trackOrUrl;
      if (typeof volumeOrName === 'number') volume = volumeOrName;
    }

    this.currentAmbienceVolume = volume;
    this.currentAmbienceTrack = track;
    this.emitState({ currentAmbienceId: track.id, currentAmbienceTitle: track.name || track.title, isPlayingAmbience: false });

    const finalUrl = await this.resolveTrackUrl(track, 'ambience');
    if (!finalUrl) {
      console.error('URL não pode ser resolvida para ambiente:', track.title || track.name);
      return;
    }

    this.killAudio(this.ambienceAudio, this.handleAmbienceEnded);

    // Procedural Web Audio Synth somente quando explicitamente solicitado
    if (finalUrl.startsWith('synth:') || finalUrl.startsWith('procedural:')) {
      this.isUsingSynthAmbience = true;
      const synthType = finalUrl.replace(/^(synth:|procedural:)/, '');
      proceduralAudio.startAmbience(synthType || track.id, volume);
      this.emitState({ isPlayingAmbience: true, currentAmbienceId: track.id, currentAmbienceTitle: track.name || track.title });
      return;
    }

    this.isUsingSynthAmbience = false;
    proceduralAudio.stopAmbience();

    const audioEl = new Audio(finalUrl);
    audioEl.loop = true; // Ambientes são sempre em loop contínuo
    audioEl.volume = Math.max(0, Math.min(1, volume));
    audioEl.addEventListener('ended', this.handleAmbienceEnded);
    audioEl.addEventListener('error', (e) => {
      console.warn('[AudioEngine] Erro ao carregar som ambiente, ativando procedural:', finalUrl, e);
      this.isUsingSynthAmbience = true;
      proceduralAudio.startAmbience(track.id, volume);
      this.emitState({ isPlayingAmbience: true, currentAmbienceId: track.id, currentAmbienceTitle: track.name || track.title });
    });
    this.ambienceAudio = audioEl;

    try {
      await audioEl.play();
      this.emitState({ isPlayingAmbience: true, currentAmbienceId: track.id, currentAmbienceTitle: track.name || track.title });
    } catch (err) {
      console.warn('[AudioEngine] Play de ambiente bloqueado pelo navegador, ativando procedural:', err);
      this.isUsingSynthAmbience = true;
      proceduralAudio.startAmbience(track.id, volume);
      this.emitState({ isPlayingAmbience: true, currentAmbienceId: track.id, currentAmbienceTitle: track.name || track.title });
    }
  }

  pauseAmbience() {
    if (this.isUsingSynthAmbience) {
      proceduralAudio.stopAmbience();
    } else {
      this.ambienceAudio?.pause();
    }
    this.emitState({ isPlayingAmbience: false });
  }

  resumeAmbience() {
    if (this.isUsingSynthAmbience && this.currentAmbienceTrack) {
      const synthType = (this.currentAmbienceTrack.url || '').replace(/^(synth:|procedural:)/, '') || this.currentAmbienceTrack.id;
      proceduralAudio.startAmbience(synthType, this.currentAmbienceVolume);
    } else {
      this.ambienceAudio?.play().catch(() => {});
    }
    this.emitState({ isPlayingAmbience: true });
  }

  async stopAmbience(fadeDuration = 500) {
    const old = this.ambienceAudio;
    this.currentAmbienceTrack = null;
    this.ambienceAudio = null;
    this.isUsingSynthAmbience = false;
    proceduralAudio.stopAmbience();
    this.emitState({ isPlayingAmbience: false, currentAmbienceId: undefined, currentAmbienceTitle: undefined });

    if (old) {
      if (fadeDuration > 0) {
        await this.fadeAudio(old, 0, fadeDuration);
      }
      old.removeEventListener('ended', this.handleAmbienceEnded);
      old.pause();
      old.src = '';
      if (this.activeAmbienceObjectUrl) {
        URL.revokeObjectURL(this.activeAmbienceObjectUrl);
        this.activeAmbienceObjectUrl = null;
      }
    }
  }

  /**
   * Transiciona suavemente para um novo som ambiente fazendo fade-out do anterior e fade-in do novo.
   */
  async crossfadeToAmbience(
    trackOrUrl: AudioTrack | string,
    volumeOrName?: number | string,
    nameOrId?: string,
    id?: string,
    crossfadeDurationMs = 2000
  ) {
    const oldAudio = this.ambienceAudio;
    const oldSynth = this.isUsingSynthAmbience;

    let targetVolume = this.currentAmbienceVolume;
    if (typeof volumeOrName === 'number') targetVolume = volumeOrName;

    // Se houver áudio anterior, inicia fade-out suave
    if (oldAudio) {
      this.fadeAudio(oldAudio, 0, crossfadeDurationMs).then(() => {
        this.killAudio(oldAudio, this.handleAmbienceEnded);
      });
    } else if (oldSynth) {
      proceduralAudio.stopAmbience();
    }

    // Inicia o novo som ambiente e faz fade-in até o volume alvo
    await this.playAmbience(trackOrUrl, 0.001, nameOrId, id);

    if (this.ambienceAudio) {
      await this.fadeAudio(this.ambienceAudio, targetVolume, crossfadeDurationMs);
    }
  }

  /**
   * Transiciona suavemente para uma nova faixa de música fazendo crossfade.
   */
  async crossfadeToMusic(
    trackOrUrl: AudioTrack | string,
    volumeOrName?: number | string,
    nameOrId?: string,
    id?: string,
    crossfadeDurationMs = 2500
  ) {
    const oldAudio = this.nativeMusicAudio;
    const oldSynth = this.isUsingSynthMusic;

    let targetVolume = this.currentMusicVolume;
    if (typeof volumeOrName === 'number') targetVolume = volumeOrName;

    if (oldAudio) {
      this.fadeAudio(oldAudio, 0, crossfadeDurationMs).then(() => {
        this.killAudio(oldAudio, this.handleMusicEnded);
      });
    } else if (oldSynth) {
      proceduralAudio.stopMusic();
    }

    await this.playMusic(trackOrUrl, 0.001, nameOrId, id);

    if (this.nativeMusicAudio) {
      await this.fadeAudio(this.nativeMusicAudio, targetVolume, crossfadeDurationMs);
    }
  }

  seekAmbience(seconds: number) {
    if (this.ambienceAudio) this.ambienceAudio.currentTime = seconds;
  }

  private activeSfx: Map<string, HTMLAudioElement> = new Map();

  async playSFX(item: SoundboardItem) {
    // Apenas se explicitamente configurado com synth:
    if (item.url?.startsWith('synth:') || item.url?.startsWith('procedural:')) {
      const synthType = (item.url || '').replace(/^(synth:|procedural:)/, '') || item.id;
      proceduralAudio.playSFX(synthType, item.volume || 1);
      return;
    }

    if (this.activeSfx.has(item.id)) {
      const existing = this.activeSfx.get(item.id)!;
      existing.pause();
      existing.src = '';
      this.activeSfx.delete(item.id);
      if (this.activeSfxUrls.has(item.id)) {
        URL.revokeObjectURL(this.activeSfxUrls.get(item.id)!);
        this.activeSfxUrls.delete(item.id);
      }
    }

    const finalUrl = await this.resolveTrackUrl(item, 'sfx');
    if (!finalUrl) {
      proceduralAudio.playSFX(item.id, item.volume || 1);
      return;
    }

    if (finalUrl.startsWith('blob:')) this.activeSfxUrls.set(item.id, finalUrl);

    const sfx = new Audio(finalUrl);
    sfx.volume = Math.max(0, Math.min(1, item.volume ?? 1));
    this.activeSfx.set(item.id, sfx);

    const cleanup = () => {
      this.activeSfx.delete(item.id);
      if (this.activeSfxUrls.has(item.id)) {
        URL.revokeObjectURL(this.activeSfxUrls.get(item.id)!);
        this.activeSfxUrls.delete(item.id);
      }
    };

    sfx.addEventListener('ended', cleanup, { once: true });
    sfx.addEventListener('error', (e) => {
      console.warn('[AudioEngine] Erro no SFX, tentando procedural...', finalUrl, e);
      cleanup();
      proceduralAudio.playSFX(item.id, item.volume || 1);
    }, { once: true });

    try {
      await sfx.play();
    } catch {
      cleanup();
      proceduralAudio.playSFX(item.id, item.volume || 1);
    }
  }

  setMusicVolume(val: number) {
    this.currentMusicVolume = val;
    if (this.nativeMusicAudio) this.nativeMusicAudio.volume = val;
    proceduralAudio.setMusicVolume(val);
    this.emitState({ musicVolume: val });
  }

  setAmbienceVolume(val: number) {
    this.currentAmbienceVolume = val;
    if (this.ambienceAudio) this.ambienceAudio.volume = val;
    proceduralAudio.setAmbienceVolume(val);
    this.emitState({ ambienceVolume: val });
  }
}

export const audioEngine = new AudioEngine();


