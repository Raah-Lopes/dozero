import { create } from 'zustand';

interface UserState {
  isGM: boolean;
  setIsGM: (value: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  isGM: localStorage.getItem('isGM') === 'true',
  setIsGM: (value: boolean) => {
    localStorage.setItem('isGM', String(value));
    set({ isGM: value });
  },
}));

export const useIsGM = () => useUserStore((s) => s.isGM);
