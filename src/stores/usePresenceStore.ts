import { create } from 'zustand';
import { gitUpdatePresence, gitGetPresence } from '../hooks/useTauri';

interface Presence {
  email: string;
  item_id: string;
  timestamp: string;
}

interface PresenceState {
  presence: Presence[];
  updatePresence: (workspacePath: string, email: string, itemId: string) => Promise<void>;
  fetchPresence: (workspacePath: string) => Promise<void>;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  presence: [],
  
  updatePresence: async (workspacePath, email, itemId) => {
    try {
      await gitUpdatePresence(workspacePath, email, itemId);
    } catch (e) {
      console.error('Failed to update presence:', e);
    }
  },

  fetchPresence: async (workspacePath) => {
    try {
      const p = await gitGetPresence(workspacePath);
      // Filter out stale presence (older than 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const activePresence = p.filter((item: Presence) => {
        const itemDate = new Date(item.timestamp);
        return itemDate > fiveMinutesAgo;
      });
      set({ presence: activePresence });
    } catch (e) {
      console.error('Failed to fetch presence:', e);
    }
  }
}));
