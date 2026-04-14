import { create } from 'zustand';
import { Collection, Folder, Request } from '../types';
import { useWorkspaceStore } from './useWorkspaceStore';

interface CollectionWithPath extends Collection {
  _diskPath?: string;
}

interface CollectionStore {
  collections: CollectionWithPath[];
  activeCollectionId: string | null;
  isLoading: boolean;
  
  // Actions
  addCollection: (collection: Collection, path: string) => Promise<void>;
  updateCollection: (id: string, updates: Partial<Collection>, _path: string) => Promise<void>;
  addFolder: (collectionId: string, parentFolderId: string | null, folder: Folder) => Promise<void>;
  addRequest: (collectionId: string, folderId: string | null, request: Request) => Promise<void>;
  updateRequest: (collectionId: string, requestId: string, updates: Partial<Request>) => Promise<void>;
  
  // Persistence
  saveCollectionToDisk: (id: string) => Promise<void>;
  saveAllCollectionsToDisk: () => Promise<void>;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collections: [],
  activeCollectionId: null,
  isLoading: false,

  addCollection: async (collection: Collection, path: string) => {
    set((state) => ({
      collections: [...state.collections, { ...collection, _diskPath: path }]
    }));
    get().saveAllCollectionsToDisk();
  },

  updateCollection: async (id: string, updates: Partial<Collection>, _path: string) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    get().saveAllCollectionsToDisk();
  },

  addFolder: async (collectionId: string, parentFolderId: string | null, folder: Folder) => {
    set((state) => ({
      collections: state.collections.map((c) => {
        if (c.id !== collectionId) return c;
        
        if (!parentFolderId) {
          return { ...c, folders: [...(c.folders || []), folder] };
        }

        const updateFolders = (folders: Folder[]): Folder[] => {
          return folders.map(f => {
            if (f.id === parentFolderId) {
              return { ...f, folders: [...(f.folders || []), folder] };
            }
            if (f.folders && f.folders.length > 0) {
              return { ...f, folders: updateFolders(f.folders) };
            }
            return f;
          });
        };

        return { ...c, folders: updateFolders(c.folders) };
      }),
    }));
    get().saveAllCollectionsToDisk();
  },

  addRequest: async (collectionId: string, folderId: string | null, request: Request) => {
    set((state) => ({
      collections: state.collections.map((c) => {
        if (c.id !== collectionId) return c;
        
        if (!folderId) {
          return { ...c, requests: [...c.requests, request] };
        }

        const updateFolders = (folders: Folder[]): Folder[] => {
          return folders.map(f => {
            if (f.id === folderId) {
              return { ...f, requests: [...f.requests, request] };
            }
            if (f.folders && f.folders.length > 0) {
              return { ...f, folders: updateFolders(f.folders) };
            }
            return f;
          });
        };

        return { ...c, folders: updateFolders(c.folders) };
      }),
    }));
    get().saveAllCollectionsToDisk();
  },

  updateRequest: async (collectionId: string, requestId: string, updates: Partial<Request>) => {
    set((state) => ({
      collections: state.collections.map((c) => {
        if (c.id !== collectionId) return c;

        const topLevelIdx = c.requests.findIndex(r => r.id === requestId);
        if (topLevelIdx !== -1) {
          const newRequests = [...c.requests];
          newRequests[topLevelIdx] = { ...newRequests[topLevelIdx], ...updates };
          return { ...c, requests: newRequests };
        }

        const updateFolders = (folders: Folder[]): Folder[] => {
          return folders.map(f => {
            const reqIdx = f.requests.findIndex(r => r.id === requestId);
            if (reqIdx !== -1) {
              const newReqs = [...f.requests];
              newReqs[reqIdx] = { ...newReqs[reqIdx], ...updates };
              return { ...f, requests: newReqs };
            }
            if (f.folders && f.folders.length > 0) {
              return { ...f, folders: updateFolders(f.folders) };
            }
            return f;
          });
        };

        return { ...c, folders: updateFolders(c.folders) };
      }),
    }));
    get().saveAllCollectionsToDisk();
  },

  saveCollectionToDisk: async (id: string) => {
    const collection = get().collections.find((c) => c.id === id);
    if (!collection) return;

    const activeWorkspace = useWorkspaceStore.getState().workspaces.find(
      w => w.id === useWorkspaceStore.getState().activeWorkspaceId
    );
    let workspacePath = activeWorkspace?.path;

    if (!workspacePath) {
      const { invoke } = await import('@tauri-apps/api/core');
      workspacePath = await invoke<string>('create_data_dir');
    }

    try {
      const { saveCollectionToDisk } = await import('../hooks/useTauri');
      await saveCollectionToDisk(workspacePath, collection);
    } catch (e) {
      console.error(`[Pulse] Failed to save collection ${collection.name} to disk:`, e);
    }
  },

  saveAllCollectionsToDisk: async () => {
    const activeWorkspace = useWorkspaceStore.getState().workspaces.find(
      w => w.id === useWorkspaceStore.getState().activeWorkspaceId
    );
    let workspacePath = activeWorkspace?.path;

    if (!workspacePath) {
      const { invoke } = await import('@tauri-apps/api/core');
      workspacePath = await invoke<string>('create_data_dir');
    }

    const { saveCollectionToDisk } = await import('../hooks/useTauri');
    const collections = get().collections;

    for (const collection of collections) {
      try {
        await saveCollectionToDisk(workspacePath, collection);
      } catch (e) {
        console.error(`[Pulse] Failed to save collection ${collection.name}:`, e);
      }
    }
  }
}));

// Auto-save: debounce saves to disk whenever collections change
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
useCollectionStore.subscribe((state, prevState) => {
  const activeWorkspace = useWorkspaceStore.getState().workspaces.find(
    w => w.id === useWorkspaceStore.getState().activeWorkspaceId
  );
  
  const hasChanged = state.collections !== prevState.collections;
  if (!hasChanged) return;

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await state.saveAllCollectionsToDisk();
  }, 1500);
});
