import { create } from 'zustand';
import React from 'react';

export interface DynamicCommand {
  id: string;
  title: string;
  icon?: React.ReactNode;
  category: string;
  onSelect: () => void;
}

interface CommandRegistryState {
  commands: DynamicCommand[];
  registerCommand: (command: DynamicCommand) => void;
  unregisterCommand: (id: string) => void;
}

export const useCommandRegistry = create<CommandRegistryState>((set) => ({
  commands: [],
  registerCommand: (command) => 
    set((state) => {
      // Previne comandos duplicados acidentalmente caso um componente remonte várias vezes
      if (state.commands.some(c => c.id === command.id)) return state;
      return { commands: [...state.commands, command] };
    }),
  unregisterCommand: (id) => 
    set((state) => ({ commands: state.commands.filter(c => c.id !== id) })),
}));
