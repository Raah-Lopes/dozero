export type AudioProviderType = 'youtube' | 'spotify' | 'soundcloud' | 'myinstants' | 'tabletop' | 'local' | 'direct';

export interface AudioPlaylist {
  id: string;
  title: string;
  tracks: AudioTrack[];
}

export interface AudioTrack {
  id: string;
  title: string;
  provider: AudioProviderType;
  url: string; // URL completa ou ID do vídeo/track
  fileHandle?: any; // Armazena a referência para o arquivo local
  thumbnail?: string;
  duration?: number;
  category: 'ambience' | 'combat' | 'exploration' | 'narrative' | 'sfx';
  tags: string[];
  volume: number; // 0.0 a 1.0
  isFavorite: boolean;
}

export interface SoundboardItem {
  id: string;
  title: string;
  provider: AudioProviderType;
  url: string;
  fileHandle?: any; // Armazena a referência para o arquivo local
  icon?: string; // Emoji ou ícone
  volume: number;
}

export interface AudioScenePreset {
  id: string;
  name: string;
  musicTrackId?: string;
  ambienceTrackId?: string;
  sfxTriggerIds?: string[];
  chatMessage?: string; // Mensagem automática no chat
  fadeDuration?: number; // ms
}

export interface AudioState {
  musicVolume: number;
  ambienceVolume: number;
  currentMusicId?: string;
  currentAmbienceId?: string;
  currentMusicTitle?: string;
  currentAmbienceTitle?: string;
  isPlayingMusic: boolean;
  isPlayingAmbience: boolean;
  playlist: AudioTrack[];
  soundboard: SoundboardItem[];
  scenePresets: AudioScenePreset[];
}
