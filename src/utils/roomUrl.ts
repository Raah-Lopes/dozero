// ponytail: single source of truth for room URL construction and navigation

const VERCEL_BASE = 'https://dozero-vert.vercel.app';

export const getRoomUrl = (roomCode: string, passCode?: string): string => {
  const base = `${window.location.origin}/vtt.html?room=${encodeURIComponent(roomCode)}`;
  return passCode ? `${base}&pass=${encodeURIComponent(passCode)}` : base;
};

export const getVercelRoomUrl = (roomCode: string, passCode?: string): string => {
  const base = `${VERCEL_BASE}/vtt.html?room=${encodeURIComponent(roomCode)}`;
  return passCode ? `${base}&pass=${encodeURIComponent(passCode)}` : base;
};

export const navigateToRoom = (roomCode: string, passCode?: string): void => {
  window.location.href = getRoomUrl(roomCode, passCode);
};

export const getCurrentRoomCode = (): string => {
  return new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2';
};
