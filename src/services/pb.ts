import PocketBase from 'pocketbase';

// The URL of the PocketBase backend.
export const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://dozero.pockethost.io';

// Global singleton PocketBase client
export const pb = new PocketBase(PB_URL);

// Automatically disable auto-cancellation for all requests
pb.autoCancellation(false);
