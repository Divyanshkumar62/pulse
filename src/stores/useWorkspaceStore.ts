import { create } from 'zustand';
import { Collection } from '../types';
import { loadCollections, createDataDir, gitInit, loadCollectionsFromWorkspace } from '../hooks/useTauri';
import { useTeamStore } from './useTeamStore';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'team';
  teamId?: string;
  collections: Collection[];
  path?: string;
  isGitEnabled?: boolean;
}

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  
  initialize: () => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;
  linkWorkspaceToFolder: (workspaceId: string) => Promise<void>;
}

const WORKSPACE_META_PATH = 'workspace-meta.json';

async function loadWorkspaceMeta(): Promise<Record<string, { path?: string; isGitEnabled?: boolean }>> {
  try {
    const dataDir = await invoke<string>('create_data_dir');
    const path = `${dataDir}${navigator.userAgent.includes('Windows') ? '\\' : '/'}${WORKSPACE_META_PATH}`;
    const fs = await import('@tauri-apps/plugin-fs');
    const content = await fs.readTextFile(path);
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveWorkspaceMeta(meta: Record<string, { path?: string; isGitEnabled?: boolean }>): Promise<void> {
  try {
    const dataDir = await invoke<string>('create_data_dir');
    const path = `${dataDir}${navigator.userAgent.includes('Windows') ? '\\' : '/'}${WORKSPACE_META_PATH}`;
    const fs = await import('@tauri-apps/plugin-fs');
    await fs.writeTextFile(path, JSON.stringify(meta, null, 2));
  } catch (e) {
    console.error('[Pulse] Failed to save workspace metadata:', e);
  }
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const meta = await loadWorkspaceMeta();

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
      
      const personalMeta = meta['personal'] || {};
      const personalWorkspace: Workspace = {
        id: 'personal',
        name: 'Personal Workspace',
        type: 'personal',
        collections,
        path: personalMeta.path,
        isGitEnabled: personalMeta.isGitEnabled
      };
      
      // Step 3: Map Team Workspaces (restore their meta too)
      const teams = useTeamStore.getState().teams;
      const teamWorkspaces: Workspace[] = (teams || []).map(t => {
        const teamMeta = meta[`team_${t.id}`] || {};
        return {
          id: `team_${t.id}`,
          name: t.name,
          type: 'team',
          teamId: t.id,
          collections: [],
          path: teamMeta.path,
          isGitEnabled: teamMeta.isGitEnabled
        };
      });

      set({ 
        workspaces: [personalWorkspace, ...teamWorkspaces],
        activeWorkspaceId: 'personal'
      });

      // Step 4: Load workspace-specific data
      const effectivePath = personalWorkspace.path || await invoke<string>('create_data_dir');
      
      try {
        const workspaceCollections = await loadCollectionsFromWorkspace(effectivePath);
        const { useCollectionStore } = await import('./useCollectionStore');
        const colStore = useCollectionStore.getState();
        
        // Populate store from collections found in workspace
        for (const col of workspaceCollections) {
          colStore.addCollection(col, effectivePath);
        }

        // Also add the default collections loaded in Step 2 if they aren't duplicates
        for (const col of collections) {
          if (!workspaceCollections.find(wc => wc.id === col.id)) {
            colStore.addCollection(col, effectivePath);
          }
        }

        // Load Flows
        const { useFlowStore } = await import('./useFlowStore');
        await useFlowStore.getState().loadFlowsFromDisk(effectivePath);
        console.log(`[Pulse] Initialization complete. Loaded data from: ${effectivePath}`);
      } catch (e) {
        console.warn('[Pulse] Failed to load workspace data on init:', e);
      }
    } catch (e) {
      console.error('[Pulse] Critical failure in workspace initialization', e);
      set({ 
        workspaces: [{ id: 'personal', name: 'Personal (Local Only)', type: 'personal', collections: [] }],
        activeWorkspaceId: 'personal'
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveWorkspace: async (id) => {
    set({ activeWorkspaceId: id });
    
    // If switching to a workspace with a path, load its collections
    const workspace = get().workspaces.find(w => w.id === id);
    if (workspace?.path) {
      try {
        const workspaceCollections = await loadCollectionsFromWorkspace(workspace.path);
        if (workspaceCollections.length > 0) {
          const { useCollectionStore } = await import('./useCollectionStore');
          const store = useCollectionStore.getState();
          for (const col of workspaceCollections) {
            store.addCollection(col, workspace.path);
          }
        }

        // Load Flows
        const { useFlowStore } = await import('./useFlowStore');
        await useFlowStore.getState().loadFlowsFromDisk(workspace.path);
      } catch (e) {
        console.warn('[Pulse] Failed to load workspace data:', e);
      }
    }
  },

  linkWorkspaceToFolder: async (workspaceId) => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Workspace Folder'
      });

      if (!selected) return;

      const path = Array.isArray(selected) ? selected[0] : selected;
      
      // Extract folder name from path
      const folderName = path.split(/[/\\]/).pop() || 'Workspace';
      
      // Initialize Git repo if needed
      try {
        await gitInit(path);
      } catch (e) {
        console.log('[Pulse] Directory already a git repo or init failed', e);
      }

      // Update store
      set(state => ({
        workspaces: state.workspaces.map(w => 
          w.id === workspaceId ? { ...w, path, isGitEnabled: true } : w
        )
      }));

      // Persist to disk
      const meta = await loadWorkspaceMeta();
      meta[workspaceId] = { path, isGitEnabled: true };
      await saveWorkspaceMeta(meta);

      // Create a collection from the workspace folder
      const { useCollectionStore } = await import('./useCollectionStore');
      const newCollection: Collection = {
        id: `ws-${Date.now()}`,
        name: folderName,
        description: `Workspace: ${path}`,
        requests: [],
        folders: [],
        variables: []
      };
      useCollectionStore.getState().addCollection(newCollection, path);
      
      // Also try to load any existing collections from workspace
      const workspaceCollections = await loadCollectionsFromWorkspace(path);
      if (workspaceCollections.length > 0) {
        for (const col of workspaceCollections) {
          if (col.name !== folderName) {
            useCollectionStore.getState().addCollection(col, path);
          }
        }
      }

      console.log(`[Pulse] Workspace ${workspaceId} linked to ${path}`);
    } catch (e) {
      console.error('[Pulse] Failed to link workspace', e);
    }
  }
}));
