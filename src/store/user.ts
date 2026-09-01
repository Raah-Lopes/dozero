import { create } from 'zustand';

interface UserState {
  isGM: boolean;
  setIsGM: (value: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  // Papel vem da autorização da campanha; nunca de localStorage.
  isGM: false,
  setIsGM: (value: boolean) => {
    set({ isGM: value });
  },
}));

export const useIsGM = () => useUserStore((s) => s.isGM);
