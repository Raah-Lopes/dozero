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

  // Callbacks para atualizar a UI
  onStateChange?: (state: any) => void;

  constructor() {
    this.ambienceAudio = new Audio();
    this.sfxAudio = new Audio();
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
        height: '300',
        width: '300',
        videoId: '',
        playerVars: {
          'playsinline': 1,
          'controls': 0,
          'disablekb': 1,
          'fs': 0,
          'rel': 0,
          'loop': 1
        },
        events: {
          'onReady': () => {
            this.isYtReady = true;
            if (this.pendingYtVideoId) {
              this.ytPlayer.loadVideoById({ videoId: this.pendingYtVideoId });
              this.ytPlayer.setVolume(this.pendingYtVolume * 100);
              this.pendingYtVideoId = null;
            }
          },
          'onStateChange': (event: any) => {
             // Se o vídeo terminou e loop falhou, forçar repetição
             if (event.data === 0) { // 0 = YT.PlayerState.ENDED
               this.ytPlayer.seekTo(0);
               this.ytPlayer.playVideo();
             }
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
    const embedIdOrUrl = this.getEmbedUrl(track);
    if (!embedIdOrUrl) return console.error('URL inválida para música');

    this.stopMusic(0);

    if (track.provider === 'youtube') {
      if (this.isYtReady && this.ytPlayer) {
        this.ytPlayer.loadVideoById({ videoId: embedIdOrUrl });
        this.ytPlayer.setVolume(volume * 100);
      } else {
        // Guarda na fila se a API ainda não tiver carregado
        this.pendingYtVideoId = embedIdOrUrl;
        this.pendingYtVolume = volume;
      }
    } else {
      this.nativeMusicAudio = new Audio(embedIdOrUrl);
      this.nativeMusicAudio.loop = true;
      this.nativeMusicAudio.volume = volume;
      this.nativeMusicAudio.play().catch(e => console.warn("Interação do usuário necessária primeiro", e));
    }
    
    this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: true });
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
    const src = this.getEmbedUrl(track);
    if (!src || !this.ambienceAudio) return;

    if (track.provider === 'youtube') {
      console.warn("Ambiente do YouTube ainda não suportado nativamente. Tente arquivos mp3.");
      return;
    }

    this.ambienceAudio.src = src;
    this.ambienceAudio.loop = true;
    this.ambienceAudio.volume = volume;
    this.ambienceAudio.play().catch(e => console.warn(e));
    
    this.onStateChange?.({ currentAmbienceId: track.id, isPlayingAmbience: true });
  }

  playSFX(item: SoundboardItem) {
    const src = this.getEmbedUrl({ ...item, category: 'sfx' } as AudioTrack);
    if (!src) return;

    if (item.provider === 'youtube') {
       console.warn("SFX do YouTube não são ideais devido a latência da API.");
       return;
    }

    const sfx = new Audio(src);
    sfx.volume = item.volume;
    sfx.play().catch(e => console.warn(e));
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
