import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebRTCVoiceManager, calculateAudioLevel } from '../services/webrtcVoiceManager';

describe('WebRTCVoiceManager & VAD Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('calculateAudioLevel', () => {
    it('returns 0 for silence (all 128 byte values)', () => {
      const mockAnalyser = {
        fftSize: 256,
        getByteTimeDomainData: (arr: Uint8Array) => arr.fill(128)
      } as unknown as AnalyserNode;

      const level = calculateAudioLevel(mockAnalyser);
      expect(level).toBe(0);
    });

    it('calculates proportional audio level for oscillating wave', () => {
      const mockAnalyser = {
        fftSize: 256,
        getByteTimeDomainData: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i % 2 === 0 ? 190 : 66; // wave +/- 62 from 128
          }
        }
      } as unknown as AnalyserNode;

      const level = calculateAudioLevel(mockAnalyser);
      expect(level).toBeGreaterThan(50);
      expect(level).toBeLessThanOrEqual(100);
    });

    it('gracefully handles missing or broken analyser nodes', () => {
      // @ts-expect-error test invalid node
      expect(calculateAudioLevel(null)).toBe(0);
      // @ts-expect-error test invalid node
      expect(calculateAudioLevel({})).toBe(0);
    });
  });

  describe('WebRTCVoiceManager State & Controls', () => {
    it('initializes with default voice settings and loads from localStorage', () => {
      localStorage.setItem('dozero_voice_sensitivity', '35');
      localStorage.setItem('dozero_voice_input_mode', 'ptt');
      localStorage.setItem('dozero_peer_volumes', JSON.stringify({ 'peer-1': 1.5 }));

      const manager = new WebRTCVoiceManager('room-123', 'Gandalf');
      expect(manager.getVadSensitivity()).toBe(35);
      expect(manager.getInputMode()).toBe('ptt');
      expect(manager.getPeerVolume('peer-1')).toBe(1.5);
      expect(manager.getPeerVolume('unknown-peer')).toBe(1.0);
    });

    it('clamps sensitivity between 0 and 100', () => {
      const manager = new WebRTCVoiceManager('room-123', 'Gandalf');
      manager.setVadSensitivity(150);
      expect(manager.getVadSensitivity()).toBe(100);
      manager.setVadSensitivity(-20);
      expect(manager.getVadSensitivity()).toBe(0);
      manager.setVadSensitivity(42);
      expect(manager.getVadSensitivity()).toBe(42);
      expect(localStorage.getItem('dozero_voice_sensitivity')).toBe('42');
    });

    it('toggles deafen mode and mutes audio properly', () => {
      const manager = new WebRTCVoiceManager('room-123', 'Gandalf');
      expect(manager.getIsDeafened()).toBe(false);

      const deafened = manager.setDeafened(true);
      expect(deafened).toBe(true);
      expect(manager.getIsDeafened()).toBe(true);

      manager.setDeafened(false);
      expect(manager.getIsDeafened()).toBe(false);
    });

    it('controls peer volume with clamping and local mute toggling', () => {
      const manager = new WebRTCVoiceManager('room-123', 'Gandalf');
      
      manager.setPeerVolume('peer-test', 1.8);
      expect(manager.getPeerVolume('peer-test')).toBe(1.8);

      manager.setPeerVolume('peer-test', 5.0); // should clamp to 2.0
      expect(manager.getPeerVolume('peer-test')).toBe(2.0);

      manager.setPeerVolume('peer-test', -0.5); // should clamp to 0
      expect(manager.getPeerVolume('peer-test')).toBe(0);

      // Local peer mute
      const isMuted1 = manager.togglePeerMute('peer-test');
      expect(isMuted1).toBe(true);
      const isMuted2 = manager.togglePeerMute('peer-test');
      expect(isMuted2).toBe(false);
    });

    it('supports subscription listeners and notifies subscribers cleanly', () => {
      const manager = new WebRTCVoiceManager('room-123', 'Gandalf');
      const listener = vi.fn();

      const unsubscribe = manager.subscribe(listener);
      expect(listener).toHaveBeenCalledWith([]);

      unsubscribe();
      manager.leave();
    });

    it('manages screen share lifecycle, track listeners, and termination callbacks', async () => {
      const stopTrackMock = vi.fn();
      const mockVideoTrack = {
        kind: 'video',
        stop: stopTrackMock,
        onended: null as (() => void) | null
      };

      const mockScreenStream = {
        getTracks: () => [mockVideoTrack],
        getVideoTracks: () => [mockVideoTrack]
      } as unknown as MediaStream;

      // Mock navigator.mediaDevices.getDisplayMedia
      const originalMediaDevices = navigator.mediaDevices;
      const getDisplayMediaMock = vi.fn().mockResolvedValue(mockScreenStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          ...originalMediaDevices,
          getDisplayMedia: getDisplayMediaMock
        },
        configurable: true
      });

      const manager = new WebRTCVoiceManager('room-123', 'Legolas');
      const endListener = vi.fn();
      manager.onScreenShareEnded(endListener);

      const stream = await manager.startScreenShare();
      expect(getDisplayMediaMock).toHaveBeenCalled();
      expect(stream).toBe(mockScreenStream);
      expect(manager.getLocalScreenStream()).toBe(mockScreenStream);

      // Stop screen share
      manager.stopScreenShare();
      expect(stopTrackMock).toHaveBeenCalled();
      expect(manager.getLocalScreenStream()).toBeNull();
      expect(endListener).toHaveBeenCalled();

      // Test automatic termination when user ends via browser bar (track.onended)
      const stream2 = await manager.startScreenShare();
      expect(stream2).not.toBeNull();
      if (mockVideoTrack.onended) {
        mockVideoTrack.onended();
      }
      expect(manager.getLocalScreenStream()).toBeNull();
    });
  });
});
