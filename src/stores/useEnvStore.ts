import { create } from 'zustand';
import { Environment } from '../types';
import { loadEnvironments, saveEnvironments } from '../hooks/useTauri';
import { v4 as uuidv4 } from 'uuid';

interface EnvStore {
  environments: Environment[];
  activeEnvId: string | null;
  isLoading: boolean;
  
  initialize: () => Promise<void>;
  setActiveEnvId: (id: string | null) => void;
  addEnvironment: (env: Environment) => Promise<void>;
  updateEnvironment: (id: string, updates: Partial<Environment>) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  duplicateEnvironment: (id: string) => Promise<void>;
  renameEnvironment: (id: string, newName: string) => Promise<void>;
  togglePinEnvironment: (id: string) => Promise<void>;
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

const syncToStorage = async (envs: Environment[]) => {
    await saveEnvironments(envs);
    const workspacePath = await getWorkspacePath();
    if (workspacePath) {
      const { saveWorkspaceToDisk } = await import('../hooks/useTauri');
      await saveWorkspaceToDisk(workspacePath, envs);
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
      set({ environments: [], activeEnvId: null });
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveEnvId: (id) => set({ activeEnvId: id }),

  addEnvironment: async (env) => {
    const newEnvs = [...get().environments, env];
    set({ environments: newEnvs });
    await syncToStorage(newEnvs);
  },

  updateEnvironment: async (id, updates) => {
    const newEnvs = get().environments.map((e) => e.id === id ? { ...e, ...updates } : e);
    set({ environments: newEnvs });
    await syncToStorage(newEnvs);
  },

  deleteEnvironment: async (id) => {
    const { activeEnvId, environments } = get();
    const newEnvs = environments.filter((e) => e.id !== id);
    set({ 
      environments: newEnvs,
      activeEnvId: activeEnvId === id ? (newEnvs[0]?.id || null) : activeEnvId
    });
    await syncToStorage(newEnvs);
  },

  duplicateEnvironment: async (id) => {
    const { environments } = get();
    const env = environments.find(e => e.id === id);
    if (!env) return;

    const duplicatedEnv: Environment = {
        ...env,
        id: uuidv4(),
        name: `${env.name} (Copy)`,
        pinned: false
    };

    const newEnvs = [...environments, duplicatedEnv];
    set({ environments: newEnvs });
    await syncToStorage(newEnvs);
  },

  renameEnvironment: async (id, newName) => {
    const newEnvs = get().environments.map(e => e.id === id ? { ...e, name: newName } : e);
    set({ environments: newEnvs });
    await syncToStorage(newEnvs);
  },

  togglePinEnvironment: async (id) => {
    const newEnvs = get().environments.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e);
    // Sort so pinned are first
    const sortedEnvs = [...newEnvs].sort((a, b) => {
        if (a.pinned === b.pinned) return 0;
        return a.pinned ? -1 : 1;
    });
    set({ environments: sortedEnvs });
    await syncToStorage(sortedEnvs);
  }
}));
