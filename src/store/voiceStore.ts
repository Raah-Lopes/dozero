import { create } from 'zustand';
import { WebRTCVoiceManager, PeerStreamState, InputMode, LocalSpeakingState } from '../services/webrtcVoiceManager';
import { toast } from '../components/UI/Toast';

interface VoiceStoreState {
  manager: WebRTCVoiceManager | null;
  inCall: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isSharingScreen: boolean;
  localScreenStream: MediaStream | null;
  peers: PeerStreamState[];
  localSpeaking: LocalSpeakingState;
  inputMode: InputMode;
  pttKey: string;
  vadSensitivity: number;
  isPTTPressed: boolean;
  roomCode: string;

  // Ações
  joinCall: (roomCode: string, userName: string) => Promise<boolean>;
  leaveCall: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleScreenShare: () => Promise<boolean>;
  setInputMode: (mode: InputMode) => void;
  setPttKey: (key: string) => void;
  setVadSensitivity: (val: number) => void;
  setPeerVolume: (peerId: string, vol: number) => void;
  togglePeerMute: (peerId: string) => void;
  setPTTPressed: (pressed: boolean) => void;
  setAudioInputDevice: (deviceId: string) => Promise<boolean>;
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => ({
  manager: null,
  inCall: false,
  isMuted: false,
  isDeafened: false,
  isSharingScreen: false,
  localScreenStream: null,
  peers: [],
  localSpeaking: { isSpeaking: false, audioLevel: 0 },
  inputMode: (typeof localStorage !== 'undefined' && localStorage.getItem('dozero_voice_input_mode') as InputMode) || 'vad',
  pttKey: (typeof localStorage !== 'undefined' && localStorage.getItem('dozero_voice_ptt_key')) || 'Space',
  vadSensitivity: (typeof localStorage !== 'undefined' && Number(localStorage.getItem('dozero_voice_sensitivity'))) || 20,
  isPTTPressed: false,
  roomCode: '',

  joinCall: async (roomCode: string, userName: string) => {
    const existing = get().manager;
    if (existing) {
      existing.leave();
    }

    const mgr = new WebRTCVoiceManager(roomCode, userName);
    const stream = await mgr.startVoice();

    if (stream) {
      mgr.subscribe((updatedPeers) => {
        set({ peers: updatedPeers });
      });

      mgr.onLocalSpeaking((state) => {
        set({ localSpeaking: state });
      });

      mgr.onScreenShareEnded(() => {
        set({ isSharingScreen: false, localScreenStream: null });
      });

      set({
        manager: mgr,
        inCall: true,
        roomCode,
        isMuted: mgr.getIsMuted(),
        isDeafened: mgr.getIsDeafened(),
        inputMode: mgr.getInputMode(),
        vadSensitivity: mgr.getVadSensitivity(),
      });

      toast.success('Conectado à sala de voz da mesa!');
      return true;
    } else {
      toast.error('Não foi possível acessar o microfone.');
      return false;
    }
  },

  leaveCall: () => {
    const mgr = get().manager;
    if (mgr) {
      mgr.leave();
    }
    set({
      manager: null,
      inCall: false,
      isSharingScreen: false,
      localScreenStream: null,
      peers: [],
      localSpeaking: { isSpeaking: false, audioLevel: 0 },
      isPTTPressed: false,
    });
    toast.info('Você saiu da chamada de voz.');
  },

  toggleMute: () => {
    const mgr = get().manager;
    if (mgr) {
      const muted = mgr.toggleMute();
      set({ isMuted: muted });
    }
  },

  toggleDeafen: () => {
    const mgr = get().manager;
    if (mgr) {
      const nextDeaf = !get().isDeafened;
      mgr.setDeafened(nextDeaf);
      set({ isDeafened: nextDeaf, isMuted: mgr.getIsMuted() });
    }
  },

  toggleScreenShare: async () => {
    const mgr = get().manager;
    if (!mgr) return false;

    if (get().isSharingScreen) {
      mgr.stopScreenShare();
      set({ isSharingScreen: false, localScreenStream: null });
      toast.info('Compartilhamento de tela finalizado.');
      return false;
    } else {
      const screenStream = await mgr.startScreenShare();
      if (screenStream) {
        set({ isSharingScreen: true, localScreenStream: screenStream });
        toast.success('Compartilhando sua tela com a mesa!');
        return true;
      }
      return false;
    }
  },

  setInputMode: (mode: InputMode) => {
    const mgr = get().manager;
    if (mgr) mgr.setInputMode(mode);
    set({ inputMode: mode });
    try { localStorage.setItem('dozero_voice_input_mode', mode); } catch {}
  },

  setPttKey: (key: string) => {
    set({ pttKey: key });
    try { localStorage.setItem('dozero_voice_ptt_key', key); } catch {}
  },

  setVadSensitivity: (val: number) => {
    const mgr = get().manager;
    if (mgr) mgr.setVadSensitivity(val);
    set({ vadSensitivity: val });
  },

  setPeerVolume: (peerId: string, vol: number) => {
    const mgr = get().manager;
    if (mgr) {
      mgr.setPeerVolume(peerId, vol);
    }
  },

  togglePeerMute: (peerId: string) => {
    const mgr = get().manager;
    if (mgr) {
      const unmuted = mgr.togglePeerMute(peerId);
      toast.info(unmuted ? 'Áudio do jogador ativado' : 'Jogador silenciado localmente');
    }
  },

  setPTTPressed: (pressed: boolean) => {
    const mgr = get().manager;
    if (mgr) mgr.setPTTActive(pressed);
    set({ isPTTPressed: pressed });
  },

  setAudioInputDevice: async (deviceId: string) => {
    const mgr = get().manager;
    if (mgr) {
      const ok = await mgr.setAudioInputDevice(deviceId);
      if (ok) toast.success('Microfone alterado.');
      return ok;
    }
    return true;
  },
}));
