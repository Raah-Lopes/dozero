import React, { useState, useEffect } from 'react';
import { useAudioStore } from '../../store/audioStore';
import { audioEngine } from '../../services/AudioEngine';
import type { AudioTrack, SoundboardItem, AudioPlaylist } from '../../utils/audioTypes';
import { Play, Pause, Volume2, Music, Mic, Star, Plus, VolumeX, ListMusic, Layers, Zap, Maximize2, Minimize2, Globe, Save, SkipForward, SkipBack, Square, Trash2, FolderOpen } from 'lucide-react';
import { DraggableWindow } from './DraggableWindow';
import { saveMarkdownContent, loadMarkdownFile, fetchRepositoryTree, openLocalFolder } from '../../utils/githubApi';

const detectProvider = (url: string): any => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('tabletopaudio.com')) return 'tabletop';
  if (url.includes('syrinscape.com')) return 'syrinscape';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('myinstants.com')) return 'myinstants';
  return 'direct';
};

export const AudioDirectorWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const audioState = useAudioStore();
  const { addAudioTrack, triggerMacro, clearMusic, clearAmbience } = audioState;

  useEffect(() => {
    audioEngine.onStateChange = (stateUpdates) => {
      useAudioStore.setState(stateUpdates);
    };
    audioEngine.onProgressChange = (type, current, duration) => {
      if (type === 'music') {
        setMusicProgress(current);
        setMusicDuration(duration);
      } else {
        setAmbienceProgress(current);
        setAmbienceDuration(duration);
      }
    };
    return () => {
      audioEngine.onStateChange = undefined;
      audioEngine.onProgressChange = undefined;
    };
  }, []);
  
  const [activeTab, setActiveTab] = useState<'session' | 'library' | 'soundboard' | 'scenes' | 'catalog'>('session');
  const [musicVol, setMusicVol] = useState(audioState.musicVolume);
  const [ambienceVol, setAmbienceVol] = useState(audioState.ambienceVolume);
  const [isMiniplayer, setIsMiniplayer] = useState(false);
  const [wikiPlaylists, setWikiPlaylists] = useState<AudioPlaylist[]>([]);
  
  // Progress states
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [ambienceProgress, setAmbienceProgress] = useState(0);
  const [ambienceDuration, setAmbienceDuration] = useState(0);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  // Search states
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [wikiSearchTerm, setWikiSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<AudioTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Estados locais
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackProvider, setNewTrackProvider] = useState<'youtube' | 'local'>('youtube');

  // Estados de Macro
  const [isCreatingMacro, setIsCreatingMacro] = useState(false);
  const [macroName, setMacroName] = useState('');
  const [macroMusic, setMacroMusic] = useState('');
  const [macroAmbience, setMacroAmbience] = useState('');
  const [macroSfx, setMacroSfx] = useState('');
  const [wikiMacros, setWikiMacros] = useState<any[]>([]);

  // Carregar faixas e macros da Wiki
  useEffect(() => {
    const loadWikiData = async () => {
      try {
        const tree = await fetchRepositoryTree();
        // Audios (Playlists em Markdown)
        const audioFiles = tree.filter(f => f.path.startsWith('Biblioteca/Audios/') && f.path.endsWith('.md'));
        const loadedPlaylists: AudioPlaylist[] = [];
        
        for (const file of audioFiles) {
          const content = await loadMarkdownFile(file.path);
          if (!content) continue;
          
          const playlistName = file.path.split('/').pop()?.replace('.md', '') || 'Playlist';
          const tracks: AudioTrack[] = [];
          
          // Regex para encontrar links em markdown: [Título](URL)
          const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
          let match;
          let trackIndex = 0;
          
          while ((match = linkRegex.exec(content)) !== null) {
            const title = match[1].trim();
            const url = match[2].trim();
            tracks.push({
              id: `${file.path}-${trackIndex++}`,
              title,
              url,
              provider: detectProvider(url),
              category: 'ambience',
              tags: [],
              volume: 0.5,
              isFavorite: false
            });
          }
          
          if (tracks.length > 0) {
            loadedPlaylists.push({
              id: file.path,
              title: playlistName,
              tracks
            });
          } else if (content.includes('tipo: audio')) {
             // Fallback para o formato antigo
             const matchUrl = content.match(/url:\s*(.+)/);
             const matchProvider = content.match(/provider:\s*(.+)/);
             if (matchUrl && matchProvider) {
               loadedPlaylists.push({
                 id: file.path,
                 title: playlistName,
                 tracks: [{
                   id: `${file.path}-legacy`,
                   title: playlistName,
                   url: matchUrl[1].trim(),
                   provider: matchProvider[1].trim() as any,
                   category: 'ambience',
                   tags: [],
                   volume: 0.5,
                   isFavorite: false
                 }]
               });
             }
          }
        }
        setWikiPlaylists(loadedPlaylists);

        // Macros
        const macroFiles = tree.filter(f => f.path.startsWith('Biblioteca/Macros/') && f.path.endsWith('.md'));
        const loadedMacros = [];
        for (const file of macroFiles) {
          const content = await loadMarkdownFile(file.path);
          if (content && content.includes('tipo: macro')) {
            const matchMusic = content.match(/musicTitle:\s*(.+)/);
            const matchAmbience = content.match(/ambienceTitle:\s*(.+)/);
            const matchSfx = content.match(/sfxId:\s*(.+)/);
            loadedMacros.push({
              id: file.path,
              name: file.path.split('/').pop()?.replace('.md', '') || 'Macro',
              musicTitle: matchMusic ? matchMusic[1].trim() : '',
              ambienceTitle: matchAmbience ? matchAmbience[1].trim() : '',
              sfxId: matchSfx ? matchSfx[1].trim() : ''
            });
          }
        }
        setWikiMacros(loadedMacros);
      } catch (err) {
        console.error("Erro ao carregar dados da Wiki:", err);
      }
    };
    if (activeTab === 'library' || activeTab === 'scenes') {
      loadWikiData();
    }
  }, [activeTab]);

  const SEARCH_INSTANCES = [
    { url: 'https://pipedapi.kavin.rocks/search?q=', type: 'piped' },
    { url: 'https://pipedapi.smnz.de/search?q=', type: 'piped' },
    { url: 'https://vid.puffyan.us/api/v1/search?q=', type: 'invidious' },
    { url: 'https://invidious.nerdvpn.de/api/v1/search?q=', type: 'invidious' },
    { url: 'https://inv.tux.pizza/api/v1/search?q=', type: 'invidious' }
  ];

  const handleSearchYouTube = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!catalogSearchTerm) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    let success = false;

    const fetchPromises = SEARCH_INSTANCES.map(async (instance) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const suffix = instance.type === 'piped' ? '&filter=all' : '&type=video';
      const res = await fetch(`${instance.url}${encodeURIComponent(catalogSearchTerm)}${suffix}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Bad response');
      const data = await res.json();
      
      let tracks: AudioTrack[] = [];
      
      if (instance.type === 'piped' && data.items && Array.isArray(data.items)) {
        tracks = data.items.filter((item: any) => item.type === 'stream').map((item: any) => ({
          id: item.url.split('?v=')[1],
          title: item.title,
          provider: 'youtube',
          url: `https://youtube.com${item.url}`,
          category: 'ambience',
          tags: [],
          volume: 0.5,
          isFavorite: false
        }));
      } else if (instance.type === 'invidious' && Array.isArray(data)) {
        tracks = data.map((item: any) => ({
          id: item.videoId,
          title: item.title,
          provider: 'youtube',
          url: `https://youtube.com/watch?v=${item.videoId}`,
          category: 'ambience',
          tags: [],
          volume: 0.5,
          isFavorite: false
        }));
      }

      if (tracks.length > 0) {
        return tracks;
      }
      throw new Error('No tracks found');
    });

    try {
      const firstValidTracks = await Promise.any(fetchPromises);
      setSearchResults(firstValidTracks);
      success = true;
    } catch (err) {
      console.warn("Todas as instâncias de busca falharam no tempo limite.");
    }

    if (!success) {
      alert('Nenhum servidor proxy de busca respondeu no momento. Eles podem estar instáveis ou bloqueados por CORS. Tente adicionar o link do YouTube diretamente na aba Wiki!');
    }
    setIsSearching(false);
  };
  const handlePlayMusic = (track: AudioTrack) => audioEngine.playMusic(track, musicVol);
  const handlePlayAmbience = (track: AudioTrack) => audioEngine.playAmbience(track, ambienceVol);
  const handlePlaySFX = (item: SoundboardItem) => audioEngine.playSFX(item);
  const handleStopMusic = () => { audioEngine.stopMusic(); clearMusic(); };
  const handleStopAmbience = () => { audioEngine.stopAmbience(); clearAmbience(); };
  const handlePauseMusic = () => audioEngine.pauseMusic();
  const handleResumeMusic = () => audioEngine.resumeMusic();
  const handlePauseAmbience = () => audioEngine.pauseAmbience();
  const handleResumeAmbience = () => audioEngine.resumeAmbience();
  
  // Guardamos a referência do input e dos files para evitar que o Garbage Collector do navegador destrua os Blobs
  const handleLoadLocalFolder = () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      (input as any).directory = true;
      input.multiple = true;
      
      input.onchange = (e: any) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        const newPlaylist: AudioPlaylist = {
          id: `local-folder-${Date.now()}`,
          title: `Pasta Local`,
          tracks: []
        };

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const lowerName = file.name.toLowerCase();
          if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav') || lowerName.endsWith('.ogg')) {
            const url = URL.createObjectURL(file);
            newPlaylist.tracks.push({
              id: `local-${Date.now()}-${i}`,
              title: file.name,
              url: url,
              provider: 'local' as any,
              category: 'music',
              tags: [],
              volume: 1,
              isFavorite: false
            });
          }
        }
        
        if (newPlaylist.tracks.length > 0) {
          if (files[0].webkitRelativePath) {
            const folderName = files[0].webkitRelativePath.split('/')[0];
            if (folderName) newPlaylist.title = `Pasta: ${folderName}`;
          }
          
          // Anexar propriedades secretas para manter as referências vivas na memória
          (newPlaylist as any)._inputRef = input;
          (newPlaylist as any)._filesRef = files;

          setWikiPlaylists(prev => [newPlaylist, ...prev]);
          setActiveTab('library');
        } else {
          alert('Nenhum arquivo de áudio (.mp3, .wav, .ogg) encontrado nesta pasta.');
        }
      };
      
      input.style.display = 'none';
      document.body.appendChild(input);
      input.click();
    } catch (e) {
      console.error('Erro ao carregar pasta local:', e);
    }
  };
  
  const handleNextTrack = () => {
    const playlist = audioState.playlist;
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === audioState.currentMusicId);
    const nextIndex = (currentIndex + 1) % playlist.length;
    handlePlayMusic(playlist[nextIndex]);
  };
  
  const handlePrevTrack = () => {
    const playlist = audioState.playlist;
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === audioState.currentMusicId);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = playlist.length - 1;
    handlePlayMusic(playlist[prevIndex]);
  };

  const handleNextAmbience = () => {
    const playlist = audioState.playlist;
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === audioState.currentAmbienceId);
    const nextIndex = (currentIndex + 1) % playlist.length;
    handlePlayAmbience(playlist[nextIndex]);
  };
  
  const handlePrevAmbience = () => {
    const playlist = audioState.playlist;
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === audioState.currentAmbienceId);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = playlist.length - 1;
    handlePlayAmbience(playlist[prevIndex]);
  };

  const handleExecuteMacro = (macroId: string) => {
    if (macroId === 'boss') {
      const music = mockLibrary.find(t => t.title.includes('Chefe')) || onlineCatalog.find(t => t.title.includes('Combat')) || onlineCatalog[3];
      const ambience = mockLibrary.find(t => t.title.includes('Chuva')) || onlineCatalog[0];
      const sfx = { id: 'm1', title: 'Trovão', icon: '⚡', url: 'https://assets.mixkit.co/active_storage/sfx/1297/1297-preview.mp3', volume: 0.9, provider: 'local' } as SoundboardItem;
      
      if (music) handlePlayMusic(music);
      if (ambience) handlePlayAmbience(ambience);
      handlePlaySFX(sfx);
    }
  };

  const handleSaveToWiki = async (trackTitle: string, url: string, provider: string) => {
    if (!url || !trackTitle) return;
    try {
      let content = '';

      if (provider === 'youtube' && url.includes('list=')) {
        const listIdMatch = url.match(/[?&]list=([^&]+)/);
        if (listIdMatch && listIdMatch[1]) {
           const listId = listIdMatch[1];
           
           try {
             const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://pipedapi.kavin.rocks/playlists/${listId}`)}`);
             if (res.ok) {
               const data = await res.json();
               if (data.relatedStreams && data.relatedStreams.length > 0) {
                 content = `# ${trackTitle}\n\n`;
                 data.relatedStreams.forEach((stream: any) => {
                   if (stream.type === 'stream') {
                     content += `- [${stream.title}](https://youtube.com/watch?v=${stream.url.split('?v=')[1]})\n`;
                   }
                 });
               }
             } else throw new Error();
           } catch (e) {
             console.warn('Piped kavin.rocks falhou, tentando smnz.de...');
             try {
               const res2 = await fetch(`/api/proxy?url=${encodeURIComponent(`https://pipedapi.smnz.de/playlists/${listId}`)}`);
               if (res2.ok) {
                 const data2 = await res2.json();
                 if (data2.relatedStreams && data2.relatedStreams.length > 0) {
                   content = `# ${trackTitle}\n\n`;
                   data2.relatedStreams.forEach((stream: any) => {
                     if (stream.type === 'stream') {
                       content += `- [${stream.title}](https://youtube.com/watch?v=${stream.url.split('?v=')[1]})\n`;
                     }
                   });
                 }
               } else throw new Error();
             } catch (e2) {
               console.warn('Piped falhou, tentando Invidious...');
               try {
                 const res3 = await fetch(`/api/proxy?url=${encodeURIComponent(`https://vid.puffyan.us/api/v1/playlists/${listId}`)}`);
                 if (res3.ok) {
                   const data3 = await res3.json();
                   if (data3.videos && data3.videos.length > 0) {
                     content = `# ${trackTitle}\n\n`;
                     data3.videos.forEach((vid: any) => {
                       content += `- [${vid.title}](https://youtube.com/watch?v=${vid.videoId})\n`;
                     });
                   }
                 }
               } catch (e3) {
                 console.error('Falha ao buscar playlist:', e3);
               }
             }
           }
           
           if (!content) {
             alert('Aviso: Proxy indisponível para extrair faixas individuais. A playlist será salva como faixa única.');
           }
        }
      }

      if (!content) {
        content = `---
tipo: audio
provider: ${provider}
url: ${url}
volume: 0.5
---

# ${trackTitle}
Adicionado via Audio Hub.
`;
      }

      await saveMarkdownContent(`Biblioteca/Audios/${trackTitle.replace(/[^a-zA-Z0-9_ ]/g, '')}.md`, content);
      alert('Faixa(s) salva(s) na Wiki com sucesso!');
      setNewTrackUrl('');
      setNewTrackTitle('');
      
      const currentTab = activeTab;
      setActiveTab('session' as any);
      setTimeout(() => setActiveTab(currentTab), 50);

    } catch (err) {
      console.error(err);
      alert('Erro ao salvar na Wiki.');
    }
  };

  const handleAddAndFavorite = (track: AudioTrack) => {
    if (!audioState.playlist.find(t => t.id === track.id)) {
      audioState.addAudioTrack({ ...track, isFavorite: true });
    } else {
      audioState.toggleFavorite(track.id);
    }
  };

  const handleAddToPlaylist = (track: AudioTrack) => {
    if (!audioState.playlist.find(t => t.id === track.id)) {
      audioState.addAudioTrack(track);
    }
  };

  const handleSaveMacro = async () => {
    if (!macroName) return;
    try {
      const content = `---
tipo: macro
musicTitle: ${macroMusic}
ambienceTitle: ${macroAmbience}
sfxId: ${macroSfx}
---

# ${macroName}
Macro de áudio criada via Audio Hub.
`;
      await saveMarkdownContent(`Biblioteca/Macros/${macroName.replace(/[^a-zA-Z0-9_ ]/g, '')}.md`, content);
      alert('Macro salva na Wiki com sucesso!');
      setMacroName(''); setMacroMusic(''); setMacroAmbience(''); setMacroSfx('');
      setIsCreatingMacro(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar macro.');
    }
  };

  const handleExecuteWikiMacro = (macro: any) => {
    const allWikiTracks = wikiPlaylists.flatMap(p => p.tracks);
    const music = audioState.playlist.find(t => t.title === macro.musicTitle) || allWikiTracks.find(t => t.title === macro.musicTitle) || onlineCatalog.find(t => t.title === macro.musicTitle);
    const ambience = audioState.playlist.find(t => t.title === macro.ambienceTitle) || allWikiTracks.find(t => t.title === macro.ambienceTitle) || onlineCatalog.find(t => t.title === macro.ambienceTitle);
    
    // Procura no soundboard pelo título exato ou ID
    const sfx = audioState.soundboard.find(s => s.id === macro.sfxId || s.title === macro.sfxId);
    
    if (music) handlePlayMusic(music);
    if (ambience) handlePlayAmbience(ambience);
    if (sfx) handlePlaySFX(sfx as any);
  };

  const handleAddTrack = () => {
    handleSaveToWiki(newTrackTitle, newTrackUrl, newTrackProvider);
    addAudioTrack({
      id: Date.now().toString(),
      title: newTrackTitle,
      url: newTrackUrl,
      provider: newTrackProvider,
      category: 'ambience',
      tags: [],
      volume: 0.5,
      isFavorite: false
    });
  };

  // Mock dados para exibir UI
  const mockLibrary: AudioTrack[] = [
    { id: '1', title: 'Taverna Noturna', provider: 'youtube', url: 'https://www.youtube.com/watch?v=RMB-LhQ1B6c', category: 'ambience', tags: [], volume: 0.5, isFavorite: true },
    { id: '2', title: 'Chefe Final: Dragão', provider: 'youtube', url: 'https://www.youtube.com/watch?v=g6h7i8j9k0l', category: 'combat', tags: [], volume: 0.8, isFavorite: false },
    { id: '3', title: 'Chuva Suave', provider: 'local', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', category: 'sfx', tags: [], volume: 0.3, isFavorite: true },
  ];

  const onlineCatalog: AudioTrack[] = [
    { id: 'cat-1', title: 'Tavern Music (Tabletop Audio)', provider: 'local', url: 'https://sounds.tabletopaudio.com/1_Tavern_Music.mp3', category: 'ambience', tags: [], volume: 0.5, isFavorite: false },
    { id: 'cat-2', title: 'True Space (Tabletop Audio)', provider: 'local', url: 'https://sounds.tabletopaudio.com/2_True_Space.mp3', category: 'ambience', tags: [], volume: 0.5, isFavorite: false },
    { id: 'cat-3', title: 'Medieval Town (Tabletop Audio)', provider: 'local', url: 'https://sounds.tabletopaudio.com/193_Medieval_Town.mp3', category: 'ambience', tags: [], volume: 0.5, isFavorite: false },
    { id: 'cat-4', title: 'RPG Combat Music (Michael Ghelfi)', provider: 'youtube', url: 'https://www.youtube.com/watch?v=A2xQeB-i9nE', category: 'combat', tags: [], volume: 0.5, isFavorite: false },
    { id: 'cat-5', title: 'Dark Ambience (Michael Ghelfi)', provider: 'youtube', url: 'https://www.youtube.com/watch?v=hZJ2wJqTXXw', category: 'ambience', tags: [], volume: 0.5, isFavorite: false },
  ];

  const allWikiTracks = wikiPlaylists.flatMap(p => p.tracks);
  const filteredWikiPlaylists = wikiPlaylists.filter(p => p.title.toLowerCase().includes(wikiSearchTerm.toLowerCase()) || p.tracks.some(t => t.title.toLowerCase().includes(wikiSearchTerm.toLowerCase())));
  
  const currentMusicTitle = audioState.playlist.find(t => t.id === audioState.currentMusicId)?.title || mockLibrary.find(t => t.id === audioState.currentMusicId)?.title || onlineCatalog.find(t => t.id === audioState.currentMusicId)?.title || allWikiTracks.find(t => t.id === audioState.currentMusicId)?.title || searchResults.find(t => t.id === audioState.currentMusicId)?.title || 'Tema de Batalha';
  const currentAmbienceTitle = audioState.playlist.find(t => t.id === audioState.currentAmbienceId)?.title || mockLibrary.find(t => t.id === audioState.currentAmbienceId)?.title || onlineCatalog.find(t => t.id === audioState.currentAmbienceId)?.title || allWikiTracks.find(t => t.id === audioState.currentAmbienceId)?.title || searchResults.find(t => t.id === audioState.currentAmbienceId)?.title || 'Chuva e Trovões';

  return (
    <DraggableWindow id="audioDirector" title="Maestro de Sessão" initialX={window.innerWidth / 2 - 250} initialY={100} width={isMiniplayer ? 340 : 480} height={isMiniplayer ? 180 : 560} onClose={onClose} variant="glass">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-primary)', overflow: 'hidden' }}>
        
        {/* HEADER: Player Visual */}
        <div style={{ 
          padding: '1rem', 
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)', 
          borderBottom: '1px solid var(--glass-border)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%)', animation: 'spin 20s linear infinite', zIndex: 0, pointerEvents: 'none' }} />
          
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontFamily: 'var(--font-display)', color: 'white' }}>
              <div style={{ padding: '0.3rem', background: 'var(--accent-primary)', borderRadius: '6px', display: 'flex', boxShadow: '0 0 10px var(--accent-glow)' }}>
                <Music size={14} color="white" />
              </div>
              Audio Hub
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleLoadLocalFolder} style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.5)', color: '#93c5fd', cursor: 'pointer', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 'bold' }} title="Importar Músicas do PC">
                <FolderOpen size={14} /> Local
              </button>
              <button onClick={() => setIsMiniplayer(!isMiniplayer)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.3rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }} title={isMiniplayer ? 'Maximizar' : 'Miniplayer'}>
                {isMiniplayer ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: (isMiniplayer && !audioState.currentAmbienceId) ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
            {/* BG Music Indicator */}
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: '#f0abfc', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Música Atual</span>
                {audioState.currentMusicId && <button onClick={handleStopMusic} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0 }} title="Limpar e Parar"><Trash2 size={12} /></button>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {audioState.currentMusicId ? currentMusicTitle : 'Silêncio...'}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <button onClick={handlePrevTrack} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.1rem' }} title="Anterior"><SkipBack size={12} /></button>
                  
                  {audioState.currentMusicId ? (
                    audioState.isPlayingMusic ? (
                       <button onClick={handlePauseMusic} style={{ background: 'transparent', border: 'none', color: '#f0abfc', cursor: 'pointer', padding: '0.1rem' }} title="Pausar"><Pause size={14} /></button>
                    ) : (
                       <button onClick={handleResumeMusic} style={{ background: 'transparent', border: 'none', color: '#f0abfc', cursor: 'pointer', padding: '0.1rem' }} title="Retomar"><Play size={14} /></button>
                    )
                  ) : (
                     <Play size={14} color="var(--text-secondary)" style={{ margin: '0.1rem' }} />
                  )}
                  
                  <button onClick={handleNextTrack} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.1rem' }} title="Próxima"><SkipForward size={12} /></button>
                </div>
              </div>
              {/* Progresso da Música */}
              {audioState.currentMusicId && (
                <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                  <span>{formatTime(musicProgress)}</span>
                  <input type="range" min={0} max={musicDuration || 100} value={musicDuration > 0 ? musicProgress : 0} onChange={(e) => audioEngine.seekMusic(Number(e.target.value))} disabled={!musicDuration} style={{ flex: 1, height: '3px', appearance: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', cursor: musicDuration ? 'pointer' : 'wait' }} />
                  <span>{musicDuration > 0 ? formatTime(musicDuration) : '--:--'}</span>
                </div>
              )}
            </div>

            {/* Ambience Indicator (Hidden in miniplayer if not playing to save space) */}
            {(!isMiniplayer || audioState.currentAmbienceId) && (
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Ambiente</span>
                  {audioState.currentAmbienceId && <button onClick={handleStopAmbience} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0 }} title="Limpar e Parar"><Trash2 size={12} /></button>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {audioState.currentAmbienceId ? currentAmbienceTitle : 'Nenhum'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <button onClick={handlePrevAmbience} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.1rem' }} title="Anterior"><SkipBack size={12} /></button>
                    {audioState.currentAmbienceId ? (
                      audioState.isPlayingAmbience ? (
                         <button onClick={handlePauseAmbience} style={{ background: 'transparent', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: '0.1rem' }} title="Pausar"><Pause size={14} /></button>
                      ) : (
                         <button onClick={handleResumeAmbience} style={{ background: 'transparent', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: '0.1rem' }} title="Retomar"><Play size={14} /></button>
                      )
                    ) : (
                       <Volume2 size={14} color="var(--text-secondary)" style={{ margin: '0.1rem' }} />
                    )}
                    <button onClick={handleNextAmbience} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.1rem' }} title="Próxima"><SkipForward size={12} /></button>
                  </div>
                </div>
                {/* Progresso do Ambiente */}
                {audioState.currentAmbienceId && (
                  <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                    <span>{formatTime(ambienceProgress)}</span>
                    <input type="range" min={0} max={ambienceDuration || 100} value={ambienceDuration > 0 ? ambienceProgress : 0} onChange={(e) => audioEngine.seekAmbience(Number(e.target.value))} disabled={!ambienceDuration} style={{ flex: 1, height: '3px', appearance: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', cursor: ambienceDuration ? 'pointer' : 'wait' }} />
                    <span>{ambienceDuration > 0 ? formatTime(ambienceDuration) : '--:--'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CONTROLES DE VOLUME (Mixer) */}
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.25rem', color: '#f0abfc' }}>
              <span>🎵 Mús</span>
              <span>{Math.round(musicVol * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={musicVol} 
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setMusicVol(v);
                audioState.setVolume('music', v);
                audioEngine.setMusicVolume(v);
              }}
              style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', appearance: 'none', cursor: 'pointer' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.25rem', color: '#93c5fd' }}>
              <span>🌧 Amb</span>
              <span>{Math.round(ambienceVol * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={ambienceVol} 
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setAmbienceVol(v);
                audioState.setVolume('ambience', v);
                audioEngine.setAmbienceVolume(v);
              }}
              style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', appearance: 'none', cursor: 'pointer' }}
            />
          </div>
        </div>

        {!isMiniplayer && (
          <>
            {/* NAVEGAÇÃO POR ABAS */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)', overflowX: 'auto' }}>
              {[
                { id: 'session', label: 'Sessão', icon: ListMusic },
                { id: 'catalog', label: 'Online', icon: Globe },
                { id: 'library', label: 'Wiki', icon: Music },
                { id: 'soundboard', label: 'SFX', icon: Mic },
                { id: 'scenes', label: 'Macros', icon: Layers },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1, minWidth: '80px', padding: '0.75rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                    background: activeTab === tab.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = 'white'; }}
                  onMouseOut={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* CONTEÚDO DAS ABAS */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'var(--glass-bg)' }}>
              
              {/* ABA SESSÃO */}
              {activeTab === 'session' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {audioState.playlist.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
                      <button onClick={() => { audioEngine.stopMusic(); audioState.clearMusic(); audioState.clearPlaylist(); }} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Limpar todas as faixas da Sessão Atual">
                        <Trash2 size={12} /> Limpar Sessão
                      </button>
                    </div>
                  )}
                  {(audioState.playlist.length > 0 ? [...audioState.playlist].sort((a,b) => (b.isFavorite?1:0) - (a.isFavorite?1:0)) : mockLibrary).map((track) => (
                    <div key={track.id} style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', 
                      background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid var(--glass-border)',
                      transition: 'border 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-glow)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold',
                          background: track.category === 'combat' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          color: track.category === 'combat' ? '#fca5a5' : '#93c5fd',
                          border: `1px solid ${track.category === 'combat' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`
                        }}>
                          {track.provider === 'youtube' ? 'YT' : 'MP3'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{track.title}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{track.category}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button onClick={() => handlePlayMusic(track)} style={{ padding: '0.4rem', borderRadius: '50%', border: 'none', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Tocar como Música Principal">
                          <Play size={14} />
                        </button>
                        <button onClick={() => handlePlayAmbience(track)} style={{ padding: '0.4rem', borderRadius: '50%', border: 'none', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Tocar como Ambiente (SFX)">
                          <Volume2 size={14} />
                        </button>
                        <button onClick={() => audioState.removeAudioTrack(track.id)} style={{ padding: '0.4rem', borderRadius: '50%', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remover da Sessão">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA CATÁLOGO EXTERNO */}
              {activeTab === 'catalog' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ marginBottom: '0.5rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={16}/> Pesquisar no YouTube</h3>
                    <form onSubmit={handleSearchYouTube} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input 
                        type="text" 
                        placeholder="Busque por trilhas, sons de RPG, etc..." 
                        value={catalogSearchTerm}
                        onChange={(e) => setCatalogSearchTerm(e.target.value)}
                        style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.75rem', color: 'white', outline: 'none' }}
                      />
                      <button type="submit" disabled={isSearching} style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: isSearching ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {isSearching ? 'Buscando...' : 'Buscar'}
                      </button>
                    </form>
                  </div>
                  
                  {(searchResults.length > 0 ? searchResults : onlineCatalog).map((track) => (
                    <div key={track.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={track.title}>{track.title}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{track.provider === 'local' ? 'Tabletop Audio (MP3)' : 'YouTube'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                        <button onClick={() => handlePlayMusic(track)} style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 'bold' }} title="Tocar">
                          <Play size={12} />
                        </button>
                        <button onClick={() => audioState.addSoundboardItem({ id: track.id, title: track.title, icon: '🔊', url: track.url, volume: 1, provider: track.provider })} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Adicionar ao Soundboard">
                          <Layers size={14} />
                        </button>
                        <button onClick={() => handleAddAndFavorite(track)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'transparent', color: audioState.playlist.find(t=>t.id===track.id)?.isFavorite ? '#fef08a' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Favoritar">
                          <Star size={14} fill={audioState.playlist.find(t=>t.id===track.id)?.isFavorite ? '#fef08a' : 'none'} />
                        </button>
                        <button onClick={() => handleAddToPlaylist(track)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Adicionar à Sessão">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA BIBLIOTECA (WIKI) */}
              {activeTab === 'library' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Plus size={14} color="var(--accent-primary)" /> Nova Faixa na Wiki
                    </h4>
                    
                    <input 
                      type="text" placeholder="Nome da Faixa" 
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', marginBottom: '0.5rem', outline: 'none' }}
                      value={newTrackTitle} onChange={e => setNewTrackTitle(e.target.value)}
                    />
                    
                    <select 
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', marginBottom: '0.5rem', outline: 'none' }}
                      value={newTrackProvider} onChange={e => setNewTrackProvider(e.target.value as any)}
                    >
                      <option value="youtube">YouTube (Video / Playlist)</option>
                      <option value="local">Link Direto (.mp3, .ogg)</option>
                    </select>
                    
                    <input 
                      type="text" placeholder="Cole a URL ou link aqui..." 
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', marginBottom: '0.75rem', outline: 'none' }}
                      value={newTrackUrl} onChange={e => setNewTrackUrl(e.target.value)}
                    />
                    
                    <button 
                      onClick={handleAddTrack}
                      style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                    >
                      <Save size={14} /> Salvar Ficha
                    </button>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Fichas de Áudio (Biblioteca/Audios)
                        <button onClick={() => openLocalFolder('Biblioteca/Audios')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Abrir pasta local">
                          <FolderOpen size={14} />
                        </button>
                      </h4>
                      <input 
                        type="text" 
                        placeholder="Filtrar..." 
                        value={wikiSearchTerm}
                        onChange={(e) => setWikiSearchTerm(e.target.value)}
                        style={{ width: '120px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.3rem', fontSize: '0.7rem', color: 'white', outline: 'none' }}
                      />
                    </div>
                    {filteredWikiPlaylists.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', border: '1px dashed var(--glass-border)', borderRadius: '8px' }}>
                        Nenhuma playlist encontrada.
                      </div>
                    ) : (
                      filteredWikiPlaylists.map(playlist => (
                        <div key={playlist.id} style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                            <h5 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ListMusic size={14} /> {playlist.title}</h5>
                            <button 
                              onClick={() => playlist.tracks.forEach(t => audioState.addAudioTrack(t))}
                              style={{ background: 'var(--accent-primary)', border: 'none', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              title="Adicionar todas as músicas desta pasta à Sessão"
                            >
                              <Plus size={10} /> Adicionar Tudo
                            </button>
                          </div>
                          {playlist.tracks.map(track => (
                            <div key={track.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '0.5rem' }}>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{track.title}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{track.provider.toUpperCase()}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button onClick={() => handlePlayMusic(track)} style={{ padding: '0.3rem', borderRadius: '4px', border: 'none', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Tocar como Música">
                                  <Play size={12} />
                                </button>
                                <button onClick={() => handlePlayAmbience(track)} style={{ padding: '0.3rem', borderRadius: '4px', border: 'none', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Tocar como Ambiente">
                                  <Volume2 size={12} />
                                </button>
                                <button onClick={() => audioState.addSoundboardItem({ id: track.id, title: track.title, icon: '🔊', url: track.url, volume: 1, provider: track.provider })} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Adicionar ao Soundboard">
                                  <Layers size={12} />
                                </button>
                                <button onClick={() => handleAddAndFavorite(track)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: audioState.playlist.find(t=>t.id===track.id)?.isFavorite ? '#fef08a' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Favoritar">
                                  <Star size={12} fill={audioState.playlist.find(t=>t.id===track.id)?.isFavorite ? '#fef08a' : 'none'} />
                                </button>
                                <button onClick={() => handleAddToPlaylist(track)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Adicionar à Sessão">
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ABA SOUNDBOARD */}
              {activeTab === 'soundboard' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {audioState.soundboard.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>
                      <Layers size={32} color="var(--text-secondary)" style={{ marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Seu Soundboard está vazio!</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>Você pode adicionar SFX ao seu painel usando as abas <b>Catálogo</b> ou <b>Biblioteca</b> clicando no ícone do Soundboard.</p>
                    </div>
                  )}
                  {audioState.soundboard.map((sfx) => (
                    <div key={sfx.id} style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); audioState.removeSoundboardItem(sfx.id); }}
                        style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-danger)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, padding: 0 }}
                        title="Remover"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button
                        onClick={() => handlePlaySFX(sfx as any)}
                        style={{
                          width: '100%', aspectRatio: '1', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '12px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                          cursor: 'pointer', transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
                      >
                        <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{sfx.icon || '🔊'}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center', padding: '0 0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{sfx.title}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA MACROS (CENAS) */}
              {activeTab === 'scenes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  
                  {isCreatingMacro ? (
                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Nova Macro (Salva na Wiki)
                      </h4>
                      <input type="text" placeholder="Nome da Macro" style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', marginBottom: '0.5rem', outline: 'none' }} value={macroName} onChange={e => setMacroName(e.target.value)} />
                      <input type="text" placeholder="Música (Título exato)" style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', marginBottom: '0.5rem', outline: 'none' }} value={macroMusic} onChange={e => setMacroMusic(e.target.value)} />
                      <input type="text" placeholder="Ambiente (Título exato)" style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', marginBottom: '0.5rem', outline: 'none' }} value={macroAmbience} onChange={e => setMacroAmbience(e.target.value)} />
                      <input type="text" placeholder="SFX (Título exato no Soundboard)" style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', marginBottom: '0.75rem', outline: 'none' }} value={macroSfx} onChange={e => setMacroSfx(e.target.value)} />
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleSaveMacro} style={{ flex: 1, background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Salvar</button>
                        <button onClick={() => setIsCreatingMacro(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setIsCreatingMacro(true)} style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px dashed rgba(168, 85, 247, 0.4)', borderRadius: '8px', color: '#f0abfc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}>
                      <Plus size={16} /> Criar Nova Macro
                    </button>
                  )}

                  {wikiMacros.map(macro => (
                    <div key={macro.id} onClick={() => handleExecuteWikiMacro(macro)} style={{ padding: '0.75rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(234, 179, 8, 0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(234, 179, 8, 0.1)'}>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fef08a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                          <Zap size={14} /> {macro.name}
                        </h4>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>{macro.musicTitle ? 'Toca: ' + macro.musicTitle : ''} {macro.ambienceTitle ? ' → Ambiente: ' + macro.ambienceTitle : ''}</p>
                      </div>
                      <Play size={16} color="#fef08a" />
                    </div>
                  ))}

                  <div onClick={() => handleExecuteMacro('boss')} style={{ padding: '0.75rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(234, 179, 8, 0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(234, 179, 8, 0.1)'}>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fef08a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <Zap size={14} /> Encontro com o Chefe (Padrão)
                      </h4>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Toca: Battle Theme → Ambiente: Chuva → SFX: Trovão</p>
                    </div>
                    <Play size={16} color="#fef08a" />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DraggableWindow>
  );
};
