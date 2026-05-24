import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Variable } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface GlobalStore {
  globalVariables: Variable[];
  addGlobalVariable: (variable: Variable) => void;
  updateGlobalVariable: (id: string, updates: Partial<Variable>) => void;
  deleteGlobalVariable: (id: string) => void;
  setGlobalVariables: (variables: Variable[]) => void;
}

export const useGlobalStore = create<GlobalStore>()(
  persist(
    (set) => ({
      globalVariables: [],
      
      addGlobalVariable: (variable) => set((state) => ({
        globalVariables: [...state.globalVariables, { ...variable, id: uuidv4() } as any]
      })),
      
      updateGlobalVariable: (id, updates) => set((state) => ({
        globalVariables: state.globalVariables.map((v: any) => v.id === id ? { ...v, ...updates } : v)
      })),
      
      deleteGlobalVariable: (id) => set((state) => ({
        globalVariables: state.globalVariables.filter((v: any) => v.id !== id)
      })),
      
      setGlobalVariables: (variables) => set({ globalVariables: variables }),
    }),
    {
      name: 'pulse-global-storage',
    }
  )
);
