import PocketBase from 'pocketbase';

// The URL of the PocketBase backend. Defaults to localhost if not set in .env
export const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Global singleton PocketBase client
export const pb = new PocketBase(PB_URL);

// Automatically disable auto-cancellation for all requests
pb.autoCancellation(false);
