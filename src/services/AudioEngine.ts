import type { AudioTrack, SoundboardItem, AudioProviderType } from '../utils/audioTypes';

const INVIDIOUS_INSTANCES = [
  'https://vid.puffyan.us',
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de'
];

class AudioEngine {
  private nativeMusicAudio: HTMLAudioElement | null = null;
  private ambienceAudio: HTMLAudioElement | null = null;
  private sfxAudio: HTMLAudioElement | null = null;
  
  // YouTube API
  private ytPlayer: any = null;
  private isYtReady = false;
  private pendingYtVideoId: string | null = null;
  private pendingYtVolume: number = 1;

  private ytAmbiencePlayer: any = null;
  private isYtAmbienceReady = false;
  private pendingYtAmbienceId: string | null = null;
  private pendingYtAmbienceVolume: number = 1;

  private ytSfxPlayer: any = null;
  private isYtSfxReady = false;
  private currentMusicVolume: number = 0.7;
  private currentAmbienceVolume: number = 0.4;
  private currentMusicTrack: AudioTrack | null = null;
  private currentAmbienceTrack: AudioTrack | null = null;

  // Callbacks para atualizar a UI
  onStateChange?: (state: any) => void;
  onProgressChange?: (type: 'music' | 'ambience', current: number, duration: number) => void;
  
  private progressInterval: any = null;

