import { create } from 'zustand';
import { Collection, Folder, Request } from '../types';
import { saveCollection } from '../hooks/useTauri'; 
import { v4 as uuidv4 } from 'uuid';

interface CollectionStore {
  collections: Collection[];
  activeCollectionId: string | null;
  isLoading: boolean;
  
  // Actions
  addCollection: (collection: Collection, path: string) => Promise<void>;
  updateCollection: (id: string, updates: Partial<Collection>, path: string) => Promise<void>;
  addFolder: (collectionId: string, folder: Folder) => Promise<void>;
  addRequest: (collectionId: string, folderId: string | null, request: Request) => Promise<void>;
  
  // Persistence Integrations
  saveToDisk: (id: string, path: string) => Promise<void>;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collections: [],
  activeCollectionId: null,
  isLoading: false,

  addCollection: async (collection: Collection, path: string) => {
    set((state) => ({ collections: [...state.collections, collection] }));
    await get().saveToDisk(collection.id, path);
  },

  updateCollection: async (id: string, updates: Partial<Collection>, path: string) => {
    set((state) => ({
      collections: state.collections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
    await get().saveToDisk(id, path);
  },

  addFolder: async (collectionId: string, folder: Folder) => {
    set((state) => ({
      collections: state.collections.map((c) => 
        c.id === collectionId 
          ? { ...c, folders: [...c.folders, folder] }
          : c
      ),
    }));
  },

  addRequest: async (collectionId: string, folderId: string | null, request: Request) => {
    set((state) => ({
      collections: state.collections.map((c) => {
        if (c.id !== collectionId) return c;
        
        if (folderId) {
          return {
            ...c,
            folders: c.folders.map(f => 
              f.id === folderId 
                ? { ...f, requests: [...f.requests, request] }
                : f
            )
          };
        } else {
          return {
            ...c,
            requests: [...c.requests, request]
          };
        }
      }),
    }));
  },

  saveToDisk: async (id: string, path: string) => {
    const collection = get().collections.find(c => c.id === id);
    if (collection) {
      try {
        await saveCollection(collection, path);
      } catch (error) {
        console.error("Failed to save collection to disk:", error);
      }
    }
  }
}));
