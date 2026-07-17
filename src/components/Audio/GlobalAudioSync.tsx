import React, { useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { state } from '../../services/yjs';
import { useAudioStore } from '../../store/audioStore';

export const GlobalAudioSync: React.FC = () => {
  const [musicState, setMusicState] = useState<any>(null);
  const [ambienceState, setAmbienceState] = useState<any>(null);
  
  const musicVolume = useAudioStore(s => s.musicVolume);
  const ambienceVolume = useAudioStore(s => s.ambienceVolume);
  const loopMode = useAudioStore(s => s.loopMode);

  useEffect(() => {
    const handleAudioUpdate = () => {
      const music = state.audio.get('music');
      const ambience = state.audio.get('ambience');
      setMusicState(music || null);
      setAmbienceState(ambience || null);
    };

    state.audio.observe(handleAudioUpdate);
    handleAudioUpdate(); // initial load

    return () => {
      state.audio.unobserve(handleAudioUpdate);
    };
  }, []);

  return (
    <div style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', zIndex: -9999 }} id="global-audio-sync">
      {musicState && musicState.url && (
        <ReactPlayer
          url={musicState.url}
          playing={musicState.isPlaying}
          volume={musicVolume}
          loop={loopMode !== 'none'}
          width="1px"
          height="1px"
          playsinline
          config={{
             youtube: {
                playerVars: { autoplay: 1, controls: 0 }
             }
          }}
        />
      )}
      {ambienceState && ambienceState.url && (
        <ReactPlayer
          url={ambienceState.url}
          playing={ambienceState.isPlaying}
          volume={ambienceVolume}
          loop={true} // Ambience usually loops
          width="1px"
          height="1px"
          playsinline
          config={{
             youtube: {
                playerVars: { autoplay: 1, controls: 0 }
             }
          }}
        />
      )}
    </div>
  );
};
