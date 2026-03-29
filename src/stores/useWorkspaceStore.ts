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
      // Step 1: Ensure Backend Data Directory Exists
      try {
        await createDataDir();
      } catch (dirError) {
        console.warn("[Pulse] Data directory creation failed, falling back to cache.", dirError);
      }

      // Step 2: Load Collections
      let collections: Collection[] = [];
      try {
        collections = await loadCollections();
      } catch (loadError) {
        console.error("[Pulse] Failed to load collections from disk.", loadError);
      }
      
      const personalWorkspace: Workspace = {
        id: 'personal',
        name: 'Personal Workspace',
        type: 'personal',
        collections
      };
      
      // Step 3: Map Team Workspaces
      const teams = useTeamStore.getState().teams;
      const teamWorkspaces: Workspace[] = (teams || []).map(t => ({
        id: `team_${t.id}`,
        name: t.name,
        type: 'team',
        teamId: t.id,
        collections: [] 
      }));

      set({ 
        workspaces: [personalWorkspace, ...teamWorkspaces],
        activeWorkspaceId: 'personal' // Force default to personal to resolve stuck UI
      });
    } catch (e) {
      console.error('[Pulse] Critical failure in workspace initialization', e);
      // Fail-safe state
      set({ 
        workspaces: [{ id: 'personal', name: 'Personal (Local Only)', type: 'personal', collections: [] }],
        activeWorkspaceId: 'personal'
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id })
}));
