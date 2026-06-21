import type { AudioTrack, SoundboardItem, AudioProviderType } from '../utils/audioTypes';

class AudioEngine {
  private nativeMusicAudio: HTMLAudioElement | null = null;
  private ambienceAudio: HTMLAudioElement | null = null;
  private sfxAudio: HTMLAudioElement | null = null;
  
  // YouTube API
  private ytPlayer: any = null;
  private isYtReady: boolean = false;
  private pendingYtVideoId: string | null = null;
  private pendingYtVolume: number = 0.5;

  private currentMusicVolume: number = 0.7;
  private currentAmbienceVolume: number = 0.4;

  // Callbacks para atualizar a UI
  onStateChange?: (state: any) => void;

  constructor() {
    this.ambienceAudio = new Audio();
    this.ambienceAudio.crossOrigin = 'anonymous';
    this.sfxAudio = new Audio();
    this.sfxAudio.crossOrigin = 'anonymous';
    this.sfxAudio.preload = 'auto'; // Carregar SFX rapidamente

    this.initYouTubeAPI();
  }

  private initYouTubeAPI() {
    if (document.getElementById('youtube-iframe-api')) return; // Já carregou

    const tag = document.createElement('script');
    tag.id = 'youtube-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Div oculta para o player
    const playerDiv = document.createElement('div');
    playerDiv.id = 'dozero-yt-player';
    playerDiv.style.position = 'absolute';
    playerDiv.style.left = '-9999px'; // Fora da tela
    playerDiv.style.width = '300px';
    playerDiv.style.height = '300px'; // Tamanho decente para o Chrome não bloquear por visibilidade
    playerDiv.style.opacity = '0.01'; // Quase invisível
    playerDiv.style.pointerEvents = 'none';
    document.body.appendChild(playerDiv);

    // Callback global que a API do YT chama quando carrega
    (window as any).onYouTubeIframeAPIReady = () => {
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
          'origin': window.location.origin
        },
        events: {
          'onReady': () => {
            console.log('YouTube Player pronto');
            this.isYtReady = true;
            if (this.pendingYtVideoId) {
              this.ytPlayer.loadVideoById({ videoId: this.pendingYtVideoId });
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
          },
          'onError': (event: any) => {
            console.error('Erro no YouTube Player:', event.data);
          }
        }
      });
    };
  }

  /**
   * Extrai o ID de embed de URLs variadas
   */
  private getEmbedUrl(track: AudioTrack): string | null {
    const { provider, url } = track;
    
    if (provider === 'youtube') {
      const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/)?.[1];
      return videoId || null;
    }
    
    if (provider === 'spotify') {
      const trackId = url.match(/track\/([a-zA-Z0-9]+)/)?.[1];
      return trackId ? `https://open.spotify.com/embed/track/${trackId}?utm_source=generator` : null;
    }

    return url;
  }

  playMusic(track: AudioTrack, volume: number) {
    this.currentMusicVolume = volume;
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
        console.log('Carregando vídeo no player YT...');
        this.ytPlayer.loadVideoById({ videoId });
        this.ytPlayer.setVolume(volume * 100);
        this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: true });
      } else {
        console.log('YouTube API não está pronta, guardando na fila...');
        this.pendingYtVideoId = videoId;
        this.pendingYtVolume = volume;
        this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: false });
      }
    } else {
      console.log('Tocando áudio nativo:', embedIdOrUrl);
      this.nativeMusicAudio = new Audio(embedIdOrUrl);
      this.nativeMusicAudio.crossOrigin = 'anonymous';
      this.nativeMusicAudio.loop = true;
      this.nativeMusicAudio.volume = volume;
      
      this.nativeMusicAudio.addEventListener('canplaythrough', () => {
        console.log('Áudio pronto para tocar');
        this.nativeMusicAudio!.play()
          .then(() => {
            console.log('Reprodução iniciada com sucesso');
            this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: true });
          })
          .catch(e => {
            console.error('Erro ao reproduzir áudio:', e);
            this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: false });
          });
      }, { once: true });
      
      this.nativeMusicAudio.addEventListener('error', (e) => {
        console.error('Erro no elemento de áudio:', e);
        this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: false });
      });
      
      this.nativeMusicAudio.load();
    }
  }

  stopMusic(fadeDuration: number = 1000) {
    if (this.ytPlayer && typeof this.ytPlayer.stopVideo === 'function') {
       this.ytPlayer.stopVideo();
    }
    if (this.nativeMusicAudio) {
       this.nativeMusicAudio.pause();
       this.nativeMusicAudio.src = '';
       this.nativeMusicAudio = null;
    }
    this.pendingYtVideoId = null;
    this.onStateChange?.({ isPlayingMusic: false });
  }

  playAmbience(track: AudioTrack, volume: number) {
    this.currentAmbienceVolume = volume;
    const src = this.getEmbedUrl(track);
    
    if (!src || !this.ambienceAudio) {
      console.error('URL inválida ou áudio não inicializado para ambiente:', track.url);
      return;
    }

    if (track.provider === 'youtube') {
      console.warn("Ambiente do YouTube ainda não suportado nativamente. Tente arquivos mp3.");
      return;
    }

    console.log('Tocando ambiente:', src);
    this.ambienceAudio.src = src;
    this.ambienceAudio.crossOrigin = 'anonymous';
    this.ambienceAudio.loop = true;
    this.ambienceAudio.volume = volume;

    this.ambienceAudio.addEventListener('canplaythrough', () => {
      console.log('Ambiente pronto para tocar');
      this.ambienceAudio!.play()
        .then(() => {
          console.log('Ambiente iniciado com sucesso');
          this.onStateChange?.({ currentAmbienceId: track.id, isPlayingAmbience: true });
        })
        .catch(e => {
          console.error('Erro ao reproduzir ambiente:', e);
          this.onStateChange?.({ currentAmbienceId: track.id, isPlayingAmbience: false });
        });
    }, { once: true });
    
    this.ambienceAudio.addEventListener('error', (e) => {
      console.error('Erro no elemento de áudio de ambiente:', e);
      this.onStateChange?.({ currentAmbienceId: track.id, isPlayingAmbience: false });
    });
    
    this.ambienceAudio.load();
  }

  playSFX(item: SoundboardItem) {
    const src = this.getEmbedUrl({ ...item, category: 'sfx' } as AudioTrack);
    if (!src) {
      console.error('URL inválida para SFX:', item.url);
      return;
    }

    if (item.provider === 'youtube') {
       console.warn("SFX do YouTube não são ideais devido a latência da API.");
       return;
    }

    console.log('Tocando SFX:', item.title, src);
    const sfx = new Audio(src);
    sfx.crossOrigin = 'anonymous';
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
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      this.ytPlayer.setVolume(val * 100);
    }
    if (this.nativeMusicAudio) {
      this.nativeMusicAudio.volume = val;
    }
  }

  setAmbienceVolume(val: number) {
    if (this.ambienceAudio) {
      this.ambienceAudio.volume = val;
    }
  }
}

export const audioEngine = new AudioEngine();
