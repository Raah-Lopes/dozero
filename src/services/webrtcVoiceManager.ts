import { supabase, isSupabaseConfigured } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PeerStreamState {
  peerId: string;
  userName: string;
  stream: MediaStream;
  screenStream?: MediaStream;
  isMuted: boolean;
  isScreenShare: boolean;
  isSpeaking: boolean;
  audioLevel: number; // 0 a 100
  volume: number; // 0.0 a 2.0 (1.0 = 100%)
  isLocallyMuted: boolean;
}

export type InputMode = 'vad' | 'ptt';

export interface LocalSpeakingState {
  isSpeaking: boolean;
  audioLevel: number;
}

type StreamCallback = (peers: PeerStreamState[]) => void;
type LocalSpeakingCallback = (state: LocalSpeakingState) => void;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export function calculateAudioLevel(analyser: AnalyserNode): number {
  try {
    const bufferLength = analyser.fftSize || 256;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const val = (dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    // Escala não-linear para sensibilidade agradável (0-100)
    return Math.min(100, Math.round(rms * 280));
  } catch {
    return 0;
  }
}

export class WebRTCVoiceManager {
  private channel: RealtimeChannel | null = null;
  private roomCode: string;
  private myPeerId: string;
  private myUserName: string;
  private localStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private peers: Map<string, { pc: RTCPeerConnection; name: string }> = new Map();
  private remoteStreams: Map<string, PeerStreamState> = new Map();
  private subscribers: Set<StreamCallback> = new Set();
  private localSpeakingSubscribers: Set<LocalSpeakingCallback> = new Set();
  private screenEndedCallbacks: Set<() => void> = new Set();
  private screenSenders: Map<string, RTCRtpSender[]> = new Map();

  // Estados de Voz e Áudio
  private isMuted = false;
  private isDeafened = false;
  private inputMode: InputMode = 'vad';
  private isPTTActive = false;
  private vadSensitivity = 20; // 0 - 100
  private selectedDeviceId = '';

  // Volumes locais individuais por peer
  private peerVolumes: Map<string, number> = new Map();
  private peerMutes: Set<string> = new Set();

  // Web Audio API
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private localSourceNode: MediaStreamAudioSourceNode | null = null;
  private remoteNodes: Map<string, { analyser: AnalyserNode; gainNode: GainNode; source: MediaStreamAudioSourceNode }> = new Map();
  private vadInterval: ReturnType<typeof setInterval> | null = null;

  constructor(roomCode: string, userName: string) {
    this.roomCode = roomCode;
    this.myUserName = userName;
    this.myPeerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.loadSavedSettings();
  }

  private loadSavedSettings() {
    try {
      if (typeof window === 'undefined') return;
      const savedSensitivity = localStorage.getItem('dozero_voice_sensitivity');
      if (savedSensitivity !== null) {
        const num = Number(savedSensitivity);
        if (!isNaN(num)) this.vadSensitivity = Math.max(0, Math.min(100, num));
      }

      const savedMode = localStorage.getItem('dozero_voice_input_mode');
      if (savedMode === 'vad' || savedMode === 'ptt') this.inputMode = savedMode;

      const savedDeviceId = localStorage.getItem('dozero_voice_input_device');
      if (savedDeviceId) this.selectedDeviceId = savedDeviceId;

      const savedVolumes = localStorage.getItem('dozero_peer_volumes');
      if (savedVolumes) {
        const parsed = JSON.parse(savedVolumes);
        Object.entries(parsed).forEach(([id, vol]) => this.peerVolumes.set(id, Number(vol)));
      }
    } catch {}
  }

  public async startVoice(): Promise<MediaStream | null> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined
        },
        video: false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.initWebAudio();
      this.updateTrackState();
      this.initSignaling();
      return this.localStream;
    } catch (err) {
      console.warn('[WebRTC] Permissão de microfone não concedida ou indisponível:', err);
      return null;
    }
  }

  private initWebAudio() {
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      if (this.localStream && this.audioCtx) {
        this.localSourceNode = this.audioCtx.createMediaStreamSource(this.localStream);
        this.localAnalyser = this.audioCtx.createAnalyser();
        this.localAnalyser.fftSize = 256;
        this.localSourceNode.connect(this.localAnalyser);
      }

      this.startVADLoop();
    } catch (e) {
      console.warn('[WebAudio] Erro ao inicializar nós de análise de áudio:', e);
    }
  }

  private startVADLoop() {
    if (this.vadInterval) clearInterval(this.vadInterval);

    this.vadInterval = setInterval(() => {
      // 1. Processa microfone local
      let localLevel = 0;
      let localSpeaking = false;

      if (this.localAnalyser && !this.isMuted && !this.isDeafened) {
        localLevel = calculateAudioLevel(this.localAnalyser);
        if (this.inputMode === 'vad') {
          localSpeaking = localLevel >= this.vadSensitivity;
        } else {
          localSpeaking = this.isPTTActive && localLevel >= 10;
        }
      }

      this.localSpeakingSubscribers.forEach(cb => cb({ isSpeaking: localSpeaking, audioLevel: localLevel }));

      // 2. Processa peers remotos
      let peersChanged = false;
      this.remoteStreams.forEach((peerState, peerId) => {
        const node = this.remoteNodes.get(peerId);
        let remoteLevel = 0;
        let remoteSpeaking = false;

        if (node && !this.isDeafened && !peerState.isLocallyMuted) {
          remoteLevel = calculateAudioLevel(node.analyser);
          remoteSpeaking = remoteLevel >= 15;
        }

        if (peerState.isSpeaking !== remoteSpeaking || Math.abs(peerState.audioLevel - remoteLevel) > 5) {
          peerState.isSpeaking = remoteSpeaking;
          peerState.audioLevel = remoteLevel;
          peersChanged = true;
        }
      });

      if (peersChanged) {
        this.notify();
      }
    }, 60);
  }

  public setInputMode(mode: InputMode) {
    this.inputMode = mode;
    try {
      localStorage.setItem('dozero_voice_input_mode', mode);
    } catch {}
    this.updateTrackState();
  }

  public getInputMode(): InputMode {
    return this.inputMode;
  }

  public setPTTActive(active: boolean) {
    this.isPTTActive = active;
    this.updateTrackState();
  }

  public setVadSensitivity(sensitivity: number) {
    this.vadSensitivity = Math.max(0, Math.min(100, sensitivity));
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dozero_voice_sensitivity', String(this.vadSensitivity));
      }
    } catch {}
  }

  public getVadSensitivity(): number {
    return this.vadSensitivity;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateTrackState();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setDeafened(deafened: boolean): boolean {
    this.isDeafened = deafened;
    this.updateTrackState();
    this.updateRemoteGains();
    return this.isDeafened;
  }

  public getIsDeafened(): boolean {
    return this.isDeafened;
  }

  private updateTrackState() {
    if (!this.localStream) return;
    const canTransmit = !this.isMuted && !this.isDeafened && (this.inputMode === 'vad' || this.isPTTActive);
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = canTransmit;
    });
  }

  public setPeerVolume(peerId: string, volume: number) {
    const clamped = Math.max(0, Math.min(2.0, volume));
    this.peerVolumes.set(peerId, clamped);

    try {
      const obj: Record<string, number> = {};
      this.peerVolumes.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem('dozero_peer_volumes', JSON.stringify(obj));
    } catch {}

    const peer = this.remoteStreams.get(peerId);
    if (peer) {
      peer.volume = clamped;
      this.updateRemoteGains();
      this.notify();
    }
  }

  public getPeerVolume(peerId: string): number {
    return this.peerVolumes.get(peerId) ?? 1.0;
  }

  public togglePeerMute(peerId: string): boolean {
    const isMuted = this.peerMutes.has(peerId);
    if (isMuted) {
      this.peerMutes.delete(peerId);
    } else {
      this.peerMutes.add(peerId);
    }

    const peer = this.remoteStreams.get(peerId);
    if (peer) {
      peer.isLocallyMuted = !isMuted;
      this.updateRemoteGains();
      this.notify();
    }
    return !isMuted;
  }

  private updateRemoteGains() {
    this.remoteNodes.forEach((node, peerId) => {
      if (this.isDeafened || this.peerMutes.has(peerId)) {
        node.gainNode.gain.value = 0;
      } else {
        const vol = this.peerVolumes.get(peerId) ?? 1.0;
        node.gainNode.gain.value = vol;
      }
    });
  }

  public async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  public async setAudioInputDevice(deviceId: string): Promise<boolean> {
    this.selectedDeviceId = deviceId;
    try {
      localStorage.setItem('dozero_voice_input_device', deviceId);
    } catch {}

    if (!this.localStream) return true;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const oldTracks = this.localStream.getAudioTracks();
      const newTrack = newStream.getAudioTracks()[0];

      if (newTrack) {
        this.peers.forEach(({ pc }) => {
          const senders = pc.getSenders();
          const sender = senders.find(s => s.track && s.track.kind === 'audio');
          if (sender) {
            sender.replaceTrack(newTrack).catch(e => console.warn('[WebRTC] replaceTrack error:', e));
          }
        });

        oldTracks.forEach(t => t.stop());
        this.localStream = newStream;
        this.initWebAudio();
        this.updateTrackState();
      }
      return true;
    } catch (e) {
      console.warn('[WebRTC] Erro ao trocar dispositivo de áudio:', e);
      return false;
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        console.warn('[WebRTC] getDisplayMedia não suportado neste navegador.');
        return null;
      }

      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' as any },
        audio: true
      });
      
      this.peers.forEach(({ pc }, peerId) => {
        const senders: RTCRtpSender[] = [];
        this.localScreenStream?.getTracks().forEach(track => {
          try {
            senders.push(pc.addTrack(track, this.localScreenStream!));
          } catch (e) {
            console.warn('[WebRTC] Falha ao adicionar track de tela ao peer:', peerId, e);
          }
        });
        if (senders.length > 0) {
          this.screenSenders.set(peerId, senders);
          void this.renegotiatePeer(peerId, pc);
        }
      });

      const videoTrack = this.localScreenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      return this.localScreenStream;
    } catch (err) {
      console.warn('[WebRTC] Compartilhamento de tela cancelado ou negado:', err);
      return null;
    }
  }

  public stopScreenShare() {
    // Remove senders de todos os RTCPeerConnections
    this.screenSenders.forEach((senders, peerId) => {
      const peer = this.peers.get(peerId);
      if (peer) {
        senders.forEach(sender => {
          try {
            peer.pc.removeTrack(sender);
          } catch {}
        });
        void this.renegotiatePeer(peerId, peer.pc);
      }
    });
    this.screenSenders.clear();

    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      this.localScreenStream = null;
    }

    this.screenEndedCallbacks.forEach(cb => {
      try { cb(); } catch {}
    });
  }

  public getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream;
  }

  public onScreenShareEnded(cb: () => void) {
    this.screenEndedCallbacks.add(cb);
    return () => {
      this.screenEndedCallbacks.delete(cb);
    };
  }

  public subscribe(cb: StreamCallback) {
    this.subscribers.add(cb);
    cb(Array.from(this.remoteStreams.values()));
    return () => {
      this.subscribers.delete(cb);
    };
  }

  public onLocalSpeaking(cb: LocalSpeakingCallback) {
    this.localSpeakingSubscribers.add(cb);
    return () => {
      this.localSpeakingSubscribers.delete(cb);
    };
  }

  private notify() {
    const list = Array.from(this.remoteStreams.values());
    this.subscribers.forEach(cb => cb(list));
  }

  private initSignaling() {
    if (!isSupabaseConfigured) return;

    this.channel = supabase.channel(`webrtc-voice:${this.roomCode}`, {
      config: { broadcast: { self: false, ack: false } }
    });

    this.channel.on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
      const { fromPeerId, fromUserName, targetPeerId, signal } = payload;
      if (targetPeerId && targetPeerId !== this.myPeerId) return;

      if (signal.type === 'leave') {
        const peer = this.peers.get(fromPeerId);
        peer?.pc.close();
        this.peers.delete(fromPeerId);
        this.cleanupRemoteNode(fromPeerId);
        this.remoteStreams.delete(fromPeerId);
        this.notify();
      } else if (signal.type === 'join') {
        this.createPeerConnection(fromPeerId, fromUserName, true);
      } else if (signal.type === 'offer') {
        const pc = this.createPeerConnection(fromPeerId, fromUserName, false);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.channel?.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            fromPeerId: this.myPeerId,
            fromUserName: this.myUserName,
            targetPeerId: fromPeerId,
            signal: { type: 'answer', sdp: answer }
          }
        });
      } else if (signal.type === 'answer') {
        const peer = this.peers.get(fromPeerId);
        if (peer) {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
      } else if (signal.type === 'ice-candidate') {
        const peer = this.peers.get(fromPeerId);
        if (peer && signal.candidate) {
          try {
            await peer.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.warn('[WebRTC] Erro ao adicionar ICE candidate:', e);
          }
        }
      }
    });

    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.channel?.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            fromPeerId: this.myPeerId,
            fromUserName: this.myUserName,
            signal: { type: 'join' }
          }
        });
      }
    });
  }

  private createPeerConnection(remotePeerId: string, remoteUserName: string, isInitiator: boolean): RTCPeerConnection {
    if (this.peers.has(remotePeerId)) {
      return this.peers.get(remotePeerId)!.pc;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(remotePeerId, { pc, name: remoteUserName });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    if (this.localScreenStream) {
      const senders = this.localScreenStream.getTracks().map(track => pc.addTrack(track, this.localScreenStream!));
      this.screenSenders.set(remotePeerId, senders);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.channel?.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            fromPeerId: this.myPeerId,
            targetPeerId: remotePeerId,
            signal: { type: 'ice-candidate', candidate: event.candidate }
          }
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      const isScreen = stream.getVideoTracks().length > 0;
      const current = this.remoteStreams.get(remotePeerId);

      if (!isScreen && this.audioCtx && this.audioCtx.state !== 'closed') {
        try {
          const source = this.audioCtx.createMediaStreamSource(stream);
          const gainNode = this.audioCtx.createGain();
          const analyser = this.audioCtx.createAnalyser();
          analyser.fftSize = 256;

          const vol = this.peerVolumes.get(remotePeerId) ?? 1.0;
          gainNode.gain.value = this.isDeafened || this.peerMutes.has(remotePeerId) ? 0 : vol;

          source.connect(gainNode);
          gainNode.connect(analyser);

          this.remoteNodes.set(remotePeerId, { source, gainNode, analyser });
        } catch (e) {
          console.warn('[WebAudio] Erro ao conectar stream remoto:', e);
        }
      }

      const next: PeerStreamState = {
        peerId: remotePeerId,
        userName: remoteUserName,
        stream: isScreen && current ? current.stream : stream,
        screenStream: isScreen ? stream : current?.screenStream,
        isMuted: false,
        isScreenShare: isScreen || Boolean(current?.screenStream),
        isSpeaking: current?.isSpeaking || false,
        audioLevel: current?.audioLevel || 0,
        volume: this.peerVolumes.get(remotePeerId) ?? 1.0,
        isLocallyMuted: this.peerMutes.has(remotePeerId)
      };
      this.remoteStreams.set(remotePeerId, next);

      if (isScreen) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) videoTrack.onended = () => {
          const peer = this.remoteStreams.get(remotePeerId);
          if (!peer || peer.screenStream !== stream) return;
          peer.screenStream = undefined;
          peer.isScreenShare = false;
          this.notify();
        };
      }
      this.notify();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.peers.delete(remotePeerId);
        this.cleanupRemoteNode(remotePeerId);
        this.remoteStreams.delete(remotePeerId);
        this.notify();
      }
    };

    if (isInitiator) {
      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        this.channel?.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            fromPeerId: this.myPeerId,
            fromUserName: this.myUserName,
            targetPeerId: remotePeerId,
            signal: { type: 'offer', sdp: offer }
          }
        });
      });
    }

    return pc;
  }

  private async renegotiatePeer(remotePeerId: string, pc: RTCPeerConnection) {
    if (!this.channel || pc.signalingState !== 'stable') return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await this.channel.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          fromPeerId: this.myPeerId,
          fromUserName: this.myUserName,
          targetPeerId: remotePeerId,
          signal: { type: 'offer', sdp: offer }
        }
      });
    } catch (error) {
      console.warn('[WebRTC] Falha ao renegociar compartilhamento de tela:', error);
    }
  }

  private cleanupRemoteNode(peerId: string) {
    const node = this.remoteNodes.get(peerId);
    if (node) {
      try {
        node.source.disconnect();
        node.gainNode.disconnect();
      } catch {}
      this.remoteNodes.delete(peerId);
    }
  }

  public leave() {
    this.stopScreenShare();
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    this.channel?.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: { fromPeerId: this.myPeerId, signal: { type: 'leave' } }
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    this.peers.forEach(({ pc }) => pc.close());
    this.peers.clear();

    this.remoteNodes.forEach((node) => {
      try {
        node.source.disconnect();
        node.gainNode.disconnect();
      } catch {}
    });
    this.remoteNodes.clear();

    if (this.localSourceNode) {
      try { this.localSourceNode.disconnect(); } catch {}
      this.localSourceNode = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }

    this.remoteStreams.clear();

    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.notify();
  }
}
