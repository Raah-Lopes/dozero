import { useEffect } from 'react';
import { state } from '../services/yjs';

// Retain messages from the last 30 days
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Check once per day

export function useYjsCleanup() {
  useEffect(() => {
    // Only run cleanup if the user is a GM? Or we can let any connected user trigger it,
    // but the first one to trigger will delete it from Yjs and it will sync.
    // We'll let any client run it, Yjs handles concurrent deletes gracefully.
    
    const runCleanup = () => {
      const now = Date.now();
      const cutoff = now - RETENTION_MS;
      
      try {
        const chatArray = state.chat.toArray();
        const toDelete: number[] = [];

        // Identify old messages
        for (let i = 0; i < chatArray.length; i++) {
          const msg = chatArray[i] as any;
          if (msg && msg.timestamp && msg.timestamp < cutoff) {
            toDelete.push(i);
          }
        }

        // Delete from end to start to preserve indices
        for (let i = toDelete.length - 1; i >= 0; i--) {
          state.chat.delete(toDelete[i], 1);
        }

        if (toDelete.length > 0) {
          console.log(`[Yjs Cleanup] Removed ${toDelete.length} old chat messages.`);
        }
      } catch (e) {
        console.error('[Yjs Cleanup] Failed to clean chat:', e);
      }
    };

    // Run on startup (with a small delay to let Yjs sync first)
    const initialTimeout = setTimeout(runCleanup, 10000);

    // Run periodically
    const interval = setInterval(runCleanup, CLEANUP_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);
}
