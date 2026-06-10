import { create } from 'zustand';
import type { HistoryEntry } from '../types';
import { loadHistory, saveHistory } from '../hooks/useTauri';
import { useSettingsStore } from './useSettingsStore';

interface HistoryStore {
  history: HistoryEntry[];
  isLoading: boolean;
  initialize: () => Promise<void>;
  addEntry: (entry: HistoryEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  applyRetention: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: [],
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const history = await loadHistory();
      set({ history: history || [] });
      // Apply retention policy after initialization
      await get().applyRetention();
    } catch (error) {
      set({ history: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    const SENSITIVE_HEADER_KEYS = /^(authorization|x-api-key|x-auth-token|api-key|cookie|set-cookie)$/i;
    const sanitizedEntry = {
      ...entry,
      request: {
        ...entry.request,
        headers: entry.request.headers.map(h => 
          SENSITIVE_HEADER_KEYS.test(h.key) ? { ...h, value: '[REDACTED]' } : h
        )
      }
    };
    const { history } = get();
    const newHistory = [sanitizedEntry, ...history].slice(0, 1000); // Increased cap slightly
    set({ history: newHistory });
    await saveHistory(newHistory);
    // Apply retention policy
    await get().applyRetention();
  },

  applyRetention: async () => {
    const { history } = get();
    const settings = useSettingsStore.getState().settings;
    if (!settings || settings.history_retention_days === 0) return;

    const now = Date.now();
    const retentionMs = settings.history_retention_days * 24 * 60 * 60 * 1000;
    
    const newHistory = history.filter(entry => {
      const entryTime = entry.timestamp ? new Date(entry.timestamp).getTime() : now; // Fallback if no timestamp
      return (now - entryTime) <= retentionMs;
    });

    if (newHistory.length !== history.length) {
      set({ history: newHistory });
      await saveHistory(newHistory);
    }
  },

  deleteEntry: async (id) => {
    const { history } = get();
    const newHistory = history.filter(e => e.id !== id);
    set({ history: newHistory });
    await saveHistory(newHistory);
  },

  clearHistory: async () => {
    set({ history: [] });
    await saveHistory([]);
  }
}));
