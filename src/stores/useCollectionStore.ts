import { create } from 'zustand';
import { Collection, Folder, Request } from '../types';
import { useWorkspaceStore } from './useWorkspaceStore';
import { v4 as uuidv4 } from 'uuid';

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
  updateCollectionVariables: (collectionId: string, updates: Record<string, any>) => Promise<void>;
  duplicateCollection: (id: string) => void;
  deleteCollection: (id: string) => void;
  
  addFolder: (collectionId: string, parentFolderId: string | null, folder: Folder) => Promise<void>;
  updateFolder: (collectionId: string, folderId: string, updates: Partial<Folder>) => void;
  duplicateFolder: (collectionId: string, folderId: string) => void;
  deleteFolder: (collectionId: string, folderId: string) => void;
  
  addRequest: (collectionId: string, folderId: string | null, request: Request) => Promise<void>;
  updateRequest: (collectionId: string, requestId: string, updates: Partial<Request>) => Promise<void>;
  duplicateRequest: (collectionId: string, requestId: string) => void;
  deleteRequest: (collectionId: string, requestId: string) => void;
  moveRequest: (sourceCollectionId: string, targetCollectionId: string, requestId: string, targetFolderId: string | null, newIndex: number) => Promise<void>;
  moveFolder: (sourceCollectionId: string, targetCollectionId: string, folderId: string, targetParentId: string | null, newIndex: number) => Promise<void>;
  
  // Persistence
  setCollections: (collections: CollectionWithPath[]) => void;
  saveCollectionToDisk: (id: string) => Promise<void>;
  saveAllCollectionsToDisk: () => Promise<void>;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collections: [],
  activeCollectionId: null,
  isLoading: false,

  addCollection: async (collection: Collection, path: string) => {
    const { collections } = get();
    const existingIdx = collections.findIndex(c => c.id === collection.id);
    
    if (existingIdx !== -1) {
      const newCollections = [...collections];
      newCollections[existingIdx] = { ...collection, _diskPath: path };
      set({ collections: newCollections });
    } else {
      set({ collections: [...collections, { ...collection, _diskPath: path }] });
    }
    await get().saveCollectionToDisk(collection.id);
  },

  updateCollection: async (id: string, updates: Partial<Collection>, _path: string) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    get().saveCollectionToDisk(id);
  },

  updateCollectionVariables: async (collectionId: string, updates: Record<string, any>) => {
    const { collections } = get();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    const newVariables = [...(collection.variables || [])];
    Object.entries(updates).forEach(([key, value]) => {
      const idx = newVariables.findIndex(v => v.key === key);
      if (idx >= 0) {
        newVariables[idx] = { ...newVariables[idx], value: String(value) };
      } else {
        newVariables.push({ key, value: String(value), enabled: true });
      }
    });

    await get().updateCollection(collectionId, { variables: newVariables }, collection._diskPath || '');
  },

  duplicateCollection: (id) => {
    const { collections } = get();
    const source = collections.find(c => c.id === id);
    if (!source) return;

    const newCol: CollectionWithPath = JSON.parse(JSON.stringify(source));
    newCol.id = uuidv4();
    newCol.name = `${source.name} (Copy)`;
    newCol.pinned = false;
    delete newCol._diskPath;

    const regenerateIds = (item: any) => {
        if (item.requests) item.requests.forEach((r: any) => r.id = uuidv4());
        if (item.folders) {
            item.folders.forEach((f: any) => {
                f.id = uuidv4();
                regenerateIds(f);
            });
        }
    };
    regenerateIds(newCol);

    set({ collections: [...collections, newCol] });
    get().saveCollectionToDisk(newCol.id);
  },

  deleteCollection: async (id) => {
    const collection = get().collections.find(c => c.id === id);
    set((state) => ({
      collections: state.collections.filter(c => c.id !== id)
    }));
    
    const activeWorkspace = useWorkspaceStore.getState().workspaces.find(
      w => w.id === useWorkspaceStore.getState().activeWorkspaceId
    );
    let workspacePath = activeWorkspace?.path;

    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined) {
      try {
        if (!workspacePath) {
          const { invoke } = await import('@tauri-apps/api/core');
          workspacePath = await invoke<string>('create_data_dir');
        }
        const { deleteCollectionFromDisk } = await import('../hooks/useTauri');
        await deleteCollectionFromDisk(workspacePath, id);
      } catch (e) {
        console.error(`[Pulse] Failed to delete collection ${id} from disk:`, e);
      }
    }
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
    get().saveCollectionToDisk(collectionId);
  },

  updateFolder: (collectionId, folderId, updates) => {
    set((state) => ({
      collections: state.collections.map((c) => {
        if (c.id !== collectionId) return c;

        const updateFoldersRecursive = (folders: Folder[]): Folder[] => {
          return folders.map(f => {
            if (f.id === folderId) {
              return { ...f, ...updates };
            }
            if (f.folders && f.folders.length > 0) {
              return { ...f, folders: updateFoldersRecursive(f.folders) };
            }
            return f;
          });
        };

        return { ...c, folders: updateFoldersRecursive(c.folders) };
      }),
    }));
    get().saveCollectionToDisk(collectionId);
  },

  duplicateFolder: (collectionId, folderId) => {
    set((state) => ({
      collections: state.collections.map((c) => {
        if (c.id !== collectionId) return c;

        let duplicated: Folder | null = null;

        const findAndClone = (folders: Folder[]): Folder[] => {
            const result: Folder[] = [];
            for (const f of folders) {
                result.push(f);
                if (f.id === folderId) {
                    duplicated = JSON.parse(JSON.stringify(f));
                    duplicated!.id = uuidv4();
                    duplicated!.name = `${f.name} (Copy)`;
                    duplicated!.pinned = false;
                    
                    const regenerate = (item: any) => {
                        if (item.requests) item.requests.forEach((r: any) => r.id = uuidv4());
                        if (item.folders) item.folders.forEach((child: any) => {
                            child.id = uuidv4();
                            regenerate(child);
                        });
                    };
                    regenerate(duplicated);
                    result.push(duplicated!);
                } else if (f.folders) {
                    f.folders = findAndClone(f.folders);
                }
            }
            return result;
        };

        return { ...c, folders: findAndClone(c.folders) };
      })
    }));
    get().saveCollectionToDisk(collectionId);
  },

  deleteFolder: (collectionId, folderId) => {
    set((state) => ({
      collections: state.collections.map(c => {
          if (c.id !== collectionId) return c;
          
          const removeInFolders = (folders: Folder[]): Folder[] => {
              return folders.filter(f => f.id !== folderId).map(f => ({
                  ...f,
                  folders: f.folders ? removeInFolders(f.folders) : []
              }));
          };
          
          return { ...c, folders: removeInFolders(c.folders) };
      })
    }));
    get().saveCollectionToDisk(collectionId);
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
    get().saveCollectionToDisk(collectionId);
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
    get().saveCollectionToDisk(collectionId);
  },

  duplicateRequest: (collectionId, requestId) => {
    set((state) => ({
      collections: state.collections.map((c) => {
        if (c.id !== collectionId) return c;

        const topLevelIdx = c.requests.findIndex(r => r.id === requestId);
        if (topLevelIdx !== -1) {
            const source = c.requests[topLevelIdx];
            const duplicated: Request = { ...JSON.parse(JSON.stringify(source)), id: uuidv4(), name: `${source.name} (Copy)`, pinned: false };
            const newRequests = [...c.requests];
            newRequests.splice(topLevelIdx + 1, 0, duplicated);
            return { ...c, requests: newRequests };
        }

        const updateFolders = (folders: Folder[]): Folder[] => {
          return folders.map(f => {
            const reqIdx = f.requests.findIndex(r => r.id === requestId);
            if (reqIdx !== -1) {
              const source = f.requests[reqIdx];
              const duplicated: Request = { ...JSON.parse(JSON.stringify(source)), id: uuidv4(), name: `${source.name} (Copy)`, pinned: false };
              const newReqs = [...f.requests];
              newReqs.splice(reqIdx + 1, 0, duplicated);
              return { ...f, requests: newReqs };
            }
            if (f.folders && f.folders.length > 0) {
              return { ...f, folders: updateFolders(f.folders) };
            }
            return f;
          });
        };

        return { ...c, folders: updateFolders(c.folders) };
      })
    }));
    get().saveCollectionToDisk(collectionId);
  },

  deleteRequest: (collectionId, requestId) => {
    set((state) => ({
      collections: state.collections.map(c => {
          if (c.id !== collectionId) return c;
          
          const removeInFolders = (folders: Folder[]): Folder[] => {
              return folders.map(f => ({
                  ...f,
                  requests: f.requests.filter(r => r.id !== requestId),
                  folders: f.folders ? removeInFolders(f.folders) : []
              }));
          };
          
          return { 
              ...c, 
              requests: c.requests.filter(r => r.id !== requestId),
              folders: removeInFolders(c.folders) 
          };
      })
    }));
    get().saveCollectionToDisk(collectionId);
  },

  moveRequest: async (sourceCollectionId, targetCollectionId, requestId, targetFolderId, newIndex) => {
    // 1. Retrieve the request to be moved first
    const collections = get().collections;
    const sourceCol = collections.find((c) => c.id === sourceCollectionId);
    if (!sourceCol) return;

    let extractedRequest: Request | undefined;

    // Search root requests
    const rootIndex = sourceCol.requests.findIndex((r) => r.id === requestId);
    if (rootIndex !== -1) {
      extractedRequest = { ...sourceCol.requests[rootIndex] };
    } else {
      // Search recursively in folders
      const findInFolders = (folders: Folder[]): Request | undefined => {
        for (const f of folders) {
          const req = f.requests.find((r) => r.id === requestId);
          if (req) return { ...req };
          if (f.folders) {
            const found = findInFolders(f.folders);
            if (found) return found;
          }
        }
        return undefined;
      };
      extractedRequest = findInFolders(sourceCol.folders);
    }

    if (!extractedRequest) return;

    // Update the collectionId if moving across boundaries
    if (sourceCollectionId !== targetCollectionId) {
      extractedRequest.collectionId = targetCollectionId;
    }

    const requestToInsert = extractedRequest; // local constant for type safety

    // 2. Remove the request from its source collection in state
    set((state) => {
      const newCollections = state.collections.map((c) => {
        if (c.id !== sourceCollectionId) return c;

        const rootIdx = c.requests.findIndex((r) => r.id === requestId);
        if (rootIdx !== -1) {
          return {
            ...c,
            requests: c.requests.filter((_, i) => i !== rootIdx)
          };
        }

        const removeFromFolders = (folders: Folder[]): Folder[] => {
          return folders.map((f) => {
            const reqIdx = f.requests.findIndex((r) => r.id === requestId);
            if (reqIdx !== -1) {
              return {
                ...f,
                requests: f.requests.filter((_, i) => i !== reqIdx)
              };
            }
            return {
              ...f,
              folders: f.folders ? removeFromFolders(f.folders) : []
            };
          });
        };

        return { ...c, folders: removeFromFolders(c.folders || []) };
      });
      return { collections: newCollections };
    });

    // 3. Insert the request into the target parent
    set((state) => {
      const newCollections = state.collections.map((c) => {
        if (c.id !== targetCollectionId) return c;

        if (!targetFolderId) {
          const newRequests = [...c.requests];
          newRequests.splice(newIndex, 0, requestToInsert);
          return { ...c, requests: newRequests };
        }

        const insertIntoFolders = (folders: Folder[]): Folder[] => {
          return folders.map((f) => {
            if (f.id === targetFolderId) {
              const newRequests = [...f.requests];
              newRequests.splice(newIndex, 0, requestToInsert);
              return { ...f, requests: newRequests };
            }
            return {
              ...f,
              folders: f.folders ? insertIntoFolders(f.folders) : []
            };
          });
        };

        return { ...c, folders: insertIntoFolders(c.folders || []) };
      });
      return { collections: newCollections };
    });

    await get().saveCollectionToDisk(sourceCollectionId);
    if (sourceCollectionId !== targetCollectionId) {
      await get().saveCollectionToDisk(targetCollectionId);
    }
  },

  moveFolder: async (sourceCollectionId, targetCollectionId, folderId, targetParentId, newIndex) => {
    // 1. Retrieve the folder to be moved first
    const collections = get().collections;
    const sourceCol = collections.find(c => c.id === sourceCollectionId);
    if (!sourceCol) return;

    let extractedFolder: Folder | undefined;
    const findFolderRecursive = (folders: Folder[]): Folder | undefined => {
      for (const f of folders) {
        if (f.id === folderId) return { ...f };
        if (f.folders) {
          const found = findFolderRecursive(f.folders);
          if (found) return found;
        }
      }
      return undefined;
    };
    extractedFolder = findFolderRecursive(sourceCol.folders || []);
    if (!extractedFolder) return;

    // 0. Circular dependency check (only if moving within same collection)
    if (sourceCollectionId === targetCollectionId && targetParentId) {
      const isDescendantOrSelf = (f: Folder, targetId: string): boolean => {
        if (f.id === targetId) return true;
        if (f.folders) {
          for (const child of f.folders) {
            if (isDescendantOrSelf(child, targetId)) return true;
          }
        }
        return false;
      };
      if (isDescendantOrSelf(extractedFolder, targetParentId)) {
        throw new Error('Circular dependency: Cannot move a folder into itself or its subfolders.');
      }
    }

    // Update all internal requests' collectionId if moving across boundaries
    if (sourceCollectionId !== targetCollectionId) {
      const updateRequestCollectionIds = (folder: Folder) => {
        if (folder.requests) {
          folder.requests.forEach(r => { r.collectionId = targetCollectionId; });
        }
        if (folder.folders) {
          folder.folders.forEach(updateRequestCollectionIds);
        }
      };
      updateRequestCollectionIds(extractedFolder);
    }

    const folderToInsert = extractedFolder; // local constant for type safety

    // 2. Remove the folder from its source collection
    set((state) => {
      const newCollections = state.collections.map((c) => {
        if (c.id !== sourceCollectionId) return c;

        const rootIdx = c.folders.findIndex((f) => f.id === folderId);
        if (rootIdx !== -1) {
          return {
            ...c,
            folders: c.folders.filter((_, i) => i !== rootIdx)
          };
        }

        const removeFromFolders = (folders: Folder[]): Folder[] => {
          return folders.map((f) => {
            const childIdx = f.folders?.findIndex((child) => child.id === folderId) ?? -1;
            if (childIdx !== -1) {
              return {
                ...f,
                folders: f.folders!.filter((_, i) => i !== childIdx)
              };
            }
            return {
              ...f,
              folders: f.folders ? removeFromFolders(f.folders) : []
            };
          });
        };

        return { ...c, folders: removeFromFolders(c.folders || []) };
      });
      return { collections: newCollections };
    });

    // 3. Insert the folder into the target parent
    set((state) => {
      const newCollections = state.collections.map((c) => {
        if (c.id !== targetCollectionId) return c;

        if (!targetParentId) {
          const newFolders = [...(c.folders || [])];
          newFolders.splice(newIndex, 0, folderToInsert);
          return { ...c, folders: newFolders };
        }

        const insertIntoFolders = (folders: Folder[]): Folder[] => {
          return folders.map((f) => {
            if (f.id === targetParentId) {
              const newFolders = [...(f.folders || [])];
              newFolders.splice(newIndex, 0, folderToInsert);
              return { ...f, folders: newFolders };
            }
            return {
              ...f,
              folders: f.folders ? insertIntoFolders(f.folders) : []
            };
          });
        };

        return { ...c, folders: insertIntoFolders(c.folders || []) };
      });
      return { collections: newCollections };
    });

    await get().saveCollectionToDisk(sourceCollectionId);
    if (sourceCollectionId !== targetCollectionId) {
      await get().saveCollectionToDisk(targetCollectionId);
    }
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
  },

  setCollections: (collections) => set({ collections })
}));

// Automatic sync to workspaces in useWorkspaceStore
useCollectionStore.subscribe((state) => {
  try {
    const wsStore = useWorkspaceStore.getState();
    const activeId = wsStore.activeWorkspaceId;
    if (activeId) {
      const workspaces = wsStore.workspaces;
      const workspace = workspaces.find(w => w.id === activeId);
      if (workspace && workspace.collections !== state.collections) {
        useWorkspaceStore.setState({
          workspaces: workspaces.map(w => 
            w.id === activeId ? { ...w, collections: state.collections } : w
          )
        });
      }
    }
  } catch (e) {
    console.warn('[Pulse] Failed to sync collections to workspace store:', e);
  }
});

// Auto-save logic is now handled directly by actions to be more targeted and efficient.
// This prevents saving all collections when only one small part of one collection changes.

