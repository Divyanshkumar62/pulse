import { create } from 'zustand';
import { Collection } from '../types';
import { loadCollections, createDataDir } from '../hooks/useTauri';
import { useTeamStore } from './useTeamStore';

export interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'team';
  teamId?: string;
  collections: Collection[];
}

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  
  initialize: () => Promise<void>;
  setActiveWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaces: [],
  activeWorkspaceId: null,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      await createDataDir();
      const collections = await loadCollections();
      
      const personalWorkspace: Workspace = {
        id: 'personal',
        name: 'Personal Workspace',
        type: 'personal',
        collections
      };
      
      // Inherit teams to generate team workspaces
      const teams = useTeamStore.getState().teams;
      const teamWorkspaces: Workspace[] = teams.map(t => ({
        id: `team_${t.id}`,
        name: t.name,
        type: 'team',
        teamId: t.id,
        collections: [] // Will fetch team remote collections later
      }));

      set({ 
        workspaces: [personalWorkspace, ...teamWorkspaces],
        activeWorkspaceId: 'personal' // Default to personal
      });
    } catch (e) {
      console.error('Failed to initialize workspaces', e);
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id })
}));
