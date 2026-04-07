import { create } from 'zustand';
import { Environment } from '../types';
import { loadEnvironments, saveEnvironments } from '../hooks/useTauri';

interface EnvStore {
  environments: Environment[];
  activeEnvId: string | null;
  isLoading: boolean;
  
  initialize: () => Promise<void>;
  setActiveEnvId: (id: string | null) => void;
  addEnvironment: (env: Environment) => Promise<void>;
  updateEnvironment: (id: string, updates: Partial<Environment>) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
}

const getWorkspacePath = async () => {
  try {
    const { useWorkspaceStore } = await import('./useWorkspaceStore');
    const state = useWorkspaceStore.getState();
    return state.workspaces.find(w => w.id === state.activeWorkspaceId)?.path;
  } catch {
    return null;
  }
};

export const useEnvStore = create<EnvStore>((set, get) => ({
  environments: [],
  activeEnvId: null,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const envs = await loadEnvironments();
      set({ 
        environments: envs,
        activeEnvId: envs.length > 0 ? envs[0].id : null,
      });
    } catch (error) {
      console.error('Failed to load environments:', error);
      // Create defaults
      const defaults: Environment[] = [
        { id: 'global', name: 'Global', variables: [] },
      ];
      set({ environments: defaults, activeEnvId: 'global' });
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveEnvId: (id) => set({ activeEnvId: id }),

  addEnvironment: async (env) => {
    const newEnvs = [...get().environments, env];
    set({ environments: newEnvs });
    
    // Global Pulse settings sync
    await saveEnvironments(newEnvs);

    // Workspace sync
    const workspacePath = await getWorkspacePath();
    if (workspacePath) {
      const { saveWorkspaceToDisk } = await import('../hooks/useTauri');
      await saveWorkspaceToDisk(workspacePath, newEnvs);
    }
  },

  updateEnvironment: async (id, updates) => {
    const newEnvs = get().environments.map((e) => e.id === id ? { ...e, ...updates } : e);
    set({ environments: newEnvs });
    await saveEnvironments(newEnvs);

    const workspacePath = await getWorkspacePath();
    if (workspacePath) {
      const { saveWorkspaceToDisk } = await import('../hooks/useTauri');
      await saveWorkspaceToDisk(workspacePath, newEnvs);
    }
  },

  deleteEnvironment: async (id) => {
    const { activeEnvId, environments } = get();
    const newEnvs = environments.filter((e) => e.id !== id);
    set({ 
      environments: newEnvs,
      activeEnvId: activeEnvId === id ? (newEnvs[0]?.id || null) : activeEnvId
    });
    await saveEnvironments(newEnvs);

    const workspacePath = await getWorkspacePath();
    if (workspacePath) {
      const { saveWorkspaceToDisk } = await import('../hooks/useTauri');
      await saveWorkspaceToDisk(workspacePath, newEnvs);
    }
  }
}));
