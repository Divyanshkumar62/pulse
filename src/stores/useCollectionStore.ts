import { create } from 'zustand';
import { Collection, Folder, Request } from '../types';

interface CollectionStore {
  collections: Collection[];
  activeCollectionId: string | null;
  isLoading: boolean;
  
  // Actions
  addCollection: (collection: Collection, path: string) => Promise<void>;
  updateCollection: (id: string, updates: Partial<Collection>, path: string) => Promise<void>;
  addFolder: (collectionId: string, parentFolderId: string | null, folder: Folder) => Promise<void>;
  addRequest: (collectionId: string, folderId: string | null, request: Request) => Promise<void>;
  updateRequest: (collectionId: string, requestId: string, updates: Partial<Request>) => Promise<void>;
  
  // Persistence Integrations
  saveToDisk: (id: string, path: string) => Promise<void>;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collections: [],
  activeCollectionId: null,
  isLoading: false,

  addCollection: async (collection: Collection, path: string) => {
    set((state) => ({ collections: [...state.collections, collection] }));
  },

  updateCollection: async (id: string, updates: Partial<Collection>, path: string) => {
    set((state) => ({
      collections: state.collections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
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
  },

  saveToDisk: async (id: string, path: string) => {}
}));
