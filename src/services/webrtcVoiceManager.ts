import { supabase, isSupabaseConfigured } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PeerStreamState {
  peerId: string;
  userName: string;
  stream: MediaStream;
  isMuted: boolean;
  isScreenShare: boolean;
}

type StreamCallback = (peers: PeerStreamState[]) => void;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

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
  private isMuted = false;

  constructor(roomCode: string, userName: string) {
    this.roomCode = roomCode;
    this.myUserName = userName;
    this.myPeerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  public async startVoice(): Promise<MediaStream | null> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });

      this.initSignaling();
      return this.localStream;
    } catch (err) {
      console.warn('[WebRTC] Permissão de microfone não concedida ou indisponível:', err);
      return null;
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      
      // Adiciona o track de tela a todos os peers conectados
      this.localScreenStream.getTracks().forEach(track => {
        this.peers.forEach(({ pc }) => {
          if (this.localScreenStream) pc.addTrack(track, this.localScreenStream);
        });
      });

      this.localScreenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      return this.localScreenStream;
    } catch (err) {
      console.warn('[WebRTC] Compartilhamento de tela cancelado:', err);
      return null;
    }
  }

  public stopScreenShare() {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(t => t.stop());
      this.localScreenStream = null;
    }
  }

  public toggleMute(): boolean {
    if (this.localStream) {
      this.isMuted = !this.isMuted;
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  public subscribe(cb: StreamCallback) {
    this.subscribers.add(cb);
    cb(Array.from(this.remoteStreams.values()));
    return () => this.subscribers.delete(cb);
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

    // 1. Recebe ofertas de novos membros
    this.channel.on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
      const { fromPeerId, fromUserName, targetPeerId, signal } = payload;
      if (targetPeerId && targetPeerId !== this.myPeerId) return;

      if (signal.type === 'leave') {
        const peer = this.peers.get(fromPeerId);
        peer?.pc.close();
        this.peers.delete(fromPeerId);
        this.remoteStreams.delete(fromPeerId);
        this.notify();
      } else if (signal.type === 'join') {
        // Alguém entrou, crie uma oferta para ele
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
        // Anuncia presença para os outros pares
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

    // Adiciona tracks de áudio locais
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidates
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

    // Recebe tracks remotos
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      const isScreen = stream.getVideoTracks().length > 0;
      this.remoteStreams.set(remotePeerId, {
        peerId: remotePeerId,
        userName: remoteUserName,
        stream,
        isMuted: false,
        isScreenShare: isScreen
      });
      this.notify();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.peers.delete(remotePeerId);
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

  public leave() {
    this.stopScreenShare();
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
    this.remoteStreams.clear();
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.notify();
  }
}
