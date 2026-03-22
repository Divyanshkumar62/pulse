import { create } from 'zustand';
import { Collection } from '../types';
import { loadCollection, saveCollection } from '../hooks/useTauri'; 
// Note: In Phase 1, we will refactor Tauri imports under services/tauri

interface CollectionStore {
  collections: Collection[];
  activeCollectionId: string | null;
  isLoading: boolean;
  
  // Actions
  addCollection: (collection: Collection, path: string) => Promise<void>;
  updateCollection: (id: string, updates: Partial<Collection>, path: string) => Promise<void>;
  
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

  saveToDisk: async (id: string, path: string) => {
    const collection = get().collections.find(c => c.id === id);
    if (collection) {
      try {
        await saveCollection(collection, path);
      } catch (error) {
        console.error("Failed to save collection to disk:", error);
        // Note: In Phase 1 we will wire this to the toast notification system.
      }
    }
  }
}));