  private fadeAudio(audio: HTMLAudioElement | any, targetVolume: number, duration: number, isYt: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      if (!audio) return resolve();
      
      const safeTarget = Number.isFinite(targetVolume) ? targetVolume : 0;
      
      if (duration <= 0) {
        if (isYt && typeof audio.setVolume === 'function') {
          audio.setVolume(safeTarget * 100);
        } else if (!isYt && audio) {
          audio.volume = safeTarget;
        }
        return resolve();
      }
      
      const startVolume = isYt ? (typeof audio.getVolume === 'function' ? audio.getVolume() / 100 : 0) : audio.volume;
      const safeStart = Number.isFinite(startVolume) ? startVolume : 0;
      const startTime = performance.now();
      
      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentVol = safeStart + (safeTarget - safeStart) * progress;
        
        if (Number.isFinite(currentVol)) {
          if (isYt && typeof audio.setVolume === 'function') {
            audio.setVolume(currentVol * 100);
          } else if (!isYt && audio) {
            audio.volume = Math.max(0, Math.min(1, currentVol));
          }
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

  constructor() {
    this.ambienceAudio = new Audio();
    this.sfxAudio = new Audio();
    this.sfxAudio.preload = 'auto';

    this.initYouTubeAPI();
    this.startProgressLoop();
  }

  private startProgressLoop() {
    this.progressInterval = setInterval(() => {
      // Music
      if (this.currentMusicTrack) {
        if (this.currentMusicTrack.provider === 'youtube' && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
          const current = this.ytPlayer.getCurrentTime() || 0;
          const duration = this.ytPlayer.getDuration() || 0;
          if (duration > 0 && Number.isFinite(duration)) this.onProgressChange?.('music', current, duration);
        } else if (this.nativeMusicAudio) {
          const current = this.nativeMusicAudio.currentTime || 0;
          const duration = this.nativeMusicAudio.duration || 0;
          if (duration > 0 && Number.isFinite(duration)) this.onProgressChange?.('music', current, duration);
        }
      }

      // Ambience
      if (this.currentAmbienceTrack) {
        if (this.currentAmbienceTrack.provider === 'youtube' && this.ytAmbiencePlayer && typeof this.ytAmbiencePlayer.getCurrentTime === 'function') {
          const current = this.ytAmbiencePlayer.getCurrentTime() || 0;
          const duration = this.ytAmbiencePlayer.getDuration() || 0;
          if (duration > 0 && Number.isFinite(duration)) this.onProgressChange?.('ambience', current, duration);
        } else if (this.ambienceAudio) {
          const current = this.ambienceAudio.currentTime || 0;
          const duration = this.ambienceAudio.duration || 0;
          if (duration > 0 && Number.isFinite(duration)) this.onProgressChange?.('ambience', current, duration);
        }
      }
    }, 1000);
  }

  private initYouTubeAPI() {
    // Limpar iframes/divs antigos que possam ter ficado de um hot-reload do Vite
    const oldIds = ['dozero-yt-player', 'dozero-yt-player-ambience', 'dozero-yt-player-sfx'];
    oldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    const createPlayerDiv = (id: string) => {
      const div = document.createElement('div');
      div.id = id;
      div.style.position = 'absolute';
      div.style.left = '-9999px';
      div.style.width = '300px';
      div.style.height = '300px';
      div.style.opacity = '0.01';
      div.style.pointerEvents = 'none';
      document.body.appendChild(div);
    };

    createPlayerDiv('dozero-yt-player');
    createPlayerDiv('dozero-yt-player-ambience');
    createPlayerDiv('dozero-yt-player-sfx');

    const setupPlayers = () => {
      this.ytPlayer = new (window as any).YT.Player('dozero-yt-player', {
        host: 'https://www.youtube.com',
        height: '300',
        width: '300',
        videoId: '',
        playerVars: {
          'playsinline': 1,
          'controls': 0,
          'disablekb': 1,
          'fs': 0,
          'rel': 0,
          'loop': 1,
          'origin': window.location.origin,
          'enablejsapi': 1
        },
        events: {
          'onReady': () => {
            this.isYtReady = true;
            console.log('YouTube Player pronto');
            if (this.pendingYtVideoId) {
              if (this.pendingYtVideoId.startsWith('LIST:')) {
                this.ytPlayer.loadPlaylist({
                  list: this.pendingYtVideoId.replace('LIST:', ''),
                  listType: 'playlist'
                });
              } else {
                this.ytPlayer.loadVideoById({ videoId: this.pendingYtVideoId });
              }
              this.ytPlayer.setVolume(this.pendingYtVolume * 100);
              this.pendingYtVideoId = null;
            }
          },
          'onStateChange': (event: any) => {
             console.log('YouTube Player estado:', event.data);
             // Se o vídeo terminou e loop falhou, forçar repetição
             if (event.data === 0) { // 0 = YT.PlayerState.ENDED
               this.ytPlayer.seekTo(0);
               this.ytPlayer.playVideo();
             }
             if (event.data === 1) { // 1 = PLAYING
               if (this.currentMusicTrack) {
                 this.onStateChange?.({ currentMusicId: this.currentMusicTrack.id, isPlayingMusic: true });
               }
             }
             if (event.data === 5) { // 5 = CUED
               console.log("Vídeo enfileirado (cued), forçando play...");
               this.ytPlayer.playVideo();
             }
          },
          'onError': (event: any) => {
            console.error('Erro no YouTube Player:', event.data);
            this.onStateChange?.({ isPlayingMusic: false });
          }
        }
      });

      this.ytAmbiencePlayer = new (window as any).YT.Player('dozero-yt-player-ambience', {
        host: 'https://www.youtube.com',
        height: '300', width: '300', videoId: '',
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0, 'loop': 1, 'origin': window.location.origin, 'enablejsapi': 1 },
        events: {
          'onReady': () => {
             this.isYtAmbienceReady = true;
             if (this.pendingYtAmbienceId) {
                if (this.pendingYtAmbienceId.startsWith('LIST:')) {
                  this.ytAmbiencePlayer.loadPlaylist({ list: this.pendingYtAmbienceId.replace('LIST:', ''), listType: 'playlist' });
                } else {
                  this.ytAmbiencePlayer.loadVideoById({ videoId: this.pendingYtAmbienceId });
                }
                this.ytAmbiencePlayer.setVolume(this.pendingYtAmbienceVolume * 100);
                this.pendingYtAmbienceId = null;
             }
          },
          'onStateChange': (event: any) => {
             if (event.data === 0) { this.ytAmbiencePlayer.seekTo(0); this.ytAmbiencePlayer.playVideo(); }
             if (event.data === 1 && this.currentAmbienceTrack) {
                this.onStateChange?.({ currentAmbienceId: this.currentAmbienceTrack.id, isPlayingAmbience: true });
             }
             if (event.data === 5) this.ytAmbiencePlayer.playVideo();
          }
        }
      });

      this.ytSfxPlayer = new (window as any).YT.Player('dozero-yt-player-sfx', {
        host: 'https://www.youtube.com',
        height: '300', width: '300', videoId: '',
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0, 'origin': window.location.origin, 'enablejsapi': 1 },
        events: {
          'onReady': () => { this.isYtSfxReady = true; },
          'onStateChange': (event: any) => {
             if (event.data === 5) this.ytSfxPlayer.playVideo();
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      setupPlayers();
    } else {
      (window as any).onYouTubeIframeAPIReady = setupPlayers;
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }
    }
  }



  /**
   * Extrai o ID de embed de URLs variadas
   */
  private getEmbedUrl(track: AudioTrack): string | null {
    const { provider, url } = track;
    
    if (provider === 'youtube') {
      const listMatch = url.match(/[?&]list=([^&]+)/);
      if (listMatch) {
         return 'LIST:' + listMatch[1];
      }
      const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/)?.[1];
      return videoId || url; // Se url já for o id
    }
    
    if (provider === 'spotify') {
      const trackId = url.match(/track\/([a-zA-Z0-9]+)/)?.[1];
      return trackId ? `https://open.spotify.com/embed/track/${trackId}?utm_source=generator` : null;
    }

    if (provider === 'tabletop' || (url && url.includes('tabletopaudio.com'))) {
      return url; // `<audio>` tag can load tabletop without CORS
    }

    return url;
  }

  playMusic(track: AudioTrack, volume: number) {
    this.currentMusicVolume = volume;
    this.currentMusicTrack = track;
    const embedIdOrUrl = this.getEmbedUrl(track);
    if (!embedIdOrUrl) {
      console.error('URL inválida para música:', track.url);
      return;
    }

    this.stopMusic(0);

    if (track.provider === 'youtube') {
      const videoId = embedIdOrUrl; 
      console.log('Tentando tocar YouTube:', videoId, 'API pronta?', this.isYtReady);
      
      if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
        console.log('Carregando vídeo/playlist no player YT...');
        if (videoId.startsWith('LIST:')) {
          this.ytPlayer.loadPlaylist({
            list: videoId.replace('LIST:', ''),
            listType: 'playlist'
          });
        } else {
          this.ytPlayer.loadVideoById({ 
            videoId: videoId
          });
          if (typeof this.ytPlayer.playVideo === 'function') {
            this.ytPlayer.playVideo();
          }
        }
        this.ytPlayer.setVolume(0);
        this.fadeAudio(this.ytPlayer, volume, 2000, true);
        // O estado só vai ser atualizado para true quando o player disparar o evento PLAYING
        this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: false });
      } else {
        console.log('YouTube API não está pronta, guardando na fila...');
        this.pendingYtVideoId = videoId;
        this.pendingYtVolume = volume;
        this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: false });
      }
    } else {
      // Provedores locais ou diretos
      this.playNativeAudio(embedIdOrUrl, track, volume, true);
    }
  }

  private playNativeAudio(src: string, track: AudioTrack, volume: number, isMusic: boolean = false) {
    console.log(`Tocando áudio nativo [${isMusic ? 'Música' : 'Ambiente'}]:`, src);
    
    const audioEl = new Audio(src);
    audioEl.loop = true;
    audioEl.volume = 0;
    
    if (isMusic) {
      this.nativeMusicAudio = audioEl;
      this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: true });
    } else {
      this.ambienceAudio = audioEl;
      this.onStateChange?.({ currentAmbienceId: track.id, isPlayingAmbience: true });
    }
    
    audioEl.play()
      .then(() => {
        this.fadeAudio(audioEl, volume, 2000, false);
      })
      .catch(e => {
        console.error(`Erro ao reproduzir áudio (${track.title}):`, e);
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
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function' && this.currentMusicTrack?.provider === 'youtube') {
      this.ytPlayer.pauseVideo();
    } else if (this.nativeMusicAudio) {
      this.nativeMusicAudio.pause();
    }
    this.onStateChange?.({ isPlayingMusic: false });
  }

  resumeMusic() {
    if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function' && this.currentMusicTrack?.provider === 'youtube') {
      this.ytPlayer.playVideo();
    } else if (this.nativeMusicAudio) {
      this.nativeMusicAudio.play().catch(e => console.error("Resume error:", e));
    }
    this.onStateChange?.({ isPlayingMusic: true });
  }

  async stopMusic(fadeDuration: number = 2000) {
    const oldYt = this.ytPlayer;
    const oldNative = this.nativeMusicAudio;
    
    this.pendingYtVideoId = null;
    this.currentMusicTrack = null;
    this.onStateChange?.({ isPlayingMusic: false });

    // Se tiver outro rodando, remove a referência atual para não atrapalhar o crossfade
    this.nativeMusicAudio = null;

    if (oldYt && typeof oldYt.getVolume === 'function') {
      await this.fadeAudio(oldYt, 0, fadeDuration, true);
      if (typeof oldYt.stopVideo === 'function') oldYt.stopVideo();
    }
    
    if (oldNative) {
      await this.fadeAudio(oldNative, 0, fadeDuration, false);
      oldNative.pause();
      oldNative.src = '';
    }
  }

  seekMusic(seconds: number) {
    if (this.currentMusicTrack?.provider === 'youtube' && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(seconds, true);
    } else if (this.nativeMusicAudio) {
      this.nativeMusicAudio.currentTime = seconds;
    }
  }

  pauseAmbience() {
    if (this.ytAmbiencePlayer && typeof this.ytAmbiencePlayer.pauseVideo === 'function') {
      this.ytAmbiencePlayer.pauseVideo();
    }
    if (this.ambienceAudio) {
      this.ambienceAudio.pause();
    }
    this.onStateChange?.({ isPlayingAmbience: false });
  }

  resumeAmbience() {
    if (this.ytAmbiencePlayer && typeof this.ytAmbiencePlayer.playVideo === 'function' && this.currentAmbienceTrack?.provider === 'youtube') {
      this.ytAmbiencePlayer.playVideo();
    } else if (this.ambienceAudio) {
      this.ambienceAudio.play();
    }
    this.onStateChange?.({ isPlayingAmbience: true });
  }

  stopAmbience(fadeMs: number = 1000) {
    if (this.ytAmbiencePlayer && typeof this.ytAmbiencePlayer.setVolume === 'function') {
      this.fadeAudio(this.ytAmbiencePlayer, 0, fadeMs).then(() => {
        this.ytAmbiencePlayer.stopVideo();
      });
    }
    if (this.ambienceAudio) {
      const oldAmbience = this.ambienceAudio;
      this.fadeAudio(oldAmbience, 0, fadeMs).then(() => {
        oldAmbience.pause();
        oldAmbience.src = '';
      });
      this.ambienceAudio = new Audio();
    }
    this.currentAmbienceTrack = null;
    this.onStateChange?.({ isPlayingAmbience: false, currentAmbienceId: null });
  }

  seekAmbience(seconds: number) {
    if (this.currentAmbienceTrack?.provider === 'youtube' && this.ytAmbiencePlayer && typeof this.ytAmbiencePlayer.seekTo === 'function') {
      this.ytAmbiencePlayer.seekTo(seconds, true);
    } else if (this.ambienceAudio) {
      this.ambienceAudio.currentTime = seconds;
    }
  }

  playAmbience(track: AudioTrack, volume: number) {
    this.currentAmbienceVolume = volume;
    this.currentAmbienceTrack = track;
    const src = this.getEmbedUrl(track);
    
    if (!src) {
      console.error('URL inválida ou áudio não inicializado para ambiente:', track.url);
      return;
    }

    if (track.provider === 'youtube') {
      const videoId = src;
      if (this.isYtAmbienceReady && this.ytAmbiencePlayer && typeof this.ytAmbiencePlayer.loadVideoById === 'function') {
        if (videoId.startsWith('LIST:')) {
          this.ytAmbiencePlayer.loadPlaylist({ list: videoId.replace('LIST:', ''), listType: 'playlist' });
        } else {
          this.ytAmbiencePlayer.loadVideoById({ videoId });
          if (typeof this.ytAmbiencePlayer.playVideo === 'function') this.ytAmbiencePlayer.playVideo();
        }
        this.ytAmbiencePlayer.setVolume(0);
        this.fadeAudio(this.ytAmbiencePlayer, volume, 2000, true);
        this.onStateChange?.({ currentAmbienceId: track.id, isPlayingAmbience: false });
      } else {
        this.pendingYtAmbienceId = videoId;
        this.pendingYtAmbienceVolume = volume;
        this.onStateChange?.({ currentAmbienceId: track.id, isPlayingAmbience: false });
      }
      return;
    }

    if (this.ambienceAudio) {
      this.stopAmbience(2000);
    }
    this.playNativeAudio(src, track, volume, false);
  }

  playSFX(item: SoundboardItem) {
    const src = this.getEmbedUrl({ ...item, category: 'sfx' } as AudioTrack);
    if (!src) {
      console.error('URL inválida para SFX:', item.url);
      return;
    }

    if (item.provider === 'youtube') {
       if (this.isYtSfxReady && this.ytSfxPlayer && typeof this.ytSfxPlayer.loadVideoById === 'function') {
         this.ytSfxPlayer.loadVideoById({ videoId: src });
         this.ytSfxPlayer.setVolume(item.volume ? item.volume * 100 : 100);
         if (typeof this.ytSfxPlayer.playVideo === 'function') this.ytSfxPlayer.playVideo();
       } else {
         console.warn("YouTube SFX player not ready yet.");
       }
       return;
    }

    console.log('Tocando SFX:', item.title, src);
    const sfx = new Audio(src);
    sfx.volume = item.volume;
    
    sfx.addEventListener('canplaythrough', () => {
      sfx.play().catch(e => console.error('Erro ao tocar SFX:', e));
    }, { once: true });
    
    sfx.addEventListener('error', (e) => {
      console.error('Erro no SFX:', e);
    });
    
    sfx.load();
  }

  setMusicVolume(val: number) {
    this.currentMusicVolume = val;
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      this.ytPlayer.setVolume(val * 100);
    }
    if (this.nativeMusicAudio) {
      this.nativeMusicAudio.volume = val;
    }
  }

  setAmbienceVolume(val: number) {
    this.currentAmbienceVolume = val;
    if (this.ytAmbiencePlayer && typeof this.ytAmbiencePlayer.setVolume === 'function') {
      this.ytAmbiencePlayer.setVolume(val * 100);
    }
    if (this.ambienceAudio) {
      this.ambienceAudio.volume = val;
    }
  }
}

export const audioEngine = new AudioEngine();
