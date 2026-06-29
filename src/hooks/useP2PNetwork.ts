import { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';

interface ChatMessagePayload {
  type: 'chat';
  message: string;
  options: any; // ChatMessageOptions
}

type P2PMessage = ChatMessagePayload | { type: 'ping' };

export function useP2PNetwork(roomId: string, isHost: boolean, playerName: string, onMessageReceived: (msg: P2PMessage) => void) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const connectionsRef = useRef<DataConnection[]>([]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  useEffect(() => {
    if (!roomId) return;
    setStatus('connecting');

    const peerId = isHost ? `dozero-room-${roomId}` : `dozero-player-${roomId}-${Math.random().toString(36).substr(2, 9)}`;
    const newPeer = new Peer(peerId);

    newPeer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      setStatus('connected');

      if (!isHost) {
        // Player connects to host
        const conn = newPeer.connect(`dozero-room-${roomId}`);
        conn.on('open', () => {
          setConnections([conn]);
        });
        conn.on('data', (data: any) => {
          onMessageReceived(data);
        });
      }
    });

    if (isHost) {
      newPeer.on('connection', (conn) => {
        setConnections(prev => [...prev, conn]);
        conn.on('data', (data: any) => {
          // Host receives from one player, broadcasts to others
          onMessageReceived(data);
          
          // Broadcast
          connectionsRef.current.forEach(c => {
            if (c.peer !== conn.peer) {
              c.send(data);
            }
          });
        });
        conn.on('close', () => {
          setConnections(prev => prev.filter(c => c.peer !== conn.peer));
        });
      });
    }

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, [roomId, isHost]);

  const broadcastMessage = (msg: P2PMessage) => {
    connections.forEach(conn => {
      conn.send(msg);
    });
  };

  return { status, broadcastMessage, connections };
}
