import { create } from 'zustand';
import type { HistoryEntry } from '../types';
import { loadHistory, saveHistory } from '../hooks/useTauri';

interface HistoryStore {
  history: HistoryEntry[];
  isLoading: boolean;
  initialize: () => Promise<void>;
  addEntry: (entry: HistoryEntry) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: [],
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const history = await loadHistory();
      set({ history: history || [] });
    } catch (error) {
      set({ history: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    const { history } = get();
    const newHistory = [entry, ...history].slice(0, 100);
    set({ history: newHistory });
    await saveHistory(newHistory);
  },

  clearHistory: async () => {
    set({ history: [] });
    await saveHistory([]);
  }
}));
