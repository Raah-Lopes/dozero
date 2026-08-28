import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVoiceStore } from '../store/voiceStore';

describe('useVoiceStore Global State Management', () => {
  beforeEach(() => {
    localStorage.clear();
    useVoiceStore.setState({
      manager: null,
      inCall: false,
      isMuted: false,
      isDeafened: false,
      isSharingScreen: false,
      peers: [],
      localSpeaking: { isSpeaking: false, audioLevel: 0 },
      inputMode: 'vad',
      pttKey: 'Space',
      vadSensitivity: 20,
      isPTTPressed: false,
      roomCode: '',
    });
  });

  it('initializes with default values', () => {
    const state = useVoiceStore.getState();
    expect(state.inCall).toBe(false);
    expect(state.isMuted).toBe(false);
    expect(state.isDeafened).toBe(false);
    expect(state.inputMode).toBe('vad');
  });

  it('updates input mode and persists to localStorage', () => {
    const { setInputMode } = useVoiceStore.getState();
    setInputMode('ptt');

    expect(useVoiceStore.getState().inputMode).toBe('ptt');
    expect(localStorage.getItem('dozero_voice_input_mode')).toBe('ptt');
  });

  it('updates PTT key and persists to localStorage', () => {
    const { setPttKey } = useVoiceStore.getState();
    setPttKey('KeyV');

    expect(useVoiceStore.getState().pttKey).toBe('KeyV');
    expect(localStorage.getItem('dozero_voice_ptt_key')).toBe('KeyV');
  });

  it('updates VAD sensitivity', () => {
    const { setVadSensitivity } = useVoiceStore.getState();
    setVadSensitivity(45);

    expect(useVoiceStore.getState().vadSensitivity).toBe(45);
  });

  it('updates PTT pressed state', () => {
    const { setPTTPressed } = useVoiceStore.getState();
    setPTTPressed(true);
    expect(useVoiceStore.getState().isPTTPressed).toBe(true);

    setPTTPressed(false);
    expect(useVoiceStore.getState().isPTTPressed).toBe(false);
  });

  it('handles leave call by resetting all session state', () => {
    useVoiceStore.setState({
      inCall: true,
      isSharingScreen: true,
      peers: [{
        peerId: 'peer-1',
        userName: 'Aragorn',
        stream: {} as MediaStream,
        isMuted: false,
        isScreenShare: false,
        isSpeaking: true,
        audioLevel: 70,
        volume: 1.0,
        isLocallyMuted: false
      }],
      localSpeaking: { isSpeaking: true, audioLevel: 50 },
    });

    const { leaveCall } = useVoiceStore.getState();
    leaveCall();

    const state = useVoiceStore.getState();
    expect(state.inCall).toBe(false);
    expect(state.isSharingScreen).toBe(false);
    expect(state.localScreenStream).toBeNull();
    expect(state.peers.length).toBe(0);
    expect(state.localSpeaking.isSpeaking).toBe(false);
  });

  it('manages toggleScreenShare and localScreenStream in store', async () => {
    const mockScreenStream = {} as MediaStream;
    const mockManager = {
      startScreenShare: vi.fn().mockResolvedValue(mockScreenStream),
      stopScreenShare: vi.fn(),
    } as any;

    useVoiceStore.setState({
      manager: mockManager,
      inCall: true,
      isSharingScreen: false,
      localScreenStream: null
    });

    // Start Screen Share
    const resultStart = await useVoiceStore.getState().toggleScreenShare();
    expect(resultStart).toBe(true);
    expect(useVoiceStore.getState().isSharingScreen).toBe(true);
    expect(useVoiceStore.getState().localScreenStream).toBe(mockScreenStream);

    // Stop Screen Share
    const resultStop = await useVoiceStore.getState().toggleScreenShare();
    expect(resultStop).toBe(false);
    expect(useVoiceStore.getState().isSharingScreen).toBe(false);
    expect(useVoiceStore.getState().localScreenStream).toBeNull();
    expect(mockManager.stopScreenShare).toHaveBeenCalled();
  });
});
