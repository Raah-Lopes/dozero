import React, { useEffect, useState, useRef } from 'react';
import { state } from '../../services/yjs';
import { useAudioStore } from '../../store/audioStore';

type SyncedMedia = { url: string; isPlaying: boolean; ts: number };

function asSyncedMedia(value: unknown): SyncedMedia | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.url !== 'string' || typeof candidate.isPlaying !== 'boolean') return null;
  return { url: candidate.url, isPlaying: candidate.isPlaying, ts: typeof candidate.ts === 'number' ? candidate.ts : Date.now() };
}

export function GlobalAudioSync() {
  const [musicState, setMusicState] = useState<SyncedMedia | null>(null);
  const [ambienceState, setAmbienceState] = useState<SyncedMedia | null>(null);

  const { musicVolume, ambienceVolume, loopMode } = useAudioStore();
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const ambienceAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const handleAudioUpdate = () => {
      const music = state.audio.get('music');
      const ambience = state.audio.get('ambience');
      setMusicState(asSyncedMedia(music));
      setAmbienceState(asSyncedMedia(ambience));
    };

    state.audio.observe(handleAudioUpdate);
    handleAudioUpdate();

    return () => {
      state.audio.unobserve(handleAudioUpdate);
    };
  }, []);

  // O soundboard principal vive no módulo SOUND, mas a transmissão precisa
  // seguir o mesmo canal Yjs usado pelo restante da mesa.
  useEffect(() => {
    const handleSoundboardBroadcast = (event: Event) => {
      const detail = (event as CustomEvent<{ url?: string; isPlaying?: boolean; ts?: number }>).detail;
      if (!detail || typeof detail.url !== 'string' || typeof detail.isPlaying !== 'boolean') return;
      state.audio.set('music', {
        url: detail.url,
        isPlaying: detail.isPlaying,
        ts: detail.ts ?? Date.now(),
      });
    };

    window.addEventListener('dozero-soundboard-broadcast', handleSoundboardBroadcast);
    return () => window.removeEventListener('dozero-soundboard-broadcast', handleSoundboardBroadcast);
  }, []);

  useEffect(() => {
    if (musicAudioRef.current) musicAudioRef.current.volume = musicVolume;
  }, [musicVolume]);

  useEffect(() => {
    if (ambienceAudioRef.current) ambienceAudioRef.current.volume = ambienceVolume;
  }, [ambienceVolume]);

  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio || !musicState?.url) return;
    if (musicState.isPlaying) void audio.play().catch(() => undefined);
    else audio.pause();
  }, [musicState?.isPlaying, musicState?.url]);

  useEffect(() => {
    const audio = ambienceAudioRef.current;
    if (!audio || !ambienceState?.url) return;
    if (ambienceState.isPlaying) void audio.play().catch(() => undefined);
    else audio.pause();
  }, [ambienceState?.isPlaying, ambienceState?.url]);

  const renderPlayer = (mediaState: SyncedMedia | null, type: 'music' | 'ambience', volume: number, loop: boolean, ref: React.RefObject<HTMLAudioElement>) => {
    if (!mediaState || !mediaState.url) return null;
    
    // Check if YouTube
    const ytMatch = mediaState.url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      const iframeId = `yt-iframe-${type}`;
      
      // Quando o isPlaying mudar, enviamos um postMessage para pausar/despausar nativamente sem recarregar o iframe
      const isPlaying = mediaState.isPlaying;
      setTimeout(() => {
        const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: isPlaying ? 'playVideo' : 'pauseVideo',
            args: []
          }), '*');
        }
      }, 100);

      // Note: YouTube iframe API requires an origin for some strict protections, but standard embed works mostly.
      // Autoplay requires muted=0 and user interaction, which we have.
      return (
        <iframe
          id={iframeId}
          width="100"
          height="100"
          // O src NUNCA pode ter mediaState.isPlaying dinamicamente senao ele recarrega o Iframe inteiro.
          // Usamos o postMessage para controlar o pause! Mas forçamos autoplay=1 na montagem inicial.
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=${loop ? 1 : 0}&playlist=${videoId}&controls=0&enablejsapi=1`}
          title={`YouTube ${type}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          style={{ opacity: 0, pointerEvents: 'none', position: 'absolute' }}
        />
      );
    }

    // Fallback to HTML Audio
    return (
      <audio 
        ref={ref}
        src={mediaState.url}
        autoPlay={mediaState.isPlaying}
        loop={loop}
        style={{ display: 'none' }}
      />
    );
  };

  return (
    <div style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', zIndex: -9999 }} id="global-audio-sync">
      {renderPlayer(musicState, 'music', musicVolume, loopMode !== 'none', musicAudioRef)}
      {renderPlayer(ambienceState, 'ambience', ambienceVolume, true, ambienceAudioRef)}
    </div>
  );
};
