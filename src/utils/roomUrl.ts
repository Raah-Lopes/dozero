// ponytail: single source of truth for room URL construction and navigation

const VERCEL_BASE = 'https://dozero-vert.vercel.app';

export const getRoomUrl = (roomCode: string): string => {
  const pathname = window.location.pathname.endsWith('.html')
    ? window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))
    : window.location.pathname.replace(/\/$/, '');
  const base = `${window.location.origin}${pathname}/vtt.html?room=${encodeURIComponent(roomCode)}`;
  return base;
};

export const getVercelRoomUrl = (roomCode: string): string => {
  const base = `${VERCEL_BASE}/vtt.html?room=${encodeURIComponent(roomCode)}`;
  return base;
};

export const navigateToRoom = (roomCode: string): void => {
  window.location.href = getRoomUrl(roomCode);
};

export const getCurrentRoomCode = (): string => {
  return new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2';
};
