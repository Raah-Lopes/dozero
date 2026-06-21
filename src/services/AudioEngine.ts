import type { AudioTrack, SoundboardItem, AudioProviderType } from '../utils/audioTypes';

class AudioEngine {
  private musicPlayer: HTMLIFrameElement | null = null; // Para YouTube/Spotify embed
  private ambienceAudio: HTMLAudioElement | null = null;
  private sfxAudio: HTMLAudioElement | null = null;
  
  // Callbacks para atualizar a UI
  onStateChange?: (state: any) => void;

  constructor() {
    this.ambienceAudio = new Audio();
    this.sfxAudio = new Audio();
    this.sfxAudio.preload = 'auto'; // Carregar SFX rapidamente
  }

  /**
   * Extrai o ID de embed de URLs variadas
   */
  private getEmbedUrl(track: AudioTrack): string | null {
    const { provider, url } = track;
    
    if (provider === 'youtube') {
      const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${videoId}&controls=0` : null;
    }
    
    if (provider === 'spotify') {
      // Spotify requer iframe específico, simplificado aqui
      const trackId = url.match(/track\/([a-zA-Z0-9]+)/)?.[1];
      return trackId ? `https://open.spotify.com/embed/track/${trackId}?utm_source=generator` : null;
    }

    if (provider === 'local' || provider === 'direct') {
      return url;
    }

    // Fallback para links diretos de mp3/ogg
    return url;
  }

  private nativeMusicAudio: HTMLAudioElement | null = null;

  playMusic(track: AudioTrack, volume: number) {
    const embedUrl = this.getEmbedUrl(track);
    if (!embedUrl) return console.error('URL inválida para música');

    // Lógica simplificada para YouTube Embed (em produção usaria a API do YT IFrame)
    this.stopMusic(0); // Clean up first

    if (track.provider === 'youtube') {
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      // Use opacity 0 instead of display:none to prevent autoplay block
      iframe.style.position = 'absolute';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.setAttribute('allow', 'autoplay; encrypted-media');
      document.body.appendChild(iframe);
      this.musicPlayer = iframe;
      // Nota: Controle de volume real requer conexão com a API do YT via postMessage
    } else {
      // Para arquivos locais/diretos
      this.nativeMusicAudio = new Audio(embedUrl);
      this.nativeMusicAudio.loop = true;
      this.nativeMusicAudio.volume = volume;
      this.nativeMusicAudio.play().catch(e => console.warn("Interação do usuário necessária primeiro", e));
    }
    
    this.onStateChange?.({ currentMusicId: track.id, isPlayingMusic: true });
  }

  stopMusic(fadeDuration: number = 1000) {
    if (this.musicPlayer) {
       document.body.removeChild(this.musicPlayer);
       this.musicPlayer = null;
    }
    if (this.nativeMusicAudio) {
       this.nativeMusicAudio.pause();
       this.nativeMusicAudio.src = '';
       this.nativeMusicAudio = null;
    }
    this.onStateChange?.({ isPlayingMusic: false });
  }

  playAmbience(track: AudioTrack, volume: number) {
    const src = this.getEmbedUrl(track);
    if (!src || !this.ambienceAudio) return;

    this.ambienceAudio.src = src;
    this.ambienceAudio.loop = true;
    this.ambienceAudio.volume = volume;
    this.ambienceAudio.play().catch(e => console.warn(e));
    
    this.onStateChange?.({ currentAmbienceId: track.id, isPlayingAmbience: true });
  }

  playSFX(item: SoundboardItem) {
    const src = this.getEmbedUrl({ ...item, category: 'sfx' } as AudioTrack);
    if (!src) return;

    // Criar nova instância para permitir sobreposição de sons (ex: várias espadas)
    const sfx = new Audio(src);
    sfx.volume = item.volume;
    sfx.play().catch(e => console.warn(e));
  }

  setMusicVolume(val: number) {
    // Ajustar volume do player ativo
  }

  setAmbienceVolume(val: number) {
    if (this.ambienceAudio) {
      this.ambienceAudio.volume = val;
    }
  }
}

export const audioEngine = new AudioEngine();
