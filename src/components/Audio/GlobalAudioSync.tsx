import React, { useEffect, useState, useRef } from 'react';
import { state } from '../../services/yjs';
import { useAudioStore } from '../../store/audioStore';

export function GlobalAudioSync() {
  const [musicState, setMusicState] = useState<{ url: string, isPlaying: boolean, ts: number } | null>(null);
  const [ambienceState, setAmbienceState] = useState<{ url: string, isPlaying: boolean, ts: number } | null>(null);

  const { musicVolume, ambienceVolume, loopMode } = useAudioStore();
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const ambienceAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const handleAudioUpdate = () => {
      const music = state.audio.get('music');
      const ambience = state.audio.get('ambience');
      setMusicState((music as any) || null);
      setAmbienceState((ambience as any) || null);
    };

    state.audio.observe(handleAudioUpdate);
    handleAudioUpdate();

    return () => {
      state.audio.unobserve(handleAudioUpdate);
    };
  }, []);

  useEffect(() => {
    if (musicAudioRef.current) musicAudioRef.current.volume = musicVolume;
  }, [musicVolume]);

  useEffect(() => {
    if (ambienceAudioRef.current) ambienceAudioRef.current.volume = ambienceVolume;
  }, [ambienceVolume]);

  const renderPlayer = (mediaState: { url: string, isPlaying: boolean, ts: number } | null, type: 'music' | 'ambience', volume: number, loop: boolean, ref: React.RefObject<HTMLAudioElement>) => {
    if (!mediaState || !mediaState.url) return null;
    
    // Check if YouTube
    const ytMatch = mediaState.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      // Note: YouTube iframe API requires an origin for some strict protections, but standard embed works mostly.
      // Autoplay requires muted=0 and user interaction, which we have.
      return (
        <iframe
          width="100"
          height="100"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${mediaState.isPlaying ? 1 : 0}&loop=${loop ? 1 : 0}&playlist=${videoId}&controls=0`}
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
